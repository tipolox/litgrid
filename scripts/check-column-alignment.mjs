import { build, preview } from 'vite'
import { chromium } from 'playwright'
import { mkdirSync,writeFileSync } from 'node:fs'
import { resolve,dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Correctness only: no timers, warmup rounds, or performance acceptance claims.
const root=fileURLToPath(new URL('../',import.meta.url))
const baseline=process.argv.find(arg=>arg.startsWith('--baseline='))?.slice(11)
const output=resolve(root,process.argv.find(arg=>arg.startsWith('--output='))?.slice(9)??'.private/column-alignment-report.json')
const servers=[], errors=[], workloads=[]
const report={qualification:null,performance:'PERF NOT QUALIFIED',timingRounds:0,node:process.version,baseline:baseline??null,workloads,errors}
let browser
try {
  browser=await chromium.launch({headless:true});report.browser=browser.version()
  const pages={}
  for(const [variant,source] of [['candidate',root],...(baseline?[['baseline',resolve(baseline)]]:[])]) {
    const outDir=resolve(root,'.private/column-alignment-browser',variant),alias={}
    for(const pkg of ['web','core','renderer','react','vue'])alias[`@tipolox/litgrid-${pkg}`]=resolve(source,`packages/grid-${pkg}/dist/index.js`)
    alias['@tipolox/litgrid-angular']=resolve(source,'dist/grid-angular/fesm2022/tipolox-litgrid-angular.mjs')
    alias.vue=resolve(root,'node_modules/vue/dist/vue.esm-bundler.js')
    await build({root,configFile:false,base:'./',logLevel:'warn',resolve:{alias,dedupe:['react','react-dom','vue','@angular/core','@angular/common','@angular/compiler','@angular/platform-browser']},define:{'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},build:{outDir,emptyOutDir:true,minify:true,rollupOptions:{input:resolve(root,'tests/contracts/column-alignment.browser.html')}}})
    const port=variant==='candidate'?5236:5237
    servers.push(await preview({root,configFile:false,build:{outDir},preview:{host:'127.0.0.1',port,strictPort:true}}))
    const page=await browser.newPage({viewport:{width:1280,height:900}})
    page.on('pageerror',error=>errors.push({variant,message:error.message}))
    await page.goto(`http://127.0.0.1:${port}/tests/contracts/column-alignment.browser.html`)
    await page.waitForFunction(()=>typeof window.runAlignmentStructure==='function')
    pages[variant]=page
  }
  report.qualification=await pages.candidate.evaluate(()=>window.runAlignmentQualification())
  for(const rows of [5000,30000])for(const columns of [3,120])for(const mode of ['web','react','vue','angular','declarative','inferred']) {
    if(mode==='inferred'&&columns!==3)continue
    const plain={mode,rows,columns,aligned:false}
    const candidate=await pages.candidate.evaluate(spec=>window.runAlignmentStructure(spec),plain)
    workloads.push({variant:'candidate',...candidate})
    if(pages.baseline) {
      const reference=await pages.baseline.evaluate(spec=>window.runAlignmentStructure(spec),plain)
      workloads.push({variant:'baseline',...reference})
      for(const phase of ['mountCounts','updateCounts','metadataCounts','maxDom']) {
        if(JSON.stringify(reference[phase])!==JSON.stringify(candidate[phase]))throw Error(`Unconfigured ${phase} parity failed: ${JSON.stringify({plain,reference:reference[phase],candidate:candidate[phase]})}`)
      }
    }
    if(mode!=='inferred') {
      const aligned=await pages.candidate.evaluate(spec=>window.runAlignmentStructure(spec),{...plain,aligned:true})
      workloads.push({variant:'candidate',...aligned})
      if(JSON.stringify(aligned.maxDom)!==JSON.stringify(candidate.maxDom))throw Error('Alignment added DOM nodes: '+JSON.stringify(plain))
    }
  }
  if(errors.length)throw Error(JSON.stringify(errors))
  console.log(`PASS alignment geometry, framework recovery and ${workloads.length} correctness-only structural workloads`)
} finally {
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n')
  await browser?.close()
  for(const server of servers)await new Promise(resolve=>server.httpServer.close(resolve))
}
