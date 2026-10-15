import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const name = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(name) ? pathToFileURL(`${name}/index.mjs`).href : name);
const browser = await chromium.launch({ headless: true, channel: 'chromium',
  ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const results = [];
const errors = [];
const output = process.env.LITGRID_PERFORMANCE_OUTPUT ?? 'packages/grid-blazor/tests/browser/Performance/results.json';
const selected = (process.env.LITGRID_PERFORMANCE_WORKLOADS ?? 'A,B,C,D').split(',').filter(Boolean);
const modes = (process.env.LITGRID_PERFORMANCE_MODES ?? 'legacy,prototype').split(',');
const url = `${process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5186'}/?performance`;

async function session() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.exposeFunction('sampleBrowserMetrics', async () => {
    const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const heap = await cdp.send('Runtime.getHeapUsage');
    return { taskDurationSeconds: metrics.TaskDuration, scriptDurationSeconds: metrics.ScriptDuration,
      jsHeapUsedBytes: heap.usedSize, jsHeapTotalBytes: heap.totalSize,
      backingStorageBytes: heap.backingStorageSize, embedderHeapUsedBytes: heap.embedderHeapUsedSize };
  });
  await page.goto(url);
  await page.waitForFunction(() => window.performanceReady === true);
  return { context, page };
}

async function run(page, button, timeout = 240000) {
  await page.evaluate(() => { window.experimentFinished = false; });
  await page.locator(`#${button}`).click();
  await page.waitForFunction(() => window.experimentFinished, { }, { timeout });
  const result = await page.evaluate(() => window.performanceResults.at(-1));
  assert.equal(result.error, undefined, result.error);
  results.push(result);
  await writeFile(output, JSON.stringify({ environment, results, errors }, null, 2));
  return result;
}

const environment = { dateUtc: new Date().toISOString(), browser: browser.version(), node: process.version,
  platform: process.platform, build: process.env.LITGRID_PERFORMANCE_HOST ?? 'Release net8.0 Blazor WebAssembly, interpreter (no AOT)',
  viewport: '1280x900 headless Chromium', batches: { targetBytes: 65536, maxRows: 128, maxRowBytes: 1048576, targetSliceMs: 8 } };

try {
  await mkdir(new URL('.', pathToFileURL(`${process.cwd()}/${output}`)), { recursive: true });
  for (const workload of selected) {
    for (const mode of modes) {
      const { context, page } = await session();
      await page.locator('#workload').selectOption(workload);
      const repeats = workload === 'D' ? 1 : 2;
      for (let i = 0; i < repeats; i++) {
        const result = await run(page, mode === 'legacy' ? 'baseline' : 'prototype', workload === 'D' ? 600000 : 240000);
        assert.equal(result.cancelled, false);
        assert.equal(result.browser.visibleRowsAtEnd, result.rows);
        if (mode === 'prototype') {
          assert.equal(result.browser.partialVisibility, false);
          assert.equal(result.browser.transport, 'Uint8Array');
          assert.equal(result.managed.rows, result.rows);
        }
        console.log(`${workload} ${mode} run ${i + 1}: ${result.browser.operationElapsedMs.toFixed(1)} ms; gap ${result.browser.maxTimerGapMs.toFixed(1)} ms`);
      }
      await context.close();
    }
  }
  if (process.env.LITGRID_SKIP_COMPATIBILITY !== '1') {
    const { context, page } = await session();
    const dispatch = await run(page, 'dispatch-control');
    console.log(`Dispatch: ${dispatch.samples.length} controls completed`);
    const compatibility = await run(page, 'compatibility');
    assert.ok(compatibility.checks.every(check => check.passed));
    console.log(`Compatibility: ${compatibility.checks.length} checks passed`);
    // Cancel using a real browser UI event once one or more batches have staged.
    await page.locator('#workload').selectOption('C');
    await page.evaluate(() => {
      window.experimentFinished = false;
      window.loadingAnimationSamples = 0;
      const observeFrame = () => {
        if (window.experimentFinished) return;
        if (document.querySelector('#transfer-status').textContent.startsWith('Loading:')) window.loadingAnimationSamples++;
        requestAnimationFrame(observeFrame);
      };
      requestAnimationFrame(observeFrame);
    });
    await page.locator('#prototype').click();
    await page.waitForFunction(() => window.prototypeState().staged > 0);
    if (process.env.LITGRID_LOADING_SCREENSHOT) {
      await page.screenshot({ path: process.env.LITGRID_LOADING_SCREENSHOT });
    }
    const clickStart = performance.now();
    await page.locator('#cancel-transfer').click();
    await page.waitForFunction(() => window.experimentFinished);
    const cancelled = await page.evaluate(() => window.performanceResults.at(-1));
    const state = await page.evaluate(() => window.prototypeState());
    assert.equal(cancelled.cancelled, true);
    assert.equal(state.visible, 1);
    assert.equal(state.staged, 0);
    cancelled.cancelClickToCompletionMs = performance.now() - clickStart;
    cancelled.cleanupState = state;
    cancelled.loadingAnimationSamples = await page.evaluate(() => window.loadingAnimationSamples);
    results.push(cancelled);
    console.log(`Cancellation: ${cancelled.cancelClickToCompletionMs.toFixed(1)} ms, old dataset retained`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(output, JSON.stringify({ environment, results, errors }, null, 2));
  await browser.close();
}
