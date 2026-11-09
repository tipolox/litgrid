// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

async function mount(rows = Array.from({length: 12}, (_, id) => ({id, name: 'Person '+id, status: 'idle'}))) {
  const render = vi.fn((value: unknown) => String(value))
  const grid = new DataGrid()
  grid.config = { selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-1' } }
  grid.columns = [{key:'name',render},{key:'status',render}]
  grid.data = rows
  document.body.append(grid)
  await grid.updateComplete
  return {grid,rows,render}
}

describe('B1 explicit data refresh and targeted presentation invalidation', () => {
  it.each(['row', 'batch', 'range'] as const)('adopts a reported same-key replacement through %s refresh', async kind => {
    const {grid, rows} = await mount()
    grid.selectRowByKey(1)
    rows[1] = {...rows[1], name: 'Maria'}
    const result = kind === 'row' ? Number(grid.refreshRow(1))
      : kind === 'batch' ? grid.refreshRows([1, 1])
      : grid.refreshRange({start: 1, endExclusive: 2})
    expect(result).toBe(1)
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.row')[1].textContent).toContain('Maria')
    expect(grid.getSelectionSnapshot().rows[0].row).toBe(rows[1])
  })

  it('reconciles a reported same-length reorder and preserves selected identity', async () => {
    const {grid, rows} = await mount()
    grid.selectRowByKey(1)
    ;[rows[1], rows[2]] = [rows[2], rows[1]]
    expect(grid.refreshRow(1)).toBe(true)
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.row')[1].textContent).toContain('Person 2')
    expect(grid.getSelectionSnapshot().rows[0]).toMatchObject({key: 1, rowIndex: 2})
  })

  it.each(['row', 'batch', 'range'] as const)('declines replacements in render-only %s refresh without painting cached data', async kind => {
    const {grid, rows, render} = await mount()
    rows[1] = {...rows[1], name:'Maria'}
    render.mockClear()
    const options = {mode:'render-only'} as const
    const result = kind === 'row' ? Number(grid.refreshRow(1, options))
      : kind === 'batch' ? grid.refreshRows([0, 1], options)
      : grid.refreshRange({start:0, endExclusive:2}, options)
    expect(result).toBe(0)
    await grid.updateComplete
    expect(render).not.toHaveBeenCalled()
    expect(grid.refreshRow(1)).toBe(true)
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('Maria')
  })

  it.each(['duplicate', 'invalid', 'changed'] as const)('reconciles a reported replacement with %s identity', async kind => {
    const {grid, rows} = await mount()
    grid.selectRowByKey(1)
    rows[1] = {...rows[1], id:kind === 'duplicate' ? 2 : kind === 'invalid' ? NaN : 99, name:'Replacement'}
    expect(grid.refreshRows([1, rows[1].id])).toBe(kind === 'changed' ? 1 : 0)
    await grid.updateComplete
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    expect(grid.renderRoot.textContent).toContain('Replacement')
    if (kind === 'duplicate') expect(grid.refreshRow(2)).toBe(false)
  })

  it.each(['sort', 'filter', 'search'] as const)('reconciles replacements under active %s and retains a valid page', async transform => {
    const {grid, rows} = await mount()
    grid.config={selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:3}}
    if (transform === 'sort') grid.sortBy('id','asc')
    else if (transform === 'filter') grid.setFilter({columnKey:'name',operator:'startsWith',value:'Person'})
    else grid.setQuickSearch('Person')
    grid.setPage(1)
    rows[4] = {...rows[4], name:'Maria'}
    expect(grid.refreshRow(4)).toBe(transform === 'sort')
    await grid.updateComplete
    expect(grid.getPagination().pageIndex).toBe(1)
    expect(grid.getTotalRowCount()).toBe(transform === 'sort' ? 12 : 11)
    expect(grid.renderRoot.textContent?.includes('Maria')).toBe(transform === 'sort')
    if (transform !== 'sort') {
      rows[4].name='Person returned'
      expect(grid.refreshRow(4)).toBe(true)
      await grid.updateComplete
      expect(grid.renderRoot.textContent).toContain('Person returned')
    }
  })

  it('maps paginated ranges to source slots, including index-only grids', async () => {
    const {grid, rows} = await mount()
    grid.config={pagination:{enabled:true,pageSize:3}}
    grid.setPage(1)
    await grid.updateComplete
    rows[4] = {...rows[4], name:'Maria'}
    expect(grid.refreshRange({start:1,endExclusive:2})).toBe(1)
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.row')[1].textContent).toContain('Maria')
    rows[4].status='validating'
    expect(grid.refreshRange({start:1,endExclusive:2},{mode:'render-only'})).toBe(1)
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('validating')
    grid.sortBy('id','desc')
    await grid.updateComplete
    expect(grid.refreshRange({start:0,endExclusive:1},{mode:'render-only'})).toBe(0)
  })

  it('keeps offscreen replacement current when virtualized into view', async () => {
    const rows = Array.from({length:1000}, (_,id) => ({id,name:'Person '+id,status:'idle'}))
    const {grid} = await mount(rows)
    rows[900] = {...rows[900], name:'Offscreen replacement'}
    expect(grid.refreshRow(900)).toBe(true)
    await grid.updateComplete
    const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
    viewport.scrollTop = 900 * 36
    viewport.dispatchEvent(new Event('scroll'))
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('Offscreen replacement')
  })

  it('does not claim to detect unreported structural mutations elsewhere', async () => {
    const {grid,rows,render} = await mount()
    rows[10] = {...rows[10], id:1} // unreported collision outside the target
    rows[1].status='validating'
    render.mockClear()
    expect(grid.refreshRow(1)).toBe(true)
    await grid.updateComplete
    expect(render).toHaveBeenCalledTimes(2)
    expect(grid.refreshData()).toBe(true)
    expect(grid.refreshRow(1)).toBe(false)
  })

  it('keeps safe render-only updates selective in a sorted paginated view', async () => {
    const {grid,rows,render} = await mount()
    grid.config={selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:3}}
    grid.sortBy('id','desc')
    grid.setPage(1)
    await grid.updateComplete
    render.mockClear()
    rows[7].status='validating'
    expect(grid.refreshRow(7,{mode:'render-only'})).toBe(true)
    await grid.updateComplete
    expect(render).toHaveBeenCalledTimes(2)
    expect(grid.renderRoot.querySelectorAll('.row')[1].textContent).toContain('validating')
    expect(grid.getPagination().pageIndex).toBe(1)
  })

  it('repaints only accepted external objects and clears them across scopes', async () => {
    const {grid} = await mount()
    grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'tenant-a'}}
    const query=grid.getQuery()
    const rows=[{id:1,name:'Accepted tenant A',status:'idle'}]
    const state={...query,rows,total:{kind:'known',totalRows:1}} as const
    expect(grid.setExternalState(state)).toBe(true)
    await grid.updateComplete
    const intent=vi.fn()
    grid.addEventListener('query-change',intent)
    rows[0]={...rows[0],name:'Uncommitted replacement'}
    expect(grid.refreshRow(1)).toBe(true)
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('Accepted tenant A')
    expect(grid.renderRoot.textContent).not.toContain('Uncommitted replacement')
    grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'tenant-b'}}
    expect(grid.refreshRow(1)).toBe(false)
    expect(grid.refreshRange({start:0,endExclusive:1})).toBe(0)
    expect(grid.setExternalState(state)).toBe(false)
    await grid.updateComplete
    expect(grid.renderRoot.textContent).not.toContain('Accepted tenant A')
    expect(intent).not.toHaveBeenCalled()
  })

  it('updates one mounted keyed row without rerendering other mounted cell callbacks', async () => {
    const {grid,rows,render} = await mount()
    const before = [...grid.renderRoot.querySelectorAll<HTMLElement>('.row')]
    expect(before.length).toBeGreaterThan(3)
    render.mockClear()
    rows[1].status = 'validating'
    expect(grid.refreshRow(1)).toBe(true)
    await grid.updateComplete
    const after = [...grid.renderRoot.querySelectorAll<HTMLElement>('.row')]
    expect(after[1]).toBe(before[1])
    expect(after[0]).toBe(before[0])
    expect(after[1].textContent).toContain('validating')
    expect(render.mock.calls.length).toBe(2)
    expect(render.mock.calls.every(call => call[0] === rows[1].name || call[0] === rows[1].status)).toBe(true)
  })

  it('batches multiple row keys and a displayed range without touching unrelated cells', async () => {
    const {grid,rows,render} = await mount()
    render.mockClear()
    rows[0].status='invalid'; rows[3].status='valid'
    expect(grid.refreshRows([0,3,0])).toBe(2)
    await grid.updateComplete
    expect(render).toHaveBeenCalledTimes(4)
    render.mockClear()
    rows[1].status='valid'; rows[2].status='validating'
    expect(grid.refreshRange({start:1,endExclusive:3})).toBe(2)
    await grid.updateComplete
    expect(render).toHaveBeenCalledTimes(4)
    expect(grid.renderRoot.textContent).toContain('validating')
  })

  it('uses the correct fallback for changed identities and active transforms', async () => {
    const {grid,rows} = await mount()
    grid.selectRowByKey(0)
    rows[0].id=99
    expect(grid.refreshRow(0)).toBe(false)
    await grid.updateComplete
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    expect(grid.selectRowByKey(99)).toBe(true)

    grid.setQuickSearch('Person')
    rows[2].name='Changed'
    expect(grid.refreshRow(2)).toBe(false)
    await grid.updateComplete
    expect(grid.getTotalRowCount()).toBe(11)
    // Validation-only rendering may bypass unrelated active transforms when
    // explicitly guaranteed by the caller.
    rows[1].status='validating'
    expect(grid.refreshRow(1, {mode:'render-only'})).toBe(true)
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('validating')
  })

  it('refreshes same-reference local source without resetting its page', async () => {
    const rows = Array.from({length: 8},(_,id)=>({id,name:'Person '+id}))
    const grid=new DataGrid()
    grid.config={selection:{mode:'multi-row',rowKey:'id'},pagination:{enabled:true,pageSize:3}}
    grid.columns=[{key:'name'}]
    grid.data=rows
    document.body.append(grid)
    await grid.updateComplete
    grid.setPage(1)
    rows[4].name='Edited'
    expect(grid.refreshData()).toBe(true)
    await grid.updateComplete
    expect(grid.getPagination().pageIndex).toBe(1)
    expect(grid.renderRoot.textContent).toContain('Edited')
    rows.splice(0,6)
    expect(grid.refreshData()).toBe(true)
    await grid.updateComplete
    expect(grid.getPagination().pageIndex).toBe(0)
    expect(grid.getTotalRowCount()).toBe(2)
  })

  it('rejects stale external keys without generating query intent and updates accepted displayed rows only', async () => {
    const {grid} = await mount()
    grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'site-2'}}
    const query=grid.getQuery()
    const externalRows=[{id:10,name:'External',status:'idle'},{id:11,name:'Remote',status:'idle'}]
    const accepted=grid.setExternalState({requestId:query.requestId,query:query.query,
      rows:externalRows,total:{kind:'known',totalRows:1000000}})
    expect(accepted).toBe(true)
    await grid.updateComplete
    const listener=vi.fn()
    grid.addEventListener('query-change', listener)
    externalRows[0].status='validating'
    expect(grid.refreshRow(10)).toBe(true)
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('validating')
    expect(grid.refreshRow(99999)).toBe(false)
    expect(grid.refreshData()).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    expect(grid.getQuery().requestId).toBe(query.requestId)
  })

  it('reconciles inferred schema instead of leaving cached unaffected row cells stale', async () => {
    const rows: Array<{id:number; name:string; extra?:string}> = [
      {id:1,name:'Ada'}, {id:2,name:'Grace'}
    ]
    const grid = new DataGrid()
    grid.config = {selection:{mode:'row',rowKey:'id'}}
    grid.data = rows
    document.body.append(grid)
    await grid.updateComplete
    expect(grid.getColumnOrder()).not.toContain('extra')
    rows[0].extra = 'new field'
    expect(grid.refreshRow(1)).toBe(true)
    await grid.updateComplete
    expect(grid.getColumnOrder()).toContain('extra')
    // Horizontal virtualization may place the newly inferred column offscreen.
    // Move it to the first visible position before asserting rendered value.
    grid.setColumnOrder(['extra','id','name'])
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('new field')
    expect(grid.refreshRow(1, {mode:'render-only'})).toBe(false)
  })

  it('never uses a stale source from a previous external-mode tenancy', async () => {
    const {grid,rows} = await mount()
    grid.config={queryMode:'external',selection:{mode:'multi-row',rowKey:'id',scopeKey:'site-2'}}
    grid.config={queryMode:'local',selection:{mode:'multi-row',rowKey:'id',scopeKey:'site-3'}}
    rows[0].name='From original site'
    expect(grid.refreshData()).toBe(true)
    await grid.updateComplete
    expect(grid.getTotalRowCount()).toBe(0)
    expect(grid.renderRoot.textContent).not.toContain('From original site')
  })
})
