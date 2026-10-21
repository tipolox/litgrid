// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'
import type { GridExternalState } from '@tipolox/litgrid-web'

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

it('keeps controlled external pages across React rerenders, uses fresh callbacks and rejects late props', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const columns = [{ key: 'name' }]
  const config = { queryMode: 'external' as const, selection: { mode: 'row' as const, rowKey: 'id', scopeKey: 'a' } }
  let state: GridExternalState = { requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 2, pageSize: 20 }, rows: [{ id: 'a', name: 'A' }], total: { kind: 'known', totalRows: 352 } }
  const a = vi.fn(), b = vi.fn()
  const render = (props = {}) => act(() => root.render(<StrictMode><DataGrid data={[]} columns={columns} config={{ ...config }} externalState={state} onQueryChange={a} {...props} /></StrictMode>))
  try {
    render()
    const grid = host.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    const dataSetter = vi.spyOn(WebGrid.prototype, 'data', 'set')
    const stateSetter = vi.spyOn(WebGrid.prototype, 'externalState', 'set')
    const columnsSetter = vi.spyOn(WebGrid.prototype, 'columns', 'set')
    render({ theme: 'dark' }); render({ ariaLabel: 'Properties' }); render({ ariaDescription: 'Authorized rows', onQueryChange: b })
    await grid.updateComplete
    expect(dataSetter).not.toHaveBeenCalled()
    expect(stateSetter).not.toHaveBeenCalled()
    expect(columnsSetter).not.toHaveBeenCalled()
    expect(grid.getPagination().pageIndex).toBe(2)
    act(() => grid.setQuickSearch('B'))
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
    const request = grid.getQuery()
    state = { ...state, ...request, rows: [{ id: 'b', name: 'B' }] }
    render({ onQueryChange: b })
    await grid.updateComplete
    expect(grid.renderRoot.textContent).toContain('B')
    expect(b).toHaveBeenCalledTimes(1)
    state = { ...state, requestId: 1, query: { ...state.query, search: 'A' }, rows: [{ id: 'a', name: 'STALE' }] }
    render({ onQueryChange: b })
    await grid.updateComplete
    expect(grid.renderRoot.textContent).not.toContain('STALE')
    expect(grid.getQuickSearch()).toBe('B')
    act(() => root.unmount())
    grid.dispatchEvent(new CustomEvent('query-change', { detail: request }))
    expect(b).toHaveBeenCalledTimes(1)
  } finally { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() }
})
