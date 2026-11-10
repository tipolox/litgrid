import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve,sep } from 'node:path'
import { cpus,loadavg,totalmem,release } from 'node:os'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
if(process.env.GITHUB_ACTIONS!=='true')throw Error('This timing probe runs only in the independent CI investigation; no laptop timing replay.')
const phase=process.argv[2]??'pilot',replicate=Number(process.env.REPLICATE),rounds=30
if(!['pilot','full'].includes(phase)||![1,2,3].includes(replicate))throw Error('Invalid schedule')
const dir=resolve(`results/${phase}-${replicate}`),bundles=resolve('ci-perf-build')
mkdirSync(dir,{recursive:true})
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const manifest=JSON.parse(readFileSync(resolve(bundles,'manifest.json')))
for(const [variant,files] of Object.entries(manifest.bundles))for(const [file,expected] of Object.entries(files)){
  if(hash(resolve(bundles,variant==='control'?'baseline':variant,file))!==expected)throw Error('Bundle bytes changed')
}
const optional=file=>{try{return readFileSync(file,'utf8')}catch{return null}}
const hostSnapshot=()=>({at:new Date().toISOString(),load:loadavg(),cpuStat:optional('/proc/stat'),pressure:{cpu:optional('/proc/pressure/cpu'),memory:optional('/proc/pressure/memory'),io:optional('/proc/pressure/io')}})
const report={phase,replicate,rounds,manifest,environment:{node:process.version,os:release(),image:process.env.ImageOS,imageVersion:process.env.ImageVersion,runner:process.env.RUNNER_NAME,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,harness:process.env.GITHUB_SHA,cpuModels:[...new Set(cpus().map(cpu=>cpu.model))],cpuCount:cpus().length,memory:totalmem(),cpuInfo:optional('/proc/cpuinfo'),cgroup:optional('/proc/self/cgroup'),bootId:optional('/proc/sys/kernel/random/boot_id'),browserExecutableSha256:hash(chromium.executablePath()),playwright:JSON.parse(readFileSync('node_modules/playwright/package.json')).version},samples:[],traces:[],errors:[],start:hostSnapshot()}
report.environment.cpuQuota=optional('/sys/fs/cgroup/cpu.max')
report.environment.cpuSet=optional('/sys/fs/cgroup/cpuset.cpus.effective')
report.environment.governor=optional('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor')
report.environment.processes=execFileSync('ps',['-eo','pid,comm,pcpu,pmem','--sort=-pcpu'],{encoding:'utf8'})
const server=createServer((request,response)=>{
 try{
  const parts=new URL(request.url,'http://localhost').pathname.split('/').filter(Boolean),variant=parts.shift()
  if(!['baseline','candidate','control'].includes(variant))throw Error('Invalid variant')
  const base=resolve(bundles,variant==='control'?'baseline':variant),file=resolve(base,...parts)
  if(!file.startsWith(base+sep)||!existsSync(file))throw Error('Missing file')
  response.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream')
  response.setHeader('Cache-Control','no-store');response.setHeader('Cross-Origin-Opener-Policy','same-origin');response.setHeader('Cross-Origin-Embedder-Policy','require-corp')
  response.end(readFileSync(file))
 }catch{response.writeHead(404);response.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--enable-automation','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']})
report.environment.browser=browser.version()
const browserSession=await browser.newBrowserCDPSession()
report.environment.browserCommandLine=(await browserSession.send('Browser.getBrowserCommandLine')).arguments
report.environment.actualBrowserExecutableSha256=hash(report.environment.browserCommandLine[0])
report.environment.browserProtocol=await browserSession.send('Browser.getVersion')
if(report.environment.actualBrowserExecutableSha256!==report.environment.browserExecutableSha256)throw Error('Unexpected browser executable')
const pages={},sessions={}
const cases=phase==='pilot'?[{mode:'vue',rows:30000,columns:3}]:[5000,30000].flatMap(rows=>[3,120].flatMap(columns=>['vue','web','react','angular'].map(mode=>({mode,rows,columns}))))
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
async function execute(variant,spec){
 const page=pages[variant],cdp=sessions[variant]
 await page.bringToFront();await cdp.send('HeapProfiler.collectGarbage');await settle(page)
 if(await page.evaluate(()=>document.visibilityState)!=='visible')throw Error('Background page')
 const before=await cdp.send('Performance.getMetrics')
 const value=await page.evaluate(spec=>window.runCiPerformanceSample(spec),spec)
 const after=await cdp.send('Performance.getMetrics'),heap=await cdp.send('Runtime.getHeapUsage')
 return{...value,cdpBefore:before.metrics,cdpAfter:after.metrics,heap}
}
try{
 for(const variant of ['baseline','candidate','control']){
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1})
  page.on('pageerror',error=>report.errors.push({variant,message:error.message}))
  await page.goto(`http://127.0.0.1:${port}/${variant}/tests/contracts/ci-performance.browser.html`)
  await page.waitForFunction(()=>typeof window.runCiPerformanceSample==='function')
  pages[variant]=page;sessions[variant]=await page.context().newCDPSession(page);await sessions[variant].send('Performance.enable')
 }
 // Equal deterministic warmup for every page and case; no timers enter the report.
 for(const spec of cases)for(let warm=0;warm<3;warm++)for(const variant of ['baseline','candidate','control'].map((_,i,all)=>all[(i+warm+replicate)%3]))await execute(variant,spec)
 for(let round=0;round<rounds;round++){
  const rotated=cases.map((_,index)=>cases[(index+round)%cases.length]);if(round%2)rotated.reverse()
  for(const spec of rotated)for(const comparison of (round%2?['AB','AA']:['AA','AB'])){
   const right=comparison==='AA'?'control':'candidate',order=round%2?[right,'baseline']:['baseline',right]
   const hostBefore=hostSnapshot(),values={}
   for(const variant of order)values[variant]=await execute(variant,spec)
   const pair={comparison,round,spec,order,left:values.baseline,right:values[right],hostBefore,hostAfter:hostSnapshot()}
   for(const key of ['mountCounts','updateCounts','scrollCounts','dom'])if(JSON.stringify(pair.left[key])!==JSON.stringify(pair.right[key]))throw Error('Structural parity failed '+JSON.stringify({spec,key,comparison}))
   report.samples.push(pair)
   writeFileSync(resolve(dir,'raw.json'),JSON.stringify(report)+'\n')
  }
 }
 // Diagnostic traces are separate from timing distributions, after timed work.
 for(const spec of cases)for(const comparison of ['AA','AB'])for(let round=0;round<3;round++)for(const variant of (round%2?[comparison==='AA'?'control':'candidate','baseline']:['baseline',comparison==='AA'?'control':'candidate'])){
  const cdp=sessions[variant],events=[]
  const listener=event=>events.push(...event.value);cdp.on('Tracing.dataCollected',listener)
  await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.gc',transferMode:'ReportEvents'})
  await execute(variant,spec)
  const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await done;cdp.off('Tracing.dataCollected',listener)
  const file=`trace-${spec.mode}-${spec.rows}-${spec.columns}-${comparison}-${round}-${variant}.json.gz`
  writeFileSync(resolve(dir,file),gzipSync(JSON.stringify({traceEvents:events})))
  report.traces.push({file,sha256:hash(resolve(dir,file)),spec,comparison,round,variant})
 }
 if(report.errors.length)throw Error('Browser errors')
 report.complete=true
}catch(error){report.errors.push({fatal:String(error)});throw error}
finally{
 report.end=hostSnapshot();writeFileSync(resolve(dir,'raw.json'),JSON.stringify(report)+'\n')
 await browser.close();await new Promise(resolve=>server.close(resolve))
}
console.log('CI_PERF_RUN '+JSON.stringify({phase,replicate,pairs:report.samples.length,traces:report.traces.length,environment:report.environment}))
