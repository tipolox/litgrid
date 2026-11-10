import {build,preview} from 'vite'
import {chromium} from 'playwright'
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'
import {gzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import os from 'node:os'
import {transformVariant} from './final-formatting-variants.mjs'

const root=fileURLToPath(new URL('../',import.meta.url))
const arg=(key,fallback)=>process.argv.find(x=>x.startsWith('--'+key+'='))?.slice(key.length+3)??fallback
const current=resolve(arg('current','../column-formatting-34-impl')),baseline=resolve(arg('baseline','../column-formatting-34-base'))
const experiment=arg('experiment','A'),rounds=Number(arg('rounds','30')),runs=Number(arg('runs',experiment==='A'?'3':'2'))
const ownershipOnly=process.argv.includes('--ownership-only')
const productionQualification=process.argv.includes('--production-qualification')
if((ownershipOnly||productionQualification)&&rounds!==0)throw Error('Ownership/production isolation is correctness-only; no further timing rounds authorized.')
if(!productionQualification&&(!process.argv.some(x=>x.startsWith('--current='))||!process.argv.some(x=>x.startsWith('--runtime='))))throw Error('Replay requires explicit --current and --runtime for the pinned source worktree.')
if(rounds>0&&!process.argv.includes('--replay-on-independent-host'))throw Error('Timing schedule is complete on the original host. Replay only on an independently qualified host with --replay-on-independent-host.')
const output=resolve(arg('output',`.private/final-experiments/${experiment}`)),entry=resolve(root,'.private/final-experiments/entry.ts'),html=resolve(root,'.private/final-experiments/index.html')
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const servers=[],reports=[],errors=[]
mkdirSync(output,{recursive:true});mkdirSync(resolve(entry,'..'),{recursive:true})
let source=readFileSync(resolve(root,'tests/contracts/column-formatting.browser.ts'),'utf8').replace("'../../packages/grid-blazor/src/gridBindings.js'","'@final-blazor-wire'")
// The existing fair startup harness is preserved; include fixture allocation in
// additional full-application metrics, and retain its prior inclusive phases.
source=source.replace('  const data=Array.from({length:30000}', '  const fullStart=performance.now()\n  const data=Array.from({length:30000}')
source=source.replace('  const renderMs=performance.now()-renderStart,renderReadyMs=performance.now()-totalStart','  const renderMs=performance.now()-renderStart,renderReadyMs=performance.now()-totalStart,fullRenderReadyMs=performance.now()-fullStart')
source=source.replace('  const firstUsableMs=performance.now()-totalStart','  const firstUsableMs=performance.now()-totalStart,fullFirstUsableMs=performance.now()-fullStart')
source=source.replace('return{spec,descriptorMs,adoptionMs,nativeConstructorMs,renderMs,renderReadyMs,firstUsableMs,','return{spec,descriptorMs,adoptionMs,nativeConstructorMs,renderMs,renderReadyMs,firstUsableMs,fullRenderReadyMs,fullFirstUsableMs,')
source+='\nimport {qualifySharing} from "@final-qualification"\nObject.assign(window,{runFinalSharingQualification:()=>qualifySharing(WebGrid,counts,reset,qualification)})\n'
writeFileSync(entry,source);writeFileSync(html,'<!doctype html><meta charset="utf-8"><script type="module" src="./entry.ts"></script>')
const comparisons=experiment==='A'?[
 {name:'AA',left:'current',right:'current-AA'},
 {name:'vue-metadata',left:'current',right:'no-vue-metadata'},
 {name:'web-guards',left:'current',right:'no-web-guards'},
 {name:'alignment-css',left:'current',right:'no-alignment-css'},
]:[
 {name:'AA',left:'current',right:'current-AA'},
 {name:'current-vs-shared',left:'current',right:'shared-date'},
 {name:'baseline-vs-shared',left:'baseline',right:'shared-date'},
 {name:'baseline-vs-current',left:'baseline',right:'current'},
]
const variants=productionQualification?['current','current-AA']:[...new Set([...comparisons.flatMap(c=>[c.left,c.right]),...(ownershipOnly?['detached-display','shared-date-detached']:[])])]
const provenance={head:'3c1e651054cc3da2ce88451c7cc5c402c7fc4138',runtime:arg('runtime','9fdf58e8d00962ee585dd70e1b9fc786823cbdb3'),baseline:'0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8',experiment,rounds,runs,ownershipOnly,productionQualification,comparisons,node:process.version,os:os.release(),cpu:os.cpus()[0].model,entrySHA256:sha(source),sources:{},variants:{},policy:'Predeclared A=3 runs, B=2 runs, 30 pairs/comparison/run; stop host benchmarking after these focused experiments if inconclusive. Threshold unchanged max(5%,0.5ms). Ownership/production isolation has zero timing rounds.'}
for(const file of ['scripts/final-formatting-experiments.mjs','scripts/final-formatting-variants.mjs','tests/contracts/final-formatting-qualification.browser.ts'])provenance.sources[file]=sha(readFileSync(resolve(root,file)))
writeFileSync(resolve(output,'entry.ts.gz'),gzipSync(source,{level:9}))
try{
 for(const [index,variant] of variants.entries()){
  const path=variant==='baseline'?baseline:current,alias={},patches=[]
  for(const pkg of ['web','core','renderer','react','vue'])alias[`@tipolox/litgrid-${pkg}`]=resolve(path,`packages/grid-${pkg}/dist/index.js`)
  alias['@tipolox/litgrid-angular']=resolve(path,'dist/grid-angular/fesm2022/tipolox-litgrid-angular.mjs')
  alias.vue=resolve(current,'node_modules/vue/dist/vue.esm-bundler.js')
  alias['@final-blazor-wire']=resolve(current,'packages/grid-blazor/src/gridBindings.ts')
  alias['@final-qualification']=resolve(root,'tests/contracts/final-formatting-qualification.browser.ts')
  const outDir=resolve(output,'build',variant)
  await build({root,configFile:false,base:'./',logLevel:'error',plugins:[{name:'isolated-final-ablation',enforce:'pre',transform(code,id){
   const changed=transformVariant(variant,id,code,baseline)
   if(changed!==code){patches.push({file:id.replaceAll('\\','/'),before:sha(code),after:sha(changed)});writeFileSync(resolve(output,`${variant}-${patches.length}.before.js.gz`),gzipSync(code,{level:9}));writeFileSync(resolve(output,`${variant}-${patches.length}.after.js.gz`),gzipSync(changed,{level:9}));return{code:changed,map:null}}
  }}],resolve:{alias,dedupe:['react','react-dom','vue','@angular/core','@angular/common','@angular/compiler','@angular/platform-browser']},define:{FORMATTING_CANDIDATE:JSON.stringify(variant!=='baseline'),'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},build:{outDir,emptyOutDir:true,minify:true,rollupOptions:{input:html}}})
  if(!['current','current-AA','baseline'].includes(variant)&&patches.length!==1)throw Error('Unexpected patch count '+variant)
  const bundles=Object.fromEntries(readdirSync(resolve(outDir,'assets')).filter(x=>x.endsWith('.js')).map(file=>[file,sha(readFileSync(resolve(outDir,'assets',file)))]))
  const port=5260+index;servers.push(await preview({root,configFile:false,build:{outDir},preview:{host:'127.0.0.1',port,strictPort:true}}))
  provenance.variants[variant]={port,patches,bundles}
 }
 if(JSON.stringify(provenance.variants.current.bundles)!==JSON.stringify(provenance.variants['current-AA'].bundles))throw Error('A/A bytes differ')
 writeFileSync(resolve(output,'provenance.json'),JSON.stringify(provenance,null,2)+'\n')
 for(let run=0;run<runs;run++){
  const browser=await chromium.launch({headless:true}),report={...provenance,run,browser:browser.version(),kind:experiment==='A'?'default':'date',started:new Date().toISOString(),samples:[],errors}
  reports.push(report)
  const pairs=new Map()
  const page=async variant=>{
   const p=await browser.newPage({viewport:{width:1280,height:900}})
   p.on('pageerror',error=>errors.push({variant,message:error.message}))
   await p.goto(`http://127.0.0.1:${provenance.variants[variant].port}/.private/final-experiments/index.html`)
   await p.waitForFunction(()=>typeof window.runDateStartup==='function')
   return{page:p,cdp:await p.context().newCDPSession(p)}
  }
  const execute=async(variant,state)=>{
   const fresh=experiment==='B',target=fresh?await page(variant):state
   try{
    await target.page.bringToFront();await target.cdp.send('HeapProfiler.collectGarbage')
    await target.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    return await target.page.evaluate(experiment=>experiment==='A'?window.runFormattingWorkload({mode:'vue',rows:30000,columns:3,scenario:'default'}):window.runDateStartup({columns:120,input:'iso'}),experiment)
   }finally{if(fresh)await target.page.close()}
  }
  try{
   if(experiment==='B'){
    report.qualification=[]
    for(const variant of productionQualification?['current']:ownershipOnly?['current','shared-date','detached-display','shared-date-detached']:['current','shared-date']){const target=await page(variant);try{report.qualification.push({variant,...await target.page.evaluate(()=>window.runFinalSharingQualification())})}finally{await target.page.close()}}
    console.log('PASS sharing qualification run '+(run+1))
   }else{
    for(const comparison of run%2?[...comparisons].reverse():comparisons){
     const states={};for(const side of run%2?['right','left']:['left','right'])states[side]=await page(comparison[side]);pairs.set(comparison.name,states)
    }
    for(let warm=0;warm<3;warm++)for(const c of comparisons)for(const side of warm%2?['right','left']:['left','right'])await execute(c[side],pairs.get(c.name)[side])
   }
   for(let round=0;round<rounds;round++){
    const order=comparisons.map((_,i)=>comparisons[(i+run+round)%comparisons.length]);if(round%2)order.reverse()
    for(const c of order){
     const values=[]
     for(const side of (round+run+comparisons.indexOf(c))%2?['right','left']:['left','right']){
      const value=await execute(c[side],pairs.get(c.name)?.[side]);values.push(value)
      report.samples.push({round,variant:side==='left'?'baseline':'candidate',actualVariant:c[side],...value,spec:{...value.spec,comparison:c.name}})
     }
     if(experiment==='A')for(const key of ['mountCounts','updateCounts','scrollCounts'])if(JSON.stringify(values[0][key])!==JSON.stringify(values[1][key]))throw Error('A counter mismatch '+c.name)
    }
    writeFileSync(resolve(output,`run-${run+1}.raw.json.gz`),gzipSync(JSON.stringify(report),{level:9}))
    if((round+1)%5===0)console.log(`Experiment ${experiment} run ${run+1}/${runs} round ${round+1}/${rounds}: ${report.samples.length} samples`)
   }
   report.finished=new Date().toISOString()
   if(errors.length)throw Error(JSON.stringify(errors))
  }finally{writeFileSync(resolve(output,`run-${run+1}.raw.json.gz`),gzipSync(JSON.stringify(report),{level:9}));await browser.close()}
 }
 console.log('PASS '+experiment+' completed predeclared schedule')
}finally{for(const server of servers)await new Promise(resolve=>server.httpServer.close(resolve))}
