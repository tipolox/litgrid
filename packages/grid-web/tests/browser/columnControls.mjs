// Run after pnpm install. Browser tooling stays external to published packages:
// LITGRID_PLAYWRIGHT_MODULE=<absolute playwright or playwright-core directory>
// LITGRID_CHROMIUM_EXECUTABLE=<optional installed Chromium executable>
// node packages/grid-web/tests/browser/columnControls.mjs
// Optional baseline comparison: LITGRID_BENCHMARK_ONLY=1 and
// LITGRID_BASELINE_SOURCE=<git-show copy of baseline components/DataGrid.ts>.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright'
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(resolve(moduleName, 'index.mjs')).href : moduleName)
const root = resolve(import.meta.dirname, '../../../..')
const baseline = process.env.LITGRID_BASELINE_SOURCE
const benchmarkOnly = process.env.LITGRID_BENCHMARK_ONLY === '1'
const server = await createServer({
  root, configFile: false, server: { host: '127.0.0.1', port: 5197, strictPort: true },
  resolve: { alias: {
    '@tipolox/litgrid-core': resolve(root, 'packages/grid-core/src/index.ts'),
    '@tipolox/litgrid-renderer': resolve(root, 'packages/grid-renderer/src/index.ts')
  } },
  plugins: [{ name: 'column-controls-fixture',
    async load(id) {
      if (baseline && id.replaceAll('\\', '/').endsWith('/packages/grid-web/src/components/DataGrid.ts')) return readFile(baseline, 'utf8')
    },
    configureServer(server) {
      server.middlewares.use('/issue37', (_, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end('<!doctype html><html><body><script type="module">import "/packages/grid-web/src/components/DataGrid.ts"; window.ready = true</script></body></html>')
      })
    }
  }]
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true, ...(process.env.LITGRID_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.LITGRID_CHROMIUM_EXECUTABLE } : { channel: 'chromium' }) })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  page.setDefaultTimeout(15_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5197/issue37')
  await page.waitForFunction(() => window.ready)
  const settle = () => page.evaluate(async () => { await document.querySelector('yc-grid').updateComplete })
  const install = options => page.evaluate(async options => {
    document.querySelector('yc-grid')?.remove()
    const grid = document.createElement('yc-grid')
    window.columns = [{ key: 'amount', ...options }, { key: 'name' }]
    grid.columns = window.columns
    grid.data = [{ amount: '2.00', name: 'Ada' }, { amount: '10.00', name: 'Grace' }, { amount: '9.00', name: 'Lin' }]
    document.body.append(grid)
    await grid.updateComplete
  }, options)
  const trigger = () => page.locator('yc-grid [data-column-key="amount"] .header-action-button')
  const action = label => page.getByRole('button', { name: label, exact: true })
  const open = async () => { await trigger().focus(); await page.keyboard.press('Enter'); await settle() }
  const focusedTrigger = () => page.evaluate(() => document.querySelector('yc-grid').shadowRoot.activeElement?.classList.contains('header-action-button'))

  if (!benchmarkOnly) {
    for (const change of ['remove', 'rename', 'hide', 'hide-all', 'hide-schema']) {
      await install({ sortable: false, filterable: false })
      await page.evaluate(() => document.querySelector('yc-grid').setFilter({ columnKey: 'amount', operator: 'isNotEmpty' }))
      await open()
      await action('Best Fit').focus()
      await page.evaluate(async change => {
        const grid = document.querySelector('yc-grid')
        if (change === 'hide' || change === 'hide-all') {
          if (change === 'hide-all') grid.setColumnVisible('name', false)
          grid.setColumnVisible('amount', false)
        } else {
          const next = change === 'remove' ? window.columns.slice(1) : window.columns.map(column => column.key === 'amount'
            ? { ...column, ...(change === 'rename' ? { key: 'renamed' } : { hidden: true }) } : column)
          grid.updateColumnSchema(next)
        }
        await grid.updateComplete
      }, change)
      assert.equal(await page.getByRole('dialog').count(), 0)
      assert.equal(await page.evaluate(() => {
        const focused = document.querySelector('yc-grid').shadowRoot.activeElement
        return focused?.isConnected && focused.matches('.header-action-button, .columns-button') && !focused.disabled
      }), true)
      if (change === 'hide-all') assert.equal(await page.getByRole('button', { name: 'Columns', exact: true }).evaluate(button => button === button.getRootNode().activeElement), true)
      await page.evaluate(async () => {
        const grid = document.querySelector('yc-grid')
        grid.updateColumnSchema(window.columns)
        grid.setColumnVisible('amount', true)
        await grid.updateComplete
      })
      assert.equal(await page.getByRole('dialog').count(), 0, 'restoring the column must not reopen a stale menu')
      assert.deepEqual(await page.evaluate(() => document.querySelector('yc-grid').getFilters()), [{ columnKey: 'amount', operator: 'isNotEmpty' }])
      await open()
      assert.equal(await action('Sort Asc').count(), 0)
      assert.equal(await action('Apply Filter').count(), 0)
      await page.keyboard.press('Escape')
      await settle()
    }
    for (const options of [{}, { sortable: false }, { filterable: false }, { sortable: false, filterable: false }]) {
      await install(options)
      await open()
      assert.equal(await action('Sort Asc').count(), options.sortable === false ? 0 : 1)
      assert.equal(await page.getByRole('combobox', { name: 'Filter operator' }).count(), options.filterable === false ? 0 : 1)
      assert.equal(await action('Best Fit').count(), 1)
      assert.equal(await action('Columns').count(), 1)
      await page.keyboard.press('Escape')
      await settle()
      assert.equal(await focusedTrigger(), true)
    }
    await install({})
    await open()
    await action('Sort Asc').focus()
    await page.keyboard.press('Space')
    await settle()
    assert.deepEqual((await page.locator('yc-grid .row .cell[data-column-index="0"]').allTextContents()).map(value => value.trim()), ['10.00', '2.00', '9.00'])
    assert.equal(await focusedTrigger(), true)
    await page.evaluate(() => document.querySelector('yc-grid').setFilter({ columnKey: 'amount', operator: 'isNotEmpty' }))
    await open()
    await action('Apply Filter').focus()
    await page.evaluate(async () => {
      window.columns[0].sortable = false
      window.columns[0].filterable = false
      const grid = document.querySelector('yc-grid')
      grid.columns = window.columns
      await grid.updateComplete
    })
    assert.equal(await focusedTrigger(), true)
    assert.equal(await page.getByRole('dialog').count(), 0)
    assert.equal(await page.locator('yc-grid [data-column-key="amount"]').getAttribute('aria-sort'), 'ascending')
    assert.equal(await page.locator('yc-grid [aria-label="Filter active"]').count(), 1)
    await open()
    await action('Columns').click()
    await settle()
    assert.equal(await page.getByRole('checkbox', { name: 'amount', exact: true }).count(), 1)
    await page.keyboard.press('Escape')
    await settle()
    assert.equal(await focusedTrigger(), true)
    await page.evaluate(async () => {
      const grid = document.querySelector('yc-grid')
      grid.updateColumnSchema([{ key: 'amount' }, { key: 'name' }])
      await grid.updateComplete
    })
    await open()
    await action('Clear Sort').click()
    await settle()
    await open()
    await page.getByRole('combobox', { name: 'Filter operator' }).selectOption('contains')
    await page.getByRole('textbox', { name: 'Filter value' }).fill('10.00')
    await action('Apply Filter').focus()
    await page.keyboard.press('Enter')
    await settle()
    assert.deepEqual((await page.locator('yc-grid .row .cell[data-column-index="0"]').allTextContents()).map(value => value.trim()), ['10.00'])
    assert.equal(await focusedTrigger(), true)
  }

  const benchmarks = []
  for (const disabled of [false, true]) {
    await install({ sortable: !disabled, filterable: !disabled })
    benchmarks.push(await page.evaluate(async disabled => {
      const grid = document.querySelector('yc-grid')
      const columns = Array.from({ length: 80 }, (_, index) => ({ key: `c${index}`, width: 140,
        accessor: row => row.amount, sortable: !disabled, filterable: !disabled }))
      const data = Array.from({ length: 100_000 }, (_, id) => ({ amount: `${id}000000000000000000.01` }))
      const start = performance.now()
      grid.columns = columns
      grid.data = data
      grid.viewportHeight = 720
      await grid.updateComplete
      const initialMs = performance.now() - start
      const viewport = grid.shadowRoot.querySelector('.viewport')
      const samples = []
      // Measure Lit's complete synchronous update separately from frame pacing.
      const updateCosts = []
      const performUpdate = grid.performUpdate.bind(grid)
      grid.performUpdate = () => {
        const before = performance.now()
        const result = performUpdate()
        updateCosts.push(performance.now() - before)
        return result
      }
      let maxCells = 0
      for (let index = 0; index < 70; index++) {
        if (index === 10) updateCosts.length = 0
        const before = performance.now()
        viewport.scrollTop = ((index * 13) % 90) * 36_000
        viewport.scrollLeft = ((index * 7) % 60) * 140
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        await grid.updateComplete
        if (index >= 10) samples.push(performance.now() - before)
        maxCells = Math.max(maxCells, grid.shadowRoot.querySelectorAll('.cell').length)
      }
      samples.sort((a, b) => a - b)
      updateCosts.sort((a, b) => a - b)
      return { disabled, rows: data.length, columns: columns.length, initialMs,
        scrollMedianMs: samples[30], scrollP95Ms: samples[57],
        updateMedianMs: updateCosts[Math.floor(updateCosts.length * .5)],
        updateP95Ms: updateCosts[Math.floor(updateCosts.length * .95)], maxCells }
    }, disabled))
    assert.ok(benchmarks.at(-1).maxCells < 1000, 'row and column virtualization must remain bounded')
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ source: baseline ? 'baseline' : 'feature', correctness: benchmarkOnly ? 'not run' : 'passed', browser: browser.version(), benchmarks }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
