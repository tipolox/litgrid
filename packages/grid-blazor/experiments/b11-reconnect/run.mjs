import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const output = process.env.LITGRID_RECONNECT_OUTPUT;
assert.ok(output, 'Choose a fresh evidence path');
await writeFile(output, '', { flag: 'wx' });
const before = process.env.LITGRID_RECONNECT_EXPECT_STALL === '1';
const terminated = process.env.LITGRID_RECONNECT_TERMINATED === '1';
const browser = await chromium.launch({ headless: true, ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const evidence = { before, terminated, browser: browser.version(), checks: [], cycles: [], errors: [], sockets: [] };
const check = (name, value) => { assert.ok(value, name); evidence.checks.push(name); };
try {
  for (const legacy of before || terminated ? [false] : [false, true]) {
    const context = await browser.newContext(), page = await context.newPage();
    page.on('pageerror', error => evidence.errors.push(error.message));
    page.on('websocket', socket => { evidence.sockets.push('open'); socket.on('close', () => evidence.sockets.push('close')); });
    await page.addInitScript(() => {
      const Native = WebSocket; window.testSockets = [];
      window.WebSocket = class extends Native { constructor(...args) { super(...args); window.testSockets.push(this); } };
    });
    const call = (method, ...args) => page.evaluate(({ method, args }) => window.reconnectFixture.invokeMethodAsync(method, ...args), { method, args });
    const wait = async (name, condition, ms = 12000) => {
      const end = Date.now() + ms; let last;
      do { last = await call('Status'); if (condition(last)) return last; await page.waitForTimeout(50); } while (Date.now() < end);
      throw new Error(`${name} deadline; status=${JSON.stringify(last)}; sockets=${JSON.stringify(evidence.sockets)}`);
    };
    const dom = (column, value) => page.waitForFunction(({ column, value }) => {
      const grids = [...document.querySelectorAll('yc-grid')];
      return grids.length === 2 && grids.every(grid => grid.shadowRoot?.querySelector(`.cell[data-row-index="0"][data-column-index="${column}"]`)?.textContent.trim() === value);
    }, { column, value }, { timeout: 12000 });
    const interrupt = async () => {
      await context.setOffline(true);
      await page.evaluate(() => window.testSockets.filter(s => s.url.includes('_blazor') && s.readyState === WebSocket.OPEN).forEach(s => s.close(4001, 'LitGrid fault regression')));
    };
    try {
      await page.goto(process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5271');
      await page.waitForFunction(() => window.reconnectFixture);
      await call('Mount', legacy); await dom(1, 'Employee 1');
      const callbackCounts = await page.evaluate(async () => {
        const api = await import('./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js');
        const grid = document.createElement('yc-grid'); document.body.append(grid);
        let callbacks = 0;
        const helper = { invokeMethodAsync() { callbacks++; return Promise.resolve(); } };
        api.initGrid(grid, helper, { data: [{ id: 1 }], columns: [{ key: 'id' }] });
        api.initGrid(grid, helper, { data: [{ id: 1 }], columns: [{ key: 'id' }] });
        await grid.updateComplete; callbacks = 0;
        const event = () => new CustomEvent('column-state-change', { detail: { reason: 'resize', state: { version: 1, columns: [] } } });
        grid.dispatchEvent(event()); const beforeDispose = callbacks;
        api.disposeGrid(grid); grid.dispatchEvent(event()); grid.remove();
        return { beforeDispose, afterDispose: callbacks };
      });
      check('repeated initialization has one callback and disposal detaches it', callbackCounts.beforeDispose === 1 && callbackCounts.afterDispose === 1);
      await call('Start', 'control', 'connected', false, false);
      await wait('connected refresh', s => s.probes.control?.complete); check('refresh before disconnect', true);
      // Both independently mounted grids must actually display the forced changes.
      await call('Start', 'control-other', 'connected', false, true); await dom(2, 'connected');
      if (terminated) {
        await interrupt(); await page.waitForTimeout(4000); await context.setOffline(false);
        const recovered = await page.evaluate(() => Blazor.reconnect());
        check('expired circuit is rejected', recovered === false); evidence.terminatedReconnect = recovered;
        await page.reload(); await page.waitForFunction(() => window.reconnectFixture); await call('Mount', false); await dom(1, 'Employee 1');
        check('new circuit reload works', true); continue;
      }
      for (let cycle = 0; cycle < (before ? 1 : 3); cycle++) {
        const id = `${legacy}-${cycle}`;
        await call('Start', id, 'lost-' + id, true, false);
        await wait('in-flight refresh', s => s.inFlight > 0);
        await call('Start', id + '-queued', 'queued-' + id, false, false);
        await call('Control', id + '-runtime', 500);
        await call('Notify', 'notified-' + id, 500);
        await call('ScheduleRefresh', id + '-offline', 'offline-' + id, 800);
        await interrupt(); await page.waitForTimeout(6500); await context.setOffline(false);
        check('same retained circuit reconnects', await page.evaluate(() => Blazor.reconnect()) === true);
        const state = await call('Status'); evidence.cycles.push({ legacy, cycle, state });
        check('framework no-token timeout control completes', state.probes[id + '-runtime'].complete && state.probes[id + '-runtime'].error === 'TaskCanceledException');
        if (before) {
          check('pre-fix original refresh remains pending beyond framework timeout', !state.probes[id].complete);
          check('pre-fix queued refresh remains blocked', !state.probes[id + '-queued'].complete);
          await call('Unmount'); await wait('disposal', s => s.probes[id].complete && s.probes[id + '-queued'].complete);
          check('disposal releases subscriptions', (await call('Status')).subscribers === 0); break;
        }
        await wait('failed and queued calls release gate', s => s.probes[id]?.complete && s.probes[id + '-queued']?.complete && s.probes[id + '-offline']?.complete);
        check('refresh started offline releases gate', (await call('Status')).probes[id + '-offline'].complete);
        check('lost call surfaces cancellation', (await call('Status')).probes[id].error?.startsWith('TaskCanceledException'));
        await call('Start', id + '-recovered', 'current-' + id, false, false);
        await call('Start', id + '-other', 'current-' + id, false, true);
        const completed = await wait('refresh after reconnect', s => s.probes[id + '-recovered']?.complete && s.probes[id + '-other']?.complete);
        check('later refresh succeeds on both grids', !completed.probes[id + '-recovered'].error && !completed.probes[id + '-other'].error);
        await dom(2, 'current-' + id); await dom(1, 'notified-' + id); check('both grids display current rows after reconnect', true);
        if (!legacy) { await call('Notify', 'after-' + id, 0); await dom(1, 'after-' + id); check('automatic notifications resume without parent render or refresh', true); }
      }
      if (!before) {
        // Dispose locally on the circuit while a deliberately unacknowledged JS call owns the gate.
        await page.evaluate(async () => {
          const grid = document.querySelector('yc-grid');
          Object.defineProperty(grid, 'data', { configurable: true, set() { throw new Error('reconnect regression setter failure'); } });
          window.restoreData = () => delete grid.data;
        });
        await call('Start', 'setter-fail', 'failed', false, false); await wait('setter error', s => s.probes['setter-fail']?.complete);
        check('unexpected setter failure surfaces', (await call('Status')).probes['setter-fail'].error?.includes('reconnect regression setter failure'));
        await page.evaluate(() => window.restoreData());
        await call('Start', 'setter-retry', 'retry', false, false); await call('Start', 'setter-other', 'retry', false, true); await dom(2, 'retry');
        check('failed setter retries current DOM', true);
        await call('Start', 'dispose-pending', 'dispose', true, false); await wait('pending disposal sync', s => s.inFlight > 0);
        await call('Unmount'); const disposed = await wait('dispose releases waiter', s => s.probes['dispose-pending']?.complete);
        check('disposal with pending synchronization releases all subscriptions', disposed.subscribers === 0);
        await call('Unmount'); check('repeated disposal is safe', true);
        await call('Mount', legacy); await dom(2, 'dispose');
        await call('Start', 'offline-dispose-refresh', 'offline-dispose', true, false);
        await wait('offline disposal owns gate', s => s.inFlight > 0);
        await call('ScheduleUnmount', 500); await interrupt();
        await page.waitForTimeout(6500); await context.setOffline(false);
        check('circuit reconnects during disposal', await page.evaluate(() => Blazor.reconnect()) === true);
        const offlineDisposed = await wait('offline disposal deadline', s => s.probes['offline-dispose']?.complete && s.probes['offline-dispose-refresh']?.complete, 25000);
        check('offline disposal completes and detaches subscriptions', offlineDisposed.subscribers === 0 && !offlineDisposed.probes['offline-dispose'].error);
      }
    } finally { await context.setOffline(false); await context.close(); }
  }
  check('no unhandled browser exceptions', evidence.errors.length === 0);
} catch (error) { evidence.failure = error.stack; process.exitCode = 1; }
finally { await writeFile(output, JSON.stringify(evidence, null, 2)); await browser.close(); }
console.log(JSON.stringify({ checks: evidence.checks.length, cycles: evidence.cycles.length, failure: evidence.failure }));
