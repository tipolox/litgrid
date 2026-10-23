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

it('keeps a newer debounced search when React supplies the prior server result', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const config = { queryMode: 'external' as const }
  const columns = [{ key: 'name' }]
  let state: GridExternalState = {
    requestId: 1,
    query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 20 },
    rows: [], total: { kind: 'known', totalRows: 0 }
  }
  const callback = vi.fn()
  const render = () => act(() => root.render(
    <DataGrid data={[]} columns={columns} config={config} externalState={state} onQueryChange={callback} />
  ))
  try {
    render()
    const grid = host.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    act(() => grid.setQuickSearch('Nor'))
    const previous = grid.getQuery()
    const input = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')!
    act(() => {
      input.value = 'Nort'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    state = { requestId: previous.requestId, query: previous.query,
      rows: [{ id: 'northwind', name: 'Northwind' }], total: { kind: 'known', totalRows: 1 } }
    render()
    await grid.updateComplete
    expect(input.value).toBe('Nort')
    act(() => vi.advanceTimersByTime(150))
    await grid.updateComplete
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.lastCall?.[0]).toMatchObject({ requestId: 3, query: { search: 'Nort' } })
  } finally {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
  }
})


it('forwards mutable typed quick-search config changes without resetting external queries', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const config: import('@tipolox/litgrid-web').GridConfig = {
    queryMode: 'external', quickSearch: { label: 'Code prefix', placeholder: 'Code starts with' }
  }
  const state: GridExternalState = {
    requestId: 1,
    query: { search: 'ABC', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 20 },
    rows: [{ name: 'ABC property' }], total: { kind: 'unknown', hasMore: false }
  }
  const callback = vi.fn()
  const render = () => act(() => root.render(
    <DataGrid data={[]} columns={[{ key: 'name' }]} config={config}
      externalState={state} onQueryChange={callback} />
  ))
  try {
    render()
    const grid = host.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    expect(grid.renderRoot.querySelector<HTMLInputElement>('.quick-search input')?.placeholder).toBe('Code starts with')
    config.quickSearch!.visible = false
    render()
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.quick-search')).toBeNull()
    expect(grid.getQuery()).toMatchObject({ requestId: 1, query: { search: 'ABC' } })
    expect(callback).not.toHaveBeenCalled()
    config.quickSearch!.visible = true
    config.quickSearch!.label = 'Code or name prefix'
    config.quickSearch!.description = 'Not path or status'
    render()
    await grid.updateComplete
    const input = grid.renderRoot.querySelector<HTMLInputElement>('.quick-search input')!
    expect(input.value).toBe('ABC')
    expect(input.getAttribute('aria-label')).toBe('Code or name prefix')
    expect(grid.renderRoot.querySelector('[id="' + input.getAttribute('aria-describedby') + '"]')?.textContent).toBe('Not path or status')
    expect(callback).not.toHaveBeenCalled()
  } finally { act(() => root.unmount()); host.remove() }
})

it('cancels a pending external input debounce when React unmounts the grid', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const callback = vi.fn()
  try {
    act(() => root.render(<DataGrid data={[]} columns={[{ key: 'name' }]} config={{ queryMode: 'external' }} onQueryChange={callback} />))
    const grid = host.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const input = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')!
    input.value = 'Pending'
    act(() => input.dispatchEvent(new Event('input', { bubbles: true })))
    expect(callback).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
    act(() => root.unmount())
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(300)
    expect(callback).not.toHaveBeenCalled()
  } finally { act(() => root.unmount()); host.remove(); vi.useRealTimers() }
})
