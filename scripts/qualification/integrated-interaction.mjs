import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [candidateArg, baselineArg, playwrightArg, out] = process.argv.slice(2)
const candidate = path.resolve(candidateArg), baseline = path.resolve(baselineArg)
const { createServer } = await import(pathToFileURL(path.join(candidate, 'node_modules/vite/dist/node/index.js')))
const { chromium } = await import(pathToFileURL(path.join(playwrightArg, 'index.mjs')))
const server = await createServer({ root: candidate, configFile: false, server: { host: '127.0.0.1', port: 5211, strictPort: true, fs: { allow: [candidate, baseline] } }, plugins: [{
  name: 'first-interaction-sources', enforce: 'pre',
  resolveId(source, importer) {
    const owner = importer?.replaceAll('\\', '/').startsWith(baseline.replaceAll('\\', '/')) ? baseline : candidate
    const packages = { '@tipolox/litgrid-core': 'grid-core', '@tipolox/litgrid-renderer': 'grid-renderer' }
    if (packages[source]) return path.join(owner, 'packages', packages[source], 'src/index.ts')
    if (importer && source.startsWith('.') && source.endsWith('.js')) { const ts = path.resolve(path.dirname(importer), source.slice(0, -3) + '.ts'); if (!ts.includes('node_modules') && fs.existsSync(ts)) return ts }
  },
  transform(code, id) { if (id.replaceAll('\\', '/').startsWith(baseline.replaceAll('\\', '/')) && id.endsWith('/components/DataGrid.ts')) return code.replaceAll("'yc-grid'", "'yc-grid-main'") },
  configureServer(s) { s.middlewares.use('/interaction', (_, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>First click</title>') }) }
}] })
await server.listen()
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5211/interaction')
  await page.evaluate(async paths => { window.Grids = {}; for (const [v, p] of Object.entries(paths)) window.Grids[v] = (await import(/* @vite-ignore */ p)).DataGrid }, { v110: `/@fs/${baseline.replaceAll('\\', '/')}/packages/grid-web/src/components/DataGrid.ts`, optimized: `/@fs/${candidate.replaceAll('\\', '/')}/packages/grid-web/src/components/DataGrid.ts` })
  const cdp = await page.context().newCDPSession(page), samples = []
  for (const rows of [30000, 100000]) for (const columns of [120, 200]) for (let i = 0; i < 20; i++) for (const variant of i % 2 ? ['optimized', 'v110'] : ['v110', 'optimized']) {
    if (i < 10) await cdp.send('HeapProfiler.collectGarbage')
    samples.push(await page.evaluate(async ({ rows, columns, variant, i }) => {
      const grid = new window.Grids[variant](); grid.style.width = '1000px'; grid.viewportHeight = 400
      grid.config = { selection: { mode: 'multi-row', rowKey: 'id' } }
      grid.columns = Array.from({ length: columns }, (_, c) => ({ key: `c${c}`, width: 120, accessor: r => `${r.id}/${c}` }))
      const data = Array.from({ length: rows }, (_, id) => ({ id, name: `Fictional unit ${id}` }))
      grid.data = data; document.body.append(grid); await grid.updateComplete
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const cell = grid.shadowRoot.querySelector('.cell[data-row-index="0"][data-column-index="0"]')
      const start = performance.now(); cell.click(); const dispatchMs = performance.now() - start
      await grid.updateComplete; const updateMs = performance.now() - start
      if ((typeof grid.getSelectionSnapshot === 'function' ? grid.getSelectionSnapshot().rows[0]?.key : grid.getSelection().rowIndexes.has(0) ? 0 : undefined) !== 0) throw new Error('First click did not select row zero')
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const frameWaitMs = performance.now() - start
      grid.remove()
      return { rows, columns, variant, i, gc: i < 10 ? 'forced' : 'natural', dispatchMs, updateMs, frameWaitMs }
    }, { rows, columns, variant, i }))
  }
  if (errors.length) throw new Error(JSON.stringify(errors))
  fs.writeFileSync(out, JSON.stringify({ browser: browser.version(), node: process.version, baseline: 'v1.1.0 (index selection)', candidate: 'optimized integrated (keyed selection)', notes: 'Cold mounted grid; first DOM cell.click() before any selection/scroll. Timer covers dispatch, Lit update, or two-frame wait separately. Does not measure physical input hardware or compositor paint.', samples, errors }, null, 2))
  console.log('PASS first DOM clicks:', samples.length)
} finally { await browser.close(); await server.close() }
