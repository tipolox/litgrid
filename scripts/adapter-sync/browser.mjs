// node scripts/adapter-sync/browser.mjs <baseline-root> <playwright-core-directory> <platform-browser-directory> <output.json>
// Source-level comparison, using one Vite/Chromium runtime and identical instrumentation.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'
import ts from 'typescript'
const candidate = process.cwd(), baseline = path.resolve(process.argv[2])
const { chromium } = await import(pathToFileURL(path.join(process.argv[3], 'index.mjs')))
const platform = path.resolve(process.argv[4]), output = path.resolve(process.argv[5])
const behaviorOnly = process.argv.includes('--behavior-only')
const ownerOf = id => id?.replaceAll('\\', '/').startsWith(baseline.replaceAll('\\', '/')) ? baseline : candidate
const aliases = {
  react: path.join(candidate, 'packages/grid-react/node_modules/react'),
  'react-dom': path.join(candidate, 'packages/grid-react/node_modules/react-dom'),
  vue: path.join(candidate, 'packages/grid-vue/node_modules/vue'),
  lit: path.join(candidate, 'packages/grid-web/node_modules/lit')
}
const angularPackages = {
  '@angular/core': path.join(candidate, 'packages/grid-angular/node_modules/@angular/core'),
  '@angular/compiler': path.join(candidate, 'packages/grid-angular/node_modules/@angular/compiler'),
  '@angular/common': path.join(platform, '../common'),
  '@angular/platform-browser': platform
}
const angularAliases = Object.entries(angularPackages).flatMap(([name, directory]) => {
  const { exports } = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
  return Object.entries(exports).filter(([key]) => key !== './package.json').map(([key, value]) => ({
    find: new RegExp('^' + name.replaceAll('/', '\\/') + (key === '.' ? '' : key.slice(1).replaceAll('/', '\\/')) + '$'),
    replacement: path.resolve(directory, typeof value === 'string' ? value : value.default)
  }))
})
const server = await createServer({
  root: candidate, configFile: false, resolve: { alias: [...angularAliases, ...Object.entries(aliases).map(([find, replacement]) => ({ find, replacement }))] },
  // Keep Angular's injector implementation in one module graph; optimizing its
  // entry points separately can instantiate two copies of the injection state.
  optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'vue'] },
  server: { host: '127.0.0.1', port: 5214, strictPort: true, fs: { allow: [candidate, baseline, platform, path.resolve(platform, '../..')] } },
  plugins: [{
    name: 'paired-adapter-sources', enforce: 'pre',
    resolveId(source, importer) {
      const packages = { '@tipolox/litgrid-core': 'grid-core', '@tipolox/litgrid-renderer': 'grid-renderer', '@tipolox/litgrid-web': 'grid-web' }
      if (packages[source]) return path.join(ownerOf(importer), 'packages', packages[source], 'src/index.ts')
      if (importer && source.startsWith('.')) {
        const stem = path.resolve(path.dirname(importer), source.replace(/\.js$/, ''))
        for (const ext of ['.ts', '.tsx']) if (!stem.includes('node_modules') && fs.existsSync(stem + ext)) return stem + ext
      }
    },
    transform(code, id) {
      if (id.endsWith('/features/transforms/applyDataTransforms.ts')) {
        return code.replace('export function applyDataTransforms(', 'function applyDataTransformsImpl(') +
          '\nexport function applyDataTransforms(...args) { const start = performance.now(); try { return applyDataTransformsImpl(...args) } finally { (globalThis.__transforms ??= []).push(performance.now() - start) } }'
      }
      if (id.endsWith('/grid-angular/src/DataGridComponent.ts')) {
        return ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true, useDefineForClassFields: false } }).outputText
      }
    },
    configureServer(server) {
      server.middlewares.use('/a1.html', (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end('<!doctype html><title>LitGrid A1 adapter checks</title><script>window.a1Roots=' + JSON.stringify({ candidate: candidate.replaceAll('\\', '/'), baseline: baseline.replaceAll('\\', '/') }) + '</script><script type="module" src="/scripts/adapter-sync/fixture.mjs"></script>')
      })
    }
  }]
})
await server.listen()
const browser = await chromium.launch({ headless: true })
const results = [], errors = []
try {
  for (const framework of ['react', 'vue', 'angular']) {
    // Alternate ordering to reduce systematic warmup/order bias.
    for (const variant of framework === 'vue' ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      page.on('pageerror', error => { errors.push({ framework, variant, message: error.message }); console.error(framework, variant, error.message) })
      page.setDefaultTimeout(60000)
      await page.goto(`http://127.0.0.1:5214/a1.html?framework=${framework}&variant=${variant}`)
      await page.waitForFunction(() => window.a1Ready, null, { timeout: 60000 })
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Performance.enable')
      for (const count of behaviorOnly ? [] : [10000, 30000, 100000]) {
        await cdp.send('HeapProfiler.collectGarbage')
        const before = await cdp.send('Performance.getMetrics')
        const result = await page.evaluate(input => window.runA1(input), { count, samples: 30 })
        const after = await cdp.send('Performance.getMetrics')
        const metric = (snapshot, name) => snapshot.metrics.find(item => item.name === name)?.value
        result.taskDurationMs = 1000 * (metric(after, 'TaskDuration') - metric(before, 'TaskDuration'))
        result.heapBefore = metric(before, 'JSHeapUsedSize')
        result.heapAfter = metric(after, 'JSHeapUsedSize')
        results.push({ framework, variant, ...result })
        console.log(framework, variant, count, JSON.stringify(result.checks))
      }
      results.push({ framework, variant, external: await page.evaluate(() => window.checkExternal()) })
      if (behaviorOnly) {
        const columns = await page.evaluate(() => window.checkColumns())
        results.push({ framework, variant, columns })
        console.log(framework, variant, JSON.stringify(columns))
      }
      await page.close()
    }
  }
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify({ browser: browser.version(), node: process.version, baseline, candidate, notes: 'Source adapters; Angular JIT with real bootstrapApplication/change detection. 120 columns use accessors over compact rows. Default public inputs only. CPU update includes framework flush and Lit updateComplete, excludes two-frame waits. Transform timers instrument both versions equally. Heap is whole-page before/after, not retained allocation or leak evidence. Each cell is isolated by a fresh page per framework/version; GC before workloads, natural GC during each workload.', results, errors }, null, 2))
  if (errors.length) throw new Error(JSON.stringify(errors))
  const failures = results.filter(result => result.variant === 'candidate' && (result.checks && Object.values(result.checks).some(value => value === false) || result.external?.passed === false || result.columns?.passed === false))
  if (failures.length) throw new Error(`${failures.length} candidate behavior checks failed; see ${output}`)
} finally { await browser.close(); await server.close() }
