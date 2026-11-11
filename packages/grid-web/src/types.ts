import type {
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  GridRowKey,
  SelectionChangeDetail,
  GridExternalState,
  GridQuerySnapshot,
  GridQueryChangeDetail,
  SortDirection,
  SelectionIntent
} from '@tipolox/litgrid-core'
import type { ColumnStateChangeDetail, GridColumnState } from './columnState/columnState.js'

export type { ColumnStateChangeDetail, GridColumnState }
export type { GridQuery, GridQueryFilter, GridQueryReason, GridQueryChangeDetail, GridQuerySnapshot, GridExternalTotal, GridExternalState, SortDirection } from '@tipolox/litgrid-core'

export type {
  GridRowKey,
  SelectedRowSnapshot,
  SelectionChangeDetail,
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  SelectionIntent
} from '@tipolox/litgrid-core'

export type GridTheme = 'light' | 'dark'

/** Targeted updates are presentation-only unless the full-model fallback is chosen. */
export type GridRefreshOptions = { mode?: 'auto' | 'render-only' }
/** Current displayed indices, start inclusive and end exclusive (not source positions). */
export type GridRefreshRange = { start: number; endExclusive: number }

/** Logical or physical column content and header label alignment. */
export type GridColumnAlign = 'start' | 'center' | 'end' | 'left' | 'right'

/**
 * Opt in to checked model keys and typed callback rows with `GridColumn<Person>`.
 * Custom keys require an accessor; renderer values remain unknown because an
 * accessor may transform them. The default preserves unrestricted legacy keys.
 * The non-generic callback boundary is bivariant so typed columns fit existing
 * props; callers are responsible for supplying data matching TRow.
 */
export type GridColumn<TRow = unknown> = {
  /** Position body content and the header label using logical or physical alignment. */
  align?: GridColumnAlign
  header?: string
  width?: number | string
  hidden?: boolean
  /** Show local sorting actions in the header menu. Defaults to true; does not change query state or imperative APIs. */
  sortable?: boolean
  /** Show local column filtering controls. Defaults to true; does not affect quick search or imperative APIs. */
  filterable?: boolean
} & (unknown extends TRow
  ? {
    key: string
    accessor?(row: TRow, rowIndex: number): unknown
    render?(value: unknown, row: TRow, rowIndex: number): unknown
  }
  : {
    accessor?: (row: TRow, rowIndex: number) => unknown
    render?: (value: unknown, row: TRow, rowIndex: number) => unknown
  } & ({ key: Extract<keyof TRow, string> } | {
    key: string
    /** An explicit accessor supplies the value for a computed/synthetic key. */
    accessor: (row: TRow, rowIndex: number) => unknown
  }))

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
  /** Additive external-query capabilities; production DataGrid implements them. */
  externalState?: GridExternalState | null
  setExternalState?: (state: GridExternalState) => boolean
  getQuery?: () => GridQuerySnapshot
  refreshQuery?: () => void
  /** Optional additive local refresh capability (Blazor already offers RefreshDataAsync). */
  refreshData?: () => boolean
  refreshRow?: (key: GridRowKey, options?: GridRefreshOptions) => boolean
  refreshRows?: (keys: readonly GridRowKey[], options?: GridRefreshOptions) => number
  refreshRange?: (range: GridRefreshRange, options?: GridRefreshOptions) => number
  sortBy?: (columnKey: string, direction: SortDirection) => void
  clearSort?: () => void
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
  getSelectionSnapshot: () => SelectionChangeDetail
  selectRowByKey: (key: GridRowKey, intent?: SelectionIntent) => boolean
  isRowSelected: (rowIndex: number) => boolean
  isCellSelected: (rowIndex: number, columnKey: string) => boolean
}

declare global {
  interface HTMLElementEventMap {
    'selection-change': CustomEvent<SelectionChangeDetail>
    'query-change': CustomEvent<GridQueryChangeDetail>
  }
}
