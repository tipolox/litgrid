import type { FilterOperator, GridSortState } from './GridState.js'

export type GridQueryFilter = Readonly<{
  columnKey: string
  operator: FilterOperator
  /** Invariant JSON scalar. Decimal strings are never coerced. */
  value?: string | number | boolean | null
}>
export type GridQuery = Readonly<{
  search: string
  filters: readonly GridQueryFilter[]
  sort: Readonly<GridSortState>
  pageIndex: number
  pageSize: number
}>
export type GridQueryReason = 'search' | 'filter' | 'sort' | 'page' | 'page-size' | 'refresh'
export type GridQueryChangeDetail = Readonly<{
  requestId: number
  reason: GridQueryReason
  query: GridQuery
}>
export type GridQuerySnapshot = Readonly<{ requestId: number; query: GridQuery }>
export type GridExternalTotal = Readonly<
  { kind: 'known'; totalRows: number } | { kind: 'unknown'; hasMore: boolean }
>
/** Atomic external result. Replace this object to signal changes. */
export type GridExternalState = Readonly<{
  requestId: number
  query: GridQuery
  rows: readonly unknown[]
  total: GridExternalTotal
  loading?: boolean
  error?: string | null
}>
