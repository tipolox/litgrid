import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
const moduleName = process.env.LITGRID_PLAYWRIGHT_MODULE ?? 'playwright';
const { chromium } = await import(isAbsolute(moduleName) ? pathToFileURL(`${moduleName}/index.mjs`).href : moduleName);
const output = process.env.LITGRID_RECONNECT_OUTPUT; assert.ok(output, 'Choose a fresh output path'); await writeFile(output, '', { flag: 'wx' });
const browser=await chromium.launch({headless:true,...(process.env.LITGRID_CHROMIUM_PATH ? { executablePath: process.env.LITGRID_CHROMIUM_PATH } : {})}),context=await browser.newContext(),page=await context.newPage(),events=[];
page.on('websocket',s=>{events.push('open');s.on('close',()=>events.push('close'))});
await page.addInitScript(()=>{const Native=WebSocket;window.qaSockets=[];window.WebSocket=class extends Native{constructor(...args){super(...args);window.qaSockets.push(this)}}});
const call=(method,...args)=>page.evaluate(({method,args})=>window.b11.invokeMethodAsync(method,...args),{method,args});
const result={events};
try{
 await page.goto(process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5263/?b11');await page.waitForFunction(()=>window.b11);await call('Prepare',8,true,false);await call('Act','initial');await page.waitForFunction(()=>document.querySelector('yc-grid')?.getTotalRowCount?.()===8);
 await call('ScheduleDelayedRefresh',20);const controlDeadline=Date.now()+10000;let control;do{control=await call('OfflineProbeStatus');if(control.complete)break;await page.waitForTimeout(100)}while(Date.now()<controlDeadline);assert.equal(control.complete,true);result.noFaultControl={status:control,progress:await call('Progress'),stats:await call('Stats')};
 await call('ScheduleDelayedRefresh',20);const deadline=Date.now()+10000;let progress;do{progress=await call('Progress');if(progress.inFlight>0)break;await page.waitForTimeout(20)}while(Date.now()<deadline);assert.ok(progress.inFlight>0);
 await context.setOffline(true);await page.evaluate(()=>window.qaSockets.filter(s=>s.url.includes('_blazor')&&s.readyState===WebSocket.OPEN).forEach(s=>s.close(4001,'QA transport interruption')));await page.waitForTimeout(1800);await context.setOffline(false);result.sameCircuitRecovered=await page.evaluate(()=>Blazor.reconnect());assert.equal(result.sameCircuitRecovered,true);
 await page.waitForTimeout(Number(process.env.LITGRID_RECONNECT_OBSERVE_MS ?? 15000));result.afterReconnect={status:await call('OfflineProbeStatus'),progress:await call('Progress'),stats:await call('Stats')};
 await page.evaluate(()=>{window.secondRefreshDone=false;window.secondRefreshError=null;window.b11.invokeMethodAsync('Act','refresh').then(()=>window.secondRefreshDone=true,e=>{window.secondRefreshDone=true;window.secondRefreshError=e.message})});await page.waitForTimeout(2000);result.secondRefreshPending=await page.evaluate(()=>!window.secondRefreshDone);
 result.stallReproduced=!result.afterReconnect.status.complete&&result.afterReconnect.progress.inFlight===1&&result.secondRefreshPending;
 await call('Act','dispose');const disposeDeadline=Date.now()+10000;let disposed;do{disposed=await call('OfflineProbeStatus');if(disposed.complete)break;await page.waitForTimeout(100)}while(Date.now()<disposeDeadline);result.afterDispose={status:disposed,stats:await call('Stats'),secondRefresh:await page.evaluate(()=>({done:window.secondRefreshDone,error:window.secondRefreshError}))};
 assert.equal(disposed.complete,true);assert.equal(result.afterDispose.stats.subscribers,0);await call('Act','initial');await page.waitForFunction(()=>document.querySelector('yc-grid')?.getTotalRowCount?.()===8);result.remountRecovered=true;
}catch(error){result.harnessError=error.stack}
finally{await context.setOffline(false);await writeFile(output,JSON.stringify(result,null,2));await browser.close()}
if (process.env.LITGRID_RECONNECT_EXPECT_RECOVERY === '1') { assert.equal(result.stallReproduced, false); assert.equal(result.afterReconnect.status.complete, true); assert.equal(result.afterReconnect.status.error, 'TaskCanceledException'); assert.equal(result.secondRefreshPending, false); }
console.log(JSON.stringify({noFaultControl:result.noFaultControl?.status,stallReproduced:result.stallReproduced,sameCircuitRecovered:result.sameCircuitRecovered,secondRefreshPending:result.secondRefreshPending,remountRecovered:result.remountRecovered,harnessError:result.harnessError}));process.exitCode=result.harnessError?1:0;
