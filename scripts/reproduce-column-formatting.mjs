import { build, preview } from 'vite'
import { chromium, firefox } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import os from 'node:os'

const root=fileURLToPath(new URL('../',import.meta.url))
const arg=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.split('=').slice(1).join('=')??fallback
const baseline=resolve(arg('baseline','../column-formatting-34-base'))
const output=resolve(arg('output','.private/formatting-reproduction'))
const rounds=Number(arg('rounds','30'))
const engine=arg('engine','chromium'),kind=arg('kind','default'),aa=process.argv.includes('--aa'),trace=process.argv.includes('--trace')
const cold=process.argv.includes('--cold')
const runs=Number(arg('runs','3')),servers=[]
const hash=b=>createHash('sha256').update(b).digest('hex')
const focused=[['react',5000,120],['vue',30000,3],['inferred',30000,3],['vue',30000,120],['web',5000,120],['web',30000,120],['react',30000,120]].map(([mode,rows,columns])=>({mode,rows,columns,scenario:'default'}))
const dates=[1,120].flatMap(columns=>['epoch','iso'].map(input=>({columns,input})))
const specs=kind==='date'?dates:focused
mkdirSync(output,{recursive:true})
const provenance={baseline:'0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8',candidate:'9fdf58e8d00962ee585dd70e1b9fc786823cbdb3',runtimeUnmodified:true,node:process.version,os:os.release(),cpu:os.cpus()[0].model,logicalCPUs:os.cpus().length,totalMemory:os.totalmem(),rounds,runs,engine,kind,aa,trace,cold,productionBundles:{},harness:{}}
for(const file of ['scripts/reproduce-column-formatting.mjs','tests/contracts/column-formatting.browser.ts','pnpm-lock.yaml'])provenance.harness[file]=hash(readFileSync(resolve(root,file)))
try{
  for(const variant of ['baseline','candidate']){
    const source=variant==='baseline'||aa?baseline:root,outDir=resolve(output,'build',variant),alias={}
    for(const pkg of ['web','core','renderer','react','vue'])alias[`@tipolox/litgrid-${pkg}`]=resolve(source,`packages/grid-${pkg}/dist/index.js`)
    alias['@tipolox/litgrid-angular']=resolve(source,'dist/grid-angular/fesm2022/tipolox-litgrid-angular.mjs')
    alias.vue=resolve(root,'node_modules/vue/dist/vue.esm-bundler.js')
    await build({root,configFile:false,base:'./',logLevel:'warn',resolve:{alias,dedupe:['react','react-dom','vue','@angular/core','@angular/common','@angular/compiler','@angular/platform-browser']},define:{FORMATTING_CANDIDATE:JSON.stringify(variant==='candidate'&&!aa),'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},build:{outDir,emptyOutDir:true,minify:true,rollupOptions:{input:resolve(root,'tests/contracts/column-formatting.browser.html')}}})
    provenance.productionBundles[variant]=Object.fromEntries(readdirSync(resolve(outDir,'assets')).filter(x=>x.endsWith('.js')).map(file=>[file,hash(readFileSync(resolve(outDir,'assets',file)))]))
    servers.push(await preview({root,configFile:false,build:{outDir},preview:{host:'127.0.0.1',port:variant==='baseline'?5240:5241,strictPort:true}}))
  }
  writeFileSync(resolve(output,'provenance.json'),JSON.stringify(provenance,null,2)+'\n')
  for(let run=0;run<runs;run++){
    const browser=await (engine==='firefox'?firefox:chromium).launch({headless:true})
    const pages={},sessions={},report={...provenance,run,browser:browser.version(),started:new Date().toISOString(),samples:[],errors:[]}
    const createPage=async variant=>{
      const page=await browser.newPage({viewport:{width:1280,height:900}});pages[variant]=page
      page.on('pageerror',error=>report.errors.push({variant,message:error.message}))
      await page.goto(`http://127.0.0.1:${variant==='baseline'?5240:5241}/tests/contracts/column-formatting.browser.html`)
      await page.waitForFunction(()=>typeof window.runDateStartup==='function')
      if(engine==='chromium')sessions[variant]=await page.context().newCDPSession(page)
    }
    const execute=async(variant,spec)=>{
      if(cold){await pages[variant]?.close();await createPage(variant)}
      const page=pages[variant];await page.bringToFront()
      if(sessions[variant])await sessions[variant].send('HeapProfiler.collectGarbage')
      // Equal frame phase and layout settlement; GC is outside measurement.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
      return await page.evaluate(({spec,kind})=>kind==='date'?window.runDateStartup(spec):window.runFormattingWorkload(spec),{spec,kind})
    }
    try{
      // Reverse page creation order as well as measurement order across runs.
      for(const variant of run%2?['candidate','baseline']:['baseline','candidate']){
        await createPage(variant)
      }
      // Both variants receive all focused cases three times. No candidate-only qualification.
      if(!cold)for(let warm=0;warm<3;warm++)for(const spec of specs)for(const variant of warm%2?['candidate','baseline']:['baseline','candidate'])await execute(variant,spec)
      for(let round=0;round<rounds;round++){
        // Rotate and reverse case sequence, never change the retained case set.
        const order=specs.map((_,i)=>specs[(i+round+run)%specs.length]);if(round%2)order.reverse()
        for(const spec of order){
          for(const variant of (round+run)%2?['candidate','baseline']:['baseline','candidate']){
            const result=await execute(variant,spec)
            report.samples.push({round,variant,...result})
          }
        }
        writeFileSync(resolve(output,`run-${run+1}.raw.json.gz`),gzipSync(JSON.stringify(report),{level:9}))
        if((round+1)%5===0)console.log(`${engine} ${kind}${aa?' A/A':''} run ${run+1}/${runs} round ${round+1}/${rounds}: ${report.samples.length} samples`)
      }
      if(trace&&engine==='chromium'){
        // Separate diagnostic samples: tracing/profiling never contaminates distributions.
        report.traces=[]
        for(const spec of specs)for(let pair=0;pair<5;pair++)for(const variant of pair%2?['candidate','baseline']:['baseline','candidate']){
          const page=pages[variant],cdp=sessions[variant],events=[]
          await page.bringToFront();await cdp.send('HeapProfiler.collectGarbage')
          const onData=event=>events.push(...event.value);cdp.on('Tracing.dataCollected',onData)
          await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:250});await cdp.send('Profiler.start')
          await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline',transferMode:'ReportEvents'})
          const result=await execute(variant,spec)
          const profile=(await cdp.send('Profiler.stop')).profile
          const finished=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await finished
          cdp.off('Tracing.dataCollected',onData)
          const name=`trace-${run+1}-${spec.mode}-${spec.rows}-${spec.columns}-${pair}-${variant}.json.gz`
          writeFileSync(resolve(output,name),gzipSync(JSON.stringify({variant,spec,result,events,profile}),{level:9}))
          report.traces.push(name)
        }
      }
      report.finished=new Date().toISOString()
      if(report.errors.length)throw Error(JSON.stringify(report.errors))
    }finally{writeFileSync(resolve(output,`run-${run+1}.raw.json.gz`),gzipSync(JSON.stringify(report),{level:9}));await browser.close()}
  }
}finally{for(const server of servers)await new Promise(resolve=>server.httpServer.close(resolve))}
