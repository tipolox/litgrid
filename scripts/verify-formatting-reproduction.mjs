import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const folder='docs/performance/evidence/column-formatting-34/reproduction'
const manifest=JSON.parse(readFileSync(folder+'/manifest.json'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const check=(ok,message)=>{if(!ok)throw Error(message)}
for(const [file,{sha256}] of Object.entries(manifest.files)){
 const bytes=readFileSync(resolve(folder,file))
 const comparable=file.startsWith('../../../../../')?Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n')):bytes
 check(hash(comparable)===sha256,'Hash mismatch '+file)
}
let samples=0,pairs=0,traces=0,maxRows=0,maxCells=0
for(const [name,study] of Object.entries(manifest.studies)){
 if(study.aa)check(JSON.stringify(Object.values(study.productionBundles.baseline))===JSON.stringify(Object.values(study.productionBundles.candidate)),'A/A bundle mismatch')
 for(let run=0;run<study.runs;run++){
  const report=JSON.parse(gunzipSync(readFileSync(`${folder}/${name}/run-${run+1}.raw.json.gz`)))
  check(report.finished&&report.errors.length===0,'Incomplete '+name)
  const groups=new Map()
  for(let i=0;i<report.samples.length;i+=2){
   const a=report.samples[i],b=report.samples[i+1]
   check(a.variant===((a.round+run)%2?'candidate':'baseline')&&b.variant!==a.variant&&a.round===b.round&&JSON.stringify(a.spec)===JSON.stringify(b.spec),'Alternation/pair mismatch')
   const key=JSON.stringify(a.spec);groups.set(key,(groups.get(key)??0)+1)
   if(report.kind==='default')for(const phase of ['mountCounts','updateCounts','scrollCounts']){
    check(JSON.stringify(a[phase])===JSON.stringify(b[phase]),'Counter parity '+key)
    for(const sample of [a,b])check(sample[phase].dateConstruct===0&&sample[phase].numberConstruct===0&&sample[phase].format===0,'Default Intl '+key)
   }
   for(const sample of [a,b]){
    maxRows=Math.max(maxRows,sample.dom.rows);maxCells=Math.max(maxCells,sample.dom.cells)
    check(sample.dom.rows<=19&&sample.dom.cells<=247,'DOM bound')
    if(report.kind==='date'){
     check(sample.mountCounts.dateConstruct===sample.spec.columns,'Date startup constructor count')
     for(const phase of ['updateCounts','scrollCounts','reuseCounts'])check(sample[phase].dateConstruct===0&&sample[phase].numberConstruct===0,'Date reuse constructor count')
    }
   }
   pairs++
  }
  check(report.samples.length===report.rounds*(report.kind==='date'?4:7)*2,'Sample total '+name)
  for(const count of groups.values())check(count===report.rounds,'Case pair count '+name)
  samples+=report.samples.length
  traces+=(report.traces??[]).length
 }
}
const first=manifest.studies.chromium.harness
for(const [file,snapshot] of [['tests/contracts/column-formatting.browser.ts','chromium-harness-v1.ts.gz'],['scripts/reproduce-column-formatting.mjs','chromium-runner-v1.mjs.gz']])check(hash(gunzipSync(readFileSync(folder+'/'+snapshot)))===first[file],'Initial harness snapshot '+file)
check(traces===70,'Diagnostic trace count')
console.log(JSON.stringify({hashes:'PASS',samples,pairs,traces,maxRows,maxCells,defaultCounterParity:true,defaultIntl:0,steadyDateConstructions:0}))
