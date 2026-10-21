import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const [candidateArg,baselineArg,playwright,out]=process.argv.slice(2)
const candidate=path.resolve(candidateArg),baseline=path.resolve(baselineArg)
const {createServer}=await import(pathToFileURL(path.join(candidate,'node_modules/vite/dist/node/index.js')))
const {chromium}=await import(pathToFileURL(path.join(playwright,'index.mjs')))
const fixture=`import React,{Profiler} from 'react';import {createRoot} from 'react-dom/client';
import {DataGrid as Candidate} from '/@fs/${candidate.replaceAll('\\','/')}/packages/grid-react/src/DataGrid.tsx';
import {DataGrid as Baseline} from '/@fs/${baseline.replaceAll('\\','/')}/packages/grid-react/src/DataGrid.tsx';
window.reactBenchmark=async({variant,count,fresh})=>{
 const Component=variant==='candidate'?Candidate:Baseline;const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const data=Array.from({length:count},(_,id)=>({id,name:'Fictional '+id})),columns=[{key:'name'},{key:'id'}],config={selection:{mode:'multi-row',rowKey:'id'}};
 const samples=[],actual=[];const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 root.render(React.createElement(Profiler,{id:variant,onRender:(_id,_phase,duration)=>actual.push(duration)},React.createElement(Component,{data,columns,config})));await frame();await frame();actual.length=0;
 for(let i=0;i<50;i++){const t=performance.now();root.render(React.createElement(Profiler,{id:variant,onRender:(_id,_phase,duration)=>actual.push(duration)},React.createElement(Component,{data,columns,config:fresh?{...config}:config,ariaLabel:'Fictional properties '+i})));await frame();samples.push(performance.now()-t)}
 root.unmount();host.remove();return {variant,count,fresh,n:samples.length,frameWaitMs:samples,reactActualDurationMs:actual};
};document.body.dataset.ready='true';`
fs.writeFileSync(path.join(candidate,'react-performance-fixture.js'),fixture)
fs.writeFileSync(path.join(candidate,'react-performance.html'),'<!doctype html><title>Repeated React rendering</title><script type="module" src="/react-performance-fixture.js"></script>')
const server=await createServer({root:candidate,configFile:false,resolve:{alias:{react:path.join(candidate,'packages/grid-react/node_modules/react'),'react-dom':path.join(candidate,'packages/grid-react/node_modules/react-dom')}},server:{host:'127.0.0.1',port:5208,strictPort:true,fs:{allow:[candidate,baseline]}},plugins:[{name:'paired-react-sources',enforce:'pre',resolveId(source,importer){
 const owner=importer?.replaceAll('\\','/').startsWith(baseline.replaceAll('\\','/'))?baseline:candidate
 const map={'@tipolox/litgrid-core':'grid-core','@tipolox/litgrid-renderer':'grid-renderer','@tipolox/litgrid-web':'grid-web'}
 if(map[source])return path.join(owner,'packages',map[source],'src/index.ts')
 if(importer&&source.startsWith('.')&&source.endsWith('.js')){const stem=path.resolve(path.dirname(importer),source.slice(0,-3));for(const ext of ['.ts','.tsx'])if(!stem.includes('node_modules')&&fs.existsSync(stem+ext))return stem+ext}
},transform(code,id){if(id.replaceAll('\\','/').startsWith(baseline.replaceAll('\\','/'))&&/\/DataGrid\.tsx?$/.test(id))return code.replaceAll('yc-grid','yc-grid-v110')}}]})
await server.listen();const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5208/react-performance.html');await page.locator('body[data-ready="true"]').waitFor({state:'attached'})
 const cdp=await page.context().newCDPSession(page),samples=[]
 for(const count of [30000,100000])for(const fresh of [false,true])for(const variant of fresh?['candidate','v110']:['v110','candidate']){await cdp.send('HeapProfiler.collectGarbage');samples.push(await page.evaluate(input=>window.reactBenchmark(input),{variant,count,fresh}))}
 if(errors.length)throw new Error(JSON.stringify(errors))
 fs.writeFileSync(out,JSON.stringify({browser:browser.version(),react:'19.2.5 development profiler',notes:'Identical local data/columns, changing ariaLabel each parent render; fresh config versus stable config; 50 updates per case. Frame waits include layout/effects/scheduling; React Profiler duration excludes adapter passive effects and core reconciliation.',samples,errors},null,2));console.log('PASS paired React benchmark: 400 update samples')
}finally{await browser.close();await server.close()}
