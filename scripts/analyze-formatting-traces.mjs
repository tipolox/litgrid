import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gunzipSync} from 'node:zlib'
const dir=resolve(process.argv[2])
const union=intervals=>{const sorted=intervals.sort((a,b)=>a[0]-b[0]);let total=0,end=-Infinity;for(const [a,b] of sorted){if(b>end){total+=b-Math.max(a,end);end=b}}return total/1000}
const groups={}
const summary={method:'Separate traced workloads, 250us CPU samples, 5 alternating pairs/case. Timeline duration categories are unioned per category (not added across nested categories). CPU time uses leaf frame sample deltas clipped to user-timing phase. Sampling/profile/trace overhead means diagnostic times are not benchmark distributions.',samples:[],groups}
for(const file of readdirSync(dir).filter(x=>/^trace-.*\.json.gz$/.test(x))){
 const {variant,spec,result,events,profile}=JSON.parse(gunzipSync(readFileSync(resolve(dir,file))))
 const entry={file,variant,spec,result:{mountMs:result.mountMs,updates:result.updates,scroll:result.scroll},phases:{}}
 const nodes=new Map(profile.nodes.map(x=>[x.id,x]))
 for(const phase of ['mount','update','scroll']){
  const start=events.find(x=>x.name===`litgrid:${phase}:start`),end=events.find(x=>x.name===`litgrid:${phase}:end`)
  if(!start||!end)throw Error('Missing phase markers '+file+' '+phase)
  const lo=start.ts,hi=end.ts,thread=start.tid
  const clipped=events.filter(e=>e.ph==='X'&&e.dur>0&&e.ts<hi&&e.ts+e.dur>lo&&e.tid===thread)
  const span=predicate=>union(clipped.filter(predicate).map(e=>[Math.max(lo,e.ts),Math.min(hi,e.ts+e.dur)]))
  const metrics={wallMs:(hi-lo)/1000,jsEntryEventMs:span(e=>/^(FunctionCall|EvaluateScript|RunMicrotasks|V8.Execute)$/.test(e.name)),styleMs:span(e=>e.name==='UpdateLayoutTree'),layoutMs:span(e=>e.name==='Layout'),gcMs:span(e=>/GC|Scavenge|MarkCompact/.test(e.name)),sampledScriptMs:0,sampledIdleMs:0,sampledGcMs:0}
  const self={};let timestamp=profile.startTime
  for(let i=0;i<(profile.samples??[]).length;i++){
   const delta=profile.timeDeltas[i],from=timestamp;timestamp+=delta
   const duration=Math.max(0,Math.min(timestamp,hi)-Math.max(from,lo))/1000
   if(!duration)continue
   const node=nodes.get(profile.samples[i]),frame=node.callFrame
   if(frame.url)metrics.sampledScriptMs+=duration
   if(frame.functionName==='(idle)')metrics.sampledIdleMs+=duration
   if(frame.functionName==='(garbage collector)')metrics.sampledGcMs+=duration
   const key=(frame.functionName||'(anonymous)')+' @ '+(frame.url?frame.url.split('/').pop()+':'+frame.lineNumber:'native')
   self[key]=(self[key]??0)+duration
  }
  entry.phases[phase]={...metrics,selfMs:Object.entries(self).sort((a,b)=>b[1]-a[1])}
  const key=JSON.stringify({spec,phase,variant});groups[key]??={spec,phase,variant,n:0,totals:{},selfMs:{},perSample:[]};const group=groups[key];group.n++;group.perSample.push(metrics)
  for(const [k,v] of Object.entries(metrics))group.totals[k]=(group.totals[k]??0)+v
  for(const [k,v] of Object.entries(self))group.selfMs[k]=(group.selfMs[k]??0)+v
 }
 summary.samples.push(entry)
}
for(const group of Object.values(groups)){group.mean=Object.fromEntries(Object.entries(group.totals).map(([k,v])=>[k,v/group.n]));group.selfMs=Object.entries(group.selfMs).sort((a,b)=>b[1]-a[1]);delete group.totals}
writeFileSync(resolve(dir,'trace-summary.json'),JSON.stringify(summary,null,2)+'\n')
console.log('Analyzed',summary.samples.length,'traced workloads')
for(const group of Object.values(groups))console.log(JSON.stringify({spec:group.spec,phase:group.phase,variant:group.variant,n:group.n,...group.mean,top:group.selfMs.slice(0,4)}))
