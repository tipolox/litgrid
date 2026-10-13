import assert from 'node:assert/strict'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

// Keep browser tooling separate from the published wrapper. Install Playwright
// externally or set LITGRID_PLAYWRIGHT_MODULE to an existing module directory.
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright'
const { chromium } = await import(isAbsolute(moduleName)
  ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName)
const browser = await chromium.launch({ headless: true, channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.setDefaultTimeout(30000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('crash', () => errors.push('Browser page crashed'))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const results = []
const baseUrl = process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5186'
const host = page.locator('yc-grid')
const ready = () => page.waitForFunction(() => {
  const grid = document.querySelector('yc-grid')
  return grid?.shadowRoot?.querySelector('.viewport') && typeof grid.getColumnOrder === 'function'
})
const settle = () => page.evaluate(async () => { await document.querySelector('yc-grid')?.updateComplete })
const click = async (id, timeout = 30000) => { await page.locator(`#${id}`).click({ timeout }); await settle() }
const state = () => page.evaluate(() => document.querySelector('yc-grid').getColumnState())
const rowValues = row => host.locator(`.cell[data-row-index="${row}"]`).allTextContents().then(values => values.map(value => value.trim()))
const run = async (name, test) => {
  const start = performance.now()
  await test()
  results.push({ name, milliseconds: Math.round(performance.now() - start), passed: true })
  console.log(`PASS ${name} (${results.at(-1).milliseconds} ms)`)
}
try {
  await page.goto(baseUrl)
  await ready()
  await run('real Blazor JS interop serialization, scalar display and null handling', async () => {
    await page.waitForFunction(() => window.interopRows?.length === 3)
    const rows = await page.evaluate(() => window.interopRows)
    assert.equal(rows[0].id, 2)
    assert.equal(rows[0].name, 'Grace')
    assert.equal(rows[0].department, null)
    assert.equal(rows[0].employee_name, 'Amazing Grace')
    assert.equal(rows[0].salary, 200.5)
    assert.equal(rows[0].joined, '2020-02-01T00:00:00')
    assert.equal('Name' in rows[0], false)
    assert.equal(await page.evaluate(() => document.querySelector('yc-grid').getSelection().mode), 'multi-cell')
    assert.deepEqual(await rowValues(0), ['2', 'Grace', '', '200.5', '2020-02-01T00:00:00', 'Amazing Grace'])
  })
  const sort = async (key, direction) => {
    await host.locator(`[data-column-key="${key}"] .header-action-button`).click()
    await host.getByRole('button', { name: direction === 'ascending' ? 'Sort Asc' : 'Sort Desc', exact: true }).click()
    await settle()
  }
  await run('numeric, string, date sorting and Blazor filtering', async () => {
    await sort('id', 'ascending')
    assert.equal((await rowValues(0))[0], '1')
    await sort('name', 'descending')
    assert.equal((await rowValues(0))[1], 'Katherine')
    await sort('joined', 'ascending')
    assert.equal((await rowValues(0))[4], '2019-01-01T00:00:00')
    await sort('employee_name', 'ascending')
    assert.equal((await rowValues(0))[5], 'Amazing Grace')
    await click('filter')
    await page.waitForFunction(() => document.querySelector('yc-grid').getTotalRowCount() === 1)
    assert.equal((await rowValues(0))[1], 'Ada')
    await click('clear-filter')
    await page.waitForFunction(() => document.querySelector('yc-grid').getTotalRowCount() === 3)
  })
  await run('pointer resizing and reordering, visibility and parent rerenders', async () => {
    await click('basic')
    const handle = host.locator('[data-column-key="name"] .resize-handle')
    const bounds = await handle.boundingBox()
    assert.ok(bounds)
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + 75, bounds.y + bounds.height / 2, { steps: 8 })
    await page.mouse.up()
    await settle()
    const resized = (await state()).columns.find(column => column.key === 'name').width
    assert.ok(resized >= 290)
    const department = await host.locator('[data-column-key="department"] .header-label').boundingBox()
    const id = await host.locator('[data-column-key="id"] .header-label').boundingBox()
    await page.mouse.move(department.x + department.width / 2, department.y + department.height / 2)
    await page.mouse.down()
    await page.mouse.move(id.x + 3, id.y + id.height / 2, { steps: 12 })
    await page.mouse.up()
    await settle()
    assert.equal((await state()).columns[0].key, 'department')
    await page.evaluate(() => document.querySelector('yc-grid').setColumnVisible('department', false))
    const before = await state()
    for (let i = 0; i < 8; i++) await click('rerender')
    assert.deepEqual(await state(), before)
    await click('metadata')
    assert.deepEqual(await state(), before)
    assert.equal(await host.locator('[data-column-key="name"] .header-label').textContent(), 'Person')
  })
  await run('explicit defaults and Order precedence, add/remove and empty schemas', async () => {
    await click('defaults')
    assert.equal((await state()).columns.find(column => column.key === 'name').width, undefined)
    assert.equal((await state()).columns.find(column => column.key === 'department').visible, true)
    await page.evaluate(() => document.querySelector('yc-grid').moveColumn('department', 4))
    await click('reorder')
    assert.equal((await state()).columns[0].key, 'department')
    await click('remove')
    assert.ok(!(await state()).columns.some(column => column.key === 'department'))
    await click('add')
    assert.ok((await state()).columns.some(column => column.key === 'department'))
    await click('empty')
    assert.deepEqual((await state()).columns, [])
    assert.equal(await host.locator('.header-cell').count(), 0)
    assert.equal(await host.locator('.cell').count(), 0)
  })
  await run('programmatic compatibility, legacy inference and same-reference row mutations', async () => {
    await click('programmatic')
    assert.deepEqual((await state()).columns.map(column => column.key), ['id', 'name'])
    assert.deepEqual(await rowValues(0), ['2', 'Grace'])
    await click('mutate')
    await page.waitForFunction(() => document.querySelector('yc-grid').getTotalRowCount() === 4)
    assert.deepEqual(await rowValues(0), ['2', 'Updated Grace'])
    await click('infer')
    assert.ok((await state()).columns.some(column => column.key === 'employee_name'))
    await click('basic')
  })
  await run('persistence across actual disposal and remount', async () => {
    await page.evaluate(() => {
      const grid = document.querySelector('yc-grid')
      grid.setColumnWidth('name', 345)
      grid.moveColumn('name', 0)
      grid.setColumnVisible('department', false)
    })
    const before = await state()
    await click('unmount')
    assert.equal(await host.count(), 0)
    await click('mount')
    await ready()
    assert.deepEqual(await state(), before)
  })
  await run('atomic schema/storage A -> B -> A, unsaved/null views and subsequent user persistence', async () => {
    const saved = await page.evaluate(() => {
      const a = { version: 1, columns: [
        { key: 'name', width: 333, visible: true }, { key: 'id', width: 111, visible: true },
        { key: 'department', width: 180, visible: false }, { key: 'salary', width: 120, visible: true },
        { key: 'joined', width: 220, visible: true }, { key: 'employee_name', width: 150, visible: true }
      ] }
      const b = { version: 1, columns: [
        { key: 'salary', width: 222, visible: true }, { key: 'department', width: 444, visible: false },
        { key: 'obsolete', width: 777, visible: true }, { key: 'id', width: 555, visible: true }
      ] }
      localStorage.setItem('browser-A', JSON.stringify(a))
      localStorage.setItem('browser-B', JSON.stringify(b))
      localStorage.removeItem('browser-C')
      window.storageTransitionEvents = []
      document.querySelector('yc-grid').addEventListener('column-state-change', event => window.storageTransitionEvents.push(event.detail))
      return { a, b }
    })
    const stored = key => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
    await click('view-a')
    assert.deepEqual(await state(), saved.a)
    await click('view-b')
    assert.deepEqual(await stored('browser-A'), saved.a)
    assert.deepEqual(await stored('browser-B'), saved.b)
    assert.deepEqual((await state()).columns, saved.b.columns.filter(column => column.key !== 'obsolete'))
    await click('view-a')
    assert.deepEqual(await state(), saved.a)
    await click('view-c')
    assert.deepEqual((await state()).columns, ['department', 'id', 'salary'].map(key => ({ key, visible: true })))
    assert.equal(await stored('browser-C'), null)
    await click('view-null')
    assert.equal(await page.evaluate(() => document.querySelector('yc-grid').columnStateStorageKey), null)
    await click('view-a')
    assert.deepEqual(await state(), saved.a)
    // The same schema arrives without column metadata when only the key changes.
    await click('view-b')
    await click('key-only-a')
    assert.equal((await state()).columns[0].key, 'id')
    assert.equal((await state()).columns[0].width, 111)
    await click('view-b')
    assert.deepEqual(await page.evaluate(() => window.storageTransitionEvents), [])
    await page.evaluate(() => {
      const grid = document.querySelector('yc-grid')
      grid.setColumnWidth('department', 606)
      grid.moveColumn('id', 0)
      grid.setColumnVisible('department', true)
    })
    await settle()
    assert.deepEqual(await stored('browser-B'), await state())
    assert.deepEqual(await stored('browser-A'), saved.a)
    await click('view-a')
    assert.deepEqual(await state(), saved.a)
    await click('basic')
  })
  await run('keyboard navigation survives parameter and schema updates', async () => {
    const viewport = host.locator('.viewport')
    await viewport.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowRight')
    await settle()
    const active = await viewport.getAttribute('aria-activedescendant')
    assert.ok(active)
    await click('rerender')
    assert.equal(await viewport.getAttribute('aria-activedescendant'), active)
    await click('metadata')
    assert.equal(await viewport.getAttribute('aria-activedescendant'), active)
  })
  await run('30,000 rows, vertical virtualization and frequent parent rerenders', async () => {
    const started = performance.now()
    await page.locator('#large').click({ timeout: 120000 })
    await page.waitForFunction(() => document.querySelector('yc-grid').getTotalRowCount() === 30000, null, { timeout: 120000 })
    await settle()
    console.log(`Large fixture ready in ${Math.round(performance.now() - started)} ms`)
    assert.equal((await state()).columns.length, 6)
    assert.ok(await host.locator('.row').count() < 30)
    assert.ok(await host.locator('.header-cell').count() < 25)
    await page.evaluate(() => {
      const grid = document.querySelector('yc-grid')
      const update = grid.updateColumnSchema.bind(grid)
      window.schemaUpdates = 0
      grid.updateColumnSchema = (...args) => { window.schemaUpdates++; return update(...args) }
    })
    await page.evaluate(async () => {
      const grid = document.querySelector('yc-grid')
      const viewport = grid.shadowRoot.querySelector('.viewport')
      for (let i = 0; i < 25; i++) {
        viewport.scrollTop = i * 35000
        viewport.dispatchEvent(new Event('scroll'))
        await new Promise(requestAnimationFrame)
      }
      await grid.updateComplete
    })
    assert.ok(await host.locator('.row').count() < 30)
    assert.ok(await host.locator('.header-cell').count() < 25)
    assert.ok((await rowValues(0)).length === 0)
    await page.evaluate(() => document.querySelector('yc-grid').setColumnWidth('id', 155))
    const before = await state()
    const rerenderTimes = []
    for (let i = 0; i < 3; i++) {
      const start = performance.now()
      await click('rerender', 120000)
      rerenderTimes.push(Math.round(performance.now() - start))
    }
    console.log('30,000-row parent rerender milliseconds:', JSON.stringify(rerenderTimes))
    assert.equal(await page.evaluate(() => window.schemaUpdates), 0)
    assert.deepEqual(await state(), before)
    const viewport = host.locator('.viewport')
    await viewport.focus()
    await page.keyboard.press('End')
    await page.keyboard.press('ArrowDown')
    await settle()
    const active = await viewport.getAttribute('aria-activedescendant')
    assert.ok(active)
    assert.equal(await host.locator(`[id="${active}"]`).count(), 1)
  })
  await run('120 columns, horizontal virtualization and schema-free scrolling/rerenders', async () => {
    await click('wide')
    assert.equal((await state()).columns.length, 120)
    await page.evaluate(async () => {
      const grid = document.querySelector('yc-grid')
      const update = grid.updateColumnSchema.bind(grid)
      window.schemaUpdates = 0
      grid.updateColumnSchema = (...args) => { window.schemaUpdates++; return update(...args) }
      const viewport = grid.shadowRoot.querySelector('.viewport')
      for (let i = 0; i < 25; i++) {
        viewport.scrollLeft = i * 450
        viewport.dispatchEvent(new Event('scroll'))
        await new Promise(requestAnimationFrame)
      }
      await grid.updateComplete
      grid.setColumnWidth('id', 155)
    })
    assert.ok(await host.locator('.header-cell').count() < 25)
    const before = await state()
    for (let i = 0; i < 8; i++) await click('rerender')
    assert.deepEqual(await state(), before)
    assert.equal(await page.evaluate(() => window.schemaUpdates), 0)
    const viewport = host.locator('.viewport')
    await viewport.focus()
    await page.keyboard.press('End')
    await settle()
    const active = await viewport.getAttribute('aria-activedescendant')
    assert.ok(active)
    assert.equal(await host.locator(`[id="${active}"]`).count(), 1)
  })
  await run('rapid scenario changes and mobile page overflow', async () => {
    for (const id of ['empty', 'basic', 'remove', 'add', 'unmount', 'mount', 'programmatic', 'infer', 'basic']) await click(id)
    await ready()
    await page.setViewportSize({ width: 375, height: 812 })
    await settle()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  })
  await run('navigation during a delayed real module import and subsequent remount', async () => {
    const navigation = await browser.newPage()
    navigation.on('pageerror', error => errors.push(error.message))
    navigation.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    let release
    let requested
    const blocked = new Promise(resolve => { release = resolve })
    const importRequested = new Promise(resolve => { requested = resolve })
    const pattern = '**/_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js'
    try {
      await navigation.route(pattern, async route => { requested(); await blocked; await route.continue() })
      await navigation.goto(baseUrl)
      await importRequested
      await navigation.locator('#unmount').click()
      await navigation.waitForFunction(() => !document.querySelector('yc-grid'))
      const response = navigation.waitForResponse(response => response.url().endsWith('/litgrid-blazor.js'))
      release()
      await response
      await navigation.unroute(pattern)
      await navigation.locator('#mount').click()
      await navigation.waitForFunction(() => document.querySelector('yc-grid')?.shadowRoot?.querySelector('.cell'))
      for (let i = 0; i < 5; i++) {
        await navigation.locator('#unmount').click()
        await navigation.locator('#mount').click()
      }
      await navigation.waitForFunction(() => document.querySelector('yc-grid')?.shadowRoot?.querySelector('.cell'))
    } finally {
      release()
      await navigation.close()
    }
  })
  // Run the optional full transfer last: clearing only the schema afterwards
  // would intentionally resend the same expensive row data under legacy semantics.
  if (process.env.LITGRID_BROWSER_STRESS === '1') {
    await run('combined 30,000-row / 120-column serialization stress', async () => {
      await click('stress', 300000)
      assert.equal((await state()).columns.length, 120)
      assert.equal(await page.evaluate(() => document.querySelector('yc-grid').getTotalRowCount()), 30000)
      assert.ok(await host.locator('.row').count() < 30)
      assert.ok(await host.locator('.header-cell').count() < 25)
      const before = await state()
      await click('rerender', 300000)
      assert.deepEqual(await state(), before)
    })
  }
  await run('no unexpected browser console errors', async () => assert.deepEqual(errors, []))
  console.log(JSON.stringify({ results, errors }, null, 2))
} catch (error) {
  const body = await page.locator('body').innerText({ timeout: 1000 }).catch(() => null)
  console.error('Browser diagnostics:', JSON.stringify({ errors, body }))
  if (process.env.LITGRID_BROWSER_SCREENSHOT) await page.screenshot({ path: process.env.LITGRID_BROWSER_SCREENSHOT, timeout: 1000 }).catch(() => {})
  throw error
} finally {
  await browser.close()
}
