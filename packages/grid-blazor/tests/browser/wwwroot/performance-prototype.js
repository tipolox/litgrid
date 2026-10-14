// Experimental host module. A consumer would receive this module as a package asset.
import * as adapter from '/_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js';

let grid, baseInputs, staging = null, cancelled = false, observation, pulse;
let nativeParse = JSON.parse, observer;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
const status = text => { document.querySelector('#transfer-status').textContent = text; };
const heap = () => performance.memory?.usedJSHeapSize ?? null;
const visibleCount = () => grid.getTotalRowCount();

export async function initialize(element) {
  grid = element;
  window.performanceResults = [];
  window.performanceReady = true;
  window.prototypeState = () => ({ visible: visibleCount(), staged: staging?.length ?? 0, cancelled });
}

export async function prepare(keys) {
  cancelled = false;
  staging = null;
  baseInputs = {
    config: {}, theme: 'light', ariaLabel: 'Performance experiment', ariaDescription: '',
    screenReaderAnnouncements: false, height: 400, rowHeight: 40, overscan: 4,
    columnOverscan: 2, bestFitSampleSize: 10, quickSearchDebounceThreshold: 10000,
    quickSearchDebounceMs: 150, declarativeColumns: true,
    columns: keys.map(key => ({ key, header: key, width: 120 }))
  };
  const inputs = { ...baseInputs, data: [{ id: -1 }] };
  if (!grid.__experimentInitialized) {
    adapter.initGrid(grid, { invokeMethodAsync: async () => {} }, inputs);
    grid.__experimentInitialized = true;
  } else adapter.updateInputs(grid, inputs);
  await grid.updateComplete;
  await frame();
  await frame();
  status('Ready');
}

export async function startObservation(label) {
  observation = { label, parseMs: 0, decodeMs: 0, parseCalls: 0, maximumParseMs: 0,
    adoptionMs: 0, deferredRenderMs: 0, maxTimerGapMs: 0, timerTicks: 0,
    longTasks: [], heapBefore: heap(), heapPeak: heap(), bytesReceived: 0,
    batches: 0, partialVisibility: false, progressYields: 0, transport: null };
  JSON.parse = function (...args) {
    const timed = label === 'legacy' && typeof args[0] === 'string' && args[0].length > 10000;
    if (!timed) return Reflect.apply(nativeParse, this, args);
    const start = performance.now();
    try { return Reflect.apply(nativeParse, this, args); }
    finally {
      const ms = performance.now() - start;
      observation.parseMs += ms;
      observation.maximumParseMs = Math.max(observation.maximumParseMs, ms);
      observation.parseCalls++;
    }
  };
  observer = new PerformanceObserver(list => {
    for (const task of list.getEntries()) observation.longTasks.push(task.duration);
  });
  observer.observe({ type: 'longtask' });
  let previous = performance.now();
  pulse = setInterval(() => {
    const now = performance.now();
    observation.maxTimerGapMs = Math.max(observation.maxTimerGapMs, now - previous);
    previous = now;
    observation.timerTicks++;
    observation.heapPeak = Math.max(observation.heapPeak ?? 0, heap() ?? 0) || null;
  }, 10);
  observation.start = performance.now();
  observation.cdpBefore = await window.sampleBrowserMetrics?.();
  status('Loading (previous dataset remains visible)');
  await tick();
}

async function adopt(rows) {
  const start = performance.now();
  // The exact shipped adapter and grid engine; no engine/virtualizer changes.
  adapter.updateInputs(grid, { ...baseInputs, data: rows });
  observation.adoptionMs += performance.now() - start;
  const deferred = performance.now();
  await grid.updateComplete;
  await frame();
  await frame();
  observation.deferredRenderMs += performance.now() - deferred;
  observation.adoptedRows = visibleCount();
  status(`Loaded ${rows.length.toLocaleString()} rows`);
}

export async function acceptLegacy(inputs) {
  observation.endpointReachedMs = performance.now() - observation.start;
  await adopt(inputs.data);
}

export function beginTransfer() { staging = []; cancelled = false; }

export async function appendBytes(bytes) {
  if (cancelled) return false;
  if (!(bytes instanceof Uint8Array)) throw new Error('Expected optimized byte[] interop');
  observation.transport = 'Uint8Array';
  observation.bytesReceived += bytes.byteLength;
  observation.batches++;
  let start = performance.now();
  const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  observation.decodeMs += performance.now() - start;
  start = performance.now();
  const rows = nativeParse(json);
  const ms = performance.now() - start;
  observation.parseMs += ms;
  observation.parseCalls++;
  observation.maximumParseMs = Math.max(observation.maximumParseMs, ms);
  for (const row of rows) staging.push(row);
  observation.partialVisibility ||= visibleCount() !== 1 || grid.engine.getRows()[0]?.id !== -1;
  status(`Loading: ${staging.length.toLocaleString()} rows staged`);
  // A browser task boundary, not merely a promise microtask or Task.Yield.
  await tick();
  observation.progressYields++;
  return !cancelled;
}

export async function commitTransfer() {
  if (cancelled) throw new Error('Cancelled transfer must not commit');
  const rows = staging;
  staging = null;
  await adopt(rows);
}

export function abortTransfer() { staging = null; }
export function cancelTransfer() { cancelled = true; status('Cancelled; previous dataset retained'); }

export async function finishObservation() {
  observation.operationElapsedMs = performance.now() - observation.start;
  observation.cdpAfter = await window.sampleBrowserMetrics?.();
  await new Promise(resolve => setTimeout(resolve, 60));
  clearInterval(pulse);
  observer.disconnect();
  JSON.parse = nativeParse;
  observation.heapAfter = heap();
  observation.heapPeak = Math.max(observation.heapPeak ?? 0, observation.heapAfter ?? 0) || null;
  observation.visibleRowsAtEnd = visibleCount();
  delete observation.start;
  return observation;
}

export function saveResult(result) {
  window.performanceResults.push(result);
  document.querySelector('#experiment-result').textContent = JSON.stringify(result);
  window.experimentFinished = true;
}

// Semantic comparison uses actual optimized byte[] interop and actual ordinary interop.
let semanticRows = [];
export function captureLegacy(rows) { semanticRows = rows; }
// Read-only engine inspection for semantic QA; not part of the proposed consumer API.
export function compareAdopted() { return JSON.stringify(grid.engine.getRows()) === JSON.stringify(semanticRows); }
export function failureState() { return { visible: visibleCount(), staged: staging?.length ?? 0 }; }
export function compareBytes(bytes) {
  const parsed = nativeParse(new TextDecoder().decode(bytes));
  return JSON.stringify(parsed) === JSON.stringify(semanticRows);
}

export function compareJsonBytes(bytes, json) {
  return JSON.stringify(nativeParse(new TextDecoder().decode(bytes))) === JSON.stringify(nativeParse(json));
}

export function dispatchControl(bytes) { return bytes?.byteLength ?? 0; }
