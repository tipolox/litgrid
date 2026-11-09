import { readFileSync, writeFileSync } from 'node:fs'
const input=process.argv[2]??'.private/column-formatting-production-final.json'
const output=process.argv[3]??'.private/column-formatting-summary.json'
const report=JSON.parse(readFileSync(input,'utf8'))
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]}
const stats=values=>({n:values.length,p50:percentile(values,.5),p95:percentile(values,.95)})
const groups=new Map()
for(const sample of report.workloads){const key=JSON.stringify(sample.spec);if(!groups.has(key))groups.set(key,{spec:sample.spec,baseline:[],candidate:[]});groups.get(key)[sample.variant].push(sample)}
const result=[]
for(const group of groups.values()){
  const entry={spec:group.spec}
  for(const variant of ['baseline','candidate']){
    const values=group[variant]
    entry[variant]={mount:stats(values.map(x=>x.mountMs)),update:stats(values.flatMap(x=>x.updates)),scroll:stats(values.flatMap(x=>x.scroll)),metadata:stats(values.map(x=>x.metadataMs)),refresh:stats(values.map(x=>x.refreshMs)),bestFit:stats(values.map(x=>x.bestFitMs)),heap:stats(values.map(x=>x.heap.usedSize)),dom:{rows:[...new Set(values.map(x=>x.dom.rows))],cells:[...new Set(values.map(x=>x.dom.cells))]},counts:values[0]&&Object.fromEntries(['mountCounts','updateCounts','scrollCounts','metadataCounts','refreshCounts','bestFitCounts'].map(key=>[key,values[0][key]]))}
  }
  const pairs=group.baseline.map(base=>({base,head:group.candidate.find(head=>head.round===base.round)})).filter(pair=>pair.head)
  entry.pairedDelta={}
  for(const [phase,select] of [['mount',value=>value.mountMs],['update',value=>percentile(value.updates,.5)],['scroll',value=>percentile(value.scroll,.5)]]){
    const deltas=pairs.map(pair=>select(pair.head)-select(pair.base))
    entry.pairedDelta[phase]={...stats(deltas),positivePairs:deltas.filter(delta=>delta>1e-6).length}
  }
  entry.flags=[]
  if(group.spec.scenario==='default')for(const phase of ['mount','update','scroll'])for(const quantile of ['p50','p95']){
    const base=entry.baseline[phase][quantile],candidate=entry.candidate[phase][quantile]
    // Ignore floating-point roundoff at the exact threshold, not timing variance.
    if(candidate-base>Math.max(.5,base*.05)+1e-6)entry.flags.push({phase,quantile,base,candidate,delta:candidate-base})
  }
  result.push(entry)
}
const summary={browser:report.browser,node:report.node,rounds:report.rounds,samples:report.workloads.length,results:result,flags:result.filter(x=>x.flags.length).map(x=>({spec:x.spec,flags:x.flags}))}
// Keep one workload per line for review; raw archives retain individual samples.
const serialized=Object.entries(summary).map(([key,value])=>
  ['results','flags'].includes(key)?`  "${key}": [\n${value.map(entry=>'    '+JSON.stringify(entry)).join(',\n')}\n  ]`:
    '  '+JSON.stringify(key)+': '+JSON.stringify(value)).join(',\n')
writeFileSync(output,'{\n'+serialized+'\n}\n')
const fmt=value=>value.toFixed(2)
for(const entry of result){const {spec,baseline:b,candidate:c}=entry;console.log(`${spec.scenario} ${spec.mode} ${spec.rows}/${spec.columns} | mount ${fmt(b.mount.p50)}/${fmt(b.mount.p95)} -> ${fmt(c.mount.p50)}/${fmt(c.mount.p95)} | update ${fmt(b.update.p50)}/${fmt(b.update.p95)} -> ${fmt(c.update.p50)}/${fmt(c.update.p95)} | scroll ${fmt(b.scroll.p50)}/${fmt(b.scroll.p95)} -> ${fmt(c.scroll.p50)}/${fmt(c.scroll.p95)}${entry.flags.length?' FLAG':''}`)}
console.log('Flagged workloads:',summary.flags.length,'/',result.length)
