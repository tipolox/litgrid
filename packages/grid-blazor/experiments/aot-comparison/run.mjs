import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { cpus, totalmem, platform, release } from 'node:os';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';

const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const browser = await chromium.launch({ headless: true,
  ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const modes = process.env.LITGRID_AOT_MODES?.split(',') ?? ['reflection-array-bytes', 'metadata-array-bytes', 'fast-array-bytes',
  'reflection-array-string', 'fast-with-unused-converter', 'primitive-decimal',
  'primitive-decimal-tryformat-utf8', 'primitive-raw-decimal'];
const repetitions = Number(process.env.LITGRID_AOT_REPETITIONS ?? 10);
const contexts = Number(process.env.LITGRID_AOT_CONTEXTS ?? 3);
const variants = process.env.LITGRID_AOT_VARIANTS?.split(',') ?? ['interpreter','aot'];
const filename = process.env.LITGRID_AOT_OUTPUT ?? 'packages/grid-blazor/experiments/aot-comparison/matched-results.json';
// Fail before sampling if the destination already exists.
await writeFile(filename, '', { flag: 'wx' });
const results = [], startup = [], errors = [];
const environment = { dateUtc: new Date().toISOString(), browser: browser.version(), node: process.version,
  hardware: { cpu: cpus()[0].model, logicalProcessors: cpus().length, physicalMemoryBytes: totalmem(), platform: platform(), osRelease: release() },
  variants, contexts, postWarmupRepetitionsPerContext: repetitions, warmupsPerModePerContext: 1,
  fixtures: { narrow: '1000 x AccountRow10', wide: '300 x AccountRow120' },
  runtime: '8.0.31', target: 'net8.0', sdk: '10.0.401', publishTrimmed: true, trimMode: 'partial',
  methodology: 'Same unchanged Probe.Run; managed elapsed excludes setup and verification; browser gaps include the entire probe; fresh contexts with no-store HTTP and Brotli where published' };
if (variants.includes('development')) environment.developmentControl = 'Existing untrimmed Release development-host artifact; separate from published AOT matrix';
async function save() { await writeFile(filename, JSON.stringify({ environment, startup, results, errors }, null, 2)); }
try {
  for (let contextIndex = 0; contextIndex < contexts; contextIndex++) {
    const order = contextIndex % 2 ? [...variants].reverse() : variants;
    for (const variant of order) {
      for (const [fixture, count] of [['narrow', 1000], ['wide', 300]]) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.addInitScript(() => {
          let ready = false;
          Object.defineProperty(window, 'ready', { get: () => ready,
            set: value => { ready = value; if (value && !window.readyAtMs) window.readyAtMs = performance.now(); } });
          window.probeLongTasks = [];
          new PerformanceObserver(list => { for (const entry of list.getEntries())
            window.probeLongTasks.push({ start: entry.startTime, duration: entry.duration }); }).observe({ type: 'longtask' });
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push({ variant, contextIndex, fixture, error: error.message }));
        page.on('console', message => { if (message.type() === 'error') errors.push({ variant, contextIndex, fixture, error: message.text() }); });
        const port = { interpreter: 5190, aot: 5191, 'stock-interpreter': 5192, 'stock-debug': 5195, development:5196 }[variant];
        const url = `http://127.0.0.1:${port}`;
        await page.goto(url);
        await page.waitForFunction(() => window.ready === true, {}, { timeout: 120000 });
        startup.push({ variant, contextIndex, fixture, ...(await page.evaluate(() => ({
          readyAtMs: window.readyAtMs,
          resources: performance.getEntriesByType('resource').map(r => ({ name: new URL(r.name).pathname,
            transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize,
            durationMs: r.duration }))
        }))) });
        for (let repetition = 0; repetition <= repetitions; repetition++) {
          const offset = (repetition * 3 + contextIndex) % modes.length;
          for (const mode of [...modes.slice(offset), ...modes.slice(0, offset)]) {
            const sample = await page.evaluate(async ({ fixture, mode, count, repetition }) => {
              const gaps = []; let last = performance.now();
              const heartbeat = setInterval(() => { const now = performance.now(); gaps.push(now - last); last = now; }, 10);
              await new Promise(resolve => setTimeout(resolve, 30));
              const started = performance.now();
              const result = JSON.parse(await DotNet.invokeMethodAsync('SerializationInvestigation', 'Run', fixture, mode, count, repetition));
              const invocationMs = performance.now() - started;
              await new Promise(resolve => setTimeout(resolve, 35));
              clearInterval(heartbeat);
              return { ...result, invocationMs, browserMaxTimerGapMs: Math.max(...gaps, 0),
                browserLongTasks: window.probeLongTasks.filter(e => e.start >= started && e.start <= started + invocationMs),
                equivalenceTested: !mode.startsWith('primitive-') };
            }, { fixture, mode, count, repetition });
            assert.equal(sample.runtime, '.NET 8.0.31');
            assert.equal(sample.equivalent, true);
            results.push({ variant, contextIndex, ...sample });
            await save();
          }
          console.log(`${variant} ${fixture} context ${contextIndex + 1} repetition ${repetition}/${repetitions} complete`);
        }
        await context.close();
      }
    }
  }
  assert.deepEqual(errors, []);
} finally { await save(); await browser.close(); }
