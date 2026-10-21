// Run a local Vite server at LITGRID_TEST_URL (default http://127.0.0.1:5174).
// Optional argv[2]: file URL to an installed Playwright module, without a repo dependency.
import assert from 'node:assert/strict'
const { chromium } = await import(process.argv[2] || 'playwright')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${process.env.LITGRID_TEST_URL || 'http://127.0.0.1:5174'}/packages/grid-web/tests/selection.browser.html`)
  await page.locator('body[data-ready="true"]').waitFor()
  const keys = () => page.evaluate(() => window.grid.getSelectionSnapshot().rows.map(row => row.key))
  const first = page.locator('yc-grid .cell[data-row-index="0"][data-column-index="0"]')
  await first.click()
  assert.deepEqual(await keys(), ['uuid-a'])
  await page.evaluate(() => { window.firstSnapshot = window.events.at(-1); window.grid.clearSelection() })
  await first.focus()
  await page.keyboard.press('Enter')
  assert.deepEqual(await keys(), ['uuid-a'])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Control+Space')
  assert.deepEqual(await keys(), ['uuid-a', 'uuid-b'])
  assert.equal(await page.locator('yc-grid [role="row"][aria-selected="true"]').count(), 2)
  const focusBeforeSort = await page.evaluate(() => window.grid.renderRoot.activeElement?.getAttribute('data-row-index'))
  assert.equal(focusBeforeSort, '1')
  await page.evaluate(async () => { window.grid.setFilter({ columnKey: 'name', operator: 'isNotEmpty' }); await window.grid.updateComplete })
  await page.getByRole('button', { name: 'Show column actions', exact: true }).first().click()
  // Use the public header menu; sorting has no imperative Web Component API.
  await page.getByRole('button', { name: 'Sort Asc', exact: true }).click()
  assert.deepEqual(await keys(), ['uuid-a', 'uuid-b'])
  assert.deepEqual(await page.evaluate(() => window.grid.getSelectionSnapshot().rows.map(row => row.rowIndex)), [2, 0])
  await page.evaluate(async () => { window.grid.setQuickSearch('Alpha'); await window.grid.updateComplete })
  assert.deepEqual(await keys(), ['uuid-b'])
  await page.evaluate(async () => { window.grid.clearQuickSearch(); window.grid.clearSelection(); await window.grid.updateComplete })
  const action = page.locator('yc-grid .cell[data-row-index="0"][data-column-index="1"]')
  await action.focus()
  await page.keyboard.press('F2')
  assert.equal(await page.evaluate(() => window.grid.renderRoot.activeElement?.tagName), 'BUTTON')
  await page.keyboard.press('Enter')
  assert.deepEqual(await keys(), [])
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => window.grid.renderRoot.activeElement?.getAttribute('role')), 'gridcell')
  await page.evaluate(() => { window.grid.selectRowByKey('uuid-a'); window.grid.config = { selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-b' } }; window.grid.data = [{ id: 'uuid-a', name: 'Different site' }] })
  assert.deepEqual(await keys(), [])
  assert.deepEqual(await page.evaluate(() => window.firstSnapshot.rows.map(row => row.key)), ['uuid-a'])
  await page.getByRole('button', { name: 'Show column actions', exact: true }).first().click()
  await page.getByRole('button', { name: 'Clear Sort', exact: true }).click()

  const measurements = []
  for (const count of [30_000, 100_000]) {
    measurements.push(await page.evaluate(async count => {
      const grid = window.grid
      grid.clearFilter()
      grid.config = { selection: { mode: 'row', rowKey: 'id', scopeKey: 'benchmark' } }
      const data = Array.from({ length: count }, (_, index) => ({ id: `uuid-${index}`, name: `Property ${index}` }))
      const start = performance.now()
      grid.data = data
      await grid.updateComplete
      const loadAndRenderMs = performance.now() - start
      const timings = []
      for (let i = 0; i < 50; i++) {
        const begin = performance.now()
        grid.selectRowByKey(`uuid-${i}`)
        await grid.updateComplete
        timings.push(performance.now() - begin)
      }
      grid.selectRowByKey(`uuid-${count - 1}`)
      await grid.updateComplete
      const viewport = grid.renderRoot.querySelector('.viewport')
      viewport.scrollTop = viewport.scrollHeight
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await grid.updateComplete
      timings.sort((a, b) => a - b)
      return {
        count, loadAndRenderMs, selectionRenderMedianMs: timings[25], selectionRenderP95Ms: timings[47],
        mountedRows: grid.renderRoot.querySelectorAll('.row').length,
        selectedKey: grid.getSelectionSnapshot().rows[0]?.key,
        lastRowMounted: !!grid.renderRoot.querySelector(`.cell[data-row-index="${count - 1}"]`),
        lastRowAriaSelected: grid.renderRoot.querySelector(`.cell[data-row-index="${count - 1}"]`)?.closest('[role="row"]')?.getAttribute('aria-selected')
      }
    }, count))
    const result = measurements.at(-1)
    assert.ok(result.mountedRows < 50)
    assert.equal(result.selectedKey, `uuid-${count - 1}`)
    assert.equal(result.lastRowMounted, true)
    assert.equal(result.lastRowAriaSelected, 'true')
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ browser: browser.version(), correctness: 'PASS', focusBeforeSort, measurements }, null, 2))
} finally { await browser.close() }
