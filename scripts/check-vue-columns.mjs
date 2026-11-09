import { createServer } from 'vite'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const base = process.argv.find(arg => arg.startsWith('--compare-base='))?.split('=')[1]
if (base) {
  const directory = new URL('../.private/vue-columns-baseline/', import.meta.url)
  mkdirSync(directory, { recursive: true })
  for (const name of ['DataGrid', 'gridBindings']) {
    const result = spawnSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/').replace(/\/$/, '')}`, 'show', `${base}:packages/grid-vue/src/${name}.ts`], { cwd: root, encoding: 'utf8' })
    if (result.status !== 0) throw new Error(result.stderr)
    writeFileSync(new URL(`${name}.ts`, directory), result.stdout)
  }
}
const server = await createServer({
  configFile: false,
  resolve: { alias: { vue: fileURLToPath(new URL('../node_modules/vue/dist/vue.esm-bundler.js', import.meta.url)) } },
  optimizeDeps: { noDiscovery: true, include: ['vue'] },
  server: { host: '127.0.0.1', port: 5225, strictPort: true },
  plugins: [{ name: 'vue-columns-contract-page', configureServer(server) {
    server.middlewares.use('/vue-columns.html', (_req, res) => {
      res.setHeader('Content-Type', 'text/html')
      res.end(`<!doctype html><title>Vue column contracts</title><script>window.compareVueColumns=${Boolean(base)}</script><script type="module" src="/tests/contracts/vue-columns.browser.ts"></script>`)
    })
  } }]
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5225/vue-columns.html')
  await page.waitForFunction(() => typeof window.runVueColumns === 'function')
  const results = await page.evaluate(() => window.runVueColumns())
  if (errors.length) throw new Error(errors.join('\n'))
  const report = { base: base ?? null, browser: browser.version(), node: process.version, results, errors }
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length)
  if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
