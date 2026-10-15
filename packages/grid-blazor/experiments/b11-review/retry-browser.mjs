import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const output = process.env.LITGRID_REVIEW_OUTPUT;
assert.ok(output, 'Choose a fresh result path'); await writeFile(output, '', { flag: 'wx' });
const browser = await chromium.launch({ headless: true, ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const page = await browser.newPage(); const results = [];
try {
  await page.goto(process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5221');
  for (const scenario of ['scalar/config reversion', 'omitted uncertain fields', 'inference reversion', 'schema omission', 'persistence reversion', 'explicit null namespace', 'latest programmatic schema']) {
    results.push(await page.evaluate(async scenario => {
      const api = await import('./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js');
      const grid = document.createElement('yc-grid'); document.body.append(grid);
      const original = { data: [{ id: 1, name: 'Ada' }], columns: [{ key: 'id', header: 'ID' }, { key: 'name', header: 'Name' }], declarativeColumns: scenario !== 'inference reversion', config: { selection: { mode: 'cell' } }, theme: 'light', ariaLabel: 'Original', ariaDescription: '', screenReaderAnnouncements: true, height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10, quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150, columnStateStorageKey: 'A' };
      api.initGrid(grid, { invokeMethodAsync: () => Promise.resolve() }, original); await grid.updateComplete;
      const proto = Object.getPrototypeOf(grid), descriptor = Object.getOwnPropertyDescriptor(proto, 'config');
      let failure = false;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      try {
        if (scenario === 'latest programmatic schema') {
          api.updateInputs(grid, { declarativeColumns: false, columns: [{ key: 'name', header: 'Programmatic' }] });
          api.updateInputs(grid, { declarativeColumns: true, columnStateStorageKey: 'B' });
        } else if (scenario === 'schema omission') {
          const helper = grid.updateColumnSchema.bind(grid);
          grid.updateColumnSchema = (...args) => { helper(...args); throw new Error('injected schema'); };
          try { api.updateInputs(grid, { columns: [{ key: 'id', header: 'Changed' }] }); } catch (e) { check(e.message.includes('injected'), e.message); failure = true; }
          grid.updateColumnSchema = helper;
          api.updateInputs(grid, { ariaDescription: 'Retry' });
        } else {
          Object.defineProperty(grid, 'config', { configurable: true, get() { return descriptor.get.call(this); }, set(value) { descriptor.set.call(this, value); throw new Error('injected config'); } });
          const changed = scenario === 'inference reversion' ? { declarativeColumns: true, columns: [{ key: 'id' }] }
            : scenario.includes('namespace') || scenario === 'persistence reversion' ? { columns: [{ key: 'name', header: 'Changed' }], columnStateStorageKey: 'B' } : { ariaLabel: 'Changed' };
          try { api.updateInputs(grid, { ...changed, config: { selection: { mode: 'row' } } }); } catch (e) { check(e.message.includes('injected'), e.message); failure = true; }
          delete grid.config;
          const retry = scenario === 'omitted uncertain fields' ? { ariaDescription: 'Retry' }
            : scenario === 'inference reversion' ? { declarativeColumns: false, columns: [], config: original.config }
            : scenario === 'persistence reversion' || scenario.includes('namespace') ? { ...original, columnStateStorageKey: scenario.includes('namespace') ? null : 'A' }
            : { ariaLabel: 'Original', config: original.config };
          api.updateInputs(grid, retry);
        }
        await grid.updateComplete;
        check(failure || scenario === 'latest programmatic schema', 'expected injected failure did not propagate');
        check(grid.ariaLabel === 'Original', `ariaLabel=${grid.ariaLabel}`);
        check(grid.shadowRoot.querySelector('.viewport').getAttribute('aria-label') === 'Original', 'DOM aria-label did not recover');
        check(grid.inferColumns === !original.declarativeColumns, 'inference did not recover');
        check(grid.getSelection().mode === 'cell', 'configuration did not recover');
        check(grid.shadowRoot.querySelectorAll('.header-cell').length === (scenario === 'latest programmatic schema' ? 1 : 2), 'schema did not recover');
        check(grid.shadowRoot.querySelectorAll('.cell')[scenario === 'latest programmatic schema' ? 0 : 1].textContent.includes('Ada'), 'displayed rows did not recover');
        check(grid.columnStateStorageKey === (scenario === 'latest programmatic schema' ? 'B' : scenario.includes('namespace') ? null : 'A'), 'namespace did not recover');
        return { scenario, passed: true };
      } catch (error) { return { scenario, passed: false, error: error.message }; }
      finally { api.disposeGrid(grid); grid.remove(); }
    }, scenario));
  }
  await writeFile(output, JSON.stringify({ results, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length }, null, 2));
  console.log(results);
  if (results.some(r => !r.passed) && process.env.LITGRID_REVIEW_EXPECT_FAILURE !== '1') throw new Error('Retry browser regression failed');
} finally { await browser.close(); }
