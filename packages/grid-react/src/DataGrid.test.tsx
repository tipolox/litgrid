// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn,
  GridColumnState,
  GridFilter,
  GridPaginationState,
  GridSelection,
  GridTheme
} from '@tipolox/litgrid-web'
import { DataGrid, type DataGridRef } from './DataGrid.js'
import { syncGridInputs } from './gridBindings.js'

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mountedRoots: Array<{ root: Root; container: HTMLDivElement }> = []

afterEach(() => {
  for (const { root, container } of mountedRoots.splice(0)) {
    act(() => {
      root.unmount()
    })
    container.remove()
  }
})

function mountGrid(
  props: Record<string, unknown> = {},
  refCallback?: (ref: DataGridRef | null) => void
) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mountedRoots.push({ root, container })

  act(() => {
    root.render(
      <DataGrid
        ref={refCallback}
        data={[]}
        {...props}
      />
    )
  })

  return { root, container }
}

describe('React DataGrid input bindings', () => {
  it('synchronizes React inputs to Web Component properties', () => {
    const data = [{ id: 1 }]
    const columns: GridColumn[] = [{ key: 'id' }]
    const config = { selection: { mode: 'row' as const } }
    const grid = {} as DataGridElement

    syncGridInputs(grid, {
      data,
      columns,
      config,
      theme: 'dark',
      ariaLabel: 'Orders',
      ariaDescription: 'Order results',
      screenReaderAnnouncements: false,
      height: 480,
      rowHeight: 42,
      overscan: 8,
      columnOverscan: 3,
      bestFitSampleSize: 25,
      quickSearchDebounceThreshold: 5_000,
      quickSearchDebounceMs: 200,
      columnStateStorageKey: 'orders-grid'
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

  it('clears optional persisted state when omitted', () => {
    const grid = {} as DataGridElement
    syncGridInputs(grid, {
      data: [],
      columns: [],
      config: {},
      theme: 'light',
      ariaLabel: 'Data grid',
      ariaDescription: '',
      screenReaderAnnouncements: true,
      height: 320,
      rowHeight: 36,
      overscan: 4,
      columnOverscan: 2,
      bestFitSampleSize: 10,
      quickSearchDebounceThreshold: 10_000,
      quickSearchDebounceMs: 150
    })

    expect(grid.columnStateStorageKey).toBeNull()
  })
})

describe('React DataGrid component and events', () => {
  it('forwards native custom-event details to React callbacks and cleans up on unmount', () => {
    let instance: DataGridRef | null = null
    const stateHandler = vi.fn()
    const reorderHandler = vi.fn()
    const visibilityHandler = vi.fn()

    const { root } = mountGrid(
      {
        onColumnStateChange: stateHandler,
        onColumnReorder: reorderHandler,
        onColumnVisibilityChange: visibilityHandler
      },
      (ref) => {
        instance = ref
      }
    )

    expect(instance).not.toBeNull()
    const grid = instance!.gridElement!

    const stateDetail: ColumnStateChangeDetail = {
      state: { version: 1, order: ['id'], widths: {}, hidden: [] },
      source: 'reorder'
    }
    const reorderDetail: ColumnReorderDetail = {
      columnKey: 'id',
      fromIndex: 1,
      toIndex: 0,
      order: ['id']
    }
    const visibilityDetail: ColumnVisibilityChangeDetail = {
      columnKey: 'id',
      visible: false,
      visibleKeys: []
    }

    grid.dispatchEvent(new CustomEvent('column-state-change', { detail: stateDetail }))
    grid.dispatchEvent(new CustomEvent('column-reorder', { detail: reorderDetail }))
    grid.dispatchEvent(new CustomEvent('column-visibility-change', { detail: visibilityDetail }))

    expect(stateHandler).toHaveBeenCalledWith(stateDetail)
    expect(reorderHandler).toHaveBeenCalledWith(reorderDetail)
    expect(visibilityHandler).toHaveBeenCalledWith(visibilityDetail)

    act(() => {
      root.unmount()
    })

    grid.dispatchEvent(new CustomEvent('column-state-change', { detail: stateDetail }))
    expect(stateHandler).toHaveBeenCalledTimes(1)
  })

  it('forwards imperative calls through ref to the underlying DataGridElement', async () => {
    let instance: DataGridRef | null = null
    mountGrid({}, (ref) => {
      instance = ref
    })

    expect(instance).not.toBeNull()
    const grid = instance!.gridElement as DataGridElement

    const getRowHeight = vi.fn(() => 45)
    const getColumnWidth = vi.fn(() => 120)
    const setRowHeight = vi.fn()
    const resetRowHeight = vi.fn()
    const resetAllRowHeights = vi.fn()
    const setColumnWidth = vi.fn()
    const resetColumnWidth = vi.fn()
    const resetAllColumnWidths = vi.fn()
    const moveColumn = vi.fn()
    const getColumnOrder = vi.fn(() => ['col1'])
    const setColumnOrder = vi.fn()
    const resetColumnOrder = vi.fn()
    const setColumnVisible = vi.fn()
    const isColumnVisible = vi.fn(() => true)
    const getVisibleColumnKeys = vi.fn(() => ['col1'])
    const resetColumnVisibility = vi.fn()
    const state: GridColumnState = { version: 1, order: ['col1'], widths: {}, hidden: [] }
    const getColumnState = vi.fn(() => state)
    const setColumnState = vi.fn()
    const resetColumnState = vi.fn()
    const bestFitColumn = vi.fn(() => 140)
    const bestFitAllColumns = vi.fn(() => [{ key: 'col1', width: 140 }])
    const copySelectedCells = vi.fn().mockResolvedValue(true)
    const copySelectedRows = vi.fn().mockResolvedValue(true)
    const setQuickSearch = vi.fn()
    const clearQuickSearch = vi.fn()
    const getQuickSearch = vi.fn(() => 'search')
    const filter: GridFilter = { columnKey: 'col1', operator: 'equals', value: 'x' }
    const setFilter = vi.fn()
    const clearFilter = vi.fn()
    const getFilters = vi.fn(() => [filter])
    const setPage = vi.fn()
    const setPageSize = vi.fn()
    const pagination: GridPaginationState = { pageIndex: 0, pageSize: 25, totalPages: 1 }
    const getPagination = vi.fn(() => pagination)
    const getTotalRowCount = vi.fn(() => 100)
    const selectRow = vi.fn()
    const selectAllRows = vi.fn()
    const clearSelection = vi.fn()
    const selection: GridSelection = { mode: 'row', selectedRowIndexes: [0], selectedCellKeys: [] }
    const getSelection = vi.fn(() => selection)
    const isRowSelected = vi.fn(() => true)
    const isCellSelected = vi.fn(() => false)

    Object.assign(grid, {
      getRowHeight,
      getColumnWidth,
      setRowHeight,
      resetRowHeight,
      resetAllRowHeights,
      setColumnWidth,
      resetColumnWidth,
      resetAllColumnWidths,
      moveColumn,
      getColumnOrder,
      setColumnOrder,
      resetColumnOrder,
      setColumnVisible,
      isColumnVisible,
      getVisibleColumnKeys,
      resetColumnVisibility,
      getColumnState,
      setColumnState,
      resetColumnState,
      bestFitColumn,
      bestFitAllColumns,
      copySelectedCells,
      copySelectedRows,
      setQuickSearch,
      clearQuickSearch,
      getQuickSearch,
      setFilter,
      clearFilter,
      getFilters,
      setPage,
      setPageSize,
      getPagination,
      getTotalRowCount,
      selectRow,
      selectAllRows,
      clearSelection,
      getSelection,
      isRowSelected,
      isCellSelected
    })

    const col: GridColumn = { key: 'col1' }

    expect(instance!.getRowHeight(1)).toBe(45)
    expect(getRowHeight).toHaveBeenCalledWith(1)

    expect(instance!.getColumnWidth(col)).toBe(120)
    expect(getColumnWidth).toHaveBeenCalledWith(col)

    instance!.setRowHeight(1, 40)
    expect(setRowHeight).toHaveBeenCalledWith(1, 40)

    instance!.resetRowHeight(1)
    expect(resetRowHeight).toHaveBeenCalledWith(1)

    instance!.resetAllRowHeights()
    expect(resetAllRowHeights).toHaveBeenCalled()

    instance!.setColumnWidth('col1', 150)
    expect(setColumnWidth).toHaveBeenCalledWith('col1', 150)

    instance!.resetColumnWidth('col1')
    expect(resetColumnWidth).toHaveBeenCalledWith('col1')

    instance!.resetAllColumnWidths()
    expect(resetAllColumnWidths).toHaveBeenCalled()

    instance!.moveColumn('col1', 0)
    expect(moveColumn).toHaveBeenCalledWith('col1', 0)

    expect(instance!.getColumnOrder()).toEqual(['col1'])
    instance!.setColumnOrder(['col1'])
    expect(setColumnOrder).toHaveBeenCalledWith(['col1'])

    instance!.resetColumnOrder()
    expect(resetColumnOrder).toHaveBeenCalled()

    instance!.setColumnVisible('col1', false)
    expect(setColumnVisible).toHaveBeenCalledWith('col1', false)

    expect(instance!.isColumnVisible('col1')).toBe(true)
    expect(instance!.getVisibleColumnKeys()).toEqual(['col1'])

    instance!.resetColumnVisibility()
    expect(resetColumnVisibility).toHaveBeenCalled()

    expect(instance!.getColumnState()).toBe(state)
    instance!.setColumnState(state)
    expect(setColumnState).toHaveBeenCalledWith(state)

    instance!.resetColumnState()
    expect(resetColumnState).toHaveBeenCalled()

    expect(instance!.bestFitColumn('col1')).toBe(140)
    expect(bestFitColumn).toHaveBeenCalledWith('col1')

    expect(instance!.bestFitAllColumns()).toEqual([{ key: 'col1', width: 140 }])

    await expect(instance!.copySelectedCells()).resolves.toBe(true)
    await expect(instance!.copySelectedRows()).resolves.toBe(true)

    instance!.setQuickSearch('test')
    expect(setQuickSearch).toHaveBeenCalledWith('test')

    instance!.clearQuickSearch()
    expect(clearQuickSearch).toHaveBeenCalled()

    expect(instance!.getQuickSearch()).toBe('search')

    instance!.setFilter(filter)
    expect(setFilter).toHaveBeenCalledWith(filter)

    instance!.clearFilter('col1')
    expect(clearFilter).toHaveBeenCalledWith('col1')

    expect(instance!.getFilters()).toEqual([filter])

    instance!.setPage(1)
    expect(setPage).toHaveBeenCalledWith(1)

    instance!.setPageSize(50)
    expect(setPageSize).toHaveBeenCalledWith(50)

    expect(instance!.getPagination()).toBe(pagination)
    expect(instance!.getTotalRowCount()).toBe(100)

    instance!.selectRow(2, 'replace')
    expect(selectRow).toHaveBeenCalledWith(2, 'replace')

    instance!.selectAllRows()
    expect(selectAllRows).toHaveBeenCalled()

    instance!.clearSelection()
    expect(clearSelection).toHaveBeenCalled()

    expect(instance!.getSelection()).toBe(selection)
    expect(instance!.isRowSelected(2)).toBe(true)
    expect(instance!.isCellSelected(2, 'col1')).toBe(false)
  })

  it('throws a descriptive error when calling imperative methods before the React component is mounted', () => {
    let instance: DataGridRef | null = null
    const { root } = mountGrid({}, (ref) => {
      instance = ref
    })

    expect(instance).not.toBeNull()
    const handle = instance!

    act(() => {
      root.unmount()
    })

    expect(() => handle.getRowHeight(0)).toThrow(
      'LitGrid is not available before the React component is mounted.'
    )
    expect(() => handle.setQuickSearch('test')).toThrow(
      'LitGrid is not available before the React component is mounted.'
    )
    expect(() => handle.selectAllRows()).toThrow(
      'LitGrid is not available before the React component is mounted.'
    )
  })
})
