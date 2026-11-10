import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
const dir=resolve(process.argv[2])
let checked=0
const quantile=(xs,p)=>{
 const s=[...xs],k=Math.min(s.length-1,Math.floor(s.length*p));let lo=0,hi=s.length-1
 while(lo<hi){const pivot=s[(lo+hi)>>1];let i=lo,j=hi
  while(i<=j){while(s[i]<pivot)i++;while(s[j]>pivot)j--;if(i<=j){[s[i],s[j]]=[s[j],s[i]];i++;j--}}
  if(k<=j)hi=j;else if(k>=i)lo=i;else break
 }
 if(checked++<1000&&s[k]!==[...xs].sort((a,b)=>a-b)[k])throw Error('Quantile selection mismatch')
 return s[k]
}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length
const stats=xs=>{const average=mean(xs);return{n:xs.length,p05:quantile(xs,.05),p50:quantile(xs,.5),p95:quantile(xs,.95),mean:average,sd:Math.sqrt(mean(xs.map(x=>(x-average)**2))),min:Math.min(...xs),max:Math.max(...xs)}}
let seed=340068
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
const reports=readdirSync(dir).filter(x=>/^run-\d+.raw.json.gz$/.test(x)).map(x=>JSON.parse(gunzipSync(readFileSync(resolve(dir,x)))))
const phases=reports[0].kind==='date'?['constructorMs','nativeConstructorMs','descriptorMs','descriptorExcludingNativeMs','adoptionMs','adoptionExcludingNativeMs','renderMs','renderReadyMs','firstUsableMs','reuseMs','update','scroll']:['mount','update','scroll']
const values=(sample,phase)=>phase==='mount'?[sample.mountMs]:phase==='update'?sample.updates:phase==='scroll'?sample.scroll:phase==='adoptionExcludingNativeMs'?[sample.adoptionMs-(sample.variant==='candidate'?sample.nativeConstructorMs:0)]:phase==='descriptorExcludingNativeMs'?[sample.descriptorMs-(sample.variant==='baseline'?sample.nativeConstructorMs:0)]:[sample[phase]]
const result={method:{quantile:'sorted floor(n*p), as retained original runs',bootstrap:'4000 seeded resamples of paired workload clusters, stratified by fresh-browser run; pointwise 95% percentile intervals, no multiple-test correction',positive:'candidate minus baseline > 1e-6ms; ties retained',threshold:'max(5% baseline, 0.5ms); unchanged; threshold flags alone are not significance tests'},runs:[],pooled:[]}
function summarize(input){
 const groups=new Map()
 for(const report of input)for(const sample of report.samples){const key=JSON.stringify(sample.spec);if(!groups.has(key))groups.set(key,{spec:sample.spec,pairs:new Map()});const id=report.run+':'+sample.round;if(!groups.get(key).pairs.has(id))groups.get(key).pairs.set(id,{run:report.run,round:sample.round});groups.get(key).pairs.get(id)[sample.variant]=sample}
 return [...groups.values()].map(group=>{
  const pairs=[...group.pairs.values()];if(pairs.some(x=>!x.baseline||!x.candidate))throw Error('incomplete pair')
  const entry={spec:group.spec,pairs:pairs.length,metrics:{},counts:{},dom:{}}
  if(reports[0].kind==='default'){
   entry.counterParity=pairs.every(pair=>['mountCounts','updateCounts','scrollCounts'].every(phase=>Object.keys(pair.baseline[phase]).every(key=>pair.baseline[phase][key]===pair.candidate[phase][key])))
   if(!entry.counterParity)throw Error('Default counter mismatch '+JSON.stringify(group.spec))
  }
  for(const variant of ['baseline','candidate']){
   const samples=pairs.map(x=>x[variant]);entry.dom[variant]={rows:Math.max(...samples.map(x=>x.dom.rows)),cells:Math.max(...samples.map(x=>x.dom.cells))}
   entry.counts[variant]={}
   for(const key of ['mountCounts','updateCounts','scrollCounts','adoptedCounts','reuseCounts'])if(samples[0][key])entry.counts[variant][key]=Object.fromEntries(Object.keys(samples[0][key]).map(k=>[k,stats(samples.map(x=>x[key][k]))]))
  }
  for(const phase of phases){
   const base=pairs.map(x=>values(x.baseline,phase)),head=pairs.map(x=>values(x.candidate,phase)),metric={baseline:stats(base.flat()),candidate:stats(head.flat()),quantiles:{}}
   for(const [label,p] of [['p50',.5],['p95',.95]]){
    const deltas=pairs.map((pair,i)=>quantile(head[i],p)-quantile(base[i],p)),strata=[...new Set(pairs.map(x=>x.run))].map(run=>pairs.map((x,i)=>x.run===run?i:-1).filter(x=>x>=0)),boot=[],bootMean=[]
    for(let b=0;b<4000;b++){
     const indices=strata.flatMap(indices=>indices.map(()=>indices[Math.floor(random()*indices.length)]))
     boot.push(quantile(indices.flatMap(i=>head[i]),p)-quantile(indices.flatMap(i=>base[i]),p));bootMean.push(mean(indices.map(i=>deltas[i])))
    }
    const delta=metric.candidate[label]-metric.baseline[label],threshold=Math.max(.5,.05*metric.baseline[label])
    metric.quantiles[label]={delta,threshold,flag:delta>threshold+1e-6,deltaCI95:[quantile(boot,.025),quantile(boot,.975)],paired:{...stats(deltas),positive:deltas.filter(x=>x>1e-6).length,negative:deltas.filter(x=>x< -1e-6).length,ties:deltas.filter(x=>Math.abs(x)<=1e-6).length,meanCI95:[quantile(bootMean,.025),quantile(bootMean,.975)]},perPair:pairs.map((x,i)=>({run:x.run,round:x.round,baseline:quantile(base[i],p),candidate:quantile(head[i],p),delta:deltas[i]}))}
   }
   entry.metrics[phase]=metric
  }
  return entry
 })
}
for(const report of reports)result.runs.push({run:report.run,browser:report.browser,started:report.started,finished:report.finished,samples:report.samples.length,results:summarize([report])})
result.pooled=summarize(reports)
writeFileSync(resolve(dir,'summary.json'),JSON.stringify(result,null,2)+'\n')
for(const entry of result.pooled)for(const [phase,m] of Object.entries(entry.metrics))console.log(JSON.stringify({spec:entry.spec,phase,base:[m.baseline.p50,m.baseline.p95],head:[m.candidate.p50,m.candidate.p95],delta:[m.quantiles.p50.delta,m.quantiles.p95.delta],ci:[m.quantiles.p50.deltaCI95,m.quantiles.p95.deltaCI95],positive:[m.quantiles.p50.paired.positive,m.quantiles.p95.paired.positive],flags:[m.quantiles.p50.flag,m.quantiles.p95.flag]}))
