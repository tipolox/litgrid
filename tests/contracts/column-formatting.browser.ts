import '@angular/compiler'
import { DataGrid as WebGrid, type GridColumn, type GridConfig, type GridColumnAlign } from '@tipolox/litgrid-web'
import { DataGrid as ReactGrid } from '@tipolox/litgrid-react'
import { DataGrid as VueGrid, LitGridColumn, type DataGridInstance } from '@tipolox/litgrid-vue'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import { syncGridInputs as blazor } from '../../packages/grid-blazor/src/gridBindings.js'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createApp, h, nextTick, shallowRef, compile } from 'vue'
import { bootstrapApplication } from '@angular/platform-browser'

declare const FORMATTING_CANDIDATE: boolean
type Mode = 'web' | 'react' | 'vue' | 'angular' | 'declarative' | 'inferred'
type Counters = { schema:number; data:number; config:number; inference:number; numberConstruct:number; dateConstruct:number; format:number }
const counts: Counters = {schema:0,data:0,config:0,inference:0,numberConstruct:0,dateConstruct:0,format:0}
const reset = () => { for (const key of Object.keys(counts) as (keyof Counters)[]) counts[key]=0 }
for (const kind of ['NumberFormat','DateTimeFormat'] as const) {
  const Native=Intl[kind]
  const Counting=function (...args:unknown[]) {
    counts[kind==='NumberFormat'?'numberConstruct':'dateConstruct']++
    const instance=Reflect.construct(Native,args) as Intl.NumberFormat | Intl.DateTimeFormat
    const format=instance.format.bind(instance) as (value:number)=>string
    Object.defineProperty(instance,'format',{value:(value:number)=>{counts.format++;return format(value)}})
    return instance
  }
  Counting.prototype=Native.prototype
  Object.setPrototypeOf(Counting,Native)
  Object.defineProperty(Intl,kind,{value:Counting,configurable:true,writable:true})
}
const originalSchema=WebGrid.prototype.updateColumnSchema
WebGrid.prototype.updateColumnSchema=function(...args){counts.schema++;return originalSchema.apply(this,args)}
for(const [key,count] of [['data','data'],['config','config'],['inferColumns','inference']] as const){
  const descriptor=Object.getOwnPropertyDescriptor(WebGrid.prototype,key)!
  Object.defineProperty(WebGrid.prototype,key,{...descriptor,set(value:unknown){counts[count]++;descriptor.set!.call(this,value)}})
}
function check(value:unknown,message:string):asserts value {if(!value)throw Error(message)}
const equal=(a:unknown,b:unknown,message:string)=>check(JSON.stringify(a)===JSON.stringify(b),message+': '+JSON.stringify(a))
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))
type Props={data:unknown[];columns?:GridColumn[];height:number;config?:GridConfig}
async function mount(mode:Mode,props:Props){
  const host=document.createElement(mode==='angular'?'litgrid-data-grid':'div')
  host.style.cssText='display:block;width:900px';document.body.append(host)
  let grid:WebGrid
  let update:(next:Partial<Props>)=>Promise<void>
  let destroy:()=>void
  if(mode==='web'||mode==='inferred'){
    grid=new WebGrid();grid.style.width='900px';grid.config=props.config??{}
    if(mode!=='inferred')grid.columns=props.columns??[]
    grid.data=props.data;grid.viewportHeight=props.height;host.append(grid)
    update=async next=>{Object.assign(props,next);if(next.columns)grid.updateColumnSchema(next.columns);if(next.height!==undefined)grid.viewportHeight=next.height}
    destroy=()=>host.remove()
  }else if(mode==='react'){
    const root=createRoot(host)
    const render=()=>flushSync(()=>root.render(createElement(ReactGrid,props)))
    render();grid=host.querySelector('yc-grid') as WebGrid
    update=async next=>{Object.assign(props,next);render()};destroy=()=>{flushSync(()=>root.unmount());host.remove()}
  }else if(mode==='vue'||mode==='declarative'){
    const state=shallowRef(props)
    const app=createApp({render:()=>h(VueGrid,mode==='declarative'?{...state.value,columns:undefined}:state.value,
      mode==='declarative'?{default:()=>state.value.columns!.map(column=>h(LitGridColumn,{column}))}:undefined)})
    app.config.errorHandler=()=>{} // Failures are asserted through retained state and recovery below.
    app.mount(host);await nextTick();grid=host.querySelector('yc-grid') as WebGrid
    update=async next=>{state.value={...state.value,...next};await nextTick()};destroy=()=>{app.unmount();host.remove()}
  }else{
    const app=await bootstrapApplication(DataGridComponent)
    const ref=app.components[0]
    for(const [key,value] of Object.entries(props))ref.setInput(key,value)
    ref.changeDetectorRef.detectChanges();grid=host.querySelector('yc-grid') as WebGrid
    update=async next=>{for(const [key,value] of Object.entries(next))ref.setInput(key,value);ref.changeDetectorRef.detectChanges()}
    destroy=()=>{app.destroy();host.remove()}
  }
  check(grid instanceof WebGrid,'real built Web Component for '+mode)
  await grid.updateComplete
  return{grid,host,update,destroy}
}
function textRect(element:Element){
  const node=[...element.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim())
  check(node,'text node exists')
  const range=document.createRange();range.selectNodeContents(node);return range.getBoundingClientRect()
}
function placement(rect:DOMRect,region:DOMRect,align:GridColumnAlign,dir:string,padding=0){
  const resolved=align==='start'?(dir==='rtl'?'right':'left'):align==='end'?(dir==='rtl'?'left':'right'):align
  const difference=resolved==='left'?rect.left-region.left-padding:resolved==='right'?region.right-padding-rect.right:(rect.left+rect.right-region.left-region.right)/2
  check(Math.abs(difference)<2,`${dir} ${align} effective placement delta ${difference}`)
}

async function geometry(){
  const results=[]
  for(const dir of ['ltr','rtl']){
    let actionX:number|undefined
    for(const align of ['left','right','center','start','end'] as const){
      const item=await mount('web',{data:[{amount:1234.5}],columns:[{key:'amount',header:'Amount',width:260,align,format:{kind:'number',locale:'en-GB'}}],height:120})
      const {grid}=item
      grid.style.direction=dir;await frame()
      const cell=grid.shadowRoot!.querySelector<HTMLElement>('.row .cell')!
      const label=grid.shadowRoot!.querySelector<HTMLElement>('.header-label')!
      placement(textRect(cell),cell.getBoundingClientRect(),align,dir,12)
      placement(textRect(label),label.getBoundingClientRect(),align,dir)
      const button=grid.shadowRoot!.querySelector<HTMLElement>('.header-action-button')!
      const x=button.getBoundingClientRect().x
      if(actionX!==undefined)check(Math.abs(x-actionX)<1,'header action position retained')
      actionX=x
      grid.updateColumnSchema([{key:'amount',header:'Amount',width:260,align,render:(value)=>{const span=document.createElement('span');span.className='custom';span.textContent=String(value);return span}}]);await grid.updateComplete
      const custom=grid.shadowRoot!.querySelector('.custom')!
      placement(custom.getBoundingClientRect(),cell.getBoundingClientRect(),align,dir,12)
      const viewport=grid.shadowRoot!.querySelector<HTMLElement>('.viewport')!
      viewport.focus();viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await grid.updateComplete
      const active=viewport.getAttribute('aria-activedescendant')
      check(active&&grid.shadowRoot!.getElementById(active),'active cell remains accessible')
      const handle=grid.shadowRoot!.querySelector<HTMLElement>('.resize-handle')!
      const before=grid.getColumnWidth({key:'amount',width:260})
      handle.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:260,bubbles:true}))
      window.dispatchEvent(new PointerEvent('pointermove',{clientX:280,bubbles:true}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))
      check(grid.getColumnWidth({key:'amount',width:260})>before,'resize remains functional')
      results.push({dir,align,body:true,header:true,custom:true,actions:true,keyboard:true,resize:true});item.destroy()
    }
  }
  return results
}

async function recovery(){
  const results=[]
  for(const mode of ['web','react','vue','angular','declarative'] as const){
    let columns:GridColumn[]=[{key:'amount',align:'right',format:{kind:'number',locale:'en-GB',options:{style:'currency',currency:'GBP'}}}]
    // Synchronous adapter failures are caught at their framework's public update
    // boundary; Vue's normal errorHandler preserves its mounted last valid grid.
    const item=await mount(mode,{data:[{id:1,amount:1234.5}],columns,height:200,config:{selection:{mode:'row',rowKey:'id'}}})
    const {grid}=item
    grid.setColumnWidth('amount',280);grid.selectRowByKey(1)
    const state=grid.getColumnState()
    const invalid={...columns[0],format:{kind:'number',locale:'en-GB',options:{style:'currency',currency:'TOOLONG'}}} as GridColumn
    let rejected=false;try{grid.updateColumnSchema([invalid])}catch{rejected=true}
    check(rejected,mode+' imperative descriptor rejection')
    try{await item.update({columns:[invalid]})}catch{}
    check(item.host.querySelector('yc-grid')===grid,mode+' retains mounted instance on invalid props')
    equal(grid.getColumnState(),state,mode+' retains state')
    check(grid.shadowRoot!.textContent!.includes('£1,234.50'),mode+' retains display')
    columns=[{key:'amount',align:'center',format:{kind:'number',locale:'de-DE'}}]
    await item.update({columns});await grid.updateComplete
    equal(grid.getColumnState(),state,mode+' metadata retains width')
    check(grid.shadowRoot!.querySelector('.row .cell')!.textContent!.trim()==='1.234,5',mode+' valid recovery')
    check(grid.getSelectionSnapshot().rows[0]?.key===1,mode+' selection retained')
    results.push({mode,rejected,recovered:true});item.destroy()
  }
  // Real compiled Vue template: inline marker props, invalid update, correction.
  const state=shallowRef<GridColumn['format']>({kind:'number',locale:'en-GB'})
  const errors:unknown[]=[]
  const host=document.createElement('div');document.body.append(host)
  const app=createApp({components:{DataGrid:VueGrid,LitGridColumn},setup:()=>({state,rows:[{value:1.25}]}),render:compile('<DataGrid :data="rows"><LitGridColumn field="value" align="right" :format="state" /></DataGrid>')})
  app.config.errorHandler=error=>errors.push(error)
  app.mount(host);await nextTick();const grid=host.querySelector('yc-grid') as WebGrid;await grid.updateComplete
  state.value={kind:'dateTime',locale:'en-GB',options:{timeZone:'Invalid/Timezone'}};await nextTick();await grid.updateComplete
  check(errors.length===1,'compiled Vue template reports invalid format once')
  state.value={kind:'number',locale:'de-DE'};await nextTick();await grid.updateComplete
  check(grid.shadowRoot!.querySelector('.row .cell')!.textContent!.trim()==='1,25','inline Vue metadata recovered')
  app.unmount();host.remove()
  for(const declarativeColumns of [false,true]){
    const grid=new WebGrid()
    const inputs={columns:[{key:'amount',align:'right',format:{kind:'number',locale:'en-GB'}}] as GridColumn[],declarativeColumns,
      data:[{amount:1.25}],config:{},theme:'light' as const,ariaLabel:'Blazor',ariaDescription:'',screenReaderAnnouncements:true,height:200,rowHeight:36,overscan:4,columnOverscan:2,bestFitSampleSize:10,quickSearchDebounceThreshold:1000,quickSearchDebounceMs:100}
    blazor(grid,JSON.parse(JSON.stringify(inputs)));document.body.append(grid);await grid.updateComplete
    grid.setColumnWidth('amount',280);const previous=grid.getColumnState()
    inputs.columns[0].format={kind:'number',locale:'invalid_locale'}
    let rejected=false;try{blazor(grid,JSON.parse(JSON.stringify(inputs)))}catch{rejected=true}
    check(rejected,'Blazor wire descriptor rejected');equal(grid.getColumnState(),previous,'Blazor retained active schema')
    inputs.columns[0].format={kind:'number',locale:'de-DE'}
    blazor(grid,JSON.parse(JSON.stringify(inputs)));await grid.updateComplete
    check(grid.shadowRoot!.querySelector('.row .cell')!.textContent!.trim()==='1,25','Blazor JSON recovery')
    equal(grid.getColumnState(),previous,'Blazor retained resize');grid.remove()
  }
  return{wrappers:results,compiledVue:true,blazorJSON:true}
}

type Scenario='default'|'align'|'one-number'|'all-number'|'epoch'|'iso'|'render'
type Workload={mode:Mode;rows:number;columns:number;scenario:Scenario}
async function workload(spec:Workload){
  const data=Array.from({length:spec.rows},(_,id)=>({id,value:id+.125,date:1794269700000,iso:'2026-11-10T00:15:00.1234567Z'}))
  const numeric={kind:'number',locale:'en-GB',options:{maximumFractionDigits:2}} as const
  const date={kind:'dateTime',locale:'en-GB',options:{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}} as const
  reset()
  const columns:GridColumn[]=Array.from({length:spec.columns},(_,index)=>{
    if(spec.scenario==='default')return{
      key:index===0?'value':index===1?'id':`c${index}`,width:100,
      accessor:(row:unknown)=>(row as typeof data[number]).value+index,
    }
    const formatted=spec.scenario!=='align'&&(spec.scenario!=='one-number'||index===0)
    const descriptor=spec.scenario==='epoch'||spec.scenario==='iso'?date:numeric
    const render=formatted&&(!FORMATTING_CANDIDATE||spec.scenario==='render')?(descriptor.kind==='number'
      ?new Intl.NumberFormat(descriptor.locale,descriptor.options):new Intl.DateTimeFormat(descriptor.locale,descriptor.options)):undefined
    return{key:index===0?'value':index===1?'id':`c${index}`,width:100,
      accessor:(row:unknown)=>{const item=row as typeof data[number];return spec.scenario==='epoch'?item.date:spec.scenario==='iso'?item.iso:item.value+index},
      ...(spec.scenario==='align'&&FORMATTING_CANDIDATE?{align:'right' as const}:{}),
      ...(formatted&&FORMATTING_CANDIDATE&&spec.scenario!=='render'?{format:descriptor}:{}),
      ...(render?{render:(value:unknown)=>render.format(typeof value==='string'?Date.parse(value):value as number)}:{})}
  })
  const inputData=spec.mode==='inferred'?data.map(({id,value,date})=>({id,value,date})):data
  const start=performance.now();const item=await mount(spec.mode,{data:inputData,columns,height:360});const mountMs=performance.now()-start
  const {grid}=item
  const mountCounts={...counts};reset()
  const updates=[]
  for(let i=0;i<12;i++){const t=performance.now();await item.update({height:360+i%2});await grid.updateComplete;if(i>=2)updates.push(performance.now()-t)}
  const updateCounts={...counts};reset()
  const viewport=grid.shadowRoot!.querySelector<HTMLElement>('.viewport')!
  const scroll=[]
  for(const [top,left] of [[600,0],[1600,0],[2600,0],[2600,400],[2600,900],[0,0]]){
    const t=performance.now();viewport.scrollTop=top;viewport.scrollLeft=left;viewport.dispatchEvent(new Event('scroll'));await frame();await grid.updateComplete;scroll.push(performance.now()-t)
  }
  const scrollCounts={...counts}
  const dom={rows:grid.shadowRoot!.querySelectorAll('.row').length,cells:grid.shadowRoot!.querySelectorAll('.row .cell').length}
  check(dom.rows<100&&dom.cells<2000,'bounded two-axis DOM')
  check(updateCounts.numberConstruct===0&&updateCounts.dateConstruct===0&&scrollCounts.numberConstruct===0&&scrollCounts.dateConstruct===0,'no steady-render Intl construction')
  if(spec.scenario==='default'||spec.scenario==='align')check(mountCounts.numberConstruct===0&&mountCounts.dateConstruct===0&&updateCounts.format===0&&scrollCounts.format===0,'no Intl work for unconfigured columns')
  reset()
  const metadataStart=performance.now()
  if(spec.mode!=='inferred'){
    const next=columns.map(column=>{
      if(column.format)return{...column,format:{...column.format,locale:'de-DE'}}
      if(column.render){
        const formatter=spec.scenario==='epoch'||spec.scenario==='iso'?new Intl.DateTimeFormat('de-DE',date.options):new Intl.NumberFormat('de-DE',numeric.options)
        return{...column,render:(value:unknown)=>formatter.format(typeof value==='string'?Date.parse(value):value as number)}
      }
      return{...column,header:'Updated'}
    })
    await item.update({columns:next});await grid.updateComplete
  }
  const metadataMs=performance.now()-metadataStart,metadataCounts={...counts}
  reset();const refreshStart=performance.now();grid.refreshRange({start:0,endExclusive:2});await grid.updateComplete
  const refreshMs=performance.now()-refreshStart,refreshCounts={...counts}
  reset();const bestFitStart=performance.now();grid.bestFitColumn(spec.mode==='inferred'?'value':columns[0].key)
  const bestFitMs=performance.now()-bestFitStart,bestFitCounts={...counts}
  item.destroy()
  return{spec,mountMs,updates,scroll,mountCounts,updateCounts,scrollCounts,dom,metadataMs,metadataCounts,refreshMs,refreshCounts,bestFitMs,bestFitCounts}
}

async function qualification(){return{geometry:await geometry(),recovery:await recovery()}}
declare global {
  interface Window {
    runFormattingQualification:typeof qualification
    runFormattingWorkload:typeof workload
  }
}
Object.assign(window,{runFormattingQualification:qualification,runFormattingWorkload:workload})
