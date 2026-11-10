import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const folder='docs/performance/evidence/column-formatting-34',manifest=JSON.parse(readFileSync(folder+'/manifest.json'))
const hash=b=>createHash('sha256').update(b).digest('hex')
const result={runs:[],sources:[],bundles:[],prioritized:[],limitation:'Intermediate initial/snapshot-tuned/default-only sources were not committed separately. Their distributions are retained, but they are prioritization signals, not controlled repetitions of the final runtime.'}
for(const run of manifest.runs){const gzip=readFileSync(`${folder}/${run.name}.raw.json.gz`),raw=gunzipSync(gzip),report=JSON.parse(raw);result.runs.push({name:run.name,samples:report.workloads.length,gzipMatch:hash(gzip)===run.gzipSHA256,rawMatch:hash(raw)===run.rawSHA256})}
for(const [file,expected] of Object.entries(manifest.sources))result.sources.push({file,match:hash(Buffer.from(readFileSync(file,'utf8').replaceAll('\r\n','\n')))===expected})
for(const [variant,files] of Object.entries(manifest.productionBundles))for(const [file,expected] of Object.entries(files)){
 const path=`.private/column-formatting-browser/${variant}/assets/${file}`
 result.bundles.push(existsSync(path)?{variant,file,match:hash(readFileSync(path))===expected}:{variant,file,skipped:'Original ignored build not present; recorded bundle hash remains in historical manifest.'})
}
const runs=['initial','snapshot-tuned','default-only','compiled'].map(name=>({name,data:JSON.parse(readFileSync(`${folder}/${name}.json`))}))
for(const [mode,rows,columns,phase,quantile] of [['react',5000,120,'scroll','p95'],['vue',30000,3,'mount','p50'],['inferred',30000,3,'mount','p50'],['vue',30000,120,'mount','p95'],['web',5000,120,'mount','p95']]){
 const key={mode,rows,columns,phase,quantile};key.runs=runs.map(({name,data})=>{const entry=data.results.find(e=>e.spec.scenario==='default'&&e.spec.mode===mode&&e.spec.rows===rows&&e.spec.columns===columns);return{name,baseline:entry.baseline[phase][quantile],candidate:entry.candidate[phase][quantile],flag:entry.flags.some(f=>f.phase===phase&&f.quantile===quantile)}});result.prioritized.push(key)
}
if(result.runs.some(x=>!x.gzipMatch||!x.rawMatch)||result.sources.some(x=>!x.match)||result.bundles.some(x=>x.match===false))throw Error('Evidence hash mismatch: '+JSON.stringify(result))
mkdirSync('.private',{recursive:true})
writeFileSync('.private/formatting-evidence-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
