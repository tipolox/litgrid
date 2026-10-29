import { createServer } from 'vite'
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Uses built package entry points, including Angular's published FESM output.
const server = await createServer({
  configFile: false,
  resolve: { alias: {
    '@tipolox/litgrid-angular': fileURLToPath(new URL('../dist/grid-angular/fesm2022/tipolox-litgrid-angular.mjs', import.meta.url))
  } },
  optimizeDeps: {
    noDiscovery: true,
    include: ['react', 'react/jsx-runtime', 'react-dom/client', 'react-dom', 'vue']
  },
  server: { host: '127.0.0.1', port: 5224, strictPort: true },
  plugins: [{
    name: 'adapter-event-contract-page',
    configureServer(server) {
      server.middlewares.use('/adapter-events.html', (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end('<!doctype html><title>Adapter event contracts</title><script type="module" src="/tests/contracts/adapter-events.browser.ts"></script>')
      })
    }
  }]
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('console', message => { if (message.text().startsWith('Checking ')) console.log(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5224/adapter-events.html')
  await page.waitForFunction(() => typeof window.runAdapterEvents === 'function')
  const results = await page.evaluate(() => window.runAdapterEvents())
  if (errors.length) throw new Error(errors.join('\n'))
  const report = { browser: browser.version(), node: process.version, results, errors }
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
