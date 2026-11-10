import { build, preview } from 'vite'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=fileURLToPath(new URL('../',import.meta.url))
const baseline=process.argv.find(arg=>arg.startsWith('--baseline='))?.slice('--baseline='.length)
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice('--output='.length)??'.private/column-formatting-report.json'
const rounds=Number(process.argv.find(arg=>arg.startsWith('--rounds='))?.slice('--rounds='.length)??15)
const defaultsOnly=process.argv.includes('--defaults-only')
const servers=[]
let browser
const workloads=[],errors=[]
const report={baseline:baseline??null,node:process.version,rounds,defaultsOnly,productionBuild:true,workloads,errors}
try{
  const pages={}
  browser=await chromium.launch({headless:true})
  report.browser=browser.version()
  for(const [variant,source] of [['candidate',root],...(baseline?[['baseline',resolve(baseline)]]:[])]){
    const outDir=resolve(root,'.private/column-formatting-browser',variant)
    const alias={}
    for(const pkg of ['web','core','renderer','react','vue'])alias[`@tipolox/litgrid-${pkg}`]=resolve(source,`packages/grid-${pkg}/dist/index.js`)
    alias['@tipolox/litgrid-angular']=resolve(source,'dist/grid-angular/fesm2022/tipolox-litgrid-angular.mjs')
    alias.vue=resolve(root,'node_modules/vue/dist/vue.esm-bundler.js')
    await build({root,configFile:false,base:'./',logLevel:'warn',resolve:{alias,dedupe:['react','react-dom','vue','@angular/core','@angular/common','@angular/compiler','@angular/platform-browser']},define:{FORMATTING_CANDIDATE:JSON.stringify(variant==='candidate'),'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},build:{outDir,emptyOutDir:true,minify:true,rollupOptions:{input:resolve(root,'tests/contracts/column-formatting.browser.html')}}})
    const server=await preview({root,configFile:false,build:{outDir},preview:{host:'127.0.0.1',port:variant==='candidate'?5226:5227,strictPort:true}})
    servers.push(server)
    const page=await browser.newPage({viewport:{width:1280,height:900}})
    page.on('pageerror',error=>{errors.push({variant,message:error.message});console.error(variant+': '+error.message)})
    page.on('console',message=>{if(message.type()==='error')console.error(variant+': '+message.text())})
    await page.goto(`http://127.0.0.1:${variant==='candidate'?5226:5227}/tests/contracts/column-formatting.browser.html`)
    try { await page.waitForFunction(()=>typeof window.runFormattingWorkload==='function') }
    catch(error){console.error(await page.evaluate(()=>({url:location.href,html:document.documentElement.outerHTML.slice(0,1000),scripts:[...document.scripts].map(script=>script.src)})));throw error}
    pages[variant]=page
  }
  if(!defaultsOnly){
    report.qualification=await pages.candidate.evaluate(()=>window.runFormattingQualification())
    console.log('PASS production Chromium: 10 LTR/RTL geometry cases, mounted framework recovery, inline compiled Vue and Blazor JSON')
  }
  if(baseline){
    const specs=[]
    for(const rows of [5000,30000])for(const columns of [3,120]){
      for(const mode of ['web','react','vue','angular','declarative'])specs.push({mode,rows,columns,scenario:'default'})
      if(columns===3)specs.push({mode:'inferred',rows,columns,scenario:'default'})
      if(!defaultsOnly)for(const scenario of ['align','one-number','all-number','epoch','iso','render'])specs.push({mode:'web',rows,columns,scenario})
    }
    // JIT/module warmup before alternating paired production measurements.
    for(const page of Object.values(pages)){await page.bringToFront();for(let i=0;i<2;i++)await page.evaluate(spec=>window.runFormattingWorkload(spec),{mode:'web',rows:5000,columns:120,scenario:'default'})}
    for(let round=0;round<rounds;round++){
      for(const spec of specs){
        const pair=round%2?['candidate','baseline']:['baseline','candidate']
        const results=[]
        for(const variant of pair){
          await pages[variant].bringToFront()
          const cdp=await pages[variant].context().newCDPSession(pages[variant])
          await cdp.send('HeapProfiler.collectGarbage')
          const result=await pages[variant].evaluate(spec=>window.runFormattingWorkload(spec),spec)
          const heap=await cdp.send('Runtime.getHeapUsage');await cdp.detach()
          const sample={round,variant,...result,heap}
          workloads.push(sample);results.push(sample)
        }
        if(spec.scenario==='default')for(const phase of ['mountCounts','updateCounts'])for(const key of ['schema','data','config','inference']){
          if(results[0][phase][key]!==results[1][phase][key])throw Error(`Default setter mismatch ${JSON.stringify(spec)} ${phase}.${key}`)
        }
      }
      console.log(`Paired production round ${round+1}/${rounds}: ${workloads.length} samples`)
      mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n')
    }
    // Sample allocation stacks and GC events on the widest unconfigured case.
    report.allocationProfiles=[]
    for(const variant of ['baseline','candidate']){
      const page=pages[variant],cdp=await page.context().newCDPSession(page)
      await page.bringToFront()
      const events=[];cdp.on('Tracing.dataCollected',event=>events.push(...event.value))
      await cdp.send('HeapProfiler.startSampling',{samplingInterval:16384})
      await cdp.send('Tracing.start',{categories:'v8',transferMode:'ReportEvents'})
      for(let i=0;i<3;i++)await page.evaluate(spec=>window.runFormattingWorkload(spec),{mode:'web',rows:30000,columns:120,scenario:'default'})
      const profile=await cdp.send('HeapProfiler.stopSampling')
      const finished=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve))
      await cdp.send('Tracing.end');await finished
      report.allocationProfiles.push({variant,profile:profile.profile,gcEvents:events.filter(event=>/GC|Scavenge|Mark/.test(event.name))})
      await cdp.detach()
    }
  }
  if(errors.length)throw Error(JSON.stringify(errors))
  mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n')
  console.log(`PASS: report ${output}; ${workloads.length} samples`)
}finally{
  if(errors.length)console.error(JSON.stringify(errors))
  await browser?.close()
  for(const server of servers)await new Promise(resolve=>server.httpServer.close(resolve))
}
