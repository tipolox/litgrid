import { readFile, writeFile } from 'node:fs/promises';
const paths = process.argv.slice(2);
const files = await Promise.all(paths.map(path => readFile(path, 'utf8').then(JSON.parse)));
const median = xs => { const v = xs.toSorted((a, b) => a - b); return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; };
const summary = files.map((file, i) => {
  const groups = new Map();
  for (const r of file.results) {
    const key = JSON.stringify({ count: r.count, observable: r.observable, legacy: r.legacy, action: r.action });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const performance = [...groups].map(([key, rows]) => ({ ...JSON.parse(key), samples: rows.length,
    elapsedMedianMs: median(rows.map(r => r.elapsedMs)), elapsedMinMs: Math.min(...rows.map(r => r.elapsedMs)), elapsedMaxMs: Math.max(...rows.map(r => r.elapsedMs)),
    maxGapMedianMs: median(rows.map(r => r.maxGapMs)),
    transfers: [...new Set(rows.map(r => r.transfers))], adoptions: [...new Set(rows.map(r => r.adoptions))], enumerations: [...new Set(rows.map(r => r.enumerations))] }));
  const tracking = [1000, 10000].map(count => {
    const rows = file.tracking.filter(r => r.count === count);
    return { count, samples: rows.length, ...Object.fromEntries(['setupMs', 'disposalMs', 'allocated', 'retained', 'afterDispose', 'remaining'].map(key => [key, median(rows.map(r => r[key]))])) };
  });
  return { input: paths[i], environment: file.environment, observations: file.results.length, correctness: file.correctness.length, errors: file.errors, performance, tracking };
});
await writeFile(process.env.LITGRID_B11_SUMMARY ?? new URL('./summary.json', import.meta.url), JSON.stringify(summary, null, 2), { flag: 'wx' });
console.log('Summary saved');
