import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { cpus, platform, release, totalmem } from 'node:os'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

// Browser-only control: real grid component from unchanged checked-out source.
// Timers exclude fixture allocation/module import, but include grid data,
// DOM adoption and Lit update. Two rAFs are NOT a paint metric.
const root = resolve(new URL('../../', import.meta.url).pathname)
const out = resolve(process.argv[2] || '.private/a3/browser-baseline.json')
const server = await createServer({
  root, configFile: false, server: { host: '127.0.0.1', port: 5225, strictPort: true },
  plugins: [{
    name: 'a3-sources', enforce: 'pre',
    resolveId(source, importer) {
      const packages = { '@tipolox/litgrid-core': 'grid-core', '@tipolox/litgrid-renderer': 'grid-renderer' }
      if (packages[source]) return resolve(root, 'packages', packages[source], 'src/index.ts')
      if (importer && source.startsWith('.') && source.endsWith('.js')) {
        const ts = resolve(dirname(importer), source.slice(0, -3) + '.ts')
        if (!ts.includes('node_modules') && existsSync(ts)) return ts
      }
    },
    configureServer(vite) {
      vite.middlewares.use('/a3-perf', (_, response) => {
        response.setHeader('content-type','text/html')
        response.end('<!doctype html><title>A3 browser baseline</title><div id="host"></div>')
      })
    }
  }]
})
await server.listen()
const browser = await chromium.launch({ headless: true })
const samples = [], external = [], errors = []
try {
  const page = await browser.newPage({viewport:{width:1280,height:900}})
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5225/a3-perf')
  await page.evaluate(async () => {
    window.A3Grid = (await import('/packages/grid-web/src/components/DataGrid.ts')).DataGrid
    window.a3Cases = {}
    for (const count of [30000,100000]) {
      // Build fixtures once outside all timed operations.
      window.a3Cases[count] = Array.from({length:count},(_,id)=>({id,name:'Fictional '+id}))
    }
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  for (const rows of [30000,100000]) for (const columns of [120,200]) {
    for (let i=0;i<12;i++) {
      if (i===0||i===6) await cdp.send('HeapProfiler.collectGarbage')
      const result = await page.evaluate(async ({rows,columns}) => {
        const grid = new window.A3Grid()
        grid.style.width = '1000px'
        grid.viewportHeight = 400
        grid.config = {selection:{mode:'multi-row',rowKey:'id'}}
        grid.columns = Array.from({length:columns},(_,c)=>({
          key:'c'+c,width:120,accessor:row=>String(row.id)+'/'+c
        }))
        const started=performance.now()
        grid.data=window.a3Cases[rows]
        document.getElementById('host').append(grid)
        await grid.updateComplete
        const firstUpdateMs=performance.now()-started
        const renderedRows=grid.shadowRoot.querySelectorAll('.row').length
        const renderedCells=grid.shadowRoot.querySelectorAll('.cell').length
        if (!(renderedRows>0&&renderedRows<80&&renderedCells<3000)) throw new Error('Virtualization bound violated: '+JSON.stringify({renderedRows,renderedCells}))
        await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))
        const twoFrameWaitMs=performance.now()-started
        const cell=grid.shadowRoot.querySelector('.cell[data-row-index="0"][data-column-index="0"]')
        if (!cell) throw new Error('First data cell not mounted')
        const clickStart=performance.now()
        cell.click()
        await grid.updateComplete
        const clickUpdateMs=performance.now()-clickStart
        const selected=grid.getSelectionSnapshot().rows[0]?.key
        if (selected!==0) throw new Error('First click selected wrong keyed row: '+String(selected))
        const viewport=grid.shadowRoot.querySelector('.viewport')
        const scrollStart=performance.now()
        viewport.scrollTop=36*1200
        viewport.dispatchEvent(new Event('scroll'))
        await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))
        await grid.updateComplete
        const scrollFrameMs=performance.now()-scrollStart
        grid.remove()
        return {rows,columns,firstUpdateMs,twoFrameWaitMs,clickUpdateMs,scrollFrameMs,renderedRows,renderedCells}
      },{rows,columns})
      const {metrics} = await cdp.send('Performance.getMetrics')
      samples.push({...result,jsHeapUsed:metrics.find(m=>m.name==='JSHeapUsedSize')?.value||null})
    }
  }
  for (const totalRows of [100000,1_000_000_000]) {
    const result=await page.evaluate(async totalRows=>{
      const grid = new window.A3Grid()
      grid.viewportHeight=400
      grid.columns=[{key:'id',width:110}]
      grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id'}}
      document.getElementById('host').append(grid)
      await grid.updateComplete
      const timings=[]
      for (let id=1;id<=25;id++){
        const begin=performance.now()
        const accepted=grid.setExternalState({
          requestId:id,query:grid.getQuery().query,
          rows:Array.from({length:20},(_,id)=>({id,name:'Fictional '+id})),
          total:{kind:'known',totalRows}
        })
        if (!accepted) throw new Error('External state not accepted')
        await grid.updateComplete
        timings.push(performance.now()-begin)
      }
      const mounted=grid.shadowRoot.querySelectorAll('.row').length
      if (mounted>30) throw new Error('External page mounted too many rows')
      grid.remove()
      return {totalRows,loadedRows:20,mounted,timings}
    },totalRows)
    external.push(result)
  }
  if (errors.length) throw new Error('Browser page errors: '+JSON.stringify(errors))
  function stats(values) {
    const xs=[...values].sort((a,b)=>a-b)
    const at=p=>xs[Math.max(0,Math.ceil(xs.length*p)-1)]
    return {n:xs.length,p50:at(.5),p95:at(.95),min:xs[0],max:xs.at(-1)}
  }
  const summary=[]
  for (const rows of [30000,100000]) for(const columns of [120,200]){
    const subset=samples.filter(s=>s.rows===rows&&s.columns===columns)
    const result={rows,columns,firstUpdate:stats(subset.map(s=>s.firstUpdateMs)),
      twoFrameWait:stats(subset.map(s=>s.twoFrameWaitMs)),
      clickUpdate:stats(subset.map(s=>s.clickUpdateMs)),
      scrollFrame:stats(subset.map(s=>s.scrollFrameMs)),
      maxRenderedRows:Math.max(...subset.map(s=>s.renderedRows))}
    summary.push(result)
    console.log('A3 BROWSER '+JSON.stringify(result))
  }
  const evidence={purpose:'A3 observational browser baseline; NOT an algorithm speedup or compositor paint benchmark',
    revision:process.env.GITHUB_SHA||null,
    environment:{node:process.version,chromium:browser.version(),cpu:cpus()[0]?.model,cpuCount:cpus().length,platform:platform(),release:release(),totalMemory:totalmem()},
    protocol:{samplesPerLocalCase:12,viewport:'1280x900',network:'local Vite; no backend',
      limitations:'two requestAnimationFrame waits are not actual compositor paint; Chrome hosted runner is noisy; fixture allocation and module load excluded'},
    summary,samples,external:external.map(v=>({...v,stats:stats(v.timings)})),errors}
  mkdirSync(dirname(out),{recursive:true})
  writeFileSync(out,JSON.stringify(evidence,null,2)+'\n')
  console.log('A3 browser baseline saved: '+out)
} finally {
  await browser.close()
  await server.close()
}
