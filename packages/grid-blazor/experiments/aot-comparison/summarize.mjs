import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
const root = 'packages/grid-blazor/experiments/aot-comparison';
const input = process.argv[2] ?? 'matched-results.json';
const data = JSON.parse(await readFile(join(root, input), 'utf8'));
const quantile = (values, p) => [...values].sort((a,b) => a-b)[Math.max(0, Math.ceil(values.length * p)-1)];
const median = values => { const sorted = [...values].sort((a,b) => a-b); const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2; };
const keys = [...new Set(data.results.filter(r => r.repetition > 0).map(r => `${r.variant}/${r.fixture}/${r.mode}`))];
const cells = keys.map(key => {
  const [variant, fixture, mode] = key.split('/');
  const rows = data.results.filter(r => r.repetition > 0 && r.variant === variant && r.fixture === fixture && r.mode === mode);
  return { variant, fixture, mode, count: rows.length, contexts: [...new Set(rows.map(r => r.contextIndex))].length,
    medianMs: median(rows.map(r => r.elapsedMs)), p95Ms: quantile(rows.map(r => r.elapsedMs), .95), maxMs: Math.max(...rows.map(r => r.elapsedMs)),
    medianAllocatedBytes: median(rows.map(r => r.allocatedBytes)), gcCollections: rows.reduce((sum,r) => sum + r.gcCollections.reduce((a,b) => a+b,0),0),
    medianInvocationMs: median(rows.map(r => r.invocationMs)), p95TimerGapMs: quantile(rows.map(r => r.browserMaxTimerGapMs), .95),
    maxTimerGapMs: Math.max(...rows.map(r => r.browserMaxTimerGapMs)), longTaskCount: rows.reduce((sum,r) => sum + r.browserLongTasks.length,0),
    contextMediansMs: [...new Set(rows.map(r => r.contextIndex))].map(index => ({ index, medianMs: median(rows.filter(r => r.contextIndex === index).map(r => r.elapsedMs)) })) };
});
const variants = data.environment.variants ?? ['interpreter','aot'];
const comparisons = cells.filter(c => c.variant === variants[0]).map(c => {
  const target = cells.find(a => a.variant === variants[1] && a.fixture === c.fixture && a.mode === c.mode);
  return { fixture: c.fixture, mode: c.mode, baseline: variants[0], comparison: variants[1], baselineMedianMs: c.medianMs, comparisonMedianMs: target?.medianMs,
    speedup: target ? c.medianMs/target.medianMs : null, reductionPercent: target ? (1-target.medianMs/c.medianMs)*100 : null };
});
const startup = variants.map(variant => {
  const rows = data.startup.filter(r => r.variant === variant);
  return { variant, count: rows.length, medianReadyMs: median(rows.map(r => r.readyAtMs)),
    minReadyMs: Math.min(...rows.map(r => r.readyAtMs)), maxReadyMs: Math.max(...rows.map(r => r.readyAtMs)),
    medianEncodedResourceBytes: median(rows.map(r => r.resources.reduce((sum,v) => sum+v.encodedBodySize,0))),
    medianTransferResourceBytes: median(rows.map(r => r.resources.reduce((sum,v) => sum+v.transferSize,0))),
    medianDecodedResourceBytes: median(rows.map(r => r.resources.reduce((sum,v) => sum+v.decodedBodySize,0))) };
});
async function files(directory, base=directory) {
  let all=[];
  for(const name of await readdir(directory)) { const path=join(directory,name), info=await stat(path);
    if(info.isDirectory()) all.push(...await files(path,base)); else all.push({ name: path.slice(base.length+1), bytes: info.size }); }
  return all;
}
const artifacts=[];
for(const variant of variants) {
  const directory = variant === 'development' ? join(root,'../serialization-investigation/bin/Release/net8.0/wwwroot') : join(root,'bin',variant,'wwwroot');
  const list=await files(directory);
  artifacts.push({ variant, uncompressedArtifactBytes: list.filter(f => !/\.(br|gz)$/.test(f.name)).reduce((s,f) => s+f.bytes,0),
    files: list });
}
const summary = { environment: data.environment, cells, comparisons, startup, artifacts, errors: data.errors };
const filename = input.replace(/\.json$/, '-summary.json');
await writeFile(join(root, filename), JSON.stringify(summary,null,2), {flag:'wx'});
console.log(JSON.stringify({ comparisons, startup, errors: data.errors }, null,2));
