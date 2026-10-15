import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const output = process.env.LITGRID_REVIEW_OUTPUT; assert.ok(output); await writeFile(output, '', { flag: 'wx' });
const browser = await chromium.launch({ headless: true, ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const results = [], errors = [];
try {
  for (const observable of [false, true]) for (const legacy of [false, true]) {
    const context = await browser.newContext(), page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.LITGRID_BROWSER_URL); await page.waitForFunction(() => window.b11, {}, { timeout: 120000 });
    await page.evaluate(async ({ observable, legacy }) => {
      await window.b11.invokeMethodAsync('Prepare', 8, observable, legacy);
      await import('./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js');
      const proto = customElements.get('yc-grid').prototype, descriptor = Object.getOwnPropertyDescriptor(proto, 'data');
      window.adoptions = 0;
      Object.defineProperty(proto, 'data', { ...descriptor, set(value) { window.adoptions++; descriptor.set.call(this, value); } });
    }, { observable, legacy });
    const actions = [['initial', 1], ['unchanged', legacy ? 1 : 0], ['replacement', 1], ['refresh', 1], ['revision', 1], ['unchanged', 0], ['item', legacy ? 0 : 1], ['refresh', 1], ['burst', legacy ? 0 : 1], ['background', legacy ? 0 : 1], ...(observable ? [['collection-burst', legacy ? 0 : 1]] : []), ['revision-null', 1], ['unchanged', legacy ? 1 : 0], ['dispose', 0], ['post-dispose', 0]];
    for (const [action, expected] of actions) {
      const result = await page.evaluate(async ({ action, expected }) => {
        const before = await window.b11.invokeMethodAsync('Stats'), adoptions = window.adoptions;
        await window.b11.invokeMethodAsync('Act', action);
        const deadline = performance.now() + 15000;
        while (expected) {
          const progress = await window.b11.invokeMethodAsync('Progress');
          if (progress.transfers >= before.transfers + expected && progress.inFlight === 0) break;
          if (performance.now() > deadline) throw new Error('Synchronization deadline: ' + action);
          await new Promise(r => setTimeout(r, 1));
        }
        await new Promise(r => setTimeout(r, 30));
        const grid = document.querySelector('yc-grid'); if (grid) await grid.updateComplete;
        const after = await window.b11.invokeMethodAsync('Stats');
        const nameColumn = grid?.getVisibleColumnKeys().indexOf('name');
        const text = grid?.shadowRoot?.querySelector(`.cell[data-row-index="0"][data-column-index="${nameColumn}"]`)?.textContent;
        return { action, transfers: after.transfers - before.transfers, adoptions: window.adoptions - adoptions, enumerations: after.enumerations - before.enumerations, visits: after.visits - before.visits, text, first: after.first, subscribers: after.subscribers, retired: after.retiredSubscribers };
      }, { action, expected });
      assert.equal(result.transfers, expected, action); assert.equal(result.adoptions, expected, action);
      if (expected === 0) { assert.equal(result.enumerations, 0); assert.equal(result.visits, 0); }
      if (expected) assert.ok(typeof result.text === 'string' && result.text.includes(result.first), 'actual DOM rows');
      if (action === 'replacement') assert.equal(result.retired, 0);
      if (action === 'dispose') assert.equal(result.subscribers, 0);
      results.push({ observable, legacy, ...result });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${results.length} small-source mode/revision/refresh/notification/disposal checks`);
} catch (error) { errors.push(error.stack); throw error; }
finally { await writeFile(output, JSON.stringify({ results, errors }, null, 2)); await browser.close(); }
