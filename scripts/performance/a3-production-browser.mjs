import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { cpus, platform, release, totalmem } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'

// A3 production qualification: inject the pinned original or candidate Core engine
// into the REAL LitGrid Web Component before any data/config is assigned.
// This is test-only instrumentation, not a supported integration API.
// The original component still drives config setter, requestUpdate and Lit.
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const out = resolve(process.argv[2] || '.private/a3/stage3-browser-config.json')
const variants = ['baseline', 'candidate']
const cases = [
  { rows:30000, columns:120 },
  { rows:100000, columns:120 },
  { rows:100000, columns:200 }
]
const server = await createServer({
  root, configFile:false, server:{host:'127.0.0.1',port:5226,strictPort:true},
  plugins:[{
    name:'a3-config-hypothesis',
    enforce:'pre',
    resolveId(source, importer) {
      const packages={'@tipolox/litgrid-core':'grid-core','@tipolox/litgrid-renderer':'grid-renderer'}
      if(packages[source]) return resolve(root,'packages',packages[source],'src/index.ts')
      if(importer && source.startsWith('.') && source.endsWith('.js')) {
        const ts=resolve(dirname(importer),source.slice(0,-3)+'.ts')
        if(!ts.includes('node_modules')&&existsSync(ts))return ts
      }
    },
    configureServer(vite) {
      vite.middlewares.use('/a3-config',(_,response)=>{
        response.setHeader('content-type','text/html')
        response.end('<!doctype html><title>A3 configuration hypothesis</title><div id="host"></div>')
      })
    }
  }]
})
await server.listen()
const browser=await chromium.launch({headless:true})
const samples=[],errors=[]
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5226/a3-config')
  const rootPath=root.replaceAll('\\','/')
  await page.evaluate(async({rootPath,variants})=>{
    window.A3Component=(await import('/packages/grid-web/src/components/DataGrid.ts')).DataGrid
    window.A3Variants={}
    for(const name of variants){
      const path='/@fs/'+rootPath+'/.private/a3/variants/'+name+'/index.js'
      window.A3Variants[name]=(await import(/* @vite-ignore */path)).createGridEngine
    }
    window.A3Rows={}
    for(const count of [30000,100000])window.A3Rows[count]=Array.from(
      {length:count},(_,id)=>({id,name:'Fictional '+id}))
  },{rootPath,variants})
  const cdp=await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  for(const {rows,columns} of cases){
    for(const mode of ['identical','display']){
      // Rotating a variant first reduces consistent first-batch advantage.
      for(let round=0;round<2;round++){
        const order=round===0?variants:[...variants].reverse()
        for(const variant of order){
          if(round===0)await cdp.send('HeapProfiler.collectGarbage')
          const timing=await page.evaluate(async({rows,columns,variant,mode,round})=>{
            const grid=new window.A3Component()
            // Rebind candidate onSelectionChange callbacks. The original
            // constructor subscribed to its engine, so a test-only swap must
            // reinstall the real component's notification behavior.
            const engine=window.A3Variants[variant]()
            grid.engine=engine
            engine.onSelectionChange(detail=>{
              grid.requestUpdate()
              grid.dispatchEvent(new CustomEvent('selection-change',
                {detail,bubbles:true,composed:true}))
            })
            engine.onQueryChange(()=>grid.requestUpdate())
            grid.style.width='1000px'
            grid.viewportHeight=400
            const initial={selection:{mode:'multi-row',rowKey:'id',scopeKey:'a'},
              rowHeader:{enabled:true,width:56}}
            grid.config=initial
            grid.columns=Array.from({length:columns},(_,c)=>({
              key:'c'+c,width:120,accessor:row=>String(row.id)+'/'+c
            }))
            grid.data=window.A3Rows[rows]
            document.getElementById('host').append(grid)
            await grid.updateComplete
            // Ensure all variants begin with an equivalent selection.
            if(!engine.selectRowByKey(0))throw new Error('Cannot select first key')
            await grid.updateComplete
            const selBefore=grid.getSelectionSnapshot().rows.map(item=>item.key).join(',')
            const timers=[]
            for(let n=0;n<15;n++){
              const input=mode==='identical'?initial:
                {...initial,rowHeader:{enabled:true,width:58+(n%2)},
                  quickSearch:{label:'Find '+n}}
              const started=performance.now()
              grid.config=input
              const setterMs=performance.now()-started
              await grid.updateComplete
              const litUpdateMs=performance.now()-started
              const selected=grid.getSelectionSnapshot().rows.map(item=>item.key).join(',')
              if(selected!==selBefore)throw new Error('Selection changed during config assignment')
              const renderedRows=grid.shadowRoot.querySelectorAll('.row').length
              if(!(renderedRows>0 && renderedRows<80))throw new Error('Virtualization bound violation '+renderedRows)
              timers.push({setterMs,litUpdateMs,renderedRows})
            }
            grid.remove()
            return {rows,columns,variant,mode,round,timers}
          },{rows,columns,variant,mode,round})
          samples.push(timing)
        }
      }
    }
  }
  if(errors.length)throw new Error('Page errors: '+JSON.stringify(errors))
  function stats(raw){
    const xs=[...raw].sort((a,b)=>a-b)
    const q=p=>xs[Math.max(0,Math.ceil(xs.length*p)-1)]
    return {n:xs.length,p50:q(.5),p95:q(.95),min:xs[0],max:xs.at(-1)}
  }
  const summaries=[]
  for(const {rows,columns} of cases)for(const mode of ['identical','display'])for(const variant of variants){
    const s=samples.filter(x=>x.rows===rows&&x.columns===columns&&x.mode===mode&&x.variant===variant)
      .flatMap(x=>x.timers)
    const sum={rows,columns,mode,variant,setter:stats(s.map(x=>x.setterMs)),
      litUpdate:stats(s.map(x=>x.litUpdateMs))}
    summaries.push(sum)
    console.log('A3 BROWSER CONFIG '+JSON.stringify(sum))
  }
  const result={
    purpose:'A3 production candidate browser configuration comparison. Candidate Core injected test-only into real Web Component; no production API.',
    revision:process.env.GITHUB_SHA||null,
    environment:{node:process.version,chromium:browser.version(),cpu:cpus()[0]?.model,
      cpuCount:cpus().length,platform:platform(),release:release(),totalMemory:totalmem()},
    protocol:{warmups:0,samplesPerVariantModeCase:30,rounds:2,
      notes:'Data created outside timer; setter and Lit update separately timed. Shared hosted runner, Vite source development build, no compositor-paint metric, candidate Core engine injected experimentally. Identity/scope/selection config held constant.'},
    summaries,samples,errors}
  mkdirSync(dirname(out),{recursive:true})
  writeFileSync(out,JSON.stringify(result,null,2)+'\n')
  console.log('A3 browser config comparison saved: '+out)
}finally{
  await browser.close()
  await server.close()
}
