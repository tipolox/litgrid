import type {
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  SelectionIntent
} from '@tipolox/litgrid-core'
import type { ColumnStateChangeDetail, GridColumnState } from './columnState/columnState.js'

export type { ColumnStateChangeDetail, GridColumnState }

export type {
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  SelectionIntent
} from '@tipolox/litgrid-core'

export type GridTheme = 'light' | 'dark'

export type GridColumn = {
  key: string
  header?: string
  width?: number | string
  hidden?: boolean
  /** Show local sorting actions in the header menu. Defaults to true; does not change query state or imperative APIs. */
  sortable?: boolean
  /** Show local column filtering controls. Defaults to true; does not affect quick search or imperative APIs. */
  filterable?: boolean
  accessor?: (row: unknown, rowIndex: number) => unknown
  render?: (value: unknown, row: unknown, rowIndex: number) => unknown
}

export type BestFitColumnWidth = {
  key: string
  width: number | null
}

export type ColumnReorderDetail = {
  columnKey: string
  previousIndex: number
  currentIndex: number
  columnOrder: string[]
}

export type ColumnVisibilityChangeDetail = {
  columnKey: string
  visible: boolean
  visibleColumnKeys: string[]
}

export type DataGridElement = HTMLElement & {
  data: unknown[]
  columns: GridColumn[]
  config: GridConfig
  theme: GridTheme
  ariaLabel: string
  ariaDescription: string
  screenReaderAnnouncements: boolean
  viewportHeight: number
  virtualRowHeight: number
  overscanCount: number
  columnOverscanCount: number
  bestFitSampleSize: number
  quickSearchDebounceThreshold: number
  quickSearchDebounceMs: number
  columnStateStorageKey: string | null
  /** Additive capability; production DataGrid always implements it. */
  inferColumns?: boolean
  /** Additive capability; older structural implementations may omit it. */
  updateColumnSchema?: (columns: GridColumn[], applyOrder?: boolean, storageKey?: string | null) => void
  getRowHeight: (rowIndex: number) => number
  getColumnWidth: (column: GridColumn) => number
  setRowHeight: (rowIndex: number, height: number) => void
  resetRowHeight: (rowIndex: number) => void
  resetAllRowHeights: () => void
  setColumnWidth: (columnKey: string, width: number) => void
  resetColumnWidth: (columnKey: string) => void
  resetAllColumnWidths: () => void
  moveColumn: (columnKey: string, targetIndex: number) => void
  getColumnOrder: () => string[]
  setColumnOrder: (columnKeys: string[]) => void
  resetColumnOrder: () => void
  setColumnVisible: (columnKey: string, visible: boolean) => void
  isColumnVisible: (columnKey: string) => boolean
  getVisibleColumnKeys: () => string[]
  resetColumnVisibility: () => void
  getColumnState: () => GridColumnState
  setColumnState: (state: GridColumnState) => void
  resetColumnState: () => void
  bestFitColumn: (columnKey: string) => number | null
  bestFitAllColumns: () => BestFitColumnWidth[]
  copySelectedCells: () => Promise<boolean>
  copySelectedRows: () => Promise<boolean>
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
  selectRow: (rowIndex: number, intent?: SelectionIntent) => void
  selectAllRows: () => void
  clearSelection: () => void
  getSelection: () => GridSelection
  isRowSelected: (rowIndex: number) => boolean
  isCellSelected: (rowIndex: number, columnKey: string) => boolean
}
