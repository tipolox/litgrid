import '@tipolox/litgrid-web'
import type {
  BestFitColumnWidth,
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn,
  GridColumnState,
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  GridTheme,
  SelectionIntent
} from '@tipolox/litgrid-web'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react'
import { syncGridInputs } from './gridBindings.js'

export type DataGridProps = {
  data: unknown[]
  columns?: GridColumn[]
  config?: GridConfig
  theme?: GridTheme
  ariaLabel?: string
  ariaDescription?: string
  screenReaderAnnouncements?: boolean
  height?: number
  rowHeight?: number
  overscan?: number
  columnOverscan?: number
  bestFitSampleSize?: number
  quickSearchDebounceThreshold?: number
  quickSearchDebounceMs?: number
  columnStateStorageKey?: string
  onColumnStateChange?: (detail: ColumnStateChangeDetail) => void
  onColumnReorder?: (detail: ColumnReorderDetail) => void
  onColumnVisibilityChange?: (detail: ColumnVisibilityChangeDetail) => void
}

export type DataGridRef = {
  readonly gridElement: DataGridElement | null
  getRowHeight(rowIndex: number): number
  getColumnWidth(column: GridColumn): number
  setRowHeight(rowIndex: number, height: number): void
  resetRowHeight(rowIndex: number): void
  resetAllRowHeights(): void
  setColumnWidth(columnKey: string, width: number): void
  resetColumnWidth(columnKey: string): void
  resetAllColumnWidths(): void
  moveColumn(columnKey: string, targetIndex: number): void
  getColumnOrder(): string[]
  setColumnOrder(columnKeys: string[]): void
  resetColumnOrder(): void
  setColumnVisible(columnKey: string, visible: boolean): void
  isColumnVisible(columnKey: string): boolean
  getVisibleColumnKeys(): string[]
  resetColumnVisibility(): void
  getColumnState(): GridColumnState
  setColumnState(state: GridColumnState): void
  resetColumnState(): void
  bestFitColumn(columnKey: string): number | null
  bestFitAllColumns(): BestFitColumnWidth[]
  copySelectedCells(): Promise<boolean>
  copySelectedRows(): Promise<boolean>
  setQuickSearch(query: string): void
  clearQuickSearch(): void
  getQuickSearch(): string
  setFilter(filter: GridFilter): void
  clearFilter(columnKey?: string): void
  getFilters(): GridFilter[]
  setPage(pageIndex: number): void
  setPageSize(pageSize: number): void
  getPagination(): GridPaginationState
  getTotalRowCount(): number
  selectRow(rowIndex: number, intent?: SelectionIntent): void
  selectAllRows(): void
  clearSelection(): void
  getSelection(): GridSelection
  isRowSelected(rowIndex: number): boolean
  isCellSelected(rowIndex: number, columnKey: string): boolean
}

export type DataGridInstance = DataGridRef

const GRID_UNAVAILABLE_MESSAGE = 'LitGrid is not available before the React component is mounted.'

export const DataGrid = forwardRef<DataGridRef, DataGridProps>(function DataGrid(
  {
    data,
    columns = [],
    config = {},
    theme = 'light',
    ariaLabel = 'Data grid',
    ariaDescription = '',
    screenReaderAnnouncements = true,
    height = 320,
    rowHeight = 36,
    overscan = 4,
    columnOverscan = 2,
    bestFitSampleSize = 10,
    quickSearchDebounceThreshold = 10000,
    quickSearchDebounceMs = 150,
    columnStateStorageKey,
    onColumnStateChange,
    onColumnReorder,
    onColumnVisibilityChange
  },
  forwardedRef
) {
  const gridRef = useRef<DataGridElement | null>(null)

  const requireGridElement = (): DataGridElement => {
    if (!gridRef.current) throw new Error(GRID_UNAVAILABLE_MESSAGE)
    return gridRef.current
  }

  useImperativeHandle(
    forwardedRef,
    () => ({
      get gridElement() {
        return gridRef.current
      },
      getRowHeight: (rowIndex: number) => requireGridElement().getRowHeight(rowIndex),
      getColumnWidth: (column: GridColumn) => requireGridElement().getColumnWidth(column),
      setRowHeight: (rowIndex: number, heightVal: number) => requireGridElement().setRowHeight(rowIndex, heightVal),
      resetRowHeight: (rowIndex: number) => requireGridElement().resetRowHeight(rowIndex),
      resetAllRowHeights: () => requireGridElement().resetAllRowHeights(),
      setColumnWidth: (columnKey: string, width: number) => requireGridElement().setColumnWidth(columnKey, width),
      resetColumnWidth: (columnKey: string) => requireGridElement().resetColumnWidth(columnKey),
      resetAllColumnWidths: () => requireGridElement().resetAllColumnWidths(),
      moveColumn: (columnKey: string, targetIndex: number) => requireGridElement().moveColumn(columnKey, targetIndex),
      getColumnOrder: () => requireGridElement().getColumnOrder(),
      setColumnOrder: (columnKeys: string[]) => requireGridElement().setColumnOrder(columnKeys),
      resetColumnOrder: () => requireGridElement().resetColumnOrder(),
      setColumnVisible: (columnKey: string, visible: boolean) => requireGridElement().setColumnVisible(columnKey, visible),
      isColumnVisible: (columnKey: string) => requireGridElement().isColumnVisible(columnKey),
      getVisibleColumnKeys: () => requireGridElement().getVisibleColumnKeys(),
      resetColumnVisibility: () => requireGridElement().resetColumnVisibility(),
      getColumnState: () => requireGridElement().getColumnState(),
      setColumnState: (state: GridColumnState) => requireGridElement().setColumnState(state),
      resetColumnState: () => requireGridElement().resetColumnState(),
      bestFitColumn: (columnKey: string) => requireGridElement().bestFitColumn(columnKey),
      bestFitAllColumns: () => requireGridElement().bestFitAllColumns(),
      copySelectedCells: () => requireGridElement().copySelectedCells(),
      copySelectedRows: () => requireGridElement().copySelectedRows(),
      setQuickSearch: (query: string) => requireGridElement().setQuickSearch(query),
      clearQuickSearch: () => requireGridElement().clearQuickSearch(),
      getQuickSearch: () => requireGridElement().getQuickSearch(),
      setFilter: (filter: GridFilter) => requireGridElement().setFilter(filter),
      clearFilter: (columnKey?: string) => requireGridElement().clearFilter(columnKey),
      getFilters: () => requireGridElement().getFilters(),
      setPage: (pageIndex: number) => requireGridElement().setPage(pageIndex),
      setPageSize: (pageSize: number) => requireGridElement().setPageSize(pageSize),
      getPagination: () => requireGridElement().getPagination(),
      getTotalRowCount: () => requireGridElement().getTotalRowCount(),
      selectRow: (rowIndex: number, intent?: SelectionIntent) => requireGridElement().selectRow(rowIndex, intent),
      selectAllRows: () => requireGridElement().selectAllRows(),
      clearSelection: () => requireGridElement().clearSelection(),
      getSelection: () => requireGridElement().getSelection(),
      isRowSelected(rowIndex: number) {
        return requireGridElement().isRowSelected(rowIndex)
      },
      isCellSelected(rowIndex: number, columnKey: string) {
        return requireGridElement().isCellSelected(rowIndex, columnKey)
      }
    }),
    []
  )

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    syncGridInputs(grid, {
      data,
      columns,
      config,
      theme,
      ariaLabel,
      ariaDescription,
      screenReaderAnnouncements,
      height,
      rowHeight,
      overscan,
      columnOverscan,
      bestFitSampleSize,
      quickSearchDebounceThreshold,
      quickSearchDebounceMs,
      columnStateStorageKey
    })
  }, [
    data,
    columns,
    config,
    theme,
    ariaLabel,
    ariaDescription,
    screenReaderAnnouncements,
    height,
    rowHeight,
    overscan,
    columnOverscan,
    bestFitSampleSize,
    quickSearchDebounceThreshold,
    quickSearchDebounceMs,
    columnStateStorageKey
  ])

  useEffect(() => {
    const element = gridRef.current
    if (!element || !onColumnStateChange) return

    const handleColumnStateChange = (event: Event) => {
      onColumnStateChange((event as CustomEvent<ColumnStateChangeDetail>).detail)
    }

    element.addEventListener('column-state-change', handleColumnStateChange)
    return () => element.removeEventListener('column-state-change', handleColumnStateChange)
  }, [onColumnStateChange])

  useEffect(() => {
    const element = gridRef.current
    if (!element || !onColumnReorder) return

    const handleColumnReorder = (event: Event) => {
      onColumnReorder((event as CustomEvent<ColumnReorderDetail>).detail)
    }

    element.addEventListener('column-reorder', handleColumnReorder)
    return () => element.removeEventListener('column-reorder', handleColumnReorder)
  }, [onColumnReorder])

  useEffect(() => {
    const element = gridRef.current
    if (!element || !onColumnVisibilityChange) return

    const handleColumnVisibilityChange = (event: Event) => {
      onColumnVisibilityChange((event as CustomEvent<ColumnVisibilityChangeDetail>).detail)
    }

    element.addEventListener('column-visibility-change', handleColumnVisibilityChange)
    return () => element.removeEventListener('column-visibility-change', handleColumnVisibilityChange)
  }, [onColumnVisibilityChange])

  return <yc-grid ref={gridRef}></yc-grid>
})
