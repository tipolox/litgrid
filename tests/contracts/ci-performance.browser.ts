import '@angular/compiler'
import { DataGrid as WebGrid, type GridColumn } from '@tipolox/litgrid-web'
import { DataGrid as ReactGrid } from '@tipolox/litgrid-react'
import { DataGrid as VueGrid } from '@tipolox/litgrid-vue'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createApp, h, nextTick, shallowRef } from 'vue'
import { bootstrapApplication } from '@angular/platform-browser'

type Spec = { mode:'vue'|'web'|'react'|'angular'; rows:number; columns:number }
const counters={schema:0,columns:0,data:0,config:0,inference:0}
const schema=WebGrid.prototype.updateColumnSchema
WebGrid.prototype.updateColumnSchema=function(...args){counters.schema++;return schema.apply(this,args)}
for(const [key,count] of [['columns','columns'],['data','data'],['config','config'],['inferColumns','inference']] as const){
  const descriptor=Object.getOwnPropertyDescriptor(WebGrid.prototype,key)!
  Object.defineProperty(WebGrid.prototype,key,{...descriptor,set(value:unknown){counters[count]++;descriptor.set!.call(this,value)}})
}
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
const reset=()=>{for(const key of Object.keys(counters) as (keyof typeof counters)[])counters[key]=0}
let busy=false
async function sample(spec:Spec){
  if(busy)throw Error('Overlapping workload')
  busy=true
  // Fixture construction is outside all timers and is identical for every build.
  const data=Array.from({length:spec.rows},(_,id)=>({id,value:id+.125}))
  const columns:GridColumn[]=Array.from({length:spec.columns},(_,index)=>({key:index?'c'+index:'value',width:100,accessor:(row:unknown)=>(row as {value:number}).value+index}))
  const props={data,columns,height:360}
  const host=document.createElement(spec.mode==='angular'?'litgrid-data-grid':'div')
  host.style.cssText='display:block;width:900px';document.body.append(host)
  let grid:WebGrid|undefined,destroy:(()=>void)|undefined,update:((height:number)=>Promise<void>)|undefined
  const mark=(name:string)=>performance.mark('litgrid:'+name)
  reset()
  try{
    mark('mount:start');const start=performance.now()
    if(spec.mode==='vue'){
      const state=shallowRef(props),app=createApp({render:()=>h(VueGrid,state.value)})
      app.mount(host);await nextTick();grid=host.querySelector('yc-grid') as WebGrid
      update=async height=>{state.value={...state.value,height};await nextTick()};destroy=()=>app.unmount()
    }else if(spec.mode==='web'){
      grid=new WebGrid();grid.columns=columns;grid.data=data;grid.viewportHeight=360;host.append(grid)
      const element=grid;update=async height=>{element.viewportHeight=height};destroy=()=>element.remove()
    }else if(spec.mode==='react'){
      const root=createRoot(host);flushSync(()=>root.render(createElement(ReactGrid,props)));grid=host.querySelector('yc-grid') as WebGrid
      update=async height=>{flushSync(()=>root.render(createElement(ReactGrid,{...props,height})))};destroy=()=>flushSync(()=>root.unmount())
    }else{
      const app=await bootstrapApplication(DataGridComponent),ref=app.components[0]
      for(const [key,value] of Object.entries(props))ref.setInput(key,value)
      ref.changeDetectorRef.detectChanges();grid=host.querySelector('yc-grid') as WebGrid
      update=async height=>{ref.setInput('height',height);ref.changeDetectorRef.detectChanges()};destroy=()=>app.destroy()
    }
    if(!(grid instanceof WebGrid))throw Error('Missing real Web grid')
    await grid.updateComplete
    // Mount ends at a layout-ready cell; module download and fixture allocation are excluded.
    grid.shadowRoot!.querySelector('.row .cell')!.getBoundingClientRect()
    const mountMs=performance.now()-start;mark('mount:end')
    const mountCounts={...counters};reset()
    const updates:number[]=[]
    mark('update:start')
    for(let i=0;i<12;i++){
      const t=performance.now();await update(360+(i+1)%2);await grid.updateComplete
      grid.shadowRoot!.querySelector('.viewport')!.getBoundingClientRect()
      updates.push(performance.now()-t)
    }
    mark('update:end')
    const updateCounts={...counters};reset()
    const viewport=grid.shadowRoot!.querySelector<HTMLElement>('.viewport')!,scroll:number[]=[],frameObservations:number[][]=[]
    let maxRows=0,maxCells=0
    const observe=()=>{maxRows=Math.max(maxRows,grid!.shadowRoot!.querySelectorAll('.row').length);maxCells=Math.max(maxCells,grid!.shadowRoot!.querySelectorAll('.row .cell').length)}
    const observer=new MutationObserver(observe);observer.observe(grid.shadowRoot!,{childList:true,subtree:true});observe()
    mark('scroll:start')
    for(const [top,left] of [[600,0],[1600,0],[2600,0],[2600,400],[2600,900],[0,0]]){
      const t=performance.now(),frames:number[]=[]
      viewport.scrollTop=top;viewport.scrollLeft=left;viewport.dispatchEvent(new Event('scroll'))
      await new Promise<void>(resolve=>requestAnimationFrame(time=>{frames.push(time);resolve()}));await grid.updateComplete
      scroll.push(performance.now()-t);frameObservations.push(frames);observe()
    }
    mark('scroll:end');observer.disconnect()
    if(maxRows>=100||maxCells>=2000)throw Error('Unbounded virtual DOM')
    return{mountMs,updates,scroll,updateMs:median(updates.slice(2)),scrollMs:median(scroll),frameObservations,mountCounts,updateCounts,scrollCounts:{...counters},dom:{maxRows,maxCells}}
  }finally{destroy?.();host.remove();await frame();busy=false;performance.clearMarks();performance.clearMeasures()}
}
declare global{interface Window{runCiPerformanceSample:typeof sample}}
window.runCiPerformanceSample=sample
