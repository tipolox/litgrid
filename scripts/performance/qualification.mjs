import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
// Run from a tool installation containing vite. Alternate order on the same
// browser/viewport; fixture allocation is outside the initial adoption timer.
const [candidateArg, baselineArg, playwrightArg, outArg] = process.argv.slice(2)
const candidate = path.resolve(candidateArg), baseline = path.resolve(baselineArg)
const { createServer } = await import(pathToFileURL(path.join(candidate,'node_modules/vite/dist/node/index.js')))
const { chromium } = await import(pathToFileURL(path.join(playwrightArg,'index.mjs')))
const server = await createServer({ root:candidate, configFile:false, server:{host:'127.0.0.1',port:5203,strictPort:true,fs:{allow:[candidate,baseline]}}, plugins:[{
 name:'qualification-sources',enforce:'pre',
 resolveId(source,importer) {
  const owner = importer?.replaceAll('\\','/').startsWith(baseline.replaceAll('\\','/')) ? baseline : candidate
  const packages = {'@tipolox/litgrid-core':'grid-core','@tipolox/litgrid-renderer':'grid-renderer'}
  if(packages[source]) return path.join(owner,'packages',packages[source],'src/index.ts')
  if(importer && source.startsWith('.') && source.endsWith('.js')) { const ts=path.resolve(path.dirname(importer),source.slice(0,-3)+'.ts'); if(!ts.includes('node_modules') && fs.existsSync(ts)) return ts }
 },
 transform(code,id) { if(id.replaceAll('\\','/').startsWith(baseline.replaceAll('\\','/')) && id.endsWith('/components/DataGrid.ts')) return code.replaceAll("'yc-grid'","'yc-grid-v110'") },
 configureServer(s) { s.middlewares.use('/qualification',(_,r)=>{r.setHeader('content-type','text/html');r.end('<!doctype html><title>Performance</title><div id="host"></div>')}) }
}]})
await server.listen()
const browser=await chromium.launch({headless:true})
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5203/qualification')
 await page.evaluate(async paths=>{window.Grids={};for(const [key,p] of Object.entries(paths)) window.Grids[key]=(await import(/* @vite-ignore */p)).DataGrid}, {candidate:`/@fs/${candidate.replaceAll('\\','/')}/packages/grid-web/src/components/DataGrid.ts`,v110:`/@fs/${baseline.replaceAll('\\','/')}/packages/grid-web/src/components/DataGrid.ts`})
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable')
 const samples=[]
 for(const count of [30000,100000]) for(const columns of [120,200]) for(let i=0;i<20;i++) for(const variant of i%2?['candidate','v110']:['v110','candidate']) {
  const gc=i<10?'forced':'natural';if(gc==='forced')await cdp.send('HeapProfiler.collectGarbage')
  const sample=await page.evaluate(async({count,columns,i,variant,gc})=>{
   const grid=new window.Grids[variant]();grid.style.width='1000px';grid.viewportHeight=400
   grid.config={selection:{mode:'multi-row',rowKey:'id'}}
   grid.columns=Array.from({length:columns},(_,c)=>({key:`c${c}`,width:120,accessor:r=>`${r.id}/${c}`}))
   const data=Array.from({length:count},(_,id)=>({id,name:`Fictional unit ${id}`}))
   const begin=performance.now();grid.data=data;document.querySelector('#host').append(grid);await grid.updateComplete;const adopt=performance.now()-begin
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const paint=performance.now()-begin
   const viewport=grid.shadowRoot.querySelector('.viewport');const scroll=[];const selection=[];let maxCells=0
   for(let n=0;n<10;n++) {const t=performance.now();viewport.scrollTop=(n*7919%count)*36;viewport.scrollLeft=n*541%(columns*120-1000);viewport.dispatchEvent(new Event('scroll'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await grid.updateComplete;scroll.push(performance.now()-t);maxCells=Math.max(maxCells,grid.shadowRoot.querySelectorAll('.cell').length)}
   for(let n=0;n<10;n++){const t=performance.now();grid.selectRow(n);await grid.updateComplete;selection.push(performance.now()-t)}
   grid.remove();return {count,columns,i,variant,gc,adoptMs:adopt,firstPaintWaitMs:paint,scrollMs:scroll,selectionMs:selection,maxCells}
  },{count,columns,i,variant,gc})
  const metrics=await cdp.send('Performance.getMetrics');sample.heapUsed=metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value;samples.push(sample)
 }
 const external=await page.evaluate(async()=>{const grid=new window.Grids.candidate();grid.config={queryMode:'external'};grid.columns=[{key:'name'}];document.querySelector('#host').append(grid);const result=[];let id=1;for(const totalRows of [352,30000,100000,1e9]){const ms=[];for(let i=0;i<50;i++){const t=performance.now();grid.setExternalState({requestId:id++,query:{search:'',filters:[],sort:{columnKey:null,direction:null},pageIndex:0,pageSize:20},rows:Array.from({length:20},(_,id)=>({id,name:`Fictional ${id}`})),total:{kind:'known',totalRows}});await grid.updateComplete;ms.push(performance.now()-t)}result.push({totalRows,loadedRows:20,ms,mountedRows:grid.shadowRoot.querySelectorAll('.row').length})}grid.remove();return result})
 await cdp.send('Profiler.enable');await cdp.send('Profiler.start')
 const coreControl=await page.evaluate(async p=>{
  const {createGridEngine}=await import(/* @vite-ignore */p)
  const result=[]
  for(const rows of [30000,100000])for(const rowKey of [undefined,'id']){
   const data=Array.from({length:rows},(_,id)=>({id,name:`Fictional ${id}`})),ms=[]
   for(let i=0;i<30;i++){const engine=createGridEngine({selection:{mode:'multi-row',...(rowKey?{rowKey}:{})}});const t=performance.now();engine.setData(data);ms.push(performance.now()-t)}
   result.push({rows,rowKey:rowKey??null,n:ms.length,ms})
  }return result
 },`/@fs/${candidate.replaceAll('\\','/')}/packages/grid-core/src/index.ts`)
 const {profile}=await cdp.send('Profiler.stop')
 const cpu=profile.nodes.filter(n=>n.hitCount).map(n=>({function:n.callFrame.functionName,url:n.callFrame.url.replace(candidate.replaceAll('\\','/'),'candidate'),hits:n.hitCount})).sort((a,b)=>b.hits-a.hits).slice(0,25)
 if(errors.length)throw new Error(JSON.stringify(errors))
 fs.writeFileSync(outArg,JSON.stringify({browser:browser.version(),viewport:{width:1280,height:900},samples,external,coreControl,cpu,network:'local Vite; no backend requests; adoption excludes fixture allocation and module loading',errors},null,2))
 console.log('Saved',samples.length,'local samples and 200 external commits to',outArg)
}finally{await browser.close();await server.close()}
