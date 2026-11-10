import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const folder='docs/performance/evidence/column-formatting-34/final-targeted'
const manifest=JSON.parse(readFileSync(folder+'/manifest.json'))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const check=(ok,label)=>{if(!ok)throw Error(label)}
for(const [file,{sha256}] of Object.entries(manifest.files)){
 const bytes=readFileSync(resolve(folder,file)),content=file.startsWith('../../../../../')?Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n')):bytes
 check(sha(content)===sha256,'Artifact/source hash '+file)
}
let samples=0,pairs=0,maxRows=0,maxCells=0,qualificationBuilds=0
for(const [name,study] of Object.entries(manifest.studies)){
 check(JSON.stringify(study.variants.current.bundles)===JSON.stringify(study.variants['current-AA'].bundles),'A/A bytes '+name)
 const runner=gunzipSync(readFileSync(resolve(folder,manifest.runnerSnapshots[name])))
 check(sha(runner)===study.sources['scripts/final-formatting-experiments.mjs'],'Exact runner '+name)
 const variantSource=gunzipSync(readFileSync(resolve(folder,name==='A'||name==='B'?'sources/variants-v1.mjs.gz':'sources/variants-v2.mjs.gz')))
 check(sha(variantSource)===study.sources['scripts/final-formatting-variants.mjs'],'Exact transforms '+name)
 for(let run=0;run<study.runs;run++){
  const report=JSON.parse(gunzipSync(readFileSync(`${folder}/${name}/run-${run+1}.raw.json.gz`)))
  check(report.finished&&report.errors.length===0,'Completed '+name)
  check(report.samples.length===study.rounds*study.comparisons.length*2,'Sample count '+name)
  for(const q of report.qualification??[]){check(q.atomic&&q.recovery&&q.teardown&&q.reconnect,'Functional qualification '+name);qualificationBuilds++}
  const groups=new Map()
  for(let i=0;i<report.samples.length;i+=2){
   const x=report.samples[i],y=report.samples[i+1],index=study.comparisons.findIndex(c=>c.name===x.spec.comparison),c=study.comparisons[index]
   check(x.round===y.round&&JSON.stringify(x.spec)===JSON.stringify(y.spec)&&x.variant!==y.variant,'Pair shape')
   check(x.variant===((x.round+run+index)%2?'candidate':'baseline'),'Alternation')
   for(const item of [x,y]){
    check(item.actualVariant===(item.variant==='baseline'?c.left:c.right),'Variant identity')
    maxRows=Math.max(maxRows,item.dom.rows);maxCells=Math.max(maxCells,item.dom.cells)
    if(name==='A')for(const phase of ['mountCounts','updateCounts','scrollCounts'])check(item[phase].dateConstruct===0&&item[phase].numberConstruct===0&&item[phase].format===0,'Default Intl')
    else check(item.mountCounts.dateConstruct===(item.actualVariant==='shared-date'?1:120),'Date startup constructors')
   }
   if(name==='A')for(const phase of ['mountCounts','updateCounts','scrollCounts'])check(JSON.stringify(x[phase])===JSON.stringify(y[phase]),'Default setter/count parity')
   const key=x.spec.comparison;groups.set(key,(groups.get(key)??0)+1);pairs++
  }
  for(const count of groups.values())check(count===study.rounds,'Comparison rounds')
  samples+=report.samples.length
 }
}
check(samples===1200&&pairs===600,'Final schedule totals')
const memory=JSON.parse(readFileSync(folder+'/C-ownership/memory.json')).results
for(const r of memory)check(r.active.alive===(r.variant.includes('detached')?1:64)&&r.numbersOnly.alive===(r.variant.includes('detached')?0:1)&&r.detached.alive===0,'Ownership contrast '+r.variant)
const before=JSON.parse(readFileSync(folder+'/pre-fix-retention.json')).results,after=JSON.parse(readFileSync(folder+'/production-retention.json')).results
check(before.every(r=>!r.pass&&r.active.alive===64&&r.removed.alive===1),'Expected negative regression control')
check(after.every(r=>r.pass&&r.active.alive===1&&r.removed.alive===0&&r.disconnected.alive===0),'Production retention correction')
console.log(JSON.stringify({hashes:'PASS',samples,pairs,qualificationBuilds,maxRows,maxCells,byteIdenticalAA:true,defaultCounterParity:true,preFixFailure:true,productionDateNumberRetention:'PASS',postStopTimingRounds:0}))
