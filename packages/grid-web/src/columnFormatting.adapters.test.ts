// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { html } from 'lit'
import { DataGrid } from './components/DataGrid.js'
import type { GridColumn } from './types.js'
import { syncGridInputs as react } from '../../grid-react/src/gridBindings.js'
import { syncGridInputs as vue } from '../../grid-vue/src/gridBindings.js'
import { syncGridInputs as angular } from '../../grid-angular/src/gridBindings.js'
import { syncGridInputs as blazor } from '../../grid-blazor/src/gridBindings.js'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); Reflect.deleteProperty(navigator, 'clipboard') })
const money = {kind:'number',locale:'en-GB',options:{style:'currency',currency:'GBP'}} as const
const rows = [{id:1,amount:1234.5},{id:2,amount:-2},{id:3,amount:null}]
const cells = (grid: DataGrid) => [...grid.renderRoot.querySelectorAll('.row .cell')].map(cell => cell.textContent!.trim())
const settings = (columns: GridColumn[]) => ({columns, data:rows, config:{selection:{mode:'row' as const,rowKey:'id'}},theme:'light' as const,
  ariaLabel:'Amounts',ariaDescription:'',screenReaderAnnouncements:true,height:320,rowHeight:36,overscan:4,columnOverscan:2,
  bestFitSampleSize:10,quickSearchDebounceThreshold:1000,quickSearchDebounceMs:100})

it.each([['Web', (grid:DataGrid, inputs:ReturnType<typeof settings>) => {grid.updateColumnSchema(inputs.columns);grid.config=inputs.config;grid.data=inputs.data}],['React',react],['Vue',vue],['Angular',angular],['Blazor programmatic',blazor],['Blazor declarative',(grid:DataGrid,inputs:ReturnType<typeof settings>)=>blazor(grid,{...inputs,declarativeColumns:true})]] as const)('%s validates atomically, keeps state and recovers after nested/replacement changes',async (_,sync)=>{
  const grid=new DataGrid()
  const columns:GridColumn[]=[{key:'id'},{key:'amount',align:'right',format:structuredClone(money)}]
  const input=settings(columns)
  sync(grid,input);document.body.append(grid);await grid.updateComplete
  grid.setColumnWidth('amount',244);grid.moveColumn('amount',0);grid.setColumnVisible('id',false);grid.selectRowByKey(1)
  const viewport=grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await grid.updateComplete
  const active=viewport.getAttribute('aria-activedescendant')
  const state=grid.getColumnState()
  expect(cells(grid)[0]).toBe('£1,234.50')
  const format=columns[1].format!
  Reflect.set(format.options!,'currency','TOOLONG')
  expect(()=>sync(grid,input)).toThrow('Column "amount"')
  await grid.updateComplete
  expect(cells(grid)[0]).toBe('£1,234.50')
  expect(grid.getColumnState()).toEqual(state)
  expect(grid.getSelectionSnapshot().rows[0]?.key).toBe(1)
  expect(viewport.getAttribute('aria-activedescendant')).toBe(active)
  Reflect.set(format.options!,'currency','USD')
  sync(grid,input);await grid.updateComplete
  expect(cells(grid)[0]).toContain('1,234.50')
  expect(cells(grid)[0]).not.toContain('£')
  expect(grid.getColumnState()).toEqual(state)
  columns[1]={...columns[1],align:'center',format:{kind:'number',locale:'de-DE',options:{maximumFractionDigits:1}}}
  sync(grid,input);await grid.updateComplete
  expect(cells(grid)[0]).toBe('1.234,5')
  expect(grid.renderRoot.querySelector('.row .cell')?.classList.contains('cell-align-center')).toBe(true)
})

it('retains source query/search and accessor clipboard semantics; render overrides formatting',async()=>{
  const grid=new DataGrid()
  const accessor=vi.fn((row:unknown)=>(row as {amount:number}).amount/100)
  const render=vi.fn((value:unknown)=>html`<strong>${String(value)}</strong>`)
  grid.columns=[{key:'amount',accessor,format:money,render}]
  grid.config={selection:{mode:'row',rowKey:'id'}}
  grid.data=rows.slice(0,2)
  document.body.append(grid);await grid.updateComplete
  expect(grid.renderRoot.querySelector('strong')?.textContent).toBe('12.345')
  expect(render.mock.calls[0][0]).toBe(12.345)
  accessor.mockClear()
  grid.selectRowByKey(1);await grid.updateComplete
  const writeText=vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true})
  expect(await grid.copySelectedRows()).toBe(true)
  expect(writeText).toHaveBeenLastCalledWith('12.345')
  grid.sortBy('amount','asc');await grid.updateComplete
  expect(cells(grid)[0]).toBe('-0.02')
  grid.setFilter({columnKey:'amount',operator:'greaterThan',value:1000});await grid.updateComplete
  expect(cells(grid)).toEqual(['12.345'])
  grid.clearFilter();grid.clearSort();grid.setQuickSearch('£');await grid.updateComplete
  expect(cells(grid)).toEqual([])
})

it('measures formatted text for best fit and preserves raw selected-cell copy',async()=>{
  const grid=new DataGrid()
  grid.columns=[{key:'amount',format:money}];grid.data=[rows[0]];grid.config={selection:{mode:'cell'}}
  document.body.append(grid);await grid.updateComplete
  const measured:string[]=[]
  Reflect.set(grid,'measureTextWidth',(value:string)=>{measured.push(value);return value.length*10})
  expect(grid.bestFitColumn('amount')).toBeGreaterThan(64)
  expect(measured).toContain('£1,234.50')
  grid.renderRoot.querySelector<HTMLElement>('.row .cell')!.click();await grid.updateComplete
  const writeText=vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true})
  await grid.copySelectedCells();expect(writeText).toHaveBeenCalledWith('1234.5')
})

it('keeps external query revision/selection/page and B1 refresh with changed formatting',async()=>{
  const grid=new DataGrid()
  grid.config={queryMode:'external',selection:{mode:'row',rowKey:'id'},pagination:{enabled:true,pageSize:2}}
  grid.columns=[{key:'amount',format:money}]
  const query=grid.getQuery()
  expect(grid.setExternalState({...query,rows:rows.slice(0,2),total:{kind:'known',totalRows:3}})).toBe(true)
  document.body.append(grid);await grid.updateComplete
  grid.selectRowByKey(1)
  const intent=vi.fn();grid.addEventListener('query-change',intent)
  grid.updateColumnSchema([{key:'amount',format:{kind:'number',locale:'de-DE'},align:'end'}])
  await grid.updateComplete
  expect(grid.getQuery()).toEqual(query)
  expect(intent).not.toHaveBeenCalled()
  expect(grid.getSelectionSnapshot().rows[0]?.key).toBe(1)
  const adopted=grid.getSelectionSnapshot().rows[0]!.row as {amount:number}
  const previous=adopted.amount;adopted.amount=18.5
  expect(grid.refreshRow(1)).toBe(true);await grid.updateComplete
  expect(cells(grid)[0]).toBe('18,5')
  expect(grid.refreshRows([1])).toBe(1)
  expect(grid.refreshRange({start:0,endExclusive:2})).toBe(2)
  adopted.amount=previous
})

it('bounds formatter retention across remove, disconnect and reconnect',async()=>{
  const Native=Intl.NumberFormat
  const construct=vi.spyOn(Intl,'NumberFormat').mockImplementation(function (locale,options) {return new Native(locale,options)})
  const grid=new DataGrid();grid.columns=[{key:'amount',format:money}];grid.data=[rows[0]]
  document.body.append(grid);await grid.updateComplete
  expect(construct).toHaveBeenCalledTimes(1)
  grid.updateColumnSchema([{key:'amount',format:structuredClone(money),align:'center'}]);await grid.updateComplete
  expect(construct).toHaveBeenCalledTimes(1)
  grid.remove()
  expect((Reflect.get(grid,'columnFormats') as Map<string,unknown>).size).toBe(0)
  expect((Reflect.get(grid,'sourceColumnDefs') as GridColumn[])[0].render).toBeUndefined()
  document.body.append(grid);await grid.updateComplete
  expect(construct).toHaveBeenCalledTimes(2)
  expect(cells(grid)[0]).toBe('£1,234.50')
  grid.updateColumnSchema([{key:'id'}]);await grid.updateComplete
  expect((Reflect.get(grid,'columnFormats') as Map<string,unknown>).size).toBe(0)
})

it('retains compiled presentation through column-state restore/reset and namespace changes without mutating inputs',async()=>{
  const grid=new DataGrid()
  const columns:GridColumn[]=[{key:'amount',align:'end',format:money},{key:'id'}]
  grid.columns=columns;grid.data=[rows[0]];grid.columnStateStorageKey='format-a'
  document.body.append(grid);await grid.updateComplete
  expect(columns[0].render).toBeUndefined()
  grid.renderRoot.querySelector<HTMLElement>('.viewport')!.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('[role="status"]')!.textContent).toContain('£1,234.50')
  const original=grid.getColumnState()
  const assertDisplay=()=>{
    expect(grid.renderRoot.querySelector('.row')!.textContent).toContain('£1,234.50')
    expect(grid.renderRoot.querySelector('.row .cell-align-end')).not.toBeNull()
  }
  grid.moveColumn('id',0);grid.resetColumnOrder();await grid.updateComplete;assertDisplay()
  grid.setColumnState(original);await grid.updateComplete;assertDisplay()
  grid.resetColumnState();await grid.updateComplete;assertDisplay()
  grid.updateColumnSchema(columns,false,'format-b');await grid.updateComplete;assertDisplay()
  grid.updateColumnSchema(columns,false,'format-a');await grid.updateComplete;assertDisplay()
  localStorage.removeItem('format-a');localStorage.removeItem('format-b')
})
