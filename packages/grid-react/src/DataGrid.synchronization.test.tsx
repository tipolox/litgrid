// @vitest-environment jsdom
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'
import type { GridColumn } from '@tipolox/litgrid-web'

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

it('reports invalid presentation props while retaining its grid, user state and retryability',async()=>{
  const host=document.createElement('div');document.body.append(host)
  const root=createRoot(host)
  const diagnostic=vi.spyOn(console,'error').mockImplementation(()=>{})
  const data=[{id:1,amount:1.25}]
  const render=(columns:GridColumn[])=>act(()=>root.render(<DataGrid data={data} columns={columns} />))
  try{
    render([{key:'amount',align:'right',format:{kind:'number',locale:'en-GB'}}])
    const grid=host.querySelector('yc-grid') as WebGrid;await grid.updateComplete
    grid.setColumnWidth('amount',280)
    const state=grid.getColumnState()
    render([{key:'amount',format:{kind:'dateTime',locale:'en-GB',options:{timeZone:'Invalid/Zone'}}}])
    expect(host.querySelector('yc-grid')).toBe(grid)
    expect(grid.getColumnState()).toEqual(state)
    expect(diagnostic).toHaveBeenCalledTimes(1)
    expect(diagnostic.mock.calls[0][0]).toMatchObject({name:'GridColumnPresentationError'})
    render([{key:'amount',align:'center',format:{kind:'number',locale:'de-DE'}}]);await grid.updateComplete
    expect(grid.renderRoot.querySelector('.row .cell')!.textContent!.trim()).toBe('1,25')
    expect(grid.getColumnState()).toEqual(state)
  }finally{act(()=>root.unmount());host.remove();vi.restoreAllMocks()}
})

it('adopts rows once in StrictMode, retains state on rerenders and initializes a new mount', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const data = Array.from({ length: 150 }, (_, id) => ({ id, name: `Person ${id}` }))
  const columns = [{ key: 'id' }, { key: 'name' }]
  const config = { selection: { mode: 'multi-row' as const, rowKey: 'id' }, pagination: { enabled: true, pageSize: 25 } }
  const adopt = vi.spyOn(WebGrid.prototype, 'data', 'set')
  let root = createRoot(host)
  const render = (ariaLabel: string) => act(() => root.render(<StrictMode><DataGrid data={data} columns={columns} config={config} ariaLabel={ariaLabel} /></StrictMode>))
  try {
    render('Initial')
    expect(adopt).toHaveBeenCalledTimes(1)
    const grid = host.querySelector('yc-grid') as WebGrid
    grid.setPage(2)
    grid.selectRowByKey(51)
    grid.moveColumn('name', 0)
    adopt.mockClear()
    render('Initial')
    expect(adopt).not.toHaveBeenCalled()
    render('Updated')
    expect(adopt).toHaveBeenCalledTimes(1)
    expect(grid.getPagination().pageIndex).toBe(2)
    expect(grid.getSelectionSnapshot().rows[0].key).toBe(51)
    expect(grid.getColumnOrder()).toEqual(['name', 'id'])
    act(() => root.unmount())
    root = createRoot(host)
    adopt.mockClear()
    render('Remounted')
    expect(adopt).toHaveBeenCalledTimes(1)
    expect(host.querySelector('yc-grid')).not.toBe(grid)
    await (host.querySelector('yc-grid') as WebGrid).updateComplete
  } finally { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() }
})
