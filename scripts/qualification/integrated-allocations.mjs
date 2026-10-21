import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [candidateArg, baselineArg, playwrightArg, out] = process.argv.slice(2)
const candidate = path.resolve(candidateArg), baseline = path.resolve(baselineArg)
const { createServer } = await import(pathToFileURL(path.join(candidate, 'node_modules/vite/dist/node/index.js')))
const { chromium } = await import(pathToFileURL(path.join(playwrightArg, 'index.mjs')))
const server = await createServer({ root: candidate, configFile: false, server: { host: '127.0.0.1', port: 5210, strictPort: true, fs: { allow: [candidate, baseline] } }, plugins: [{
  name: 'allocation-typescript', enforce: 'pre',
  resolveId(source, importer) { if (importer && source.startsWith('.') && source.endsWith('.js')) { const ts = path.resolve(path.dirname(importer), source.slice(0, -3) + '.ts'); if (!ts.includes('node_modules') && fs.existsSync(ts)) return ts } },
  configureServer(s) { s.middlewares.use('/allocations', (_, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>Allocation samples</title>') }) }
}] })
await server.listen()
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5210/allocations')
  await page.evaluate(async paths => { window.engines = {}; for (const [v, p] of Object.entries(paths)) window.engines[v] = (await import(/* @vite-ignore */ p)).createGridEngine }, { main: `/@fs/${baseline.replaceAll('\\', '/')}/packages/grid-core/src/index.ts`, optimized: `/@fs/${candidate.replaceAll('\\', '/')}/packages/grid-core/src/index.ts` })
  const cdp = await page.context().newCDPSession(page), samples = []
  await cdp.send('Profiler.enable')
  for (const rows of [30000, 100000]) for (const phase of ['cold', 'repeated']) for (const variant of ['main', 'optimized']) {
    await page.evaluate(({ rows, variant }) => { window.data = Array.from({ length: rows }, (_, id) => ({ id })); window.makeEngine = () => window.engines[variant]({ selection: { mode: 'multi-row', rowKey: 'id' } }); window.engine = window.makeEngine(); window.engine.setData(window.data) }, { rows, variant })
    await cdp.send('HeapProfiler.collectGarbage')
    await cdp.send('Profiler.start')
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true })
    await page.evaluate(phase => { for (let i = 0; i < 30; i++) { if (phase === 'cold') window.engine = window.makeEngine(); window.engine.setData(window.data) } }, phase)
    const { profile } = await cdp.send('HeapProfiler.stopSampling')
    const { profile: cpuProfile } = await cdp.send('Profiler.stop')
    const frames = []
    const visit = n => { if (n.selfSize) frames.push({ function: n.callFrame.functionName, url: n.callFrame.url, line: n.callFrame.lineNumber, bytes: n.selfSize }); n.children.forEach(visit) }
    visit(profile.head)
    samples.push({ rows, phase, variant, cpuProfile, n: 30, sampledBytes: frames.reduce((a, n) => a + n.bytes, 0), topFrames: frames.sort((a, b) => b.bytes - a.bytes).slice(0, 15), profile })
    await page.evaluate(() => { window.data = null; window.engine = null; window.makeEngine = null })
  }
  if (errors.length) throw new Error(JSON.stringify(errors))
  fs.writeFileSync(out, JSON.stringify({ node: process.version, baseline: 'v1.1.0 (raw main label)', candidate: 'optimized integrated', browser: browser.version(), samplingInterval: 32768, notes: 'Separate allocation profiling, excluded from timing runs. 30 synchronizations per case; includes sampled collected objects. Approximate allocation estimates, not exact allocated byte counts or retained heap. Fixture rows allocated before sampling.', samples, errors }, null, 2))
  console.log('PASS allocation sampling:', samples.length, 'cases')
} finally { await browser.close(); await server.close() }
