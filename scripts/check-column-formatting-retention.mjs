import {preview} from 'vite'
import {chromium} from 'playwright'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync} from 'node:fs'

// Run after the production formatting browser build. This is a GC ownership
// regression gate, not a wall-clock benchmark or native-memory certification.
const value=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)??fallback
const build=resolve(value('build','.private/column-formatting-browser/candidate'))
const entry=value('entry','/tests/contracts/column-formatting.browser.html')
const output=resolve(value('output','.private/column-formatting-retention.json'))
const browser=await chromium.launch({headless:true}),results=[]
const server=await preview({configFile:false,build:{outDir:build},preview:{host:'127.0.0.1',port:5290,strictPort:true}})
try{
 for(const kind of ['DateTimeFormat','NumberFormat']){
  const page=await browser.newPage({viewport:{width:1280,height:900}})
  await page.goto('http://127.0.0.1:5290'+entry);await page.waitForFunction(()=>typeof window.runDateStartup==='function')
  await page.evaluate(async kind=>{
   const refs=[],Native=Intl[kind]
   const Tracking=function(...args){const instance=Reflect.construct(Native,args);refs.push(new WeakRef(instance));return instance}
   Tracking.prototype=Native.prototype;Object.setPrototypeOf(Tracking,Native);Object.defineProperty(Intl,kind,{value:Tracking,writable:true,configurable:true})
   const Grid=customElements.get('yc-grid'),grid=new Grid();grid.data=[{value:'2026-11-10T00:15:00.1234567Z',n:1.5}];grid.viewportHeight=200;document.body.append(grid)
   const zones=['UTC','Asia/Singapore','America/New_York','Asia/Tokyo'],styles=['short','medium','long','full'],locales=['en-GB','de-DE','ja-JP','fr-FR']
   const stable=kind==='DateTimeFormat'?{kind:'number',locale:'en-GB'}:{kind:'dateTime',locale:'en-GB',options:{timeZone:'UTC'}}
   for(let i=0;i<64;i++){
    const format=kind==='DateTimeFormat'?{kind:'dateTime',locale:'en-GB',options:{timeZone:zones[i%4],dateStyle:styles[Math.floor(i/4)%4],timeStyle:styles[Math.floor(i/16)]}}:{kind:'number',locale:locales[Math.floor(i/16)],options:{maximumFractionDigits:i%16}}
    grid.updateColumnSchema([{key:'changed',accessor:row=>kind==='DateTimeFormat'?row.value:row.n,format},{key:'stable',accessor:row=>kind==='DateTimeFormat'?row.n:row.value,format:stable}]);await grid.updateComplete
   }
   window.formatRetentionProbe={refs,grid,stable}
  },kind)
  const cdp=await page.context().newCDPSession(page)
  const collect=async()=>{await cdp.send('HeapProfiler.collectGarbage');await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));await cdp.send('HeapProfiler.collectGarbage');return page.evaluate(()=>({constructed:window.formatRetentionProbe.refs.length,alive:window.formatRetentionProbe.refs.filter(ref=>ref.deref()).length,activeFormats:window.formatRetentionProbe.grid.columnFormats.size}))}
  const active=await collect()
  await page.evaluate(async()=>{const {grid,stable}=window.formatRetentionProbe;grid.updateColumnSchema([{key:'stable',format:stable}]);await grid.updateComplete})
  const removed=await collect()
  await page.evaluate(()=>window.formatRetentionProbe.grid.remove())
  const disconnected=await collect()
  const pass=active.constructed===64&&active.alive===1&&removed.alive===0&&disconnected.alive===0
  results.push({kind,active,removed,disconnected,pass});await page.close()
 }
 mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify({browser:browser.version(),method:'64 descriptor changes, stable sibling column, two explicit full collections after separate JS turns; only weak instance references retained by probe.',results},null,2)+'\n')
 console.log(JSON.stringify(results));if(results.some(r=>!r.pass))throw Error('Retired Intl instances remain reachable')
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
