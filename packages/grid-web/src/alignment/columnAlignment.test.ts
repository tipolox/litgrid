// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from '../components/DataGrid.js'
import type { GridColumn } from '../types.js'
import { prepareAlignedColumns } from './columnAlignment.js'
import { syncGridInputs as react } from '../../../grid-react/src/gridBindings.js'
import { syncGridInputs as vue } from '../../../grid-vue/src/gridBindings.js'
import { syncGridInputs as angular } from '../../../grid-angular/src/gridBindings.js'
import { syncGridInputs as blazor } from '../../../grid-blazor/src/gridBindings.js'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })
const settings = (columns: GridColumn[]) => ({ columns, data: [{id:1,amount:12.5},{id:2,amount:20}],
  config:{selection:{mode:'row' as const,rowKey:'id'}},theme:'light' as const,
  ariaLabel:'Amounts',ariaDescription:'',screenReaderAnnouncements:true,height:320,rowHeight:36,overscan:4,columnOverscan:2,
  bestFitSampleSize:10,quickSearchDebounceThreshold:1000,quickSearchDebounceMs:100 })

it.each(['start','center','end','left','right'] as const)('detaches and validates %s without changing callbacks', align => {
  const render = vi.fn(), accessor = vi.fn()
  const source: GridColumn[] = [{key:'amount',align,render,accessor}]
  const prepared = prepareAlignedColumns(source)
  expect(prepared.columns[0]).not.toBe(source[0])
  expect(prepared.columns[0].render).toBe(render)
  expect(prepared.columns[0].accessor).toBe(accessor)
  expect(prepared.alignments.get('amount')).toBe('cell-align-'+align)
  expect(render).not.toHaveBeenCalled()
})

it.each(['justify','',null,1,{},true])('rejects invalid alignment %j with the column key', align => {
  expect(() => prepareAlignedColumns([{key:'amount',align} as GridColumn])).toThrow('Column "amount"')
})

it('rejects getters and inherited metadata without evaluating them; rejects duplicate keys', () => {
  const getter = vi.fn(() => 'right')
  const column = {key:'amount'}
  Object.defineProperty(column,'align',{get:getter,enumerable:true})
  expect(() => prepareAlignedColumns([column])).toThrow('own data property')
  expect(() => prepareAlignedColumns([Object.assign(Object.create(column),{key:'other'})])).toThrow('own data property')
  expect(getter).not.toHaveBeenCalled()
  expect(() => prepareAlignedColumns([{key:'amount'},{key:'amount',align:'end'}])).toThrow('Duplicate')
})

it.each([
  ['Web',(grid:DataGrid,input:ReturnType<typeof settings>) => {grid.updateColumnSchema(input.columns);grid.config=input.config;grid.data=input.data}],
  ['React',react],['Vue',vue],['Angular',angular],['Blazor',blazor],
  ['Blazor declarations',(grid:DataGrid,input:ReturnType<typeof settings>)=>blazor(grid,{...input,declarativeColumns:true})]
] as const)('%s rejects atomically and recovers with user state and focus intact', async (_,sync) => {
  const grid = new DataGrid()
  const columns: GridColumn[] = [{key:'id'},{key:'amount',align:'right'}]
  const input = settings(columns)
  sync(grid,input); document.body.append(grid); await grid.updateComplete
  grid.setColumnWidth('amount',244); grid.moveColumn('amount',0); grid.setColumnVisible('id',false); grid.selectRowByKey(1)
  const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  viewport.focus(); viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})); await grid.updateComplete
  const active = viewport.getAttribute('aria-activedescendant'), state = grid.getColumnState()
  Reflect.set(columns[1],'align','justify')
  expect(() => sync(grid,input)).toThrow('Column "amount"')
  expect(grid.getColumnState()).toEqual(state)
  expect(grid.getSelectionSnapshot().rows[0]?.key).toBe(1)
  expect(viewport.getAttribute('aria-activedescendant')).toBe(active)
  columns[1].align = 'center'; sync(grid,input); await grid.updateComplete
  expect(grid.getColumnState()).toEqual(state)
  expect(grid.renderRoot.querySelector('.row .cell')?.classList.contains('cell-align-center')).toBe(true)
  delete columns[1].align; sync(grid,input); await grid.updateComplete
  expect(grid.getColumnState()).toEqual(state)
  expect(grid.renderRoot.querySelector('.row .cell')?.className).not.toContain('cell-align-')
})

it('keeps replacement setter atomic and preserves historical unconfigured input identity', async () => {
  const grid = new DataGrid(), plain: GridColumn = {key:'amount'}
  grid.columns = [plain]
  expect(Reflect.get(grid,'sourceColumnDefs')[0]).toBe(plain)
  grid.columns = [{key:'amount',align:'end'}]
  const previous = Reflect.get(grid,'sourceColumnDefs')
  expect(() => { grid.columns = [{key:'amount',align:'bad'} as unknown as GridColumn] }).toThrow('Invalid alignment')
  expect(Reflect.get(grid,'sourceColumnDefs')).toBe(previous)
  grid.columns = [plain]
  expect(Reflect.get(grid,'sourceColumnDefs')[0]).toBe(plain)
})

it('retains alignment across disconnect/reconnect and dynamic keys without extra renderer nodes', async () => {
  const grid = new DataGrid()
  grid.inferColumns = false
  grid.columns = [{key:'amount',align:'right',render:value=>String(value)}]; grid.data = [{amount:12.5}]
  document.body.append(grid); await grid.updateComplete
  expect(grid.renderRoot.querySelector('.row .cell')?.textContent?.trim()).toBe('12.5')
  grid.remove(); document.body.append(grid); await grid.updateComplete
  expect(grid.renderRoot.querySelector('.row .cell')?.className).toContain('cell-align-right')
  grid.updateColumnSchema([{key:'id',align:'start'}]); await grid.updateComplete
  expect(grid.getColumnOrder()).toEqual(['id'])
  grid.updateColumnSchema([]); await grid.updateComplete
  expect(grid.getColumnOrder()).toEqual([])
})

it('retains external query state and B1 refresh when alignment changes', async () => {
  const grid = new DataGrid()
  grid.config = {queryMode:'external',selection:{mode:'row',rowKey:'id'},pagination:{enabled:true,pageSize:2}}
  grid.columns = [{key:'amount',align:'right'}]
  grid.externalState = {requestId:7,rows:[{id:1,amount:12.5}],total:{kind:'known',totalRows:5},query:{sort:{columnKey:null,direction:null},filters:[],search:'',pageIndex:1,pageSize:2}}
  document.body.append(grid); await grid.updateComplete
  const query = vi.fn(); grid.addEventListener('query-change',query)
  const before = grid.getPagination()
  grid.updateColumnSchema([{key:'amount',align:'left'}]); grid.refreshRange({start:0,endExclusive:1}); await grid.updateComplete
  expect(grid.getPagination()).toEqual(before)
  expect(grid.renderRoot.querySelector('.row .cell')?.textContent?.trim()).toBe('12.5')
  expect(query).not.toHaveBeenCalled()
})
