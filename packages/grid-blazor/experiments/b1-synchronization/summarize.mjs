import { readFile, writeFile } from 'node:fs/promises';
const folder = new URL('./',import.meta.url);
const names=process.argv.slice(2);
if(!names.length)names.push('baseline-final-results.json','complete-results.json','server-results.json');
const median=values=>{const sorted=values.toSorted((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;};
const groups=[];
for(const name of names){
  const file=JSON.parse(await readFile(new URL(name,folder),'utf8'));
  for (const row of file.results) row.phase = row.token == null || row.token < 13 ? 'primary' : row.token < 15 ? 'null-transition' : 'versioned-transition';
  const keys=[...new Set(file.results.map(r=>`${r.fixture}|${r.mode}|${r.action}|${r.phase}`))];
  for(const key of keys){
    const [fixture,mode,action,phase]=key.split('|'),samples=file.results.filter(r=>r.fixture===fixture&&r.mode===mode&&r.action===action&&r.phase===phase);
    const numeric=['elapsedMs','calls','transfers','adoptions','columns','configurations','enumerations','visits','allocated','maxTimerGapMs'];
    groups.push({source:name,variant:file.environment.variant,fixture,mode,action,phase,n:samples.length,
      ...Object.fromEntries(numeric.filter(k=>samples.every(s=>typeof s[k]==='number')).map(k=>[k,{median:median(samples.map(s=>s[k])),max:Math.max(...samples.map(s=>s[k]))}])),
      longTaskCount:samples.reduce((sum,s)=>sum+(s.longTasks?.length??0),0)});
  }
}
const output = new URL('summary.json',folder);
await writeFile(output,JSON.stringify(groups,null,2),{flag:'wx'});
for(const row of groups.filter(g=>g.mode==='versioned'&&g.phase==='primary'&&['initial','unchanged','columns','config','scalar'].includes(g.action)))
  console.log(`${row.variant} ${row.fixture} ${row.action}: ${row.elapsedMs?.median.toFixed(1)} ms; transfer ${row.transfers?.median}; gap max ${row.maxTimerGapMs?.max.toFixed(1)} ms`);
