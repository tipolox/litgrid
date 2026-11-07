import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { cpus, platform } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'

// B1 draft browser performance + behavior: actual Web Component from source.
// This is not a customer SLA, a Core-only benchmark, or compositor paint.
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)))
const out=resolve(process.argv[2]||'.private/b1/targeted-browser.json')
const server=await createServer({
  root,configFile:false,server:{host:'127.0.0.1',port:5247,strictPort:true},
  plugins:[{
    name:'b1-browser-source',enforce:'pre',
    resolveId(name,importer){
      const packages={'@tipolox/litgrid-core':'grid-core','@tipolox/litgrid-renderer':'grid-renderer'}
      if(packages[name]) return resolve(root,'packages',packages[name],'src/index.ts')
      if(importer&&name.startsWith('.')&&name.endsWith('.js')){
        const ts=resolve(dirname(importer),name.slice(0,-3)+'.ts')
        if(!ts.includes('node_modules')&&existsSync(ts))return ts
      }
    },
    configureServer(vite){
      vite.middlewares.use('/b1-targeted',(_,res)=>{
        res.setHeader('content-type','text/html')
        res.end('<!doctype html><div id="host"></div>')
      })
    }
  }]
})
await server.listen()
const browser=await chromium.launch({headless:true})
const records=[], errors=[]
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}})
  page.on('pageerror',err=>errors.push(err.message))
  await page.goto('http://127.0.0.1:5247/b1-targeted')
  await page.evaluate(async()=>{
    window.B1Grid=(await import('/packages/grid-web/src/components/DataGrid.ts')).DataGrid
    window.B1Cases={}
    for(const count of [30000,100000]){
      window.B1Cases[count]=Array.from({length:count},(_,id)=>({id,name:'Fictional '+id,status:'idle'}))
    }
  })
  const regressions=process.argv.includes('--performance-only')?[]:await page.evaluate(async()=>{
    const checks=[]
    const assert=(ok,message)=>{if(!ok)throw Error('B1 regression: '+message)}
    const settle=async grid=>{
      await grid.updateComplete
      await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))
      await grid.updateComplete
    }
    const mount=async(config={selection:{mode:'multi-row',rowKey:'id'}})=>{
      const rows=Array.from({length:1000},(_,id)=>({id,name:'Person '+id,status:'idle'}))
      const grid=new window.B1Grid()
      grid.columns=[{key:'name',width:200},{key:'status',width:200}]
      grid.config=config;grid.data=rows;grid.viewportHeight=400
      document.getElementById('host').append(grid)
      await settle(grid)
      return {grid,rows}
    }
    const text=(grid,index)=>grid.shadowRoot.querySelector('.cell[data-row-index="'+index+'"]')?.textContent
    for(const kind of ['row','batch','range']){
      const {grid,rows}=await mount()
      grid.selectRowByKey(1);await settle(grid)
      rows[1]={...rows[1],name:'Maria'}
      const result=kind==='row'?Number(grid.refreshRow(1)):kind==='batch'?grid.refreshRows([1,1]):grid.refreshRange({start:1,endExclusive:2})
      assert(result===1,kind+' replacement count');await settle(grid)
      assert(text(grid,1)?.includes('Maria'),kind+' replacement remained stale')
      assert(grid.getSelectionSnapshot().rows[0].row===rows[1],kind+' selected object stale')
      rows[1]={...rows[1],name:'Render-only replacement'}
      assert(grid.refreshRow(1,{mode:'render-only'})===false,'render-only accepted replaced object')
      assert(grid.refreshRow(1),'auto recovery');await settle(grid)
      ;[rows[1],rows[2]]=[rows[2],rows[1]]
      assert(grid.refreshRows([1,2])===2,'reorder count');await settle(grid)
      assert(text(grid,1)?.includes('Person 2'),'reorder remained stale')
      assert(grid.getSelectionSnapshot().rows[0].rowIndex===2,'selection did not follow key')
      rows[2]={...rows[2],id:2}
      assert(grid.refreshRows([1,2])===0,'duplicate accepted');await settle(grid)
      assert(grid.getSelectionSnapshot().rows.length===0,'duplicate selection retained')
      rows[2]={...rows[2],id:NaN}
      assert(grid.refreshRange({start:2,endExclusive:3})===1,'invalid identity range reconciliation')
      await settle(grid)
      assert(grid.refreshRow(1)===false,'obsolete identity accepted')
      grid.remove();checks.push(kind+' replacement/reorder/selection/identities/render-only')
    }
    for(const transform of ['sort','filter','search']){
      const {grid,rows}=await mount({selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:3}})
      if(transform==='sort')grid.sortBy('id','asc')
      else if(transform==='filter')grid.setFilter({columnKey:'name',operator:'startsWith',value:'Person'})
      else grid.setQuickSearch('Person')
      grid.setPage(1);await settle(grid)
      rows[4].status='validating'
      assert(grid.refreshRow(4,{mode:'render-only'}),'safe transformed render-only declined')
      await settle(grid)
      assert(grid.shadowRoot.querySelectorAll('.row')[1].textContent.includes('validating'),'transformed render-only stale')
      rows[4]={...rows[4],name:'Maria'}
      assert(grid.refreshRow(4)===(transform==='sort'),transform+' membership result')
      await settle(grid)
      assert(grid.getPagination().pageIndex===1,transform+' page reset')
      assert(grid.getTotalRowCount()===(transform==='sort'?1000:999),transform+' count')
      assert(!!text(grid,1)?.includes('Maria')===(transform==='sort'),transform+' stale display')
      grid.remove();checks.push(transform+' replacement/page/membership')
    }
    {
      const {grid,rows}=await mount({pagination:{enabled:true,pageSize:3}})
      grid.setPage(1);await settle(grid)
      rows[4]={...rows[4],name:'Index replacement'}
      assert(grid.refreshRange({start:1,endExclusive:2})===1,'index range result');await settle(grid)
      assert(text(grid,1)?.includes('Index replacement'),'index source offset stale')
      grid.sortBy('id','desc');await settle(grid)
      assert(grid.refreshRange({start:0,endExclusive:1},{mode:'render-only'})===0,'unkeyed transformed render-only accepted')
      grid.remove();checks.push('index-only paginated range and render-only boundary')
    }
    {
      const {grid,rows}=await mount()
      const viewport=grid.shadowRoot.querySelector('.viewport')
      viewport.focus();viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))
      await settle(grid)
      const active=viewport.getAttribute('aria-activedescendant')
      assert(active&&grid.shadowRoot.getElementById(active),'missing active cell')
      const focused=grid.shadowRoot.activeElement
      const height=grid.shadowRoot.querySelector('.row').getBoundingClientRect().height
      rows[1].status='validating';assert(grid.refreshRow(1),'safe focused edit');await settle(grid)
      assert(grid.shadowRoot.activeElement===focused,'focus lost on selective update')
      assert(viewport.getAttribute('aria-activedescendant')===active,'ARIA active cell changed')
      rows[1]={...rows[1],name:'Focused replacement'};assert(grid.refreshRow(1),'focused fallback');await settle(grid)
      assert(grid.shadowRoot.activeElement===focused,'focus lost on fallback')
      assert(grid.shadowRoot.getElementById(viewport.getAttribute('aria-activedescendant')),'dangling ARIA after fallback')
      assert(grid.shadowRoot.querySelector('.row').getBoundingClientRect().height===height,'row layout changed')
      viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await settle(grid)
      assert(viewport.getAttribute('aria-activedescendant')!==active,'keyboard navigation stopped')
      rows[900]={...rows[900],name:'Offscreen replacement'};assert(grid.refreshRow(900),'offscreen replacement')
      await settle(grid);viewport.scrollTop=900*36;viewport.dispatchEvent(new Event('scroll'));await settle(grid)
      assert(text(grid,900)?.includes('Offscreen replacement'),'virtualized replacement stale')
      assert(grid.shadowRoot.querySelectorAll('.row').length<80,'virtualization unbounded')
      grid.remove();checks.push('focus/keyboard/ARIA/layout/virtualization')
    }
    return checks
  })
  console.log('B1 regressions: '+JSON.stringify(regressions))
  const stat = raw => {
    const v=[...raw].sort((a,b)=>a-b)
    return {n:v.length,min:v[0],p50:v[Math.ceil(v.length*.5)-1],p95:v[Math.ceil(v.length*.95)-1],max:v.at(-1)}
  }
  for(const rows of [30000,100000])for(const columns of [120,200]){
    const result=await page.evaluate(async({rows,columns})=>{
      const data=window.B1Cases[rows]
      const counts=new Map()
      const renderCounts=new Map()
      const columnDefs=Array.from({length:columns},(_,index)=>({
        key:'c'+index,width:120,
        accessor:row=>{
          counts.set(row.id,(counts.get(row.id)||0)+1)
          return row.status+'/'+index
        },
        render:(value,row)=>{
          renderCounts.set(row.id,(renderCounts.get(row.id)||0)+1)
          return value
        }
      }))
      const grid=new window.B1Grid()
      grid.style.width='1000px';grid.viewportHeight=400
      grid.config={selection:{mode:'multi-row',rowKey:'id',scopeKey:'tenant-a'}}
      grid.columns=columnDefs
      grid.data=data
      document.getElementById('host').append(grid)
      await grid.updateComplete
      // Browser-only ResizeObserver and scrollbar-width reconciliation may
      // legitimately enqueue a full layout update immediately after mount.
      // Qualify isolated edits only after the ordinary initial layout settles.
      await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))
      await grid.updateComplete
      const mounted=grid.shadowRoot.querySelectorAll('.row').length
      if(mounted<5||mounted>80)throw Error('unexpected mounted row count '+mounted)
      const firstRow=grid.shadowRoot.querySelector('.row')
      const rowCountBefore=grid.getTotalRowCount()
      const one=[],batch=[],full=[],replacement=[]
      const assertOnly=(allowed,operation)=>{
        for(const [id,n] of counts)if(n>0&&!allowed.includes(id))throw Error(operation+' touched other accessor row '+id+' epoch '+grid.completeRowRenderEpoch)
        for(const [id,n] of renderCounts)if(n>0&&!allowed.includes(id))throw Error(operation+' touched other renderer row '+id+' epoch '+grid.completeRowRenderEpoch)
      }
      for(let i=0;i<18;i++){
        counts.clear();renderCounts.clear()
        data[2].status=i%2?'validating':'valid'
        const start=performance.now()
        if(!grid.refreshRow(2))throw Error('loaded key not refreshed')
        await grid.updateComplete
        one.push(performance.now()-start)
        assertOnly([2],'refreshRow')
        if(grid.shadowRoot.querySelector('.row')!==firstRow)throw Error('unrelated row DOM identity was lost')
        if(!grid.shadowRoot.querySelector('.cell[data-row-index="2"]')?.textContent.includes(data[2].status))throw Error('refreshRow did not paint edited value')
      }
      for(let i=0;i<12;i++){
        counts.clear();renderCounts.clear()
        data[1].status='pending-'+i;data[3].status='passed-'+i
        const start=performance.now()
        if(grid.refreshRows([1,3,1])!==2)throw Error('batch deduplication failed')
        await grid.updateComplete
        batch.push(performance.now()-start)
        assertOnly([1,3],'refreshRows')
      }
      counts.clear();renderCounts.clear()
      data[4].status='in-range'
      if(grid.refreshRange({start:4,endExclusive:5})!==1)throw Error('range count wrong')
      await grid.updateComplete
      assertOnly([4],'refreshRange')
      for(let i=0;i<6;i++){
        const start=performance.now()
        if(!grid.refreshData())throw Error('full local refresh failed')
        await grid.updateComplete
        full.push(performance.now()-start)
      }
      for(let i=0;i<6;i++){
        data[2]={...data[2],status:'replacement-'+i}
        const start=performance.now()
        if(!grid.refreshRow(2))throw Error('same-key replacement declined in auto')
        await grid.updateComplete
        replacement.push(performance.now()-start)
        if(!grid.shadowRoot.querySelector('.cell[data-row-index="2"]')?.textContent.includes(data[2].status))throw Error('same-key replacement remained stale')
      }
      if(grid.getTotalRowCount()!==rowCountBefore)throw Error('data count changed after refresh')
      const focused=grid.shadowRoot.querySelector('.row')===firstRow
      grid.remove()
      return {rows,columns,mounted,focused,one,batch,full,replacement}
    },{rows,columns})
    records.push({
      rows,columns,mounted:result.mounted,unchangedRowDOM:result.focused,
      refreshRow:stat(result.one),refreshRows:stat(result.batch),fullRefresh:stat(result.full),replacementRefresh:stat(result.replacement)
    })
    console.log('B1 TARGETED '+JSON.stringify(records.at(-1)))
  }
  const external=await page.evaluate(async()=>{
    const grid=new window.B1Grid()
    grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'remote-site'}}
    grid.columns=[{key:'id'},{key:'status'}]
    let intents=0;grid.addEventListener('query-change',()=>intents++)
    document.getElementById('host').append(grid)
    await grid.updateComplete
    const query=grid.getQuery()
    const state=[{id:'r0',status:'idle'},{id:'r1',status:'idle'}]
    if(!grid.setExternalState({requestId:query.requestId,query:query.query,
        rows:state,total:{kind:'known',totalRows:1000000000}}))throw Error('remote controlled commit failed')
    await grid.updateComplete
    state[0].status='validating'
    if(!grid.refreshRow('r0'))throw Error('loaded remote status not repainted')
    await grid.updateComplete
    if(!grid.shadowRoot.textContent.includes('validating'))throw Error('remote status missing')
    if(grid.refreshRow('unloaded'))throw Error('unloaded remote row incorrectly refreshed')
    if(grid.refreshData())throw Error('external full local refresh incorrectly accepted')
    if(intents!==0||grid.getQuery().requestId!==query.requestId)throw Error('targeted repaint caused server query')
    const mounted=grid.shadowRoot.querySelectorAll('.row').length
    grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'next-remote-site'}}
    if(grid.refreshRow('r0')||grid.refreshRange({start:0,endExclusive:2})!==0)throw Error('old tenant targeted after scope reset')
    if(grid.setExternalState({requestId:query.requestId,query:query.query,rows:state,
        total:{kind:'known',totalRows:1000000000}}))throw Error('old tenant response accepted')
    await grid.updateComplete
    if(grid.shadowRoot.textContent.includes('validating')||intents!==0)throw Error('tenant data/query leaked')
    grid.remove()
    return {total:1000000000,loaded:2,mounted,queryIntents:intents,scopeIsolation:true}
  })
  if(errors.length)throw Error('browser page errors: '+JSON.stringify(errors))
  const result={purpose:'B1 source browser targeted callback and DOM identity safety benchmark (no compositor paint)',
    revision:process.env.GITHUB_SHA||null,environment:{node:process.version,chromium:browser.version(),platform:platform(),cpu:cpus()[0]?.model},
    cases:records,external,regressions,errors}
  mkdirSync(dirname(out),{recursive:true})
  writeFileSync(out,JSON.stringify(result,null,2)+'\n')
  console.log('B1 browser evidence: '+out+' remote='+JSON.stringify(external))
}finally{
  await browser.close()
  await server.close()
}
