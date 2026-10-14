import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(`${process.env.LITGRID_PLAYWRIGHT_MODULE}/index.mjs`).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.LITGRID_CHROMIUM_PATH});
const results=[],errors=[];
const output=process.env.LITGRID_B1_OUTPUT;
await writeFile(output,'',{flag:'wx'});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try {
  await page.goto(process.env.LITGRID_BROWSER_URL ?? 'http://127.0.0.1:5198');
  await page.waitForFunction(()=>window.b1,{}, {timeout:120000});
  await page.evaluate(async()=>{await window.b1.invokeMethodAsync('Prepare',1000,true);await window.b1.invokeMethodAsync('UseDeclarative');await window.b1.invokeMethodAsync('Act','initial',1);});
  await page.waitForFunction(()=>document.querySelector('yc-grid')?.getTotalRowCount?.()===1000);
  await page.evaluate(async()=>{const grid=document.querySelector('yc-grid');await grid.updateComplete;window.schemaCalls=0;const original=grid.updateColumnSchema.bind(grid);grid.updateColumnSchema=(...args)=>{window.schemaCalls++;return original(...args);};});
  const before=await page.evaluate(()=>window.b1.invokeMethodAsync('Counters'));
  await page.evaluate(()=>window.b1.invokeMethodAsync('ChangeChild','Child changed'));
  await page.waitForFunction(()=>document.querySelector('yc-grid').getColumnState().columns.length===11 && window.schemaCalls===1);
  const after=await page.evaluate(()=>window.b1.invokeMethodAsync('Counters'));
  assert.equal(after.transfers,before.transfers);assert.equal(after.enumerations,before.enumerations);
  results.push({scenario:'declarative child-only change',transfers:0,schemaCalls:1});

  await page.evaluate(async()=>{await window.b1.invokeMethodAsync('Act','namespace',2);});
  await page.waitForFunction(()=>window.completed===2);
  await page.evaluate(async()=>{const grid=document.querySelector('yc-grid');grid.setColumnWidth('name',333);await grid.updateComplete;window.savedA=localStorage.getItem('b1-a');localStorage.setItem('b1-b',JSON.stringify({version:1,columns:[{key:'name',width:290,visible:false},{key:'id',width:95,visible:true}]}));await window.b1.invokeMethodAsync('Act','namespace',3);});
  await page.waitForFunction(()=>window.completed===3);
  assert.equal(await page.evaluate(()=>document.querySelector('yc-grid').getColumnWidth({key:'name'})),290);
  assert.equal(await page.evaluate(()=>localStorage.getItem('b1-a')===window.savedA),true);
  await page.evaluate(()=>window.b1.invokeMethodAsync('Act','namespace',4));await page.waitForFunction(()=>window.completed===4);
  assert.equal(await page.evaluate(()=>document.querySelector('yc-grid').getColumnWidth({key:'name'})),333);
  results.push({scenario:'declarative namespace A/B/A persistence',passed:true});

  await page.evaluate(()=>{const grid=document.querySelector('yc-grid'),descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(grid),'data');let failed=false;Object.defineProperty(grid,'data',{configurable:true,set(value){if(!failed){failed=true;throw new Error('B1 injected failure');}descriptor.set.call(this,value);}});});
  await page.evaluate(()=>window.b1.invokeMethodAsync('FailRefresh'));
  const failed=await page.evaluate(()=>window.b1.invokeMethodAsync('Counters'));
  await page.evaluate(()=>window.b1.invokeMethodAsync('Act','unchanged',5));await page.waitForFunction(()=>window.completed===5);
  const retried=await page.evaluate(()=>window.b1.invokeMethodAsync('Counters'));
  assert.equal(retried.transfers,failed.transfers+1);
  await page.evaluate(()=>window.b1.invokeMethodAsync('Act','unchanged',6));await page.waitForFunction(()=>window.completed===6);
  assert.equal((await page.evaluate(()=>window.b1.invokeMethodAsync('Counters'))).transfers,retried.transfers);
  results.push({scenario:'actual JS failure propagates; next render retries forced refresh',passed:true});

  await page.evaluate(async()=>{await Promise.all([7,8,9].map(token=>window.b1.invokeMethodAsync('Act','item',token)));});
  await page.waitForFunction(()=>document.querySelector('yc-grid').engine.getRows()[0].name.endsWith(' edited edited edited'));
  results.push({scenario:'rapid revisions adopt latest data',passed:true});

  await page.evaluate(async()=>{await window.b1.invokeMethodAsync('DelayNextSync');await window.b1.invokeMethodAsync('Act','item',10);await window.b1.invokeMethodAsync('Act','unmount',11);});
  await page.waitForFunction(()=>document.querySelector('yc-grid')===null);
  await page.evaluate(()=>window.b1.invokeMethodAsync('Act','initial',12));
  await page.waitForFunction(()=>document.querySelector('yc-grid')?.getTotalRowCount?.()===1000);
  results.push({scenario:'dispose during pending synchronization; remount',passed:true});
  assert.deepEqual(errors,[]);
} finally {await writeFile(output,JSON.stringify({results,errors},null,2));await browser.close();}
console.log(`${results.length} B1 lifecycle/schema browser scenarios passed`);
