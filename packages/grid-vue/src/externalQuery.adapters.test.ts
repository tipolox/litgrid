// @vitest-environment jsdom
import { createApp, h, shallowRef, nextTick } from 'vue'
import { expect, it, vi } from 'vitest'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'
import { DataGrid } from './DataGrid.js'
import { DataGridComponent } from '../../grid-angular/src/DataGridComponent'
import { initGrid, disposeGrid, updateInputs } from '../../grid-blazor/src/index'
import type { GridExternalState } from '@tipolox/litgrid-web'

const config = { queryMode: 'external' as const, selection: { mode: 'row' as const, rowKey: 'id', scopeKey: 'a' } }
const state: GridExternalState = { requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 2, pageSize: 20 }, rows: [{ id: 'a', name: 'A' }], total: { kind: 'known', totalRows: 352 } }

it('forwards real Vue query intents, reconciles controlled state and removes subscriptions', async () => {
  const host = document.createElement('div'); document.body.append(host)
  const callback = vi.fn()
  const inputs = shallowRef({ data: [], columns: [{ key: 'name' }], config, externalState: state })
  const app = createApp({ render: () => h(DataGrid, { ...inputs.value, onQueryChange: callback }) })
  app.mount(host)
  const grid = host.querySelector('yc-grid') as WebGrid
  try {
    expect(grid.getPagination().pageIndex).toBe(2)
    grid.setPage(3)
    expect(callback).toHaveBeenCalledTimes(1)
    inputs.value = { ...inputs.value, externalState: { ...state, ...grid.getQuery() } }
    await nextTick()
    expect(grid.getPagination().pageIndex).toBe(3)
    expect(callback).toHaveBeenCalledTimes(1)
  } finally { app.unmount(); host.remove() }
  grid.refreshQuery()
  expect(callback).toHaveBeenCalledTimes(1)
})

it('forwards Angular public inputs, typed output and external imperative methods', () => {
  const grid = new WebGrid()
  const component = new DataGridComponent()
  Reflect.set(component, 'gridRef', { nativeElement: grid })
  component.config = config
  component.columns = [{ key: 'name' }]
  component.externalState = state
  grid.addEventListener('query-change', event => component.handleQueryChange(event))
  const callback = vi.fn()
  component.queryChange.subscribe(callback)
  component.ngAfterViewInit()
  component.setPage(3)
  expect(callback).toHaveBeenCalledTimes(1)
  component.externalState = { ...state, ...component.getQuery() }
  component.ngOnChanges({})
  expect(component.getPagination().pageIndex).toBe(3)
  expect(callback).toHaveBeenCalledTimes(1)
  component.refreshQuery()
  expect(callback).toHaveBeenCalledTimes(2)
})

it('forwards Blazor interop query events and applies scope before external results', () => {
  const grid = new WebGrid()
  const helper = { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }
  const inputs = { config, externalState: state, theme: 'light' as const, ariaLabel: 'Grid', ariaDescription: '', screenReaderAnnouncements: true, height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10, quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150 }
  initGrid(grid, helper, inputs)
  grid.selectRowByKey('a')
  grid.setPage(3)
  expect(helper.invokeMethodAsync).toHaveBeenCalledWith('HandleQueryChange', expect.objectContaining({ reason: 'page' }))
  updateInputs(grid, { externalState: { ...state, ...grid.getQuery() } })
  expect(grid.getPagination().pageIndex).toBe(3)
  updateInputs(grid, { config: { ...config, selection: { ...config.selection, scopeKey: 'b' } }, externalState: { ...state, requestId: grid.getQuery().requestId + 1 } })
  expect(grid.getSelectionSnapshot()).toMatchObject({ scopeKey: 'b', rows: [] })
  disposeGrid(grid)
  helper.invokeMethodAsync.mockClear()
  grid.refreshQuery()
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})
