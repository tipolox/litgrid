import fs from 'node:fs'
import path from 'node:path'
const dir=process.argv[2]??'docs/release/evidence/v1.2.0-integrated'
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name)))
const stats=values=>{const a=values.toSorted((a,b)=>a-b);if(!a.length)throw new Error('No samples');return {n:a.length,p50:a[Math.ceil(a.length*.5)-1],p95:a[Math.ceil(a.length*.95)-1],min:a[0],max:a.at(-1)}}
const label=v=>['v110','main'].includes(v)?'historical-v1.1.0':'optimized-integrated'
const summary={base:'dc065d58ca2a7c6b0d99b0676750cfeac7b7800b',local:[],heap:[],react:[],firstClick:[],external:[],core:[],allocation:[]}
for(const selectionCase of ['keyed','legacy']){
 const runs=[1,2,3].map(n=>read(`${selectionCase}-${n}.json`)),samples=runs.flatMap(r=>r.samples)
 summary.browser=runs[0].browser;summary.node=runs[0].node
 for(const rows of [30000,100000])for(const columns of [120,200])for(const variant of ['v110','candidate']){
  const s=samples.filter(s=>s.count===rows&&s.columns===columns&&s.variant===variant)
  summary.local.push({selectionCase,rows,columns,variant:label(variant),adoption:stats(s.map(s=>s.adoptMs)),presentation:stats(s.map(s=>s.firstPaintWaitMs)),scroll:stats(s.flatMap(s=>s.scrollMs)),selection:stats(s.flatMap(s=>s.selectionMs)),maxCells:Math.max(...s.map(s=>s.maxCells))})
 }
 for(const variant of ['v110','candidate'])for(const gc of ['forced','natural']){
  const s=samples.filter(s=>s.variant===variant&&s.gc===gc)
  summary.heap.push({selectionCase,variant:label(variant),gc,heapMiB:stats(s.map(s=>s.heapUsed/2**20))})
 }
 if(selectionCase==='keyed')for(const rows of [30000,100000])for(const keyed of [false,true])summary.core.push({rows,keyed,variant:'optimized-integrated',synchronization:stats(runs.flatMap(r=>r.coreControl.find(x=>x.rows===rows&&Boolean(x.rowKey)===keyed).ms))})
}
const react=[1,2,3].flatMap(n=>read(`react-${n}.json`).samples)
for(const rows of [30000,100000])for(const freshConfig of [false,true])for(const variant of ['v110','candidate']){
 const s=react.filter(s=>s.count===rows&&s.fresh===freshConfig&&s.variant===variant)
 summary.react.push({rows,freshConfig,variant:label(variant),update:stats(s.flatMap(s=>s.frameWaitMs)),profiler:stats(s.flatMap(s=>s.reactActualDurationMs))})
}
const click=read('first-click.json').samples
for(const rows of [30000,100000])for(const columns of [120,200])for(const variant of ['v110','optimized']){
 const s=click.filter(s=>s.rows===rows&&s.columns===columns&&s.variant===variant)
 summary.firstClick.push({rows,columns,variant:label(variant),dispatch:stats(s.map(s=>s.dispatchMs)),update:stats(s.map(s=>s.updateMs)),frames:stats(s.map(s=>s.frameWaitMs))})
}
const external=read('external-keyed.json').samples
for(const totalRows of [352,30000,100000,1e9])for(const keyed of [false,true]){
 const s=external.filter(s=>s.totalRows===totalRows&&s.keyed===keyed)
 summary.external.push({totalRows,keyed,loadedRows:20,commit:stats(s.flatMap(s=>s.ms)),selection:stats(s.flatMap(s=>s.selectionMs)),identityReads:stats(s.flatMap(s=>s.identityReads)),maxMountedRows:Math.max(...s.map(s=>s.mountedRows))})
}
for(const s of read('allocations.json').samples){
 const cpu=s.cpuProfile,gcNodes=new Set(cpu.nodes.filter(n=>n.callFrame.functionName==='(garbage collector)').map(n=>n.id))
 const sampledGC=cpu.samples.reduce((sum,id,i)=>sum+(gcNodes.has(id)?cpu.timeDeltas[i]:0),0)
 summary.allocation.push({rows:s.rows,phase:s.phase,variant:label(s.variant),n:s.n,sampledMiB:s.sampledBytes/2**20,gcSampleMs:sampledGC/1000,profileMs:(cpu.endTime-cpu.startTime)/1000,topAllocationFrames:s.topFrames})
}
const f=n=>n.toFixed(2),cell=s=>`${f(s.p50)} / ${f(s.p95)} (${f(s.min)}–${f(s.max)}; n=${s.n})`
let md='Integrated qualification after PR #42. Milliseconds unless specified; p50 / p95 (min–max; sample count), nearest rank. Historical v1.1.0 has index selection and does not implement stable keys; `keyed` is the identical configured workload, not identical functionality. `legacy` omits rowKey on both versions.\n\n'
md+='| Case | Rows | Columns | Version | Adoption | Two-frame presentation | Scroll | Selection | Max cells |\n|---|---:|---:|---|---|---|---|---|---:|\n'
for(const s of summary.local)md+=`| ${s.selectionCase} | ${s.rows} | ${s.columns} | ${s.variant} | ${cell(s.adoption)} | ${cell(s.presentation)} | ${cell(s.scroll)} | ${cell(s.selection)} | ${s.maxCells} |\n`
md+='\nWhole-page heap snapshots after grid removal and before the next collection. MiB; these are not retained-leak measurements.\n\n| Case | Version | GC | Heap MiB |\n|---|---|---|---|\n'
for(const s of summary.heap)md+=`| ${s.selectionCase} | ${s.variant} | ${s.gc} | ${cell(s.heapMiB)} |\n`
md+='\n| React rows | Fresh config | Version | Update including two frames | React render actual duration |\n|---:|---|---|---|---|\n'
for(const s of summary.react)md+=`| ${s.rows} | ${s.freshConfig} | ${s.variant} | ${cell(s.update)} | ${cell(s.profiler)} |\n`
md+='\n| First click rows | Columns | Version | DOM dispatch | Through Lit update | Two-frame wait |\n|---:|---:|---|---|---|---|\n'
for(const s of summary.firstClick)md+=`| ${s.rows} | ${s.columns} | ${s.variant} | ${cell(s.dispatch)} | ${cell(s.update)} | ${cell(s.frames)} |\n`
md+='\n| External declared total | Keyed | Loaded | Commit | Immediate selection | Identity reads per commit | Max mounted rows |\n|---:|---|---:|---|---|---|---:|\n'
for(const s of summary.external)md+=`| ${s.totalRows} | ${s.keyed} | 20 | ${cell(s.commit)} | ${cell(s.selection)} | ${cell(s.identityReads)} | ${s.maxMountedRows} |\n`
md+='\nCore controls profile the optimized source only, no DOM/network, n=90 per case across the three keyed qualification runs.\n\n| Rows | rowKey | Core cold setData |\n|---:|---|---|\n'
for(const s of summary.core)md+=`| ${s.rows} | ${s.keyed} | ${cell(s.synchronization)} |\n`
md+='\nAllocation/GC profiles are separate from timing runs. Allocation values are estimates over 30 syncs at a 32768-byte sampling interval, including collected objects. GC values are attributed CPU sample time, not exact pauses. Fixtures are allocated before sampling. These profiles compare historical index-only v1.1.0 with optimized keyed source.\n\n| Rows | Phase | Version | Sampled allocation MiB | GC sample ms | Profile ms |\n|---:|---|---|---:|---:|---:|\n'
for(const s of summary.allocation)md+=`| ${s.rows} | ${s.phase} | ${s.variant} | ${f(s.sampledMiB)} | ${f(s.gcSampleMs)} | ${f(s.profileMs)} |\n`
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(dir,'performance-tables.md'),md)
// Preserve every sample/profile value while keeping review diffs manageable.
for(const name of fs.readdirSync(dir).filter(n=>/^(keyed-|legacy-|react-|first-click|external-keyed|allocations).*\.json$/.test(n)))fs.writeFileSync(path.join(dir,name),JSON.stringify(read(name))+'\n')
console.log('Summarized',summary.local.length,'local cases and all integrated profiles')
