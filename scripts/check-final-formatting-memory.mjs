import {preview} from 'vite'
import {chromium} from 'playwright'
import {resolve} from 'node:path'
import {writeFileSync} from 'node:fs'
import {gzipSync} from 'node:zlib'

// Ownership/GC correctness probe, not a timing benchmark. Use the exact B builds.
const root=resolve(process.argv[2]??'.private/final-experiments/B'),browser=await chromium.launch({headless:true}),results=[]
const variants=process.argv.find(x=>x.startsWith('--variants='))?.slice(11).split(',')??(process.argv.includes('--all')?['current','shared-date','detached-display','shared-date-detached']:['current','shared-date'])
const servers=[]
try{
 for(const [index,variant] of variants.entries()){
  servers.push(await preview({configFile:false,build:{outDir:resolve(root,'build',variant)},preview:{host:'127.0.0.1',port:5280+index,strictPort:true}}))
  const page=await browser.newPage({viewport:{width:1280,height:900}})
  await page.goto(`http://127.0.0.1:${5280+index}/.private/final-experiments/index.html`);await page.waitForFunction(()=>typeof window.runDateStartup==='function')
  await page.evaluate(async()=>{
   const refs=[],Native=Intl.DateTimeFormat
   const Tracking=function(...args){const instance=Reflect.construct(Native,args);Object.defineProperty(instance,'__litgridProbeId',{value:'formatter-'+refs.length});refs.push(new WeakRef(instance));return instance}
   Tracking.prototype=Native.prototype;Object.setPrototypeOf(Tracking,Native);Object.defineProperty(Intl,'DateTimeFormat',{value:Tracking,writable:true,configurable:true})
   const Grid=customElements.get('yc-grid'),grid=new Grid();grid.data=[{value:'2026-11-10T00:15:00.1234567Z',n:1.5}];grid.viewportHeight=200;document.body.append(grid)
   const zones=['UTC','Asia/Singapore','America/New_York','Asia/Tokyo'],styles=['short','medium','long','full']
   for(let i=0;i<64;i++){
    grid.updateColumnSchema([{key:'date',accessor:row=>row.value,format:{kind:'dateTime',locale:'en-GB',options:{timeZone:zones[i%4],dateStyle:styles[Math.floor(i/4)%4],timeStyle:styles[Math.floor(i/16)]}}},
     {key:'n1',accessor:row=>row.n,format:{kind:'number',locale:'en-GB'}},{key:'n2',accessor:row=>row.n,format:{kind:'number',locale:'en-GB'}}])
    await grid.updateComplete
   }
   window.finalMemoryProbe={refs,grid}
  })
  const cdp=await page.context().newCDPSession(page)
  const collect=async()=>{await cdp.send('HeapProfiler.collectGarbage');await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));await cdp.send('HeapProfiler.collectGarbage');return await page.evaluate(()=>({constructed:window.finalMemoryProbe.refs.length,alive:window.finalMemoryProbe.refs.filter(ref=>ref.deref()).length,active:window.finalMemoryProbe.grid.columnFormats.size}))}
  const active=await collect()
  if(active.alive>1&&process.argv.includes('--snapshots')){
   const chunks=[],onChunk=event=>chunks.push(event.chunk);cdp.on('HeapProfiler.addHeapSnapshotChunk',onChunk)
   await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});cdp.off('HeapProfiler.addHeapSnapshotChunk',onChunk)
   writeFileSync(resolve(root,variant+'.active.heap.json.gz'),gzipSync(chunks.join(''),{level:9}))
  }
  await page.evaluate(async()=>{const grid=window.finalMemoryProbe.grid;grid.updateColumnSchema([{key:'n1',format:{kind:'number',locale:'en-GB'}}]);await grid.updateComplete})
  const numbersOnly=await collect()
  await page.evaluate(()=>window.finalMemoryProbe.grid.remove())
  const detached=await collect()
  results.push({variant,active,numbersOnly,detached,pass:active.alive<=1&&numbersOnly.alive===0&&detached.alive===0})
  await page.close()
 }
 writeFileSync(resolve(root,'memory.json'),JSON.stringify({browser:browser.version(),method:'64 unique date descriptors with stable number columns, separate event-loop turns and two explicit CDP full collections per phase; WeakRefs retain no strong instance references. This is a renderer GC ownership check, not total native memory/leak certification.',results},null,2)+'\n')
 console.log(JSON.stringify(results))
}finally{await browser.close();for(const server of servers)await new Promise(resolve=>server.httpServer.close(resolve))}
