// Structural declarations copied from the v1.2.3 tag, for source-compatibility checks.
import type { GridConfig, ResolvedGridConfig, GridExternalState, GridQueryChangeDetail, GridQuerySnapshot, GridSelection, GridRowKey, SelectionChangeDetail, GridFilter, GridPaginationState, SelectionIntent, SortDirection } from '@tipolox/litgrid-core'
type GridSortState = { columnKey: string | null; direction: SortDirection | null }
import type { BestFitColumnWidth, DataGridElement, GridColumn, GridColumnState } from '@tipolox/litgrid-web'

export type LegacyGridEngine = {
  setExternalState: (state: GridExternalState) => boolean
  getExternalState: () => GridExternalState | null
  getQuery: () => GridQuerySnapshot
  refreshQuery: () => void
  onQueryChange: (listener: (detail: GridQueryChangeDetail) => void) => () => void
  setConfig: (config: GridConfig) => void
  getConfig: () => ResolvedGridConfig
  setData: (data: unknown[]) => void
  getRows: () => unknown[]
  setQuickSearch: (query: string) => void
  clearQuickSearch: () => void
  getQuickSearch: () => string
  setFilter: (filter: GridFilter) => void
  clearFilter: (columnKey?: string) => void
  getFilters: () => GridFilter[]
  setPage: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  getPagination: () => GridPaginationState
  getTotalRowCount: () => number
  sortBy: (columnKey: string, direction: SortDirection) => void
  clearSort: () => void
  getSort: () => GridSortState
  getRowCount: () => number
  /** Number of displayed rows with valid unique keys, or all rows in index mode. */
  getSelectableRowCount: () => number
  getVisibleRows: (startIndex: number, endIndex: number) => unknown[]
  selectRow: (rowIndex: number, intent?: SelectionIntent) => void
  selectRowByKey: (key: GridRowKey, intent?: SelectionIntent) => boolean
  getSelectionSnapshot: () => SelectionChangeDetail
  onSelectionChange: (listener: (detail: SelectionChangeDetail) => void) => () => void
  selectAllRows: () => void
  selectCell: (rowIndex: number, columnKey: string) => void
  clearSelection: () => void
  getSelection: () => GridSelection
  isRowSelected: (rowIndex: number) => boolean
  isCellSelected: (rowIndex: number, columnKey: string) => boolean
}

export type LegacyDataGridRef = {
  setExternalState(state: GridExternalState): boolean
  getQuery(): GridQuerySnapshot
  refreshQuery(): void
  sortBy(columnKey: string, direction: SortDirection): void
  clearSort(): void
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
  getSelectionSnapshot(): SelectionChangeDetail
  selectRowByKey(key: GridRowKey, intent?: SelectionIntent): boolean
  isRowSelected(rowIndex: number): boolean
  isCellSelected(rowIndex: number, columnKey: string): boolean
}

export type LegacyVueInstance = {
  setExternalState(state: GridExternalState): boolean
  getQuery(): GridQuerySnapshot
  refreshQuery(): void
  sortBy(key: string, direction: SortDirection): void
  clearSort(): void
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
  getSelectionSnapshot(): SelectionChangeDetail
  selectRowByKey(key: GridRowKey, intent?: SelectionIntent): boolean
  isRowSelected(rowIndex: number): boolean
  isCellSelected(rowIndex: number, columnKey: string): boolean
}
