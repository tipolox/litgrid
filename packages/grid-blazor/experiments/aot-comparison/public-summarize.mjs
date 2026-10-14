import { readFile, writeFile } from 'node:fs/promises';
const root='packages/grid-blazor/experiments/aot-comparison';
const input=process.argv[2] ?? 'public-component-results.json';
const data=JSON.parse(await readFile(`${root}/${input}`,'utf8'));
const median=values=>{const v=[...values].sort((a,b)=>a-b),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;};
const p95=values=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1];
const cells=[];
for(const variant of ['interpreter','aot']) for(const fixture of ['A','B']) {
  const rows=data.results.filter(r=>r.repetition>0&&r.variant===variant&&r.fixture===fixture);
  cells.push({variant,fixture,count:rows.length,medianMs:median(rows.map(r=>r.elapsedMs)),p95Ms:p95(rows.map(r=>r.elapsedMs)),maxMs:Math.max(...rows.map(r=>r.elapsedMs)),
    medianAllocatedBytes:median(rows.map(r=>r.allocatedBytes)),p95TimerGapMs:p95(rows.map(r=>r.browserMaxTimerGapMs)),maxTimerGapMs:Math.max(...rows.map(r=>r.browserMaxTimerGapMs)),
    longTaskCount:rows.reduce((sum,r)=>sum+r.longTasks.length,0),gcCollections:rows.reduce((sum,r)=>sum+r.gcCollections.reduce((a,b)=>a+b,0),0)});
}
const startup=['interpreter','aot'].map(variant=>{const rows=data.startup.filter(r=>r.variant===variant);return {variant,count:rows.length,medianReadyMs:median(rows.map(r=>r.readyAtMs)),
  minReadyMs:Math.min(...rows.map(r=>r.readyAtMs)),maxReadyMs:Math.max(...rows.map(r=>r.readyAtMs)),
  medianEncodedResourceBytes:median(rows.map(r=>r.resources.reduce((s,v)=>s+v.encodedBodySize,0)))};});
const summary={environment:data.environment,cells,startup,errors:data.errors};
await writeFile(`${root}/${input.replace(/\.json$/,'-summary.json')}`,JSON.stringify(summary,null,2),{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
