// node scripts/external-query-browser-check.mjs <playwright-module> <main-source-directory>
// Snapshot main with git archive into an ignored directory. No other worktree is changed.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'
const { chromium } = await import(process.argv[2] || 'playwright')
const baseline = process.argv[3] && resolve(process.argv[3])
const root = process.cwd()
const server = await createServer({ configFile: false, root, server: { host: '127.0.0.1', port: 5178, strictPort: true }, plugins: [{
  name: 'external-query-browser-sources', enforce: 'pre',
  resolveId(source, importer) {
    const packages = { '@tipolox/litgrid-core': 'grid-core', '@tipolox/litgrid-renderer': 'grid-renderer', '@tipolox/litgrid-web': 'grid-web' }
    if (packages[source]) return resolve(baseline && importer?.replaceAll('\\', '/').startsWith(baseline.replaceAll('\\', '/')) ? baseline : root, `packages/${packages[source]}/src/index.ts`)
    if (importer && source.startsWith('.') && source.endsWith('.js')) {
      const candidate = resolve(dirname(importer), source.slice(0, -3) + '.ts')
      if (!candidate.includes('node_modules') && existsSync(candidate)) return candidate
    }
  },
  transform(code, id) {
    if (baseline && id.replaceAll('\\', '/').startsWith(baseline.replaceAll('\\', '/')) && id.endsWith('/components/DataGrid.ts')) return code.replaceAll("'yc-grid'", "'yc-grid-baseline'")
  }
}] })
await server.listen()
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1150, height: 850 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5178/packages/grid-web/tests/externalQuery.browser.html')
  await page.locator('body[data-ready="true"]').waitFor()
  await page.getByText('Page 3 of 18', { exact: true }).waitFor()
  assert.equal(await page.locator('yc-grid .cell').first().textContent().then(x => x.trim()), 'Zulu')
  await page.evaluate(() => { window.grid.selectRowByKey('a'); window.order.length = 0 })
  const next = page.getByRole('button', { name: 'Next', exact: true })
  await next.focus()
  await page.keyboard.press('Enter')
  assert.deepEqual(await page.evaluate(() => window.order), ['selection', 'query'])
  assert.equal(await page.locator('yc-grid .cell').count(), 0)
  assert.equal(await page.evaluate(() => window.events.at(-1).query.pageIndex), 3)
  await page.evaluate(() => window.commit())
  await page.getByText('Page 4 of 18', { exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Quick search' }).fill('A')
  await page.evaluate(() => { window.a = window.grid.getQuery() })
  await page.getByRole('textbox', { name: 'Quick search' }).fill('B')
  assert.equal(await page.evaluate(() => window.commit({ ...window.a })), false)
  await page.evaluate(() => window.commit({ rows: [{ id: 'b', name: 'Result B', amount: '0.00' }] }))
  await page.getByText('Result B', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.evaluate(() => window.commit())
  await page.getByRole('button', { name: 'Show column actions', exact: true }).first().focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Sort Asc', exact: true }).click()
  assert.equal(await page.evaluate(() => window.events.at(-1).reason), 'sort')
  assert.equal(await page.evaluate(() => window.grid.shadowRoot.activeElement?.getAttribute('aria-label')), 'Show column actions')
  await page.evaluate(() => window.commit())
  await page.getByRole('button', { name: 'Show column actions', exact: true }).first().click()
  await page.getByRole('textbox', { name: 'Filter value' }).fill('Alpha')
  await page.getByRole('button', { name: 'Apply Filter', exact: true }).click()
  assert.equal(await page.evaluate(() => window.events.at(-1).reason), 'filter')
  await page.evaluate(() => window.commit())
  await page.getByRole('button', { name: 'Show column actions', exact: true }).nth(1).click()
  assert.equal(await page.getByRole('button', { name: 'Sort Asc', exact: true }).count(), 0)
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('50')
  assert.deepEqual(await page.evaluate(() => [window.events.at(-1).reason, window.events.at(-1).query.pageIndex]), ['page-size', 0])
  await page.evaluate(() => window.commit({ total: { kind: 'unknown', hasMore: true } }))
  await page.getByText('Total unknown', { exact: true }).waitFor()
  await next.focus()
  await page.keyboard.press('Space')
  assert.equal(await page.evaluate(() => window.grid.getPagination().pageIndex), 1)
  assert.ok(await page.evaluate(() => ['Rows per page', 'Previous'].includes(window.grid.shadowRoot.activeElement?.getAttribute('aria-label') || window.grid.shadowRoot.activeElement?.textContent.trim())))
  await page.evaluate(() => window.commit({ total: { kind: 'unknown', hasMore: false }, rows: [] }))
  assert.equal(await next.isDisabled(), true)
  await page.evaluate(() => { window.grid.refreshQuery(); window.commit({ error: 'Server unavailable', rows: [] }) })
  await page.getByRole('alert').filter({ hasText: 'Server unavailable' }).waitFor()
  await page.evaluate(() => { window.grid.config = { queryMode: 'external', selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-b' } }; window.commit({ rows: [{ id: 'a', name: 'Other scope', amount: '1.00' }] }) })
  assert.deepEqual(await page.evaluate(() => window.grid.getSelectionSnapshot().rows), [])

  const measurements = []
  if (baseline) {
    const relative = baseline.replaceAll('\\', '/').slice(root.replaceAll('\\', '/').length)
    await page.evaluate(async path => { window.baselineGrid = (await import(/* @vite-ignore */ path)).DataGrid }, `${relative}/packages/grid-web/src/components/DataGrid.ts`)
    for (const count of [30_000, 100_000]) for (let repetition = 0; repetition < 3; repetition++) {
      for (const variant of repetition % 2 ? ['feature', 'main'] : ['main', 'feature']) {
        // Reduce cross-sample garbage from previously detached virtualized grids.
        await page.requestGC()
        measurements.push(await page.evaluate(async ({ count, variant, repetition }) => {
          window.grid.remove()
          const Grid = variant === 'main' ? window.baselineGrid : window.featureGrid
          const grid = new Grid()
          grid.style.width = '850px'
          grid.config = { selection: { mode: 'multi-row', rowKey: 'id' } }
          grid.columns = Array.from({ length: 200 }, (_, i) => ({ key: `c${i}`, width: 120, accessor: row => `${row.id}/${i}` }))
          const data = Array.from({ length: count }, (_, id) => ({ id, name: `Property ${id}` }))
          const start = performance.now()
          grid.data = data
          document.querySelector('#host').append(grid)
          await grid.updateComplete
          const loadMs = performance.now() - start
          const viewport = grid.shadowRoot.querySelector('.viewport')
          const scroll = []
          let maxCells = 0
          for (let i = 0; i < 35; i++) {
            const begin = performance.now()
            viewport.scrollTop = (i * 7919 % count) * 36
            viewport.scrollLeft = i * 541 % 23000
            viewport.dispatchEvent(new Event('scroll'))
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
            await grid.updateComplete
            if (i >= 5) scroll.push(performance.now() - begin)
            maxCells = Math.max(maxCells, grid.shadowRoot.querySelectorAll('.cell').length)
          }
          scroll.sort((a, b) => a - b)
          grid.remove()
          return { variant, repetition, count, columns: 200, loadMs, scrollMedianMs: scroll[15], scrollP95Ms: scroll[28], maxCells }
        }, { count, variant, repetition }))
      }
    }
  }
  const external = await page.evaluate(async () => {
    const grid = new window.featureGrid()
    grid.columns = [{ key: 'name' }]
    grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id' } }
    document.querySelector('#host').append(grid)
    const results = []
    for (const totalRows of [352, 30_000, 100_000, 1_000_000_000]) {
      const timings = []
      for (let i = 1; i <= 30; i++) {
        const begin = performance.now()
        grid.setExternalState({ ...window.initial, requestId: totalRows * 100 + i, total: { kind: 'known', totalRows }, rows: Array.from({ length: 20 }, (_, id) => ({ id, name: `Property ${id}` })) })
        await grid.updateComplete
        timings.push(performance.now() - begin)
      }
      timings.sort((a, b) => a - b)
      results.push({ totalRows, loadedRows: 20, medianMs: timings[15], p95Ms: timings[28], mountedRows: grid.shadowRoot.querySelectorAll('.row').length })
    }
    grid.remove()
    return results
  })
  assert.deepEqual(errors, [])
  assert.ok(measurements.every(result => result.maxCells < 1000))
  console.log(JSON.stringify({ browser: browser.version(), correctness: 'PASS', measurements, external }, null, 2))
} finally { await browser.close(); await server.close() }
