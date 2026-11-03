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
