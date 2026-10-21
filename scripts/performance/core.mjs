import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [candidateArg, baselineArg, playwrightArg, out] = process.argv.slice(2)
const candidate = path.resolve(candidateArg), baseline = path.resolve(baselineArg)
const { createServer } = await import(pathToFileURL(path.join(candidate, 'node_modules/vite/dist/node/index.js')))
const { chromium } = await import(pathToFileURL(path.join(playwrightArg, 'index.mjs')))
const server = await createServer({ root: candidate, configFile: false, server: { host: '127.0.0.1', port: 5209, strictPort: true, fs: { allow: [candidate, baseline] } }, plugins: [{
  name: 'core-typescript', enforce: 'pre',
  resolveId(source, importer) {
    if (importer && source.startsWith('.') && source.endsWith('.js')) {
      const ts = path.resolve(path.dirname(importer), source.slice(0, -3) + '.ts')
      if (!ts.includes('node_modules') && fs.existsSync(ts)) return ts
    }
  },
  configureServer(s) { s.middlewares.use('/core', (_, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>Core controls</title>') }) }
}] })
await server.listen()
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5209/core')
  await page.evaluate(async paths => {
    window.engines = {}
    for (const [variant, p] of Object.entries(paths)) window.engines[variant] = (await import(/* @vite-ignore */ p)).createGridEngine
  }, { optimized: `/@fs/${candidate.replaceAll('\\', '/')}/packages/grid-core/src/index.ts`, main: `/@fs/${baseline.replaceAll('\\', '/')}/packages/grid-core/src/index.ts` })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable'); await cdp.send('Profiler.enable')
  const samples = [], profiles = []
  for (const rows of [30000, 100000]) for (const gc of ['forced', 'natural']) for (const variant of rows === 30000 ? ['main', 'optimized'] : ['optimized', 'main']) {
    await cdp.send('HeapProfiler.collectGarbage')
    const before = await cdp.send('Runtime.getHeapUsage')
    await cdp.send('Profiler.start')
    for (const operation of ['cold-keyed', 'cold-unkeyed', 'same-array', 'replaced-same-keys', 'changed-last', 'duplicate-last', 'config-only']) {
      if (gc === 'forced') await cdp.send('HeapProfiler.collectGarbage')
      const result = await page.evaluate(({ rows, variant, operation }) => {
        const create = window.engines[variant], config = { selection: { mode: 'multi-row', rowKey: 'id' } }
        const data = Array.from({ length: rows }, (_, id) => ({ id, name: 'Fictional ' + id }))
        let engine = create(config)
        engine.setData(data)
        const ms = [], firstSelectionMs = [], clearMs = []
        for (let i = 0; i < 30; i++) {
          let input = data
          if (operation === 'replaced-same-keys') input = data.map(row => ({ ...row }))
          if (operation === 'cold-keyed' || operation === 'cold-unkeyed') engine = create(operation === 'cold-unkeyed' ? {} : config)
          if (operation === 'changed-last') data[rows - 1].id = rows + i
          if (operation === 'duplicate-last') data[rows - 1].id = i % 2 ? rows - 1 : 0
          const t = performance.now()
          if (operation === 'config-only') engine.setConfig(config)
          else engine.setData(input)
          ms.push(performance.now() - t)
          const click = performance.now()
          const selected = engine.selectRowByKey(operation === 'duplicate-last' && i % 2 === 0 ? 1 : 0)
          firstSelectionMs.push(performance.now() - click)
          if (operation !== 'cold-unkeyed' && !selected) throw new Error('First selection failed')
          if (operation === 'duplicate-last' && i % 2 === 0 && engine.selectRowByKey(0)) throw new Error('Duplicate selected')
          const clear = performance.now(); engine.clearSelection(); clearMs.push(performance.now() - clear)
        }
        return { ms, firstSelectionMs, clearMs }
      }, { rows, variant, operation })
      samples.push({ rows, variant, gc, operation, ...result, heap: await cdp.send('Runtime.getHeapUsage') })
    }
    const { profile } = await cdp.send('Profiler.stop')
    const afterWork = await cdp.send('Runtime.getHeapUsage')
    await cdp.send('HeapProfiler.collectGarbage')
    profiles.push({ rows, variant, gc, before, afterWork, afterCollection: await cdp.send('Runtime.getHeapUsage'), profile })
  }
  if (errors.length) throw new Error(JSON.stringify(errors))
  fs.writeFileSync(out, JSON.stringify({ browser: browser.version(), viewport: { width: 1280, height: 900 }, notes: '30 samples per operation/case; fixture allocation excluded. Forced GC before each operation batch; natural GC during each batch in both modes. CPU profiles include fixture allocation, validation, selections and profiling overhead; heap snapshots are whole-page observations, not retained-engine leak measurements.', samples, profiles, errors }, null, 2))
  console.log('PASS core controls:', samples.length * 30, 'syncs with immediate first selections')
} finally { await browser.close(); await server.close() }
