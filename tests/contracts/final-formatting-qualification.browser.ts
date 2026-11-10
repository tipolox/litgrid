import type {DataGrid,GridColumn} from '@tipolox/litgrid-web'

export async function qualifySharing(Grid:typeof DataGrid,counts:{dateConstruct:number;numberConstruct:number;format:number},reset:()=>void,existing:()=>Promise<unknown>){
 const check=(ok:unknown,label:string)=>{if(!ok)throw Error('Sharing qualification: '+label)}
 const same=(a:unknown,b:unknown,label:string)=>check(JSON.stringify(a)===JSON.stringify(b),label)
 const descriptor={kind:'dateTime',locale:'en-GB',options:{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}} as const
 const schema=(n=120):GridColumn[]=>Array.from({length:n},(_,i)=>({key:'c'+i,width:100,accessor:(row:unknown)=>(row as {value:string}).value,format:{...descriptor,options:i%2?{timeStyle:'short',dateStyle:'medium',timeZone:'Asia/Singapore'}:{...descriptor.options}}}))
 const grid=new Grid();grid.style.width='900px';grid.config={selection:{mode:'row',rowKey:'id'}}
 reset();let columns=schema();grid.columns=columns;grid.data=[{id:1,value:'2026-11-10T00:15:00.1234567Z'}];grid.viewportHeight=200;document.body.append(grid);await grid.updateComplete
 const initial=counts.dateConstruct,sharing=initial===1
 check(initial===1||initial===120,'initial construction count')
 const formats=()=>Reflect.get(grid,'columnFormats') as Map<string,{display:(value:unknown)=>string;descriptor:unknown;formatter?:object}>
 const identity=formats().get('c0')!.display
 grid.setColumnWidth('c0',240);grid.selectRowByKey(1)
 const viewport=grid.shadowRoot!.querySelector<HTMLElement>('.viewport')!;viewport.focus()
 const state=grid.getColumnState(),selection=grid.getSelectionSnapshot(),focus=grid.shadowRoot!.activeElement
 reset();grid.updateColumnSchema(columns.map(c=>({...c,format:{...descriptor,options:{timeStyle:'short',timeZone:'Asia/Singapore',dateStyle:'medium'}}})));await grid.updateComplete
 check(counts.dateConstruct===0&&formats().get('c0')!.display===identity,'unchanged/reordered options reuse')
 const invalids:unknown[]=[
  {kind:'dateTime',locale:'bad_locale',options:{...descriptor.options}},
  {kind:'dateTime',locale:'en-GB',options:{...descriptor.options,timeZone:'Invalid/Zone'}},
  {kind:'dateTime',locale:'en-GB',options:{...descriptor.options,dateStyle:'invalid'}},
  {kind:'dateTime',locale:'en-GB',options:{...descriptor.options,calendar:'gregory'}},
  {kind:'dateTime',locale:'en-GB',options:{dateStyle:'short'}},
  {kind:'dateTime',locale:'en-GB',options:{...descriptor.options,timeStyle:42}},
  {kind:'number',locale:'en-GB',options:{style:'currency',currency:'INVALID'}},
 ]
 for(const format of invalids)for(const boundary of ['setter','reconcile']){
  const old=formats(),bad=[...columns.slice(0,-1),{...columns[119],format} as GridColumn];let rejected=false
  try{if(boundary==='setter')grid.columns=bad;else grid.updateColumnSchema(bad)}catch{rejected=true}
  check(rejected,'invalid descriptor rejected '+boundary);check(formats()===old,'active cache atomic '+boundary)
  same(grid.getColumnState(),state,'width/order/visibility atomic');same(grid.getSelectionSnapshot(),selection,'selection atomic');check(grid.shadowRoot!.activeElement===focus,'focus atomic')
 }
 for(const bad of [[...columns,{...columns[0]}],[{...columns[0],align:'bad'} as unknown as GridColumn,...columns.slice(1)]]){
  const old=formats();let rejected=false;try{grid.updateColumnSchema(bad)}catch{rejected=true}
  check(rejected&&formats()===old,'duplicate/alignment rejection atomic')
 }
 // Recover, then introduce three genuinely distinct descriptors.
 columns=columns.map((c,i)=>i===0?{...c,format:{...descriptor,locale:'ja-JP'}}:i===1?{...c,format:{...descriptor,options:{...descriptor.options,timeZone:'UTC'}}}:i===2?{...c,format:{...descriptor,options:{...descriptor.options,dateStyle:'long'}}}:c)
 reset();grid.updateColumnSchema(columns);await grid.updateComplete
 check(counts.dateConstruct===3,'mixed descriptor changes construct exactly three')
 if(sharing)check(new Set([...formats().values()].map(x=>x.formatter)).size===4,'four bounded active date instances')
 columns=[...columns,{key:'new',format:{...descriptor,options:{...descriptor.options}},accessor:(row:unknown)=>(row as {value:string}).value}]
 reset();grid.updateColumnSchema(columns);await grid.updateComplete
 check(counts.dateConstruct===(sharing?0:1),'new key reuses identical active descriptor only in prototype')
 // Numbers remain separate, custom renderers win, invalid inputs remain blank.
 const custom=()=> 'custom renderer'
 columns=[{key:'custom',format:descriptor,render:custom},{key:'date',format:descriptor},{key:'n1',format:{kind:'number',locale:'en-GB'}},{key:'n2',format:{kind:'number',locale:'en-GB'}}]
 reset();grid.updateColumnSchema(columns);await grid.updateComplete
 check(counts.dateConstruct===(sharing?0:2)&&counts.numberConstruct===2,'mixed numbers/custom renderer validation')
 check(formats().get('date')!.display('invalid')===''&&formats().get('date')!.display(null)==='','invalid/missing date semantics')
 check((Reflect.get(grid,'columnDefs') as GridColumn[]).find(c=>c.key==='custom')!.render===custom,'custom render precedence')
 if(sharing)check(new Set([...formats().values()].filter(x=>x.formatter).map(x=>x.formatter)).size===1,'removed descriptors not retained in active cache')
 reset();grid.refreshRange({start:0,endExclusive:1});await grid.updateComplete;check(counts.dateConstruct===0,'B1 refresh reuses formatter')
 grid.updateColumnSchema(schema());await grid.updateComplete
 const oldDisplays=new Set([...formats().values()].map(x=>x.display))
 grid.remove();check(formats().size===0,'disconnect releases active formats')
 for(const property of ['columnDefs','sourceColumnDefs'])check((Reflect.get(grid,property) as GridColumn[]).every(c=>!c.render||!oldDisplays.has(c.render as (value:unknown)=>string)),'disconnect releases generated closures')
 reset();document.body.append(grid);await grid.updateComplete
 check(counts.dateConstruct===(sharing?1:120),'reconnect rebuilds local pool');check(formats().size===120,'reconnect restores schema')
 grid.updateColumnSchema([{key:'plain'}]);await grid.updateComplete;check(formats().size===0,'unconfigured schema releases entries');grid.remove()
 // A new grid must never reuse another grid's pool.
 reset();const other=new Grid();other.columns=schema();other.data=[];document.body.append(other);await other.updateComplete
 check(counts.dateConstruct===(sharing?1:120),'no cross-grid cache');other.remove()
 const parity=await existing()
 return{sharing,initialConstructors:initial,invalidCases:invalids.length*2+2,atomic:true,mixedDescriptors:true,recovery:true,unchangedReuse:true,newKeyReuse:sharing,teardown:true,reconnect:true,noGlobalCache:true,customRender:true,B1:true,existingFrameworkQualification:parity}
}
