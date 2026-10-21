// @vitest-environment jsdom
import { createApp, h, nextTick } from 'vue'
import { expect, it, vi } from 'vitest'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'
import { DataGrid as VueGrid } from './DataGrid.js'
import { DataGridComponent } from '../../grid-angular/src/DataGridComponent'
import { initGrid, disposeGrid, updateInputs } from '../../grid-blazor/src/index'

it('forwards real Vue selection snapshots and removes its listener on unmount', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const callback = vi.fn()
  const app = createApp({ render: () => h(VueGrid, {
    data: [{ id: 'uuid' }], config: { selection: { mode: 'row', rowKey: 'id' } }, onSelectionChange: callback
  }) })
  app.mount(host)
  await nextTick()
  const grid = host.querySelector('yc-grid') as WebGrid
  try {
    grid.selectRowByKey('uuid')
    expect(callback.mock.calls.at(-1)![0].rows[0].key).toBe('uuid')
    const calls = callback.mock.calls.length
    app.unmount()
    grid.clearSelection()
    expect(callback).toHaveBeenCalledTimes(calls)
  } finally { host.remove() }
})

it('exposes typed Angular selection outputs and key methods', () => {
  const component = new DataGridComponent()
  const grid = new WebGrid()
  grid.config = { selection: { mode: 'row', rowKey: 'id' } }
  grid.data = [{ id: 'uuid' }]
  Object.assign(component, { gridRef: { nativeElement: grid } })
  const callback = vi.fn()
  component.selectionChange.subscribe(callback)
  grid.addEventListener('selection-change', event => component.handleSelectionChange(event))
  expect(component.selectRowByKey('uuid')).toBe(true)
  expect(callback.mock.calls[0][0]).toBe(component.getSelectionSnapshot())
})

it('forwards Blazor selection once after retry, clears scope before reused keys, and disposes callbacks', () => {
  const grid = new WebGrid()
  const invokeMethodAsync = vi.fn().mockResolvedValue(undefined)
  const config = { selection: { mode: 'row' as const, rowKey: 'id', scopeKey: 'site-a' } }
  const inputs = {
    data: [{ id: 'uuid', name: 'A' }], config, columns: [{ key: 'name' }], theme: 'light' as const,
    ariaLabel: 'Properties', ariaDescription: '', screenReaderAnnouncements: true,
    height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10,
    quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150
  }
  initGrid(grid, { invokeMethodAsync }, inputs)
  initGrid(grid, { invokeMethodAsync }, inputs)
  invokeMethodAsync.mockClear()
  grid.selectRowByKey('uuid')
  expect(invokeMethodAsync).toHaveBeenCalledTimes(1)
  updateInputs(grid, {
    config: { selection: { ...config.selection, scopeKey: 'site-b' } }, data: [{ id: 'uuid', name: 'B' }]
  })
  expect(invokeMethodAsync).toHaveBeenCalledTimes(2)
  expect(invokeMethodAsync.mock.calls[1]).toEqual(['HandleSelectionChange', expect.objectContaining({ scopeKey: 'site-b', rows: [] })])
  disposeGrid(grid)
  grid.selectRowByKey('uuid')
  expect(invokeMethodAsync).toHaveBeenCalledTimes(2)
})
