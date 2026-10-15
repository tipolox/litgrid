import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const browser = await chromium.launch({ headless: true, ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const output = process.env.LITGRID_B11_OUTPUT;
assert.ok(output, 'Choose a fresh output path');
await writeFile(output, '', { flag: 'wx' });
const results = [], errors = [], correctness = [], tracking = [];
const environment = { dateUtc: new Date().toISOString(), browser: browser.version(), host: process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5211', contexts: Number(process.env.LITGRID_B11_CONTEXTS ?? 3), warmRefreshes: Number(process.env.LITGRID_B11_WARM_REFRESHES ?? 0), methodology: 'Release published non-AOT WASM; production serializer, setter and component. Ten business properties plus ignored subscriber count. Setup excluded; completion includes synchronization, updateComplete and two animation frames. Optional equal forced-refresh warmup after cold initial binding; warmup outside measurements. Live managed heap includes the mounted component; not JS or peak memory. No builds during sampling.' };
const save = () => writeFile(output, JSON.stringify({ environment, results, correctness, tracking, errors }, null, 2));
async function open(count, observable, legacy) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(environment.host); await page.waitForFunction(() => window.b11, {}, { timeout: 120000 });
  await page.evaluate(async ({ count, observable, legacy }) => {
    await window.b11.invokeMethodAsync('Prepare', count, observable, legacy);
    await import('./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js');
    window.adoptions = 0;
    const proto = customElements.get('yc-grid').prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'data');
    window.originalData = descriptor;
    Object.defineProperty(proto, 'data', { ...descriptor, set(value) { window.adoptions++; if (window.failNextData) { window.failNextData = false; throw new Error('B11 injected failure'); } descriptor.set.call(this, value); } });
  }, { count, observable, legacy });
  return { context, page };
}
async function sample(page, action, expected = 1) {
  return page.evaluate(async ({ action, expected }) => {
    const before = await window.b11.invokeMethodAsync('Stats'), adoptionBefore = window.adoptions;
    let last = performance.now(); const gaps = [];
    const heartbeat = setInterval(() => { const now = performance.now(); gaps.push(now - last); last = now; }, 10);
    const start = performance.now();
    await window.b11.invokeMethodAsync('Act', action);
    const deadline = start + 120000;
    // Notifications schedule their own render; wait for their transfer rather than rerendering a parent.
    while (expected > 0) {
      const stats = await window.b11.invokeMethodAsync('Progress');
      if (stats.transfers >= before.transfers + expected && stats.inFlight === 0) break;
      if (performance.now() > deadline) throw new Error('Timed out: ' + action);
      await new Promise(r => setTimeout(r, 1));
    }
    let quietMs = 0;
    if (expected === 0) { const quietStart = performance.now(); await new Promise(r => setTimeout(r, 40)); quietMs = performance.now() - quietStart; }
    for (const grid of document.querySelectorAll('yc-grid')) await grid.updateComplete;
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const elapsedMs = performance.now() - start - quietMs;
    const after = await window.b11.invokeMethodAsync('Stats');
    clearInterval(heartbeat);
    const delta = Object.fromEntries(['calls', 'transfers', 'enumerations', 'visits', 'allocated'].map(k => [k, after[k] - before[k]]));
    return { action, elapsedMs, maxGapMs: Math.max(0, ...gaps), ...delta, adoptions: window.adoptions - adoptionBefore, after };
  }, { action, expected });
}
function check(s, expected) {
  assert.equal(s.transfers, expected, `${s.action} transfers`); assert.equal(s.adoptions, expected, `${s.action} adoptions`);
  if (expected === 0) { assert.equal(s.enumerations, 0); assert.equal(s.visits, 0); assert.equal(s.calls, 0); }
}
try {
  for (let contextIndex = 0; contextIndex < environment.contexts; contextIndex++)
    for (const count of [1000, 10000]) for (const observable of [false, true]) for (const legacy of [false, true]) {
      const { context, page } = await open(count, observable, legacy);
      const liveBefore = await page.evaluate(() => window.b11.invokeMethodAsync('Collect'));
      const actions = ['initial', 'unchanged', 'unchanged', 'replacement', ...(observable && !legacy ? ['collection'] : []), ...(!legacy ? ['item', 'burst', 'background'] : []), 'refresh', 'revision', 'unchanged', 'revision-null', ...(observable && !legacy ? ['collection-burst'] : []), 'dispose', 'post-dispose'];
      for (const action of actions) {
        const expected = action === 'dispose' || action === 'post-dispose' || action === 'unchanged' && (!legacy || results.at(-1)?.action === 'revision') ? 0 : 1;
        const s = await sample(page, action, expected);
        // disposal owns separate cleanup interop; dataset work still remains zero.
        if (action === 'dispose') { assert.equal(s.transfers, 0); assert.equal(s.adoptions, 0); assert.equal(s.enumerations, 0); assert.equal(s.after.subscribers, 0); }
        else check(s, expected);
        if (action === 'replacement') assert.equal(s.after.retiredSubscribers, 0);
        if (action === 'initial') {
          s.liveBefore = liveBefore; s.liveMounted = await page.evaluate(() => window.b11.invokeMethodAsync('Collect'));
          assert.equal(s.after.subscribers, legacy ? 0 : count);
        }
        if (action === 'dispose') s.liveDisposed = await page.evaluate(() => window.b11.invokeMethodAsync('Collect'));
        results.push({ contextIndex, count, observable, legacy, ...s }); await save();
        if (action === 'initial') for (let warm = 0; warm < environment.warmRefreshes; warm++) check(await sample(page, 'refresh'), 1);
      }
      if (observable && !legacy) {
        const measurement = await page.evaluate(count => window.b11.invokeMethodAsync('TrackerBench', count), count);
        assert.equal(measurement.subscriptions, count); assert.equal(measurement.remaining, 0);
        tracking.push({ contextIndex, ...measurement }); await save();
      }
      await context.close();
    }
  // Additional correctness uses a fresh small observable grid, without timed build work.
  const { context, page } = await open(8, true, false);
  for (const action of ['initial', 'duplicates', 'remove-duplicate', 'item', 'remove-duplicate', 'item', 'move', 'replace-item', 'remove', 'reset']) {
    const s = await sample(page, action); check(s, 1); correctness.push(s);
  }
  assert.equal(correctness.at(-1).after.subscribers, 0);
  await sample(page, 'replacement');
  check(await sample(page, 'retired', 0), 0);
  const second = await sample(page, 'second'); check(second, 1);
  assert.equal(second.after.subscribers, 16);
  check(await sample(page, 'item', 2), 2);
  await page.evaluate(() => window.b11.invokeMethodAsync('Act', 'delay'));
  const pending = sample(page, 'item', 2);
  await page.waitForFunction(async () => (await window.b11.invokeMethodAsync('Progress')).inFlight > 0);
  await page.evaluate(() => window.b11.invokeMethodAsync('Act', 'burst'));
  await pending; await page.waitForTimeout(100);
  const overlap = await page.evaluate(() => window.b11.invokeMethodAsync('Stats'));
  assert.equal(overlap.first, 'burst 96');
  await sample(page, 'dispose', 0); check(await sample(page, 'post-dispose', 0), 0);
  correctness.push({ scenario: 'multiple grids, overlapping notifications and disposal', passed: true });
  await context.close();
  // Real JS failure is surfaced by the imperative API, then retry uses the same data generation.
  const retry = await open(8, true, false); await sample(retry.page, 'initial');
  await retry.page.evaluate(() => window.failNextData = true);
  assert.equal(await retry.page.evaluate(() => window.b11.invokeMethodAsync('FailRefresh')), true);
  check(await sample(retry.page, 'unchanged'), 1);
  check(await sample(retry.page, 'unchanged', 0), 0);
  correctness.push({ scenario: 'real failed interop followed by parent retry', passed: true });
  await retry.context.close();
  const disposal = await open(8, true, false); await sample(disposal.page, 'initial');
  await disposal.page.evaluate(async () => { await window.b11.invokeMethodAsync('Act', 'delay'); await window.b11.invokeMethodAsync('Act', 'item'); });
  await disposal.page.waitForFunction(async () => (await window.b11.invokeMethodAsync('Progress')).inFlight > 0);
  await sample(disposal.page, 'dispose', 0);
  check(await sample(disposal.page, 'post-dispose', 0), 0);
  const released = await disposal.page.evaluate(() => window.b11.invokeMethodAsync('Stats'));
  assert.equal(released.subscribers, 0);
  correctness.push({ scenario: 'notification synchronization canceled during disposal', passed: true });
  await disposal.context.close();
  // Expected failure is logged by the interop runtime in some hosts.
  const unexpected = errors.filter(error => !error.includes('B11 injected failure'));
  assert.deepEqual(unexpected, []); await save();
  console.log(`PASS: ${results.length} performance observations and ${correctness.length} correctness checks`);
} catch (error) { errors.push(error.stack); await save(); throw error; }
finally { await browser.close(); }
