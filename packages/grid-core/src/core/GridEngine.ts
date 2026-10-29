import type { GridConfig, ResolvedGridConfig } from '../model/GridConfig.js'
import type { GridExternalState, GridQueryChangeDetail, GridQuerySnapshot } from '../model/GridQuery.js'
import type {
  GridSelection,
  GridRowKey,
  SelectionChangeDetail,
  GridFilter,
  GridPaginationState,
  GridSortState,
  SelectionIntent,
  SortDirection
} from '../model/GridState.js'

export type GridEngine = {
  setExternalState: (state: GridExternalState) => boolean
  getExternalState: () => GridExternalState | null
  getQuery: () => GridQuerySnapshot
  refreshQuery: () => void
  onQueryChange: (listener: (detail: GridQueryChangeDetail) => void) => () => void
  setConfig: (config: GridConfig) => void
  getConfig: () => ResolvedGridConfig
  setData: (data: unknown[], preservePage?: boolean) => void
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
