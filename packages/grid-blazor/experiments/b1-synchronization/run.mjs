import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const browser = await chromium.launch({ headless:true, ...(process.env.LITGRID_CHROMIUM_PATH ? {executablePath:process.env.LITGRID_CHROMIUM_PATH} : {}) });
const output = process.env.LITGRID_B1_OUTPUT;
assert.ok(output, 'Choose a new output filename');
await writeFile(output,'',{flag:'wx'});
const results=[], errors=[];
const environment = { dateUtc:new Date().toISOString(), browser:browser.version(), variant:process.env.LITGRID_B1_VARIANT,
  host:process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5197', contexts:Number(process.env.LITGRID_B1_CONTEXTS ?? 3),
  methodology:'Published Release non-AOT (unless variant=server). Ordinary public DataGrid and original AccountRow10. Enumeration counters observe actual managed serializer row traversal; not exclusive serialization CPU. Completion includes component render/sync, updateComplete and two RAFs. Model setup excluded. No build runs during sampling.' };
const save=()=>writeFile(output,JSON.stringify({environment,results,errors},null,2));
try {
  for(let contextIndex=0;contextIndex<environment.contexts;contextIndex++) for(const [fixture,count] of [['A',1000],['B',10000]]) for(const versioned of [false,true]) {
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.addInitScript(()=>{window.adoptions=0;window.b1LongTasks=[];new PerformanceObserver(list=>window.b1LongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});});
    await page.goto(environment.host);
    await page.waitForFunction(()=>window.b1,{}, {timeout:120000});
    await page.evaluate(async ({count,versioned})=>{
      await window.b1.invokeMethodAsync('Prepare',count,versioned);
      // Observe the production grid setter before mount, including initial adoption.
      const module=await import('./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js');
      const proto=customElements.get('yc-grid').prototype;
      const descriptor=Object.getOwnPropertyDescriptor(proto,'data');
      Object.defineProperty(proto,'data',{...descriptor,set(value){window.adoptions++;descriptor.set.call(this,value);}});
    },{count,versioned});
    let token=0;
    const actions=['initial','unchanged','unchanged','item','collection','replacement','columns','config','scalar','namespace','unannounced','refresh','to-null','unchanged','to-versioned','unchanged'];
    for(const action of actions) {
      const sample=await page.evaluate(async ({action,token})=>{
        const before=await window.b1.invokeMethodAsync('Counters'), adoptionBefore=window.adoptions;
        const gaps=[];let last=performance.now();
        const heartbeat=setInterval(()=>{const now=performance.now();gaps.push(now-last);last=now;},10);
        await new Promise(r=>setTimeout(r,30));
        const start=performance.now();
        await window.b1.invokeMethodAsync('Act',action,token);
        while(window.completed!==token)await new Promise(r=>setTimeout(r,1));
        const grid=document.querySelector('yc-grid');
        await grid.updateComplete;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
        const elapsedMs=performance.now()-start, after=await window.b1.invokeMethodAsync('Counters');
        await new Promise(r=>setTimeout(r,30));clearInterval(heartbeat);
        const delta=Object.fromEntries(['calls','transfers','columns','configurations','enumerations','visits','allocated'].map(k=>[k,after[k]-before[k]]));
        return {...delta,elapsedMs,adoptions:window.adoptions-adoptionBefore,maxTimerGapMs:Math.max(...gaps,0),
          longTasks:window.b1LongTasks.filter(e=>e.start>=start&&e.start<=start+elapsedMs), supportsRevision:after.supportsRevision,
          rowCount:grid.getTotalRowCount(),firstName:grid.engine.getRows()[0].name,header:grid.renderRoot.querySelectorAll('.header-cell')[1]?.textContent,
          selectionMode:grid.getSelection().mode};
      },{action,token:++token});
      assert.equal(sample.adoptions,sample.transfers,`adoption count ${action}`);
      assert.equal(sample.enumerations,sample.transfers,`actual serializer enumeration ${action}`);
      if (sample.supportsRevision) {
        const omit = (token<13 && versioned && ['unchanged','columns','config','scalar','namespace','unannounced'].includes(action)) || token===16;
        assert.equal(sample.transfers,omit?0:1,`transfer contract ${action} at ${token}`);
        if (omit) assert.equal(sample.visits,0,`zero dataset serialization ${action}`);
      }
      assert.equal(sample.rowCount, action==='collection'?count+1:count);
      if(sample.supportsRevision && versioned && ['unchanged','columns','config','scalar','namespace','unannounced','to-versioned'].includes(action) && token<13) {
        assert.equal(sample.transfers,0,`versioned ${action}`);
        assert.equal(sample.visits,0,`versioned row serialization ${action}`);
      }
      if(action==='item')assert.match(sample.firstName,/edited/);
      if(action==='columns')assert.match(sample.header,/changed/);
      if(action==='config')assert.equal(sample.selectionMode,'multi-cell');
      if(action==='refresh')assert.match(sample.firstName,/unannounced/);
      results.push({contextIndex,fixture,count,mode:versioned?'versioned':'legacy',action,token,...sample});
      await save();
    }
    // Scroll uses existing engine virtualization and performs no wrapper transfer.
    const scrolling=await page.evaluate(async()=>{
      const grid=document.querySelector('yc-grid'),before=window.adoptions,viewport=grid.renderRoot.querySelector('.viewport');
      const gaps=[];let last=performance.now();const timer=setInterval(()=>{const now=performance.now();gaps.push(now-last);last=now;},10);
      for(let i=0;i<10;i++){viewport.scrollTop=i*1000;viewport.dispatchEvent(new Event('scroll'));await new Promise(r=>setTimeout(r,30));await grid.updateComplete;}
      clearInterval(timer);return {adoptions:window.adoptions-before,rows:grid.renderRoot.querySelectorAll('.row').length,maxTimerGapMs:Math.max(...gaps)};
    });
    assert.equal(scrolling.adoptions,0);assert.ok(scrolling.rows<40);
    results.push({contextIndex,fixture,mode:versioned?'versioned':'legacy',action:'scroll',...scrolling});await save();
    await context.close();
    console.log(`${environment.variant} ${contextIndex+1} ${fixture} ${versioned?'versioned':'legacy'} passed`);
  }
  assert.deepEqual(errors,[]);
} finally {await save();await browser.close();}
