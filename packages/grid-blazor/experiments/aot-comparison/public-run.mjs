import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const browser = await chromium.launch({ headless: true,
  ...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {}) });
const filename = process.env.LITGRID_PUBLIC_OUTPUT ?? 'packages/grid-blazor/experiments/aot-comparison/public-component-results.json';
await writeFile(filename, '', { flag: 'wx' });
const results=[], startup=[], errors=[];
const environment={ dateUtc:new Date().toISOString(), browser:browser.version(), runtime:'8.0.31',
  sdk:'10.0.401', package:'Tipolox.LitGrid.Blazor 1.0.3, unchanged source project reference',
  contextsPerVariant:3, postWarmupLoadsPerFixturePerContext:5,
  fixtures:{ A:'1000 x AccountRow10', B:'10000 x AccountRow10' },
  methodology:'Prepare source outside load; use public DataGrid; wait for new data identity, updateComplete and two RAFs; timer gap and allocation include normal framework work' };
async function save(){await writeFile(filename,JSON.stringify({environment,startup,results,errors},null,2));}
try {
  for(let contextIndex=0;contextIndex<3;contextIndex++) {
    for(const variant of contextIndex%2?['aot','interpreter']:['interpreter','aot']) {
      const context=await browser.newContext({viewport:{width:1280,height:900}});
      await context.addInitScript(()=>{
        window.componentLongTasks=[];
        new PerformanceObserver(list=>{ for(const entry of list.getEntries()) window.componentLongTasks.push({start:entry.startTime,duration:entry.duration}); }).observe({type:'longtask'});
      });
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push({variant,contextIndex,error:e.message}));
      page.on('console',m=>{if(m.type()==='error')errors.push({variant,contextIndex,error:m.text()});});
      await page.goto(`http://127.0.0.1:${variant==='aot'?5194:5193}`);
      await page.waitForFunction(()=>window.componentRef && document.querySelector('yc-grid')?.getTotalRowCount?.()===1,{}, {timeout:120000});
      await page.evaluate(async()=>{await document.querySelector('yc-grid').updateComplete;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
      startup.push({variant,contextIndex,...await page.evaluate(()=>({readyAtMs:performance.now(),resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,transferSize:r.transferSize}))}))});
      for(const [fixture,count] of [['A',1000],['B',10000]]) {
        await page.evaluate(count=>window.componentRef.invokeMethodAsync('Prepare',count),count);
        for(let repetition=0;repetition<=5;repetition++) {
          const sample=await page.evaluate(async count=>{
            const grid=document.querySelector('yc-grid');
            const before=await window.componentRef.invokeMethodAsync('Counters');
            const gaps=[];let last=performance.now();
            const heartbeat=setInterval(()=>{const now=performance.now();gaps.push(now-last);last=now;},10);
            await new Promise(resolve=>setTimeout(resolve,30));
            const previous=grid.engine.getRows(),start=performance.now();
            await window.componentRef.invokeMethodAsync('Load');
            while(grid.engine.getRows()===previous)await new Promise(requestAnimationFrame);
            await grid.updateComplete;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
            const elapsedMs=performance.now()-start;
            const after=await window.componentRef.invokeMethodAsync('Counters');
            await new Promise(resolve=>setTimeout(resolve,35));clearInterval(heartbeat);
            return {elapsedMs,allocatedBytes:after.allocated-before.allocated,gcCollections:after.collections.map((v,i)=>v-before.collections[i]),
              browserMaxTimerGapMs:Math.max(...gaps,0),longTasks:window.componentLongTasks.filter(e=>e.start>=start&&e.start<=start+elapsedMs),
              actualRows:grid.getTotalRowCount(),firstId:grid.engine.getRows()[0].id,lastId:grid.engine.getRows().at(-1).id,
              lastBalance:grid.engine.getRows().at(-1).balance,hasAlias:Object.hasOwn(grid.engine.getRows()[0],'account_alias')};
          },count);
          assert.equal(sample.actualRows,count);assert.equal(sample.firstId,1);assert.equal(sample.lastId,count);
          assert.equal(sample.lastBalance,count*12.34);assert.equal(sample.hasAlias,true);
          assert.equal(Number.isFinite(sample.allocatedBytes),true,'Allocation counters were not preserved/returned');
          results.push({variant,fixture,contextIndex,repetition,...sample});await save();
          console.log(`${variant} ${fixture} context ${contextIndex+1} #${repetition}: ${sample.elapsedMs.toFixed(1)} ms; gap ${sample.browserMaxTimerGapMs.toFixed(1)} ms`);
        }
      }
      await context.close();
    }
  }
  assert.deepEqual(errors,[]);
}finally{await save();await browser.close();}
