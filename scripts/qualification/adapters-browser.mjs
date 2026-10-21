import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const [rootArg,playwright,out]=process.argv.slice(2),root=path.resolve(rootArg)
const {createServer}=await import(pathToFileURL(path.resolve('node_modules/vite/dist/node/index.js')))
const {chromium}=await import(pathToFileURL(path.join(playwright,'index.mjs')))
const fixture=`import {createApp,h,nextTick} from 'vue';
import {DataGrid} from '@tipolox/litgrid-vue';
import '@angular/compiler';
import {createComponent,createEnvironmentInjector} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {DataGridComponent} from '@tipolox/litgrid-angular';
const config={queryMode:'external',selection:{mode:'row',rowKey:'id',scopeKey:'fictional/a'}};
const state={requestId:1,query:{search:'',filters:[],sort:{columnKey:null,direction:null},pageIndex:0,pageSize:20},rows:[{id:'unit-a',name:'Fictional Alpha',amount:'9007199254740993.01'}],total:{kind:'known',totalRows:352}};
const columns=[{key:'name'},{key:'amount',sortable:false,filterable:false}];
window.vueCalls=[];window.vueSelections=[];
const app=createApp({render:()=>h(DataGrid,{ref:v=>window.vueRef=v,data:[],config,columns,externalState:state,onQueryChange:d=>window.vueCalls.push(d),onSelectionChange:d=>window.vueSelections.push(d)})});app.mount('#vue');await nextTick();
const angular=await bootstrapApplication(DataGridComponent);const component=angular.components[0].instance;
const componentRef=angular.components[0];componentRef.setInput('config',config);componentRef.setInput('columns',columns);componentRef.setInput('externalState',state);componentRef.changeDetectorRef.detectChanges();
window.angularCalls=[];window.angularSelections=[];component.queryChange.subscribe(d=>window.angularCalls.push(d));component.selectionChange.subscribe(d=>window.angularSelections.push(d));
window.adapters={app,angular,component,componentRef,state};document.body.dataset.ready='true';`
fs.writeFileSync(path.join(root,'adapters-fixture.js'),fixture)
fs.writeFileSync(path.join(root,'adapters.html'),'<!doctype html><title>Packaged framework adapters</title><div id="vue"></div><litgrid-data-grid></litgrid-data-grid><script type="module" src="/adapters-fixture.js"></script>')
const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port:5205,strictPort:true}});await server.listen()
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5205/adapters.html');await page.locator('body[data-ready="true"]').waitFor()
 for(const [variant,selector] of [['vue','#vue'],['angular','litgrid-data-grid']]) {
  const grid=page.locator(selector).locator('yc-grid');await grid.getByText('9007199254740993.01',{exact:true}).waitFor()
  await grid.getByRole('button',{name:'Next',exact:true}).click()
  await page.waitForFunction(v=>window[v+'Calls'].length===1,variant)
  assert.equal(await page.evaluate(v=>window[v+'Calls'][0].query.pageIndex,variant),1)
  await page.evaluate(v=>{const ref=v==='vue'?window.vueRef:window.adapters.component;const intent=window[v+'Calls'][0];ref.setExternalState({...window.adapters.state,...intent,rows:[{id:'unit-b',name:'Fictional page 2',amount:'-2.00'}]});ref.selectRowByKey('unit-b')},variant)
  await grid.getByText('Fictional page 2',{exact:true}).waitFor()
  assert.equal(await page.evaluate(v=>window[v+'Selections'].at(-1).rows[0].key,variant),'unit-b')
 }
 await page.evaluate(()=>{window.detachedVue=window.vueRef.gridElement;window.detachedAngular=window.adapters.component.gridElement;window.adapters.app.unmount();window.adapters.angular.destroy();window.detachedVue.dispatchEvent(new CustomEvent('query-change',{detail:{requestId:99}}));window.detachedAngular.dispatchEvent(new CustomEvent('query-change',{detail:{requestId:99}}))})
 assert.deepEqual(await page.evaluate(()=>[window.vueCalls.length,window.angularCalls.length]),[1,1]);assert.deepEqual(errors,[])
 fs.writeFileSync(out,JSON.stringify({node:process.version,angularEngine:JSON.parse(fs.readFileSync(path.join(root,'node_modules/@angular/core/package.json'))).engines.node,browser:browser.version(),vue:'PASS real Vue createApp mount, query/selection events, decimal strings, unmount cleanup',angular:'PASS real Angular bootstrapApplication, inputs, query/selection events, decimal strings, destroy cleanup',errors},null,2));console.log('PASS packaged Vue and Angular browser applications on',process.version)
}finally{await browser.close();await server.close()}
