import { readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
const input=resolve(process.argv[2]??'collected'),out=resolve(process.argv[3]??'assessment')
mkdirSync(out,{recursive:true})
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(resolve(dir,entry.name)):[resolve(dir,entry.name)])
const reports=walk(input).filter(file=>file.endsWith('/raw.json')||file.endsWith('\\raw.json')).map(file=>JSON.parse(readFileSync(file)))
if(reports.length!==3||reports.some(r=>!r.complete||r.errors.length)||new Set(reports.map(r=>r.replicate)).size!==3)throw Error('Three complete independent replications are mandatory')
reports.sort((a,b)=>a.replicate-b.replicate)
const iterations=4000,threshold=baseline=>Math.max(Math.abs(baseline)*.05,.5)
let seed=340069
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
const q=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]}
const vector=(pair,side,metric)=>metric==='mount'?[pair[side].mountMs]:metric==='update'?pair[side].updates.slice(2):pair[side].scroll
const keys=[...new Set(reports.flatMap(r=>r.samples.map(s=>JSON.stringify(s.spec))))]
const pairedSummary=(groups,metric,p)=>{
 const all=groups.flat(),left=all.flatMap(pair=>vector(pair,'left',metric)),right=all.flatMap(pair=>vector(pair,'right',metric))
 const baseline=q(left,p),candidate=q(right,p),deltas=[]
 for(let iteration=0;iteration<iterations;iteration++){
  const cluster=groups.length===1?groups:Array.from({length:groups.length},()=>groups[Math.floor(random()*groups.length)])
  const resampled=cluster.flatMap(group=>Array.from({length:group.length},()=>group[Math.floor(random()*group.length)]))
  deltas.push(q(resampled.flatMap(pair=>vector(pair,'right',metric)),p)-q(resampled.flatMap(pair=>vector(pair,'left',metric)),p))
 }
 const interval=[q(deltas,.025),q(deltas,.975)],trigger=threshold(baseline),delta=candidate-baseline
 const pairedDeltas=all.map(pair=>q(vector(pair,'right',metric),p)-q(vector(pair,'left',metric),p))
 return{baseline,candidate,delta,trigger,interval95:interval,pairedDeltas,positivePairs:pairedDeltas.filter(v=>v>1e-6).length,ties:pairedDeltas.filter(v=>Math.abs(v)<=1e-6).length,pairs:all.length,leftDistribution:left,rightDistribution:right,withinNoiseBudget:Math.abs(delta)<=trigger&&interval[0]>=-trigger&&interval[1]<=trigger,belowRegressionTrigger:delta<=trigger&&interval[1]<=trigger}
}
const summaries=[],crossRun=[]
for(const key of keys)for(const comparison of ['AA','AB'])for(const metric of ['mount','update','scroll'])for(const [name,p] of [['p50',.5],['p95',.95]]){
 const groups=reports.map(report=>report.samples.filter(pair=>JSON.stringify(pair.spec)===key&&pair.comparison===comparison))
 if(groups.some(group=>group.length!==30||new Set(group.map(pair=>pair.round)).size!==30))throw Error('Incomplete predeclared paired schedule')
 const perRun=groups.map((group,index)=>({replicate:reports[index].replicate,...pairedSummary([group],metric,p)}))
 summaries.push({spec:JSON.parse(key),comparison,metric,quantile:name,perRun,pooled:pairedSummary(groups,metric,p)})
 if(comparison==='AA')for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){
  const left=groups[a],right=groups[b],baseline=q(left.flatMap(pair=>vector(pair,'left',metric)),p),candidate=q(right.flatMap(pair=>vector(pair,'left',metric)),p),deltas=[]
  for(let i=0;i<iterations;i++){
   const l=Array.from({length:30},()=>left[Math.floor(random()*30)]),r=Array.from({length:30},()=>right[Math.floor(random()*30)])
   deltas.push(q(r.flatMap(pair=>vector(pair,'left',metric)),p)-q(l.flatMap(pair=>vector(pair,'left',metric)),p))
  }
  const interval95=[q(deltas,.025),q(deltas,.975)],trigger=threshold(baseline),delta=candidate-baseline
  crossRun.push({spec:JSON.parse(key),metric,quantile:name,runs:[a+1,b+1],baseline,candidate,delta,trigger,interval95,stable:Math.abs(delta)<=trigger&&interval95[0]>=-trigger&&interval95[1]<=trigger})
 }
}
const cohort=r=>JSON.stringify([r.environment.node,r.environment.image,r.environment.imageVersion,r.environment.cpuModels,r.environment.cpuCount,r.environment.browser,r.environment.browserExecutableSha256,r.environment.playwright,r.manifest.lockSha256,r.manifest.bundles])
const sameCohort=new Set(reports.map(cohort)).size===1
const distinctVMs=new Set(reports.map(r=>r.environment.bootId)).size===3&&reports.every(r=>r.environment.bootId)
const cpuFields=s=>s?.split('\n')[0].trim().split(/\s+/).slice(1,9).map(Number)
const steal=[]
for(const report of reports)for(const pair of report.samples){
 const before=cpuFields(pair.hostBefore.cpuStat),after=cpuFields(pair.hostAfter.cpuStat)
 const total=before&&after?after.reduce((a,b)=>a+b,0)-before.reduce((a,b)=>a+b,0):0
 steal.push(total>0?100*(after[7]-before[7])/total:null)
}
const maxStealPercent=Math.max(...steal.filter(value=>value!==null)),telemetryComplete=steal.every(value=>value!==null)
const aaFailures=summaries.filter(s=>s.comparison==='AA'&&(!s.pooled.withinNoiseBudget||s.perRun.some(run=>!run.withinNoiseBudget)))
const abExceedances=summaries.filter(s=>s.comparison==='AB'&&(!s.pooled.belowRegressionTrigger||s.perRun.some(run=>!run.belowRegressionTrigger)))
const environmentSuitable=!!(sameCohort&&distinctVMs&&telemetryComplete&&maxStealPercent<=1&&!aaFailures.length&&crossRun.every(c=>c.stable))
const result={phase:reports[0].phase,decision:environmentSuitable?'STABLE PILOT VM COHORT; ARCHITECTURAL HOST ACCEPTANCE STILL REQUIRED':'UNSUITABLE OR UNPROVEN CI ENVIRONMENT; STOP',performanceAcceptance:false,threshold:'max(5% baseline, 0.5 ms)',iterations,intervalMethod:'95% percentile paired-cluster bootstrap; pooled resamples run clusters, then paired samples; cross-run independent cluster bootstrap; pointwise, no trimming or A/A subtraction',environmentSuitable,sameCohort,distinctVMs:!!distinctVMs,physicalHostIndependenceVerified:false,maxStealPercent,telemetryComplete,aaFailureCount:aaFailures.length,crossRunFailureCount:crossRun.filter(c=>!c.stable).length,abExceedanceCount:abExceedances.length,environment:reports.map(r=>({replicate:r.replicate,...r.environment})),summaries,crossRun}
writeFileSync(resolve(out,'assessment.json'),JSON.stringify(result,null,2)+'\n')
const compact={...result,environment:result.environment.map(({cpuInfo,cgroup,...env})=>env),summaries:undefined,crossRun:undefined,aaFailures:aaFailures.map(s=>({spec:s.spec,metric:s.metric,quantile:s.quantile,pooled:s.pooled.delta,interval:s.pooled.interval95,trigger:s.pooled.trigger,perRun:s.perRun.map(r=>({replicate:r.replicate,delta:r.delta,interval:r.interval95,trigger:r.trigger}))}))}
console.log('CI_PERF_ASSESSMENT '+JSON.stringify(compact))
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`suitable=${environmentSuitable}\n`)
const md=`# LitGrid CI performance feasibility\n\n${result.decision}\n\nPERF NOT QUALIFIED; no merge authorization.\n\nThree independent VM jobs, ${reports.reduce((a,r)=>a+r.samples.length,0)} alternating pairs. A/A failures: ${result.aaFailureCount}; cross-run stability failures: ${result.crossRunFailureCount}; A/B threshold/interval flags: ${result.abExceedanceCount}. Same hardware/image/browser cohort: ${sameCohort}. Distinct VM boot IDs: ${!!distinctVMs}. Max observed steal: ${maxStealPercent.toFixed(3)}%. Physical host independence remains unverified.\n\nUnchanged trigger: max(5% baseline, 0.5 ms). Full raw distributions, paired deltas, pointwise intervals and separate diagnostic traces are retained as artifacts. No prior laptop evidence was used.\n`
writeFileSync(resolve(out,'assessment.md'),md)
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,md)
