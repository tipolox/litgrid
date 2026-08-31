import type { ResolvedGridConfig, SelectionMode } from './GridConfig.js'

export type SelectionIntent = 'replace' | 'toggle' | 'range'

export type GridSelection = {
  mode: SelectionMode
  rowIndex: number | null
  columnKey: string | null
  anchorRowIndex: number | null
  rowIndexes: Set<number>
  cells: Set<string>
}

export type SortDirection = 'asc' | 'desc'

export type GridSortState = {
  columnKey: string | null
  direction: SortDirection | null
}

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'

export type GridFilter = {
  columnKey: string
  operator: FilterOperator
  value?: unknown
}

export type GridPaginationState = {
  enabled: boolean
  pageIndex: number
  pageSize: number
  totalRows: number
  pageCount: number
}

export type GridState = {
  config: ResolvedGridConfig
  originalData: unknown[]
  transformedData: unknown[]
  data: unknown[]
  sort: GridSortState
  quickSearchQuery: string
  filters: GridFilter[]
  pagination: GridPaginationState
  selection: GridSelection
}
