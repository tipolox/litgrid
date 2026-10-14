import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const browser = await chromium.launch({ headless: true,
  ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const defaultModes = [
  'reflection-array-bytes', 'reflection-fresh-array-bytes', 'reflection-envelope-bytes',
  'reflection-dictionary-bytes', 'reflection-array-string', 'metadata-array-bytes',
  'fast-array-bytes', 'fast-envelope-bytes', 'reflection-whole-writer', 'metadata-whole-writer',
  'fast-whole-writer', 'reflection-row-writer', 'metadata-row-writer', 'fast-row-writer',
  'primitive-decimal', 'primitive-double', 'primitive-raw-decimal', 'primitive-reflection-getters'
];
const modes = process.env.LITGRID_SERIALIZATION_MODES?.split(',') ?? defaultModes;
const fixtures = process.env.LITGRID_SERIALIZATION_FIXTURES?.split(',') ?? ['narrow', 'wide'];
const output = process.env.LITGRID_SERIALIZATION_OUTPUT ?? 'packages/grid-blazor/experiments/serialization-investigation/results.json';
const results = [], errors = [];
const environment = { dateUtc: new Date().toISOString(), browser: browser.version(), node: process.version,
  host: 'Release net8.0 WebAssembly; RunAOTCompilation unset', sdk: '10.0.401',
  methodology: '1 excluded warmup per mode; 3 measured rotated-order repetitions per fixture; no dataset interop, parse, render or task yields within timed managed sections' };
try {
  for (const [fixture, count] of [['narrow', 1000], ['wide', 300]].filter(([fixture]) => fixtures.includes(fixture))) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5188');
    await page.waitForFunction(() => window.ready === true);
    for (let repetition = 0; repetition <= 3; repetition++) {
      const offset = repetition * 5 % modes.length;
      const order = [...modes.slice(offset), ...modes.slice(0, offset)];
      for (const mode of order) {
        const sample = await page.evaluate(async ({ fixture, mode, count, repetition }) =>
          JSON.parse(await DotNet.invokeMethodAsync('SerializationInvestigation', 'Run', fixture, mode, count, repetition)),
          { fixture, mode, count, repetition });
        assert.equal(sample.equivalent, true);
        results.push(sample);
        await writeFile(output, JSON.stringify({ environment, results, errors }, null, 2));
        console.log(`${fixture} ${mode} #${repetition}: ${sample.elapsedMs.toFixed(1)} ms; ${sample.allocatedBytes} B; GC ${sample.gcCollections}`);
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
