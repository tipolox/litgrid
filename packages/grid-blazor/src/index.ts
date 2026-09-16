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
  GridTheme,
  SelectionIntent
} from '@tipolox/litgrid-web'
import { syncGridInputs, type BlazorGridInputs } from './gridBindings'

export type BlazorGridPaginationState = {
  enabled: boolean
  pageIndex: number
  pageSize: number
  totalPages: number
  totalRows: number
}

export type BlazorGridCellSelection = {
  rowIndex: number
  columnKey: string
}

export type BlazorGridSelection = {
  mode: 'none' | 'row' | 'multi-row' | 'cell' | 'multi-cell'
  rowIndex: number | null
  selectedRowIndices: number[]
  cell: BlazorGridCellSelection | null
  selectedCells: BlazorGridCellSelection[]
}

export type {
  BestFitColumnWidth,
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn,
  GridColumnState,
  GridConfig,
  GridFilter,
  GridTheme,
  SelectionIntent,
  BlazorGridInputs
}

export { syncGridInputs }

export interface DotNetHelper {
  invokeMethodAsync<T = unknown>(methodName: string, ...args: unknown[]): Promise<T>
}

interface GridListeners {
  onStateChange: (event: Event) => void
  onReorder: (event: Event) => void
  onVisibilityChange: (event: Event) => void
}

const activeListeners = new WeakMap<HTMLElement, GridListeners>()

function requireGrid(element: HTMLElement | null): DataGridElement {
  if (!element || typeof (element as DataGridElement).getRowHeight !== 'function') {
    throw new Error('LitGrid is not available before the Blazor component is mounted.')
  }
  return element as DataGridElement
}

export function initGrid(
  element: HTMLElement,
  dotNetHelper: DotNetHelper,
  inputs: BlazorGridInputs
): void {
  const grid = requireGrid(element)
  syncGridInputs(grid, inputs)

    const onStateChange = (event: Event) => {
    const detail = (event as CustomEvent<ColumnStateChangeDetail>).detail
    dotNetHelper.invokeMethodAsync('HandleColumnStateChange', detail)
  }

  const onReorder = (event: Event) => {
    const detail = (event as CustomEvent<ColumnReorderDetail>).detail
    dotNetHelper.invokeMethodAsync('HandleColumnReorder', detail)
  }

  const onVisibilityChange = (event: Event) => {
    const detail = (event as CustomEvent<ColumnVisibilityChangeDetail>).detail
    dotNetHelper.invokeMethodAsync('HandleColumnVisibilityChange', detail)
  }

  grid.addEventListener('column-state-change', onStateChange)
  grid.addEventListener('column-reorder', onReorder)
  grid.addEventListener('column-visibility-change', onVisibilityChange)

  activeListeners.set(element, {
    onStateChange,
    onReorder,
    onVisibilityChange
  })
}

export function updateInputs(element: HTMLElement, inputs: BlazorGridInputs): void {
  const grid = requireGrid(element)
  syncGridInputs(grid, inputs)
}

export function disposeGrid(element: HTMLElement): void {
  const listeners = activeListeners.get(element)
  if (listeners && element) {
    element.removeEventListener('column-state-change', listeners.onStateChange)
    element.removeEventListener('column-reorder', listeners.onReorder)
    element.removeEventListener('column-visibility-change', listeners.onVisibilityChange)
    activeListeners.delete(element)
  }
}

// Imperative API delegations
export function getRowHeight(element: HTMLElement, rowIndex: number): number {
  return requireGrid(element).getRowHeight(rowIndex)
}

export function getColumnWidth(element: HTMLElement, column: GridColumn): number {
  return requireGrid(element).getColumnWidth(column)
}

export function setRowHeight(element: HTMLElement, rowIndex: number, height: number): void {
  requireGrid(element).setRowHeight(rowIndex, height)
}

export function resetRowHeight(element: HTMLElement, rowIndex: number): void {
  requireGrid(element).resetRowHeight(rowIndex)
}

export function resetAllRowHeights(element: HTMLElement): void {
  requireGrid(element).resetAllRowHeights()
}

export function setColumnWidth(element: HTMLElement, columnKey: string, width: number): void {
  requireGrid(element).setColumnWidth(columnKey, width)
}

export function resetColumnWidth(element: HTMLElement, columnKey: string): void {
  requireGrid(element).resetColumnWidth(columnKey)
}

export function resetAllColumnWidths(element: HTMLElement): void {
  requireGrid(element).resetAllColumnWidths()
}

export function moveColumn(element: HTMLElement, columnKey: string, targetIndex: number): void {
  requireGrid(element).moveColumn(columnKey, targetIndex)
}

export function getColumnOrder(element: HTMLElement): string[] {
  return requireGrid(element).getColumnOrder()
}

export function setColumnOrder(element: HTMLElement, columnKeys: string[]): void {
  requireGrid(element).setColumnOrder(columnKeys)
}

export function resetColumnOrder(element: HTMLElement): void {
  requireGrid(element).resetColumnOrder()
}

export function setColumnVisible(element: HTMLElement, columnKey: string, visible: boolean): void {
  requireGrid(element).setColumnVisible(columnKey, visible)
}

export function isColumnVisible(element: HTMLElement, columnKey: string): boolean {
  return requireGrid(element).isColumnVisible(columnKey)
}

export function getVisibleColumnKeys(element: HTMLElement): string[] {
  return requireGrid(element).getVisibleColumnKeys()
}

export function resetColumnVisibility(element: HTMLElement): void {
  requireGrid(element).resetColumnVisibility()
}

export function getColumnState(element: HTMLElement): GridColumnState {
  return requireGrid(element).getColumnState()
}

export function setColumnState(element: HTMLElement, state: GridColumnState): void {
  requireGrid(element).setColumnState(state)
}

export function resetColumnState(element: HTMLElement): void {
  requireGrid(element).resetColumnState()
}

export function bestFitColumn(element: HTMLElement, columnKey: string): number | null {
  return requireGrid(element).bestFitColumn(columnKey)
}

export function bestFitAllColumns(element: HTMLElement): BestFitColumnWidth[] {
  return requireGrid(element).bestFitAllColumns()
}

export function copySelectedCells(element: HTMLElement): Promise<boolean> {
  return requireGrid(element).copySelectedCells()
}

export function copySelectedRows(element: HTMLElement): Promise<boolean> {
  return requireGrid(element).copySelectedRows()
}

export function setQuickSearch(element: HTMLElement, query: string): void {
  requireGrid(element).setQuickSearch(query)
}

export function clearQuickSearch(element: HTMLElement): void {
  requireGrid(element).clearQuickSearch()
}

export function getQuickSearch(element: HTMLElement): string {
  return requireGrid(element).getQuickSearch()
}

export function setFilter(element: HTMLElement, filter: GridFilter): void {
  requireGrid(element).setFilter(filter)
}

export function clearFilter(element: HTMLElement, columnKey?: string): void {
  requireGrid(element).clearFilter(columnKey)
}

export function getFilters(element: HTMLElement): GridFilter[] {
  return requireGrid(element).getFilters()
}

export function setPage(element: HTMLElement, pageIndex: number): void {
  requireGrid(element).setPage(pageIndex)
}

export function setPageSize(element: HTMLElement, pageSize: number): void {
  requireGrid(element).setPageSize(pageSize)
}

export function getPagination(element: HTMLElement): BlazorGridPaginationState {
  const pagination = requireGrid(element).getPagination()
  return {
    enabled: pagination.enabled,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    totalPages: pagination.pageCount,
    totalRows: pagination.totalRows
  }
}

export function getTotalRowCount(element: HTMLElement): number {
  return requireGrid(element).getTotalRowCount()
}

export function selectRow(element: HTMLElement, rowIndex: number, intent?: SelectionIntent): void {
  requireGrid(element).selectRow(rowIndex, intent)
}

export function selectAllRows(element: HTMLElement): void {
  requireGrid(element).selectAllRows()
}

export function clearSelection(element: HTMLElement): void {
  requireGrid(element).clearSelection()
}

export function getSelection(element: HTMLElement): BlazorGridSelection {
  const selection = requireGrid(element).getSelection()
  const selectedRowIndices = [...selection.rowIndexes]
  const selectedCells = [...selection.cells].map(cellKey => {
    const separatorIndex = cellKey.indexOf(':')
    return {
      rowIndex: Number(cellKey.slice(0, separatorIndex)),
      columnKey: cellKey.slice(separatorIndex + 1)
    }
  })
  const cell = selection.rowIndex !== null && selection.columnKey !== null
    ? { rowIndex: selection.rowIndex, columnKey: selection.columnKey }
    : null

  return {
    mode: selection.mode,
    rowIndex: selection.rowIndex,
    selectedRowIndices,
    cell,
    selectedCells
  }
}

export function isRowSelected(element: HTMLElement, rowIndex: number): boolean {
  return requireGrid(element).isRowSelected(rowIndex)
}

export function isCellSelected(element: HTMLElement, rowIndex: number, columnKey: string): boolean {
  return requireGrid(element).isCellSelected(rowIndex, columnKey)
}
