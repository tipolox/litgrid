import { deepStrictEqual } from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Deterministic differential stress test between main's behavior and the
// candidate implementation from the current production PR. No production source is changed.
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const out = resolve(process.argv[2] ?? '.private/a3/stage3-contract-fuzz.json')
const load = async name => (await import(pathToFileURL(resolve(root,'.private/a3/variants',name,'index.js')).href)).createGridEngine
const [baseline, candidate] = await Promise.all([load('baseline'),load('candidate')])

let seed = 0x1A34C3
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0 }
const choose = n => random() % n
const clone = x => JSON.parse(JSON.stringify(x))
const row = id => ({ id, alternative: id + 1_000_000, name: 'Fictional row ' + id })
const initialRows = Array.from({length:48},(_,id)=>row(id))
const firstConfig = {selection:{mode:'multi-row',rowKey:'id',scopeKey:'site-0'},
  pagination:{enabled:true,pageSize:12}}
const records = [
  { variant:'baseline', engine:baseline(clone(firstConfig)), data:clone(initialRows), events:[] },
  { variant:'verified-index-reuse', engine:candidate(clone(firstConfig)), data:clone(initialRows), events:[] }
]
for(const record of records){
  record.engine.onSelectionChange(event=>record.events.push({
    scopeKey:event.scopeKey, rowIndexes:[...event.rowIndexes],
    rows:event.rows.map(item=>({rowIndex:item.rowIndex,key:item.key, id:item.row?.id ?? null}))
  }))
  record.engine.setData(record.data)
}
function observation(record) {
  const grid=record.engine
  const selection=grid.getSelectionSnapshot()
  return {
    data: grid.getRows().map(item=>({id:item?.id??null,alternative:item?.alternative??null})),
    displayed: grid.getRowCount(),
    total: grid.getTotalRowCount(),
    selectable: grid.getSelectableRowCount(),
    pagination: grid.getPagination(),
    sort: grid.getSort(),
    filters: grid.getFilters(),
    query: grid.getQuickSearch(),
    config: grid.getConfig(),
    selection: {
      scopeKey: selection.scopeKey,
      rowIndex: selection.rowIndex,
      rowIndexes: [...selection.rowIndexes],
      rows: selection.rows.map(item=>({rowIndex:item.rowIndex,key:item.key,id:item.row?.id??null,
        alternative:item.row?.alternative??null}))
    },
    events: record.events
  }
}
const steps = []
function apply(record, command) {
  const grid=record.engine
  const data=record.data
  switch(command.action){
    case 'setData':grid.setData(data);break
    case 'edit-identity':if(data.length)data[command.index%data.length].id=command.value;break
    case 'edit-name':if(data.length)data[command.index%data.length].name='Renamed '+command.value;break
    case 'push':data.push(row(command.value));grid.setData(data);break
    case 'remove':if(data.length)data.splice(command.index%data.length,1);grid.setData(data);break
    case 'reorder':data.reverse();grid.setData(data);break
    case 'set-config':grid.setConfig(clone(command.config));break
    case 'sort':grid.sortBy('id',command.direction);break
    case 'clear-sort':grid.clearSort();break
    case 'filter':grid.setFilter({columnKey:'id',operator:'greaterThan',value:command.value});break
    case 'clear-filter':grid.clearFilter();break
    case 'quick-search':grid.setQuickSearch(command.value);break
    case 'clear-search':grid.clearQuickSearch();break
    case 'page':grid.setPage(command.value);break
    case 'page-size':grid.setPageSize(command.value);break
    case 'select':grid.selectRowByKey(command.value);break
    case 'select-all':grid.selectAllRows();break
    case 'clear-selection':grid.clearSelection();break
    case 'page-array-edit':if(grid.getRows().length)grid.getRows()[0]={id:command.value,alternative:-1};break
    default:throw new Error('Unknown action '+command.action)
  }
}
for(let index=0;index<750;index++){
  const op=choose(20)
  const scope='site-'+choose(4)
  const pageSize=[1,2,10,12,25][choose(5)]
  const baseConfig={
    selection:{mode:'multi-row',rowKey:choose(5)===0?'alternative':'id',scopeKey:scope},
    pagination:{enabled:choose(4)!==0,pageSize,pageIndex:choose(4)},
    rowHeader:{enabled:choose(2)===0,width:48+choose(4)*8},
    quickSearch:{label:'Find '+choose(6)}
  }
  const command=[
    {action:'setData'}, {action:'edit-identity',index:choose(100),value:choose(48)},
    {action:'edit-name',index:choose(100),value:choose(100)},
    {action:'push',value:1000+index}, {action:'remove',index:choose(100)},
    {action:'reorder'}, {action:'set-config',config:baseConfig},
    {action:'sort',direction:choose(2)?'asc':'desc'}, {action:'clear-sort'},
    {action:'filter',value:choose(50)}, {action:'clear-filter'},
    {action:'quick-search',value:choose(2)?'Fictional':'Renamed'},
    {action:'clear-search'}, {action:'page',value:choose(6)},
    {action:'page-size',value:pageSize}, {action:'select',value:choose(60)},
    {action:'select-all'}, {action:'clear-selection'},
    {action:'page-array-edit',value:90000+index},
    {action:'set-config',config:clone(firstConfig)}
  ][op]
  for(const record of records)apply(record,command)
  try {
    deepStrictEqual(observation(records[0]),observation(records[1]))
  } catch(error){
    console.error('A3 H4 semantic divergence at index '+index+': '+JSON.stringify(command))
    throw error
  }
  steps.push({index,action:command.action})
}
function external(create) {
  const engine=create({queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'site-0'}})
  const events=[]
  engine.onSelectionChange(event=>events.push(event.rows.map(item=>item.key)))
  const observations=[]
  for(let i=1;i<=50;i++){
    const freshRows=Array.from({length:20},(_,id)=>({id:i*100+id}))
    const query=engine.getQuery().query
    const accepted=engine.setExternalState({requestId:i,query,rows:freshRows,total:{kind:'known',totalRows:1_000_000_000}})
    engine.selectRowByKey(i*100)
    engine.setConfig({queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'site-0'}})
    const stale=engine.setExternalState({requestId:i-1,query,rows:freshRows,total:{kind:'known',totalRows:1_000_000_000}})
    observations.push({accepted,stale,selected:engine.getSelectionSnapshot().rows.map(x=>x.key),
      count:engine.getSelectableRowCount(),events:clone(events)})
  }
  return observations
}
deepStrictEqual(external(baseline),external(candidate))
const result={
  purpose:'Stage 3 deterministic state-differential stress tests for production candidate candidate verified index reuse',
  revision:process.env.GITHUB_SHA || null, seed:0x1A34C3,
  steps:steps.length, externalStates:50,
  scope:'No authored source changes; compares events, identity and selection, page-array operations, data mutation, sort/filter/search, pagination, scope and external stale requests.',
  result:'All compared observations matched the unchanged baseline',
  commands:steps
}
mkdirSync(dirname(out),{recursive:true})
writeFileSync(out,JSON.stringify(result,null,2)+'\n')
console.log('A3 H4 deterministic differential PASS: '+steps.length+' state transitions + 50 external commits; artifact '+out)
