import fs from 'node:fs'
const dir='docs/release/evidence/v1.2.0'
const runs=['v120-performance.json','v120-performance-repeat.json','v120-performance-profile.json'].map(f=>JSON.parse(fs.readFileSync(`${dir}/${f}`)))
const stats=a=>{a=a.toSorted((a,b)=>a-b);return {n:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],min:a[0],max:a.at(-1)}}
const samples=runs.flatMap(r=>r.samples),summary={local:[],gc:[],external:[],core:runs[2].coreControl.map(s=>({...s,ms:stats(s.ms)})),cpu:runs[2].cpu}
for(const rows of [30000,100000])for(const columns of [120,200])for(const variant of ['v110','candidate']){const s=samples.filter(s=>s.count===rows&&s.columns===columns&&s.variant===variant);summary.local.push({rows,columns,variant,adopt:stats(s.map(s=>s.adoptMs)),frameWait:stats(s.map(s=>s.firstPaintWaitMs)),scroll:stats(s.flatMap(s=>s.scrollMs)),selection:stats(s.flatMap(s=>s.selectionMs)),heap:stats(s.map(s=>s.heapUsed)),maxCells:Math.max(...s.map(s=>s.maxCells))})}
for(const variant of ['v110','candidate'])for(const gc of ['forced','natural']){const s=samples.filter(s=>s.variant===variant&&s.gc===gc);summary.gc.push({variant,gc,n:s.length,adopt:stats(s.map(s=>s.adoptMs)),heap:stats(s.map(s=>s.heapUsed))})}
for(const total of [352,30000,100000,1e9])summary.external.push({total,commit:stats(runs.flatMap(r=>r.external.find(e=>e.totalRows===total).ms)),loadedRows:20})
summary.react=JSON.parse(fs.readFileSync(`${dir}/v120-react-performance.json`)).samples.map(s=>({...s,frameWaitMs:stats(s.frameWaitMs),reactActualDurationMs:stats(s.reactActualDurationMs)}))
fs.writeFileSync(`${dir}/performance-summary.json`,JSON.stringify(summary,null,2)+'\n')
const f=n=>n.toFixed(1),cell=s=>`${f(s.p50)} / ${f(s.p95)} (${f(s.min)}–${f(s.max)}; n=${s.n})`
let md='All timings in milliseconds; cells show p50 / p95 (min–max; sample count). Nearest-rank percentiles.\n\n| Rows | Columns | Version | Initial adoption | Scroll incl. 2 rAF | Selection update |\n|---:|---:|---|---|---|---|\n'
for(const s of summary.local)md+=`| ${s.rows} | ${s.columns} | ${s.variant} | ${cell(s.adopt)} | ${cell(s.scroll)} | ${cell(s.selection)} |\n`
md+='\n| Declared total | Loaded rows | External commit |\n|---:|---:|---|\n';for(const e of summary.external)md+=`| ${e.total} | 20 | ${cell(e.commit)} |\n`
md+='\n| Rows | Core rowKey | Core adoption (no DOM/network) |\n|---:|---|---|\n';for(const c of summary.core)md+=`| ${c.rows} | ${c.rowKey??'none'} | ${cell(c.ms)} |\n`
md+='\n| React local rows | Fresh config | Version | Update incl. 2 rAF | React Profiler actual duration |\n|---:|---|---|---|---|\n';for(const r of summary.react)md+=`| ${r.count} | ${r.fresh} | ${r.variant} | ${cell(r.frameWaitMs)} | ${cell(r.reactActualDurationMs)} |\n`
fs.writeFileSync(`${dir}/performance-tables.md`,md);console.log(md)
