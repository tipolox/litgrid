// @vitest-environment jsdom
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn
} from '@tipolox/litgrid-web'
import { DataGrid, type DataGridInstance } from './DataGrid.js'
import { syncGridInputs } from './gridBindings.js'

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []

afterEach(() => {
  for (const { app, host } of mountedApps.splice(0)) {
    app.unmount()
    host.remove()
  }
})

async function mountGrid(props: Record<string, unknown> = {}) {
  let instance: DataGridInstance | null = null
  const host = document.createElement('div')
  document.body.append(host)

  const app = createApp({
    render: () => h(DataGrid, {
      ref: (value: unknown) => { instance = value as DataGridInstance | null },
      data: [],
      ...props
    })
  })
  app.mount(host)
  mountedApps.push({ app, host })
  await nextTick()
  await nextTick()

  if (!instance) throw new Error('Vue DataGrid instance was not mounted.')
  return { app, host, instance }
}

describe('Vue DataGrid', () => {
  it('synchronizes Vue inputs to Web Component properties', () => {
    const data = [{ id: 1 }]
    const columns: GridColumn[] = [{ key: 'id' }]
    const config = { selection: { mode: 'row' as const } }
    const grid = {} as DataGridElement
    syncGridInputs(grid, {
      data, columns, config, theme: 'dark', ariaLabel: 'Orders', ariaDescription: 'Order results',
      screenReaderAnnouncements: false, height: 480, rowHeight: 42, overscan: 8,
      columnOverscan: 3, bestFitSampleSize: 25, quickSearchDebounceThreshold: 5_000,
      quickSearchDebounceMs: 200, columnStateStorageKey: 'orders-grid'
    })

    expect(grid.data).toBe(data)
    expect(grid.columns).toBe(columns)
    expect(grid.config).toBe(config)
    expect(grid.theme).toBe('dark')
    expect(grid.ariaLabel).toBe('Orders')
    expect(grid.ariaDescription).toBe('Order results')
    expect(grid.screenReaderAnnouncements).toBe(false)
    expect(grid.viewportHeight).toBe(480)
    expect(grid.virtualRowHeight).toBe(42)
    expect(grid.overscanCount).toBe(8)
    expect(grid.columnOverscanCount).toBe(3)
    expect(grid.bestFitSampleSize).toBe(25)
    expect(grid.quickSearchDebounceThreshold).toBe(5_000)
    expect(grid.quickSearchDebounceMs).toBe(200)
    expect(grid.columnStateStorageKey).toBe('orders-grid')
  })

  it('forwards native custom-event details as Vue events and removes listeners on unmount', async () => {
    const stateHandler = vi.fn()
    const reorderHandler = vi.fn()
    const visibilityHandler = vi.fn()
    const { app, instance } = await mountGrid({
      onColumnStateChange: stateHandler,
      onColumnReorder: reorderHandler,
      onColumnVisibilityChange: visibilityHandler
    })
    const grid = instance.gridElement!
    const stateDetail: ColumnStateChangeDetail = {
      state: { version: 1, order: ['id'], widths: {}, hidden: [] },
      source: 'reorder'
    }
    const reorderDetail: ColumnReorderDetail = {
      columnKey: 'id', fromIndex: 1, toIndex: 0, order: ['id']
    }
    const visibilityDetail: ColumnVisibilityChangeDetail = {
      columnKey: 'id', visible: false, visibleKeys: []
    }

    grid.dispatchEvent(new CustomEvent('column-state-change', { detail: stateDetail }))
    grid.dispatchEvent(new CustomEvent('column-reorder', { detail: reorderDetail }))
    grid.dispatchEvent(new CustomEvent('column-visibility-change', { detail: visibilityDetail }))

    expect(stateHandler).toHaveBeenCalledWith(stateDetail)
    expect(reorderHandler).toHaveBeenCalledWith(reorderDetail)
    expect(visibilityHandler).toHaveBeenCalledWith(visibilityDetail)

    app.unmount()
    grid.dispatchEvent(new CustomEvent('column-state-change', { detail: stateDetail }))
    expect(stateHandler).toHaveBeenCalledTimes(1)
  })

  it('forwards imperative calls to the Web Component', async () => {
    const { instance } = await mountGrid()
    const grid = instance.gridElement as DataGridElement
    const setQuickSearch = vi.fn()
    const setColumnWidth = vi.fn()
    const getTotalRowCount = vi.fn(() => 100)
    const copySelectedRows = vi.fn().mockResolvedValue(true)
    Object.assign(grid, { setQuickSearch, setColumnWidth, getTotalRowCount, copySelectedRows })

    instance.setQuickSearch('ada')
    instance.setColumnWidth('name', 180)
    expect(instance.getTotalRowCount()).toBe(100)
    await expect(instance.copySelectedRows()).resolves.toBe(true)

    expect(setQuickSearch).toHaveBeenCalledWith('ada')
    expect(setColumnWidth).toHaveBeenCalledWith('name', 180)
    expect(getTotalRowCount).toHaveBeenCalledTimes(1)
    expect(copySelectedRows).toHaveBeenCalledTimes(1)
  })
})
