import type { GridConfig } from '../model/GridConfig.js'
import { normalizeConfig } from '../model/GridConfig.js'
import type { GridFilter, GridState, SelectionIntent, SortDirection } from '../model/GridState.js'
import {
  createEmptySelection,
  getCellKey,
  getNextCellSelection,
  getNextRowSelection
} from '../features/selection/selection.js'
import { applyDataTransforms } from '../features/transforms/applyDataTransforms.js'
import { clampPageIndex, createPaginationState, paginateData } from '../features/pagination/pagination.js'
import type { GridEngine } from './GridEngine.js'
import { createSelectionCoordination } from '../features/selection/selectionCoordination.js'
import { createExternalQuery } from '../features/query/externalQuery.js'
import type { GridQuery } from '../model/GridQuery.js'

export function createGridEngine(config: GridConfig = {}): GridEngine {
  const initialConfig = normalizeConfig(config)
  const state: GridState = {
    config: initialConfig,
    originalData: [],
    transformedData: [],
    data: [],
    sort: { columnKey: null, direction: null },
    quickSearchQuery: '',
    filters: [],
    pagination: createPaginationState(
      initialConfig.pagination.enabled,
      initialConfig.pagination.pageSize,
      initialConfig.pagination.pageIndex
    ),
    selection: createEmptySelection(initialConfig.selection.mode)
  }
  const coordination = createSelectionCoordination(state)
  const external = createExternalQuery(state, rows => {
    state.originalData = rows
    state.transformedData = rows
    state.data = rows
    coordination.rebuildKeys()
    coordination.reconcile(true)
  })
  if (external.active()) external.reset()

  function refreshData() {
    if (external.active()) { external.reconcile(); return }
    state.transformedData = applyDataTransforms(
      state.originalData,
      state.quickSearchQuery,
      state.filters,
      state.sort
    )
    const pageCount = Math.ceil(state.transformedData.length / state.pagination.pageSize)
    state.pagination = {
      ...state.pagination,
      totalRows: state.transformedData.length,
      pageCount,
      pageIndex: clampPageIndex(state.pagination.pageIndex, pageCount)
    }
    state.data = paginateData(state.transformedData, state.pagination)
    coordination.reconcile(!state.pagination.enabled && !state.quickSearchQuery.trim() &&
      state.filters.length === 0 && (!state.sort.columnKey || !state.sort.direction))
  }

  function resetPage() {
    state.pagination = { ...state.pagination, pageIndex: 0 }
  }

  const engine: GridEngine = {
    setExternalState: external.commit,
    getExternalState: external.getState,
    getQuery: external.getQuery,
    onQueryChange: external.subscribe,
    refreshQuery() { if (external.active()) external.intent({}, 'refresh') },
    setConfig(config: GridConfig) {
      const nextConfig = normalizeConfig(config)
      const previousConfig = state.config
      const modeChanged = state.config.queryMode !== nextConfig.queryMode
      const reset = state.selection.mode !== nextConfig.selection.mode ||
        state.config.selection.rowKey !== nextConfig.selection.rowKey ||
        state.config.selection.scopeKey !== nextConfig.selection.scopeKey
      const keyChanged = state.config.selection.rowKey !== nextConfig.selection.rowKey
      if (reset) state.selection = createEmptySelection(nextConfig.selection.mode)
      state.config = nextConfig
      if (external.active()) {
        if (modeChanged || reset) external.reset()
        else external.reconcile()
        return
      }
      if (modeChanged) {
        external.reset()
        state.quickSearchQuery = ''
        state.filters = []
        state.sort = { columnKey: null, direction: null }
      }
      if (keyChanged) coordination.rebuildKeys()
      if (modeChanged || previousConfig.pagination.enabled !== nextConfig.pagination.enabled ||
        previousConfig.pagination.pageSize !== nextConfig.pagination.pageSize ||
        previousConfig.pagination.pageIndex !== nextConfig.pagination.pageIndex) {
        state.pagination = createPaginationState(
          nextConfig.pagination.enabled,
          nextConfig.pagination.pageSize,
          nextConfig.pagination.pageIndex,
          state.transformedData.length
        )
      }
      if (modeChanged) refreshData()
      else {
        // Configuration does not alter local transforms. Repaginate the cached
        // view and reconcile selection without sorting/filtering every row again.
        state.data = paginateData(state.transformedData, state.pagination)
        coordination.reconcile()
      }

    },
    getConfig() {
      return state.config
    },
    setData(data: unknown[], preservePage = false) {
      if (external.active()) return
      state.originalData = data ?? []
      coordination.rebuildKeys()
      if (!preservePage) resetPage()
      refreshData()
    },
    getRows() {
      return state.data
    },
    setQuickSearch(query: string) {
      if (external.active()) {
        const search = typeof query === 'string' ? query : ''
        if (search === state.quickSearchQuery) return
        external.intent({ search, pageIndex: 0 }, 'search'); return
      }
      state.quickSearchQuery = typeof query === 'string' ? query : ''
      resetPage()
      refreshData()
    },
    clearQuickSearch() {
      if (external.active()) { engine.setQuickSearch(''); return }
      state.quickSearchQuery = ''
      resetPage()
      refreshData()
    },
    getQuickSearch() {
      return state.quickSearchQuery
    },
    setFilter(filter: GridFilter) {
      if (external.active()) {
        const previous = state.filters.find(item => item.columnKey === filter.columnKey)
        if (previous && previous.operator === filter.operator && Object.is(previous.value, filter.value)) return
        external.intent({ filters: [...state.filters.filter(item => item.columnKey !== filter.columnKey), { ...filter }] as GridQuery['filters'], pageIndex: 0 }, 'filter'); return
      }
      state.filters = [
        ...state.filters.filter((item) => item.columnKey !== filter.columnKey),
        { ...filter }
      ]
      resetPage()
      refreshData()
    },
    clearFilter(columnKey?: string) {
      if (external.active()) {
        const filters = columnKey ? state.filters.filter(item => item.columnKey !== columnKey) : []
        if (filters.length === state.filters.length) return
        external.intent({ filters: filters as GridQuery['filters'], pageIndex: 0 }, 'filter'); return
      }
      state.filters = columnKey
        ? state.filters.filter((item) => item.columnKey !== columnKey)
        : []
      resetPage()
      refreshData()
    },
    getFilters() {
      return state.filters.slice()
    },
    setPage(pageIndex: number) {
      const nextPageIndex = Number.isFinite(pageIndex) ? Math.max(0, Math.floor(pageIndex)) : 0
      if (external.active()) {
        const pagination = state.pagination
        if (!Number.isSafeInteger(nextPageIndex) || nextPageIndex === pagination.pageIndex) return
        if (nextPageIndex > pagination.pageIndex && (pagination.totalKnown
          ? nextPageIndex >= pagination.pageCount
          : !pagination.hasMore || nextPageIndex > pagination.pageIndex + 1)) return
        external.intent({ pageIndex: nextPageIndex }, 'page'); return
      }
      state.pagination = {
        ...state.pagination,
        pageIndex: clampPageIndex(nextPageIndex, state.pagination.pageCount)
      }
      state.data = paginateData(state.transformedData, state.pagination)
      coordination.reconcile()
    },
    setPageSize(pageSize: number) {
      if (!Number.isFinite(pageSize) || pageSize <= 0) {
        return
      }

      if (external.active()) {
        const size = Math.max(1, Math.floor(pageSize))
        if (!Number.isSafeInteger(size) || size === state.pagination.pageSize) return
        external.intent({ pageSize: size, pageIndex: 0 }, 'page-size'); return
      }

      state.pagination = {
        ...state.pagination,
        pageSize: Math.max(1, Math.floor(pageSize)),
        pageIndex: 0
      }
      refreshData()
    },
    getPagination() {
      return { ...state.pagination }
    },
    getTotalRowCount() {
      return state.pagination.totalRows
    },
    sortBy(columnKey: string, direction: SortDirection) {
      if (external.active()) {
        if (state.sort.columnKey === columnKey && state.sort.direction === direction) return
        external.intent({ sort: { columnKey, direction }, pageIndex: 0 }, 'sort'); return
      }
      state.sort = { columnKey, direction }
      resetPage()
      refreshData()
    },
    clearSort() {
      if (external.active()) {
        if (state.sort.columnKey === null) return
        external.intent({ sort: { columnKey: null, direction: null }, pageIndex: 0 }, 'sort'); return
      }
      state.sort = { columnKey: null, direction: null }
      resetPage()
      refreshData()
    },
    getSort() {
      return state.sort
    },
    getRowCount() {
      return state.data.length
    },
    getSelectableRowCount: coordination.getSelectableRowCount,
    getVisibleRows(startIndex: number, endIndex: number) {
      return state.data.slice(startIndex, endIndex)
    },
    selectRow(rowIndex: number, intent: SelectionIntent = 'replace') {
      if (state.config.selection.rowKey !== undefined && !coordination.canSelect(rowIndex)) return
      const nextSelection = getNextRowSelection(
        state.selection,
        state.config.selection.mode,
        rowIndex,
        intent
      )

      if (nextSelection) {
        state.selection = nextSelection
        // Ranges can cross rows with missing or ambiguous keys.
        for (const index of state.selection.rowIndexes) {
          if (state.config.selection.rowKey !== undefined && !coordination.canSelect(index)) state.selection.rowIndexes.delete(index)
        }
        coordination.commit()
      }
    },
    selectRowByKey(key, intent = 'replace') {
      const index = coordination.indexForKey(key)
      if (index === undefined || !['row', 'multi-row'].includes(state.selection.mode)) return false
      engine.selectRow(index, intent)
      return true
    },
    getSelectionSnapshot: coordination.getSnapshot,
    onSelectionChange: coordination.subscribe,
    selectAllRows() {
      if (state.config.selection.mode !== 'multi-row') {
        return
      }

      const rowIndexes = new Set<number>()
      for (let rowIndex = 0; rowIndex < state.data.length; rowIndex += 1) {
        if (coordination.canSelect(rowIndex)) rowIndexes.add(rowIndex)
      }

      state.selection = {
        ...createEmptySelection('multi-row'),
        rowIndex: [...rowIndexes].at(-1) ?? null,
        anchorRowIndex: rowIndexes.values().next().value ?? null,
        rowIndexes
      }
      coordination.commit()
    },
    selectCell(rowIndex: number, columnKey: string) {
      if (state.config.selection.rowKey !== undefined && !coordination.canSelect(rowIndex)) return
      const nextSelection = getNextCellSelection(
        state.selection,
        state.config.selection.mode,
        rowIndex,
        columnKey
      )

      if (nextSelection) {
        state.selection = nextSelection
        coordination.commit()
      }
    },
    clearSelection() {
      state.selection = createEmptySelection(state.config.selection.mode)
      coordination.commit()
    },
    getSelection() {
      return { ...state.selection, rowIndexes: new Set(state.selection.rowIndexes), cells: new Set(state.selection.cells) }
    },
    isRowSelected(rowIndex: number) {
      return (
        (state.selection.mode === 'row' || state.selection.mode === 'multi-row') &&
        state.selection.rowIndexes.has(rowIndex)
      )
    },
    isCellSelected(rowIndex: number, columnKey: string) {
      return (
        (state.selection.mode === 'cell' || state.selection.mode === 'multi-cell') &&
        state.selection.cells.has(getCellKey(rowIndex, columnKey))
      )
    }
  }
  return engine
}
