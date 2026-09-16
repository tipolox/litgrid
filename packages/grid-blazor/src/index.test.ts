// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type {
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn,
  GridFilter,
  GridPaginationState,
  GridSelection
} from '@tipolox/litgrid-web'
import {
  bestFitAllColumns,
  bestFitColumn,
  clearFilter,
  clearQuickSearch,
  clearSelection,
  copySelectedCells,
  copySelectedRows,
  disposeGrid,
  getColumnOrder,
  getColumnState,
  getColumnWidth,
  getFilters,
  getPagination,
  getQuickSearch,
  getRowHeight,
  getSelection,
  getTotalRowCount,
  getVisibleColumnKeys,
  initGrid,
  isCellSelected,
  isColumnVisible,
  isRowSelected,
  moveColumn,
  resetAllColumnWidths,
  resetAllRowHeights,
  resetColumnOrder,
  resetColumnState,
  resetColumnVisibility,
  resetColumnWidth,
  resetRowHeight,
  selectAllRows,
  selectRow,
  setColumnOrder,
  setColumnState,
  setColumnVisible,
  setColumnWidth,
  setFilter,
  setPage,
  setPageSize,
  setQuickSearch,
  setRowHeight,
  syncGridInputs,
  updateInputs,
  type DotNetHelper
} from './index'

describe('Blazor Grid Interop', () => {
  it('synchronizes inputs to Web Component properties', () => {
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

  it('wires up DOM events to DotNetObjectReference and cleans up on dispose', () => {
    const element = document.createElement('yc-grid') as DataGridElement
    // Stub required method so requireGrid succeeds
    element.getRowHeight = vi.fn()

    const invokeMethodAsync = vi.fn().mockResolvedValue(undefined)
    const dotNetHelper: DotNetHelper = { invokeMethodAsync }

    initGrid(element, dotNetHelper, {
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
      quickSearchDebounceThreshold: 10000,
      quickSearchDebounceMs: 150
    })

    const stateDetail: ColumnStateChangeDetail = {
      reason: 'resize',
      state: { version: 1, columns: [{ key: 'id', width: 120, visible: true }] }
    }
    const reorderDetail: ColumnReorderDetail = {
      columnKey: 'id',
      previousIndex: 1,
      currentIndex: 0,
      columnOrder: ['id', 'name']
    }
    const visibilityDetail: ColumnVisibilityChangeDetail = {
      columnKey: 'name',
      visible: false,
      visibleColumnKeys: ['id']
    }

    element.dispatchEvent(new CustomEvent('column-state-change', { detail: stateDetail }))
    element.dispatchEvent(new CustomEvent('column-reorder', { detail: reorderDetail }))
    element.dispatchEvent(new CustomEvent('column-visibility-change', { detail: visibilityDetail }))

        expect(invokeMethodAsync).toHaveBeenCalledWith('HandleColumnStateChange', stateDetail)
    expect(invokeMethodAsync).toHaveBeenCalledWith('HandleColumnReorder', reorderDetail)
    expect(invokeMethodAsync).toHaveBeenCalledWith('HandleColumnVisibilityChange', visibilityDetail)

    disposeGrid(element)

    invokeMethodAsync.mockClear()
    element.dispatchEvent(new CustomEvent('column-state-change', { detail: stateDetail }))
    expect(invokeMethodAsync).not.toHaveBeenCalled()
  })

  it('delegates imperative methods to the Web Component', async () => {
    const element = document.createElement('yc-grid') as unknown as DataGridElement

    const getRowHeightMock = vi.fn().mockReturnValue(36)
    const setRowHeightMock = vi.fn()
    const resetRowHeightMock = vi.fn()
    const resetAllRowHeightsMock = vi.fn()
    const getColumnWidthMock = vi.fn().mockReturnValue(120)
    const setColumnWidthMock = vi.fn()
    const resetColumnWidthMock = vi.fn()
    const resetAllColumnWidthsMock = vi.fn()
    const moveColumnMock = vi.fn()
    const getColumnOrderMock = vi.fn().mockReturnValue(['col1', 'col2'])
    const setColumnOrderMock = vi.fn()
    const resetColumnOrderMock = vi.fn()
    const setColumnVisibleMock = vi.fn()
    const isColumnVisibleMock = vi.fn().mockReturnValue(true)
    const getVisibleColumnKeysMock = vi.fn().mockReturnValue(['col1'])
    const resetColumnVisibilityMock = vi.fn()
    const getColumnStateMock = vi.fn().mockReturnValue({ version: 1, columns: [] })
    const setColumnStateMock = vi.fn()
    const resetColumnStateMock = vi.fn()
    const bestFitColumnMock = vi.fn().mockReturnValue(150)
    const bestFitAllColumnsMock = vi.fn().mockReturnValue([{ key: 'col1', width: 150 }])
    const copySelectedCellsMock = vi.fn().mockResolvedValue(true)
    const copySelectedRowsMock = vi.fn().mockResolvedValue(true)
    const setQuickSearchMock = vi.fn()
    const clearQuickSearchMock = vi.fn()
    const getQuickSearchMock = vi.fn().mockReturnValue('search text')
    const setFilterMock = vi.fn()
    const clearFilterMock = vi.fn()
    const getFiltersMock = vi.fn().mockReturnValue([])
    const setPageMock = vi.fn()
    const setPageSizeMock = vi.fn()
    const getPaginationMock = vi.fn().mockReturnValue({ enabled: true, pageIndex: 0, pageSize: 20, pageCount: 5, totalRows: 100 })
    const getTotalRowCountMock = vi.fn().mockReturnValue(100)
    const selectRowMock = vi.fn()
    const selectAllRowsMock = vi.fn()
    const clearSelectionMock = vi.fn()
    const getSelectionMock = vi.fn().mockReturnValue({
      mode: 'row', rowIndex: 0, columnKey: null, anchorRowIndex: 0, rowIndexes: new Set([0]), cells: new Set()
    })
    const isRowSelectedMock = vi.fn().mockReturnValue(true)
    const isCellSelectedMock = vi.fn().mockReturnValue(false)

    Object.assign(element, {
      getRowHeight: getRowHeightMock,
      setRowHeight: setRowHeightMock,
      resetRowHeight: resetRowHeightMock,
      resetAllRowHeights: resetAllRowHeightsMock,
      getColumnWidth: getColumnWidthMock,
      setColumnWidth: setColumnWidthMock,
      resetColumnWidth: resetColumnWidthMock,
      resetAllColumnWidths: resetAllColumnWidthsMock,
      moveColumn: moveColumnMock,
      getColumnOrder: getColumnOrderMock,
      setColumnOrder: setColumnOrderMock,
      resetColumnOrder: resetColumnOrderMock,
      setColumnVisible: setColumnVisibleMock,
      isColumnVisible: isColumnVisibleMock,
      getVisibleColumnKeys: getVisibleColumnKeysMock,
      resetColumnVisibility: resetColumnVisibilityMock,
      getColumnState: getColumnStateMock,
      setColumnState: setColumnStateMock,
      resetColumnState: resetColumnStateMock,
      bestFitColumn: bestFitColumnMock,
      bestFitAllColumns: bestFitAllColumnsMock,
      copySelectedCells: copySelectedCellsMock,
      copySelectedRows: copySelectedRowsMock,
      setQuickSearch: setQuickSearchMock,
      clearQuickSearch: clearQuickSearchMock,
      getQuickSearch: getQuickSearchMock,
      setFilter: setFilterMock,
      clearFilter: clearFilterMock,
      getFilters: getFiltersMock,
      setPage: setPageMock,
      setPageSize: setPageSizeMock,
      getPagination: getPaginationMock,
      getTotalRowCount: getTotalRowCountMock,
      selectRow: selectRowMock,
      selectAllRows: selectAllRowsMock,
      clearSelection: clearSelectionMock,
      getSelection: getSelectionMock,
      isRowSelected: isRowSelectedMock,
      isCellSelected: isCellSelectedMock
    })

    expect(getRowHeight(element, 2)).toBe(36)
    setRowHeight(element, 2, 50)
    expect(setRowHeightMock).toHaveBeenCalledWith(2, 50)
    resetRowHeight(element, 2)
    expect(resetRowHeightMock).toHaveBeenCalledWith(2)
    resetAllRowHeights(element)
    expect(resetAllRowHeightsMock).toHaveBeenCalled()

    const col = { key: 'col1' }
    expect(getColumnWidth(element, col)).toBe(120)
    setColumnWidth(element, 'col1', 180)
    expect(setColumnWidthMock).toHaveBeenCalledWith('col1', 180)
    resetColumnWidth(element, 'col1')
    expect(resetColumnWidthMock).toHaveBeenCalledWith('col1')
    resetAllColumnWidths(element)
    expect(resetAllColumnWidthsMock).toHaveBeenCalled()

    moveColumn(element, 'col1', 3)
    expect(moveColumnMock).toHaveBeenCalledWith('col1', 3)
    expect(getColumnOrder(element)).toEqual(['col1', 'col2'])
    setColumnOrder(element, ['col2', 'col1'])
    expect(setColumnOrderMock).toHaveBeenCalledWith(['col2', 'col1'])
    resetColumnOrder(element)
    expect(resetColumnOrderMock).toHaveBeenCalled()

    setColumnVisible(element, 'col1', false)
    expect(setColumnVisibleMock).toHaveBeenCalledWith('col1', false)
    expect(isColumnVisible(element, 'col1')).toBe(true)
    expect(getVisibleColumnKeys(element)).toEqual(['col1'])
    resetColumnVisibility(element)
    expect(resetColumnVisibilityMock).toHaveBeenCalled()

    expect(getColumnState(element)).toEqual({ version: 1, columns: [] })
    setColumnState(element, { version: 1, columns: [] })
    expect(setColumnStateMock).toHaveBeenCalled()
    resetColumnState(element)
    expect(resetColumnStateMock).toHaveBeenCalled()

    expect(bestFitColumn(element, 'col1')).toBe(150)
    expect(bestFitAllColumns(element)).toEqual([{ key: 'col1', width: 150 }])
    await expect(copySelectedCells(element)).resolves.toBe(true)
    await expect(copySelectedRows(element)).resolves.toBe(true)

    setQuickSearch(element, 'abc')
    expect(setQuickSearchMock).toHaveBeenCalledWith('abc')
    expect(getQuickSearch(element)).toBe('search text')
    clearQuickSearch(element)
    expect(clearQuickSearchMock).toHaveBeenCalled()

    const filter: GridFilter = { columnKey: 'col1', operator: 'contains', value: 'x' }
    setFilter(element, filter)
    expect(setFilterMock).toHaveBeenCalledWith(filter)
    clearFilter(element, 'col1')
    expect(clearFilterMock).toHaveBeenCalledWith('col1')
    expect(getFilters(element)).toEqual([])

    setPage(element, 2)
    expect(setPageMock).toHaveBeenCalledWith(2)
    setPageSize(element, 50)
    expect(setPageSizeMock).toHaveBeenCalledWith(50)
    expect(getPagination(element)).toEqual({ enabled: true, pageIndex: 0, pageSize: 20, totalPages: 5, totalRows: 100 })
    expect(getTotalRowCount(element)).toBe(100)

    selectRow(element, 1, 'toggle')
    expect(selectRowMock).toHaveBeenCalledWith(1, 'toggle')
    selectAllRows(element)
    expect(selectAllRowsMock).toHaveBeenCalled()
    clearSelection(element)
    expect(clearSelectionMock).toHaveBeenCalled()
    expect(getSelection(element).mode).toBe('row')
    expect(isRowSelected(element, 0)).toBe(true)
    expect(isCellSelected(element, 0, 'col1')).toBe(false)
  })

  it('normalizes Web Component pagination and selection results for Blazor JSON interop', () => {
    const element = document.createElement('yc-grid') as unknown as DataGridElement
    const getRowHeightMock = vi.fn().mockReturnValue(36)
    const getPaginationMock = vi.fn().mockReturnValue({ enabled: true, pageIndex: 1, pageSize: 25, pageCount: 4, totalRows: 91 })
    const getSelectionMock = vi.fn()
    Object.assign(element, { getRowHeight: getRowHeightMock, getPagination: getPaginationMock, getSelection: getSelectionMock })

    expect(getPagination(element)).toEqual({ enabled: true, pageIndex: 1, pageSize: 25, totalPages: 4, totalRows: 91 })

    const cases = [
      {
        source: { mode: 'none', rowIndex: null, columnKey: null, anchorRowIndex: null, rowIndexes: new Set<number>(), cells: new Set<string>() },
        expected: { mode: 'none', rowIndex: null, selectedRowIndices: [], cell: null, selectedCells: [] }
      },
      {
        source: { mode: 'row', rowIndex: 2, columnKey: null, anchorRowIndex: 2, rowIndexes: new Set([2]), cells: new Set<string>() },
        expected: { mode: 'row', rowIndex: 2, selectedRowIndices: [2], cell: null, selectedCells: [] }
      },
      {
        source: { mode: 'multi-row', rowIndex: 4, columnKey: null, anchorRowIndex: 1, rowIndexes: new Set([1, 4]), cells: new Set<string>() },
        expected: { mode: 'multi-row', rowIndex: 4, selectedRowIndices: [1, 4], cell: null, selectedCells: [] }
      },
      {
        source: { mode: 'cell', rowIndex: 3, columnKey: 'status', anchorRowIndex: null, rowIndexes: new Set<number>(), cells: new Set(['3:status']) },
        expected: { mode: 'cell', rowIndex: 3, selectedRowIndices: [], cell: { rowIndex: 3, columnKey: 'status' }, selectedCells: [{ rowIndex: 3, columnKey: 'status' }] }
      },
      {
        source: { mode: 'multi-cell', rowIndex: 2, columnKey: 'name', anchorRowIndex: null, rowIndexes: new Set<number>(), cells: new Set(['0:id', '2:name']) },
        expected: { mode: 'multi-cell', rowIndex: 2, selectedRowIndices: [], cell: { rowIndex: 2, columnKey: 'name' }, selectedCells: [{ rowIndex: 0, columnKey: 'id' }, { rowIndex: 2, columnKey: 'name' }] }
      }
    ] as const

    for (const { source, expected } of cases) {
      getSelectionMock.mockReturnValue(source)
      expect(getSelection(element)).toEqual(expected)
      expect(JSON.parse(JSON.stringify(getSelection(element)))).toEqual(expected)
    }
  })
})
