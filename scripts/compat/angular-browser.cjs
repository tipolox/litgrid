const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  try {
    await page.goto('http://127.0.0.1:4317', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForFunction(() =>
      window.litgridSmoke?.count() === 2 &&
      document.querySelector('litgrid-data-grid yc-grid')?.shadowRoot?.querySelector('.row'),
      { timeout: 30000 })
    const first = await page.evaluate(() => ({
      count: window.litgridSmoke.count(),
      columns: window.litgridSmoke.columnOrder()
    }))
    if (first.count !== 2 || !first.columns.includes('name')) throw new Error('Initial grid mounting/columns failed: ' + JSON.stringify(first))
    await page.evaluate(() => window.litgridSmoke.select())
    await page.waitForFunction(() => (window.litgridEvents ?? 0) > 0, { timeout: 10000 })
    await page.evaluate(() => window.litgridSmoke.update())
    await page.waitForFunction(() => window.litgridSmoke?.count() === 3 &&
      window.litgridSmoke?.columnOrder().includes('status'), { timeout: 15000 })
    if (errors.length) throw new Error('Browser errors: ' + errors.join('\n'))
    console.log('BROWSER PASS: mount, 2 initial records, selection event, updated inputs, 3 records and changed columns')
  } finally {
    await browser.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
