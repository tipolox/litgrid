// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
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
import { DataGridComponent } from './DataGridComponent'
import { syncGridInputs } from './gridBindings'

function createMockGridElement(): DataGridElement {
  return {
    data: [] as unknown[],
    columns: [] as GridColumn[],
    config: {} as any,
    theme: 'light' as GridTheme,
    ariaLabel: '',
    ariaDescription: '',
    screenReaderAnnouncements: true,
    viewportHeight: 0,
    virtualRowHeight: 0,
    overscanCount: 0,
    columnOverscanCount: 0,
    bestFitSampleSize: 0,
    quickSearchDebounceThreshold: 0,
    quickSearchDebounceMs: 0,
    columnStateStorageKey: null as string | null,
    getRowHeight: vi.fn(),
    getColumnWidth: vi.fn(),
    setRowHeight: vi.fn(),
    resetRowHeight: vi.fn(),
    resetAllRowHeights: vi.fn(),
    setColumnWidth: vi.fn(),
    resetColumnWidth: vi.fn(),
    resetAllColumnWidths: vi.fn(),
    moveColumn: vi.fn(),
    getColumnOrder: vi.fn(),
    setColumnOrder: vi.fn(),
    resetColumnOrder: vi.fn(),
    setColumnVisible: vi.fn(),
    isColumnVisible: vi.fn(),
    getVisibleColumnKeys: vi.fn(),
    resetColumnVisibility: vi.fn(),
    getColumnState: vi.fn(),
    setColumnState: vi.fn(),
    resetColumnState: vi.fn(),
    bestFitColumn: vi.fn(),
    bestFitAllColumns: vi.fn(),
    copySelectedCells: vi.fn(),
    copySelectedRows: vi.fn(),
    setQuickSearch: vi.fn(),
    clearQuickSearch: vi.fn(),
    getQuickSearch: vi.fn(),
    setFilter: vi.fn(),
    clearFilter: vi.fn(),
    getFilters: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    getPagination: vi.fn(),
    getTotalRowCount: vi.fn(),
    selectRow: vi.fn(),
    selectAllRows: vi.fn(),
    clearSelection: vi.fn(),
    getSelection: vi.fn(),
    isRowSelected: vi.fn(),
    isCellSelected: vi.fn()
  } as unknown as DataGridElement
}

describe('Angular grid input bindings', () => {
  it('synchronizes Angular inputs to the Web Component properties', () => {
    const grid = createMockGridElement()
    const data = [{ id: 1 }]
    const columns: GridColumn[] = [{ key: 'id' }]
    const config = { selection: { mode: 'row' as const } }

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

  it('clears optional persisted state without serializing complex values', () => {
    const grid = createMockGridElement()
    const data: unknown[] = []
    const columns: GridColumn[] = []
    const config = {}

    syncGridInputs(grid, {
      data,
      columns,
      config,
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

    expect(grid.data).toBe(data)
    expect(grid.columns).toBe(columns)
    expect(grid.config).toBe(config)
    expect(grid.columnStateStorageKey).toBeNull()
  })
})

describe('DataGridComponent', () => {
  function createComponentWithGrid() {
    const component = new DataGridComponent()
    const gridElement = createMockGridElement()
    Object.defineProperty(component, 'gridRef', {
      value: { nativeElement: gridElement },
      writable: true
    })
    return { component, gridElement }
  }

  it('provides null gridElement before initialization and returns nativeElement after', () => {
    const uninitialized = new DataGridComponent()
    expect(uninitialized.gridElement).toBeNull()

    const { component, gridElement } = createComponentWithGrid()
    expect(component.gridElement).toBe(gridElement)
  })

  it('syncs inputs on ngAfterViewInit and ngOnChanges', () => {
    const { component, gridElement } = createComponentWithGrid()
    component.data = [{ id: 10 }]
    component.columns = [{ key: 'id', title: 'ID' }]
    component.theme = 'dark'

    component.ngAfterViewInit()
    expect(gridElement.data).toBe(component.data)
    expect(gridElement.columns).toBe(component.columns)
    expect(gridElement.theme).toBe('dark')

    component.theme = 'light'
    component.ngOnChanges({})
    expect(gridElement.theme).toBe('light')
  })

  it('translates DOM custom events to typed Angular outputs', () => {
    const { component } = createComponentWithGrid()

    const stateEmissions: ColumnStateChangeDetail[] = []
    const reorderEmissions: ColumnReorderDetail[] = []
    const visibilityEmissions: ColumnVisibilityChangeDetail[] = []

    component.columnStateChange.subscribe(detail => stateEmissions.push(detail))
    component.columnReorder.subscribe(detail => reorderEmissions.push(detail))
    component.columnVisibilityChange.subscribe(detail => visibilityEmissions.push(detail))

    const stateDetail: ColumnStateChangeDetail = {
      state: { version: 1, order: ['a', 'b'], widths: { a: 100 }, hidden: [] },
      source: 'reorder'
    }
    const reorderDetail: ColumnReorderDetail = {
      columnKey: 'b',
      fromIndex: 1,
      toIndex: 0,
      order: ['b', 'a']
    }
    const visibilityDetail: ColumnVisibilityChangeDetail = {
      columnKey: 'a',
      visible: false,
      visibleKeys: ['b']
    }

    component.handleColumnStateChange(
      new CustomEvent('column-state-change', { detail: stateDetail })
    )
    component.handleColumnReorder(
      new CustomEvent('column-reorder', { detail: reorderDetail })
    )
    component.handleColumnVisibilityChange(
      new CustomEvent('column-visibility-change', { detail: visibilityDetail })
    )

    expect(stateEmissions).toEqual([stateDetail])
    expect(reorderEmissions).toEqual([reorderDetail])
    expect(visibilityEmissions).toEqual([visibilityDetail])
  })

  it('throws a descriptive error when calling imperative methods before view initialization', () => {
    const uninitialized = new DataGridComponent()
    expect(() => uninitialized.getRowHeight(0)).toThrow(
      'LitGrid is not available before the Angular view is initialized.'
    )
    expect(() => uninitialized.setQuickSearch('test')).toThrow(
      'LitGrid is not available before the Angular view is initialized.'
    )
    expect(() => uninitialized.selectAllRows()).toThrow(
      'LitGrid is not available before the Angular view is initialized.'
    )
  })

  it('forwards sizing, ordering, and visibility methods to DataGridElement', () => {
    const { component, gridElement } = createComponentWithGrid()
    const col: GridColumn = { key: 'col1' }
    const state: GridColumnState = { version: 1, order: ['col1'], widths: {}, hidden: [] }

    vi.mocked(gridElement.getRowHeight).mockReturnValue(50)
    vi.mocked(gridElement.getColumnWidth).mockReturnValue(120)
    vi.mocked(gridElement.getColumnOrder).mockReturnValue(['col1'])
    vi.mocked(gridElement.isColumnVisible).mockReturnValue(true)
    vi.mocked(gridElement.getVisibleColumnKeys).mockReturnValue(['col1'])
    vi.mocked(gridElement.getColumnState).mockReturnValue(state)
    vi.mocked(gridElement.bestFitColumn).mockReturnValue(150)
    vi.mocked(gridElement.bestFitAllColumns).mockReturnValue([{ key: 'col1', width: 150 }])

    expect(component.getRowHeight(2)).toBe(50)
    expect(gridElement.getRowHeight).toHaveBeenCalledWith(2)

    expect(component.getColumnWidth(col)).toBe(120)
    expect(gridElement.getColumnWidth).toHaveBeenCalledWith(col)

    component.setRowHeight(1, 45)
    expect(gridElement.setRowHeight).toHaveBeenCalledWith(1, 45)

    component.resetRowHeight(1)
    expect(gridElement.resetRowHeight).toHaveBeenCalledWith(1)

    component.resetAllRowHeights()
    expect(gridElement.resetAllRowHeights).toHaveBeenCalled()

    component.setColumnWidth('col1', 130)
    expect(gridElement.setColumnWidth).toHaveBeenCalledWith('col1', 130)

    component.resetColumnWidth('col1')
    expect(gridElement.resetColumnWidth).toHaveBeenCalledWith('col1')

    component.resetAllColumnWidths()
    expect(gridElement.resetAllColumnWidths).toHaveBeenCalled()

    component.moveColumn('col1', 0)
    expect(gridElement.moveColumn).toHaveBeenCalledWith('col1', 0)

    expect(component.getColumnOrder()).toEqual(['col1'])
    component.setColumnOrder(['col1'])
    expect(gridElement.setColumnOrder).toHaveBeenCalledWith(['col1'])

    component.resetColumnOrder()
    expect(gridElement.resetColumnOrder).toHaveBeenCalled()

    component.setColumnVisible('col1', false)
    expect(gridElement.setColumnVisible).toHaveBeenCalledWith('col1', false)

    expect(component.isColumnVisible('col1')).toBe(true)
    expect(component.getVisibleColumnKeys()).toEqual(['col1'])

    component.resetColumnVisibility()
    expect(gridElement.resetColumnVisibility).toHaveBeenCalled()

    expect(component.getColumnState()).toBe(state)
    component.setColumnState(state)
    expect(gridElement.setColumnState).toHaveBeenCalledWith(state)

    component.resetColumnState()
    expect(gridElement.resetColumnState).toHaveBeenCalled()

    expect(component.bestFitColumn('col1')).toBe(150)
    expect(gridElement.bestFitColumn).toHaveBeenCalledWith('col1')

    expect(component.bestFitAllColumns()).toEqual([{ key: 'col1', width: 150 }])
  })

  it('forwards search, filter, pagination, clipboard, and selection methods to DataGridElement', async () => {
    const { component, gridElement } = createComponentWithGrid()
    const filter: GridFilter = { columnKey: 'col1', operator: 'equals', value: 'x' }
    const pagination: GridPaginationState = { pageIndex: 0, pageSize: 25, totalPages: 1 }
    const selection: GridSelection = { mode: 'row', selectedRowIndexes: [0], selectedCellKeys: [] }

    vi.mocked(gridElement.copySelectedCells).mockResolvedValue(true)
    vi.mocked(gridElement.copySelectedRows).mockResolvedValue(true)
    vi.mocked(gridElement.getQuickSearch).mockReturnValue('search')
    vi.mocked(gridElement.getFilters).mockReturnValue([filter])
    vi.mocked(gridElement.getPagination).mockReturnValue(pagination)
    vi.mocked(gridElement.getTotalRowCount).mockReturnValue(100)
    vi.mocked(gridElement.getSelection).mockReturnValue(selection)
    vi.mocked(gridElement.isRowSelected).mockReturnValue(true)
    vi.mocked(gridElement.isCellSelected).mockReturnValue(false)

    await expect(component.copySelectedCells()).resolves.toBe(true)
    await expect(component.copySelectedRows()).resolves.toBe(true)

    component.setQuickSearch('query')
    expect(gridElement.setQuickSearch).toHaveBeenCalledWith('query')

    component.clearQuickSearch()
    expect(gridElement.clearQuickSearch).toHaveBeenCalled()

    expect(component.getQuickSearch()).toBe('search')

    component.setFilter(filter)
    expect(gridElement.setFilter).toHaveBeenCalledWith(filter)

    component.clearFilter('col1')
    expect(gridElement.clearFilter).toHaveBeenCalledWith('col1')

    expect(component.getFilters()).toEqual([filter])

    component.setPage(2)
    expect(gridElement.setPage).toHaveBeenCalledWith(2)

    component.setPageSize(50)
    expect(gridElement.setPageSize).toHaveBeenCalledWith(50)

    expect(component.getPagination()).toBe(pagination)
    expect(component.getTotalRowCount()).toBe(100)

    component.selectRow(3, 'toggle')
    expect(gridElement.selectRow).toHaveBeenCalledWith(3, 'toggle')

    component.selectAllRows()
    expect(gridElement.selectAllRows).toHaveBeenCalled()

    component.clearSelection()
    expect(gridElement.clearSelection).toHaveBeenCalled()

    expect(component.getSelection()).toBe(selection)
    expect(component.isRowSelected(3)).toBe(true)
    expect(component.isCellSelected(3, 'col1')).toBe(false)
  })
})
