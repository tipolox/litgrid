import { preview } from 'vite'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'

// Run after check-column-formatting.mjs --baseline=... has built both production
// bundles. This count-only pass instruments every public setter, outside timings.
const servers=[],samples=[]
const browser=await chromium.launch({headless:true})
try{
  const pages={}
  for(const [index,variant] of ['baseline','candidate'].entries()){
    const server=await preview({configFile:false,build:{outDir:resolve('.private/column-formatting-browser',variant)},preview:{host:'127.0.0.1',port:5230+index,strictPort:true}})
    servers.push(server)
    const page=await browser.newPage({viewport:{width:1280,height:900}})
    await page.goto(`http://127.0.0.1:${5230+index}/tests/contracts/column-formatting.browser.html`)
    await page.waitForFunction(()=>typeof window.runFormattingWorkload==='function')
    await page.evaluate(()=>{
      const Grid=customElements.get('yc-grid')
      new Grid() // Finalize Lit's generated properties before capturing descriptors.
      window.allColumnSetterCounts={}
      window.columnDomObservers=[]
      const createRoot=Grid.prototype.createRenderRoot
      Grid.prototype.createRenderRoot=function(){
        const root=createRoot.call(this)
        const observer=new MutationObserver(()=>{
          window.columnDomMaximum.rows=Math.max(window.columnDomMaximum.rows,root.querySelectorAll('.row').length)
          window.columnDomMaximum.cells=Math.max(window.columnDomMaximum.cells,root.querySelectorAll('.row .cell').length)
        })
        observer.observe(root,{childList:true,subtree:true});window.columnDomObservers.push(observer)
        return root
      }
      for(const key of Object.getOwnPropertyNames(Grid.prototype)){
        const descriptor=Object.getOwnPropertyDescriptor(Grid.prototype,key)
        if(!descriptor?.set)continue
        Object.defineProperty(Grid.prototype,key,{...descriptor,set(value){window.allColumnSetterCounts[key]=(window.allColumnSetterCounts[key]??0)+1;descriptor.set.call(this,value)}})
      }
    })
    pages[variant]=page
  }
  const specs=[]
  for(const rows of [5000,30000])for(const columns of [3,120]){
    for(const mode of ['web','react','vue','angular','declarative',...(columns===3?['inferred']:[])])specs.push({mode,rows,columns,scenario:'default'})
    for(const scenario of ['align','one-number','all-number','epoch','iso','render'])specs.push({mode:'web',rows,columns,scenario})
  }
  for(const {mode,rows,columns,scenario} of specs){
    const pair=[]
    for(const variant of ['baseline','candidate']){
      const page=pages[variant];await page.bringToFront()
      const result=await page.evaluate(async spec=>{
        window.allColumnSetterCounts={};window.columnDomMaximum={rows:0,cells:0}
        await window.runFormattingWorkload(spec)
        window.columnDomObservers.forEach(observer=>observer.disconnect());window.columnDomObservers=[]
        return{setters:window.allColumnSetterCounts,dom:window.columnDomMaximum}
      },{mode,rows,columns,scenario})
      if(result.dom.rows>=100||result.dom.cells>=2000)throw Error('Unbounded DOM during scroll/metadata/refresh')
      samples.push({variant,mode,rows,columns,scenario,...result});pair.push(result.setters)
    }
    const names=[...new Set([...Object.keys(pair[0]),...Object.keys(pair[1])])]
    for(const name of names)if((pair[0][name]??0)!==(pair[1][name]??0))throw Error(`Setter mismatch ${mode} ${rows}/${columns} ${name}`)
  }
  writeFileSync('.private/column-formatting-all-setters.json',JSON.stringify({browser:browser.version(),samples,parity:true},null,2)+'\n')
  console.log(`PASS: all-public-setter parity and observed DOM bounds in ${samples.length/2} production workload pairs`)
}finally{await browser.close();for(const server of servers)await new Promise(resolve=>server.httpServer.close(resolve))}
