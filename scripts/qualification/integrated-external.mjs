import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [rootArg,playwright,out]=process.argv.slice(2),root=path.resolve(rootArg)
const {createServer}=await import(pathToFileURL(path.join(root,'node_modules/vite/dist/node/index.js')))
const {chromium}=await import(pathToFileURL(path.join(playwright,'index.mjs')))
const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port:5213,strictPort:true},plugins:[{
 name:'integrated-external-sources',enforce:'pre',resolveId(source,importer){
  const packages={'@tipolox/litgrid-core':'grid-core','@tipolox/litgrid-renderer':'grid-renderer'}
  if(packages[source])return path.join(root,'packages',packages[source],'src/index.ts')
  if(importer&&source.startsWith('.')&&source.endsWith('.js')){const ts=path.resolve(path.dirname(importer),source.slice(0,-3)+'.ts');if(!ts.includes('node_modules')&&fs.existsSync(ts))return ts}
 },configureServer(s){s.middlewares.use('/external-timing',(_,r)=>{r.setHeader('content-type','text/html');r.end('<!doctype html><title>Keyed external timing</title>')})}
}]})
await server.listen();const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5213/external-timing')
 await page.evaluate(async p=>{window.Grid=(await import(/* @vite-ignore */p)).DataGrid},`/@fs/${root.replaceAll('\\','/')}/packages/grid-web/src/components/DataGrid.ts`)
 const cdp=await page.context().newCDPSession(page),samples=[]
 for(let run=0;run<3;run++)for(const totalRows of [352,30000,100000,1e9])for(const keyed of [false,true]){
  await cdp.send('HeapProfiler.collectGarbage')
  samples.push(await page.evaluate(async({run,totalRows,keyed})=>{
   const grid=new window.Grid();grid.columns=[{key:'name'}];grid.config={queryMode:'external',selection:{mode:'multi-row',...(keyed?{rowKey:'id'}:{})}};document.body.append(grid);await grid.updateComplete
   let reads=0;const ms=[],identityReads=[],selectionMs=[]
   for(let i=0;i<50;i++){
    const rows=Array.from({length:20},(_,n)=>({get id(){reads++;return i*20+n},name:`Fictional ${i}/${n}`}))
    reads=0;const start=performance.now();grid.setExternalState({requestId:i+1,query:{search:'',filters:[],sort:{columnKey:null,direction:null},pageIndex:0,pageSize:20},rows,total:{kind:'known',totalRows}});await grid.updateComplete;ms.push(performance.now()-start);identityReads.push(reads)
    const selection=performance.now();if(keyed&&!grid.selectRowByKey(i*20+19))throw new Error('External last loaded key missing');if(keyed&&grid.selectRowByKey(i*20+20))throw new Error('External selected an unloaded key');grid.clearSelection();selectionMs.push(performance.now()-selection)
   }
   const mountedRows=grid.shadowRoot.querySelectorAll('.row').length;grid.remove();if(keyed&&Math.max(...identityReads)>24)throw new Error('External validation exceeded page bounds')
   return {run,totalRows,keyed,loadedRows:20,ms,identityReads,selectionMs,mountedRows}
  },{run,totalRows,keyed}))
 }
 if(errors.length)throw new Error(JSON.stringify(errors))
 fs.writeFileSync(out,JSON.stringify({node:process.version,browser:browser.version(),notes:'20 loaded rows, changing IDs on each commit, n=150 per total/key mode; forced GC before each 50-commit batch. Fixture allocation excluded. Selection is a separate timer.',samples,errors}))
 console.log('PASS integrated keyed/unkeyed external commits:',samples.length*50)
}finally{await browser.close();await server.close()}
