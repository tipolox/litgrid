import type { GridState } from '../../model/GridState.js'
import type { GridExternalState, GridQuery, GridQueryChangeDetail, GridQueryReason } from '../../model/GridQuery.js'
import { createEmptySelection } from '../selection/selection.js'

const operators = new Set(['contains', 'equals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual'])
const integer = (value: number, min = 0): boolean => Number.isSafeInteger(value) && value >= min

function copyQuery(query: GridQuery): GridQuery {
  if (!query || typeof query.search !== 'string' || !integer(query.pageIndex) || !integer(query.pageSize, 1) ||
      !Array.isArray(query.filters) || !query.sort ||
      !(query.sort.columnKey === null && query.sort.direction === null ||
        typeof query.sort.columnKey === 'string' && ['asc', 'desc'].includes(query.sort.direction!))) {
    throw new TypeError('Invalid external query')
  }
  const keys = new Set<string>()
  const filters = query.filters.map(filter => {
    if (!filter || typeof filter.columnKey !== 'string' || keys.has(filter.columnKey) || !operators.has(filter.operator) ||
        !(filter.value == null || ['string', 'boolean'].includes(typeof filter.value) || typeof filter.value === 'number' && Number.isFinite(filter.value))) {
      throw new TypeError('External filters require unique columns and finite JSON scalar values')
    }
    keys.add(filter.columnKey)
    return Object.freeze({ columnKey: filter.columnKey, operator: filter.operator, ...(filter.value !== undefined ? { value: filter.value } : {}) })
  })
  return Object.freeze({ search: query.search, filters: Object.freeze(filters), sort: Object.freeze({ ...query.sort }), pageIndex: query.pageIndex, pageSize: query.pageSize })
}

const equalQuery = (a: GridQuery, b: GridQuery) => a.search === b.search && a.pageIndex === b.pageIndex && a.pageSize === b.pageSize &&
  a.sort.columnKey === b.sort.columnKey && a.sort.direction === b.sort.direction && a.filters.length === b.filters.length &&
  a.filters.every((filter, i) => filter.columnKey === b.filters[i].columnKey && filter.operator === b.filters[i].operator && Object.is(filter.value, b.filters[i].value))

export function createExternalQuery(state: GridState, replaceRows: (rows: unknown[]) => void) {
  let requestId = 0
  let query = copyQuery({ search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: state.config.pagination.pageIndex, pageSize: state.config.pagination.pageSize })
  let result: GridExternalState | null = null
  let terminal = false
  let used = false
  let lastInput: GridExternalState | null = null
  let applying = false
  let notifying = false
  const queuedIntents: Array<() => void> = []
  const listeners = new Set<(detail: GridQueryChangeDetail) => void>()

  function advance() {
    if (requestId === Number.MAX_SAFE_INTEGER) throw new RangeError('External request identity exhausted; remount the grid')
    requestId += 1
  }

  function apply() {
    state.quickSearchQuery = query.search
    state.filters = query.filters.map(filter => ({ ...filter }))
    state.sort = { ...query.sort }
    const total = result?.total ?? { kind: 'unknown', hasMore: false }
    const known = total.kind === 'known'
    const totalRows = known ? total.totalRows : -1
    const pageCount = known ? Math.ceil(totalRows / query.pageSize) : -1
    state.pagination = {
      enabled: true, pageIndex: query.pageIndex, pageSize: query.pageSize,
      totalRows, pageCount, totalKnown: known,
      hasMore: known ? query.pageIndex + 1 < pageCount : total.hasMore
    }
    applying = true
    try { replaceRows(result && !result.loading && !result.error ? [...result.rows] : []) }
    finally { applying = false }
  }

  function flush() {
    while (!applying && !notifying && queuedIntents.length) queuedIntents.shift()!()
  }

  function intent(changes: Partial<GridQuery>, reason: GridQueryReason) {
    if (applying || notifying) { queuedIntents.push(() => intent(changes, reason)); return }
    const next = copyQuery({ ...query, ...changes })
    if (reason !== 'refresh' && equalQuery(query, next)) return
    advance()
    used = true
    terminal = false
    query = next
    const total = (reason === 'page' || reason === 'refresh' || reason === 'page-size') && result?.total.kind === 'known'
      ? result.total : { kind: 'unknown' as const, hasMore: false }
    result = Object.freeze({ requestId, query, rows: Object.freeze([]), total, loading: true, error: null })
    const detail = Object.freeze({ requestId, query, reason })
    apply()
    notifying = true
    try { for (const listener of [...listeners]) listener(detail) }
    finally { notifying = false; flush() }
  }

  return {
    active: () => state.config.queryMode === 'external',
    getQuery: () => Object.freeze({ requestId, query }),
    getState: () => result,
    subscribe(listener: (detail: GridQueryChangeDetail) => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    reset() {
      if (used) advance()
      used = true
      terminal = false
      query = copyQuery({ search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: state.config.pagination.pageIndex, pageSize: state.config.pagination.pageSize })
      result = null
      lastInput = null
      apply()
      flush()
    },
    reconcile: apply,
    commit(input: GridExternalState): boolean {
      if (state.config.queryMode !== 'external') return false
      // Selection notifications run inside an atomic commit. A query callback
      // runs after it, and may synchronously commit its matching response.
      if (applying) return false
      if (input === lastInput) return false
      if (!input || !integer(input.requestId)) throw new TypeError('Invalid external requestId')
      if (input.requestId < requestId) return false
      const next = copyQuery(input.query)
      if (input.requestId === requestId && (!equalQuery(query, next) || terminal)) return false
      if (!Array.isArray(input.rows) || input.rows.length > next.pageSize ||
          input.loading !== undefined && typeof input.loading !== 'boolean' ||
          input.error != null && typeof input.error !== 'string' ||
          !input.total || !['known', 'unknown'].includes(input.total.kind) ||
          input.total.kind === 'known' && !integer(input.total.totalRows) ||
          input.total.kind === 'unknown' && typeof input.total.hasMore !== 'boolean') throw new TypeError('Invalid external result')
      if (input.total.kind === 'known' && !input.loading && !input.error &&
          input.rows.length > Math.max(0, input.total.totalRows - next.pageIndex * next.pageSize)) throw new TypeError('External rows contradict the exact total')
      const changed = !equalQuery(query, next)
      if (changed) state.selection = createEmptySelection(state.config.selection.mode)
      used = true
      lastInput = input
      requestId = input.requestId
      query = next
      terminal = !input.loading
      result = Object.freeze({ requestId, query, rows: Object.freeze([...input.rows]), total: Object.freeze({ ...input.total }), loading: !!input.loading, error: input.error ?? null })
      apply()
      flush()
      return true
    },
    intent
  }
}
