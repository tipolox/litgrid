import { describe, expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'
import type { GridExternalState, GridQuery, GridQueryChangeDetail } from '../model/GridQuery.js'

const query: GridQuery = { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 20 }
const rows = (count = 20, start = 0) => Array.from({ length: count }, (_, i) => ({ id: i + start, amount: `${20 - i}.00`, name: `Property ${i + start}` }))
const initial = (overrides: Partial<GridExternalState> = {}): GridExternalState => ({ requestId: 1, query, rows: rows(), total: { kind: 'known', totalRows: 352 }, ...overrides })
function setup(overrides: Partial<GridExternalState> = {}) {
  const grid = createGridEngine({ queryMode: 'external', selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-a' } })
  grid.setExternalState(initial(overrides))
  return grid
}
function resolve(grid: ReturnType<typeof setup>, overrides: Partial<GridExternalState> = {}) {
  return grid.setExternalState({ ...initial(), ...grid.getQuery(), ...overrides })
}

describe('external queries', () => {
  it.each([0, 2, 17])('renders only the supplied page at index %i with 352 exact rows', pageIndex => {
    const data = rows(pageIndex === 17 ? 12 : 20, pageIndex * 20)
    const grid = setup({ query: { ...query, pageIndex }, rows: data })
    expect(grid.getRows()).toEqual(data)
    expect(grid.getPagination()).toEqual({ enabled: true, pageIndex, pageSize: 20, totalRows: 352, pageCount: 18, totalKnown: true, hasMore: pageIndex < 17 })
    grid.setData(rows(20, 100))
    expect(grid.getRows()).toEqual(data)
    expect(grid.getPagination().pageIndex).toBe(pageIndex)
  })

  it('does no local transform or second pagination, even for controlled active queries', () => {
    const data = rows()
    const grid = setup({ query: { ...query, pageIndex: 2, search: 'absent', filters: [{ columnKey: 'amount', operator: 'greaterThan', value: '9007199254740993.00000001' }], sort: { columnKey: 'amount', direction: 'asc' } }, rows: data })
    expect(grid.getRows()).toEqual(data)
    expect(grid.getQuickSearch()).toBe('absent')
    expect(grid.getFilters()[0].value).toBe('9007199254740993.00000001')
  })

  it.each(['search', 'filter', 'sort', 'page-size'] as const)('resets %s to first page and emits once after clearing selection', reason => {
    const grid = setup({ query: { ...query, pageIndex: 2 } })
    grid.selectRow(0)
    const order: string[] = []
    grid.onSelectionChange(() => order.push('selection'))
    const callback = vi.fn((event: GridQueryChangeDetail) => {
      order.push('query')
      expect(grid.getRows()).toEqual([])
      expect(grid.getSelectionSnapshot().rows).toEqual([])
      expect(grid.getExternalState()?.loading).toBe(true)
      expect(event.query.pageIndex).toBe(0)
    })
    grid.onQueryChange(callback)
    const action = () => {
      if (reason === 'search') grid.setQuickSearch('B')
      if (reason === 'filter') grid.setFilter({ columnKey: 'amount', operator: 'equals', value: '-9007199254740993.01' })
      if (reason === 'sort') grid.sortBy('amount', 'desc')
      if (reason === 'page-size') grid.setPageSize(50)
    }
    action(); action()
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0].reason).toBe(reason)
    expect(order).toEqual(['selection', 'query'])
    expect(grid.getQuery().requestId).toBe(2)
  })

  it('handles page requests, same-page no-ops and explicit same-page refresh', () => {
    const grid = setup()
    const listener = vi.fn()
    const unsubscribe = grid.onQueryChange(listener)
    grid.setPage(2)
    expect(grid.getPagination().pageIndex).toBe(2)
    expect(resolve(grid, { rows: rows(20, 40) })).toBe(true)
    expect(grid.getPagination().pageIndex).toBe(2)
    grid.setPage(2)
    grid.setPage(18)
    expect(listener).toHaveBeenCalledTimes(1)
    grid.refreshQuery()
    expect(listener.mock.calls[1][0]).toMatchObject({ reason: 'refresh', query: { pageIndex: 2 } })
    unsubscribe()
    grid.setQuickSearch('C')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('never invents totals for unknown pages and uses hasMore exclusively', () => {
    const grid = setup({ rows: rows(3), total: { kind: 'unknown', hasMore: true } })
    expect(grid.getTotalRowCount()).toBe(-1)
    expect(grid.getPagination()).toMatchObject({ totalRows: -1, pageCount: -1, totalKnown: false, hasMore: true })
    grid.setPage(4)
    expect(grid.getPagination().pageIndex).toBe(0)
    grid.setPage(1)
    grid.setPage(2) // pending previous page must not reuse its hasMore
    expect(grid.getPagination().pageIndex).toBe(1)
    resolve(grid, { rows: [], total: { kind: 'unknown', hasMore: false } })
    grid.setPage(2)
    expect(grid.getPagination().pageIndex).toBe(1)
    grid.setPage(0)
    expect(grid.getPagination().pageIndex).toBe(0)
  })

  it('accepts empty and out-of-range controlled results without silently changing query', () => {
    const grid = setup({ rows: [], total: { kind: 'known', totalRows: 0 } })
    expect(grid.getPagination()).toMatchObject({ pageCount: 0, totalRows: 0, pageIndex: 0 })
    grid.setExternalState(initial({ requestId: 2, query: { ...query, pageIndex: 9 }, rows: [], total: { kind: 'known', totalRows: 2 } }))
    expect(grid.getPagination()).toMatchObject({ pageCount: 1, totalRows: 2, pageIndex: 9 })
    grid.setPage(8)
    expect(grid.getPagination().pageIndex).toBe(8)
  })

  it('rejects late responses and settled replays; loading can precede one result', () => {
    const grid = setup()
    grid.setQuickSearch('A')
    const a = grid.getQuery()
    grid.setQuickSearch('B')
    const b = grid.getQuery()
    expect(resolve(grid, { ...a, rows: rows(1) })).toBe(false)
    expect(resolve(grid, { ...b, rows: rows(1), loading: true })).toBe(true)
    expect(grid.getRows()).toEqual([])
    expect(resolve(grid, { ...b, rows: rows(1, 80) })).toBe(true)
    expect(resolve(grid, { ...a, rows: rows(1) })).toBe(false)
    expect(resolve(grid, { ...b, rows: rows(1) })).toBe(false)
    expect(grid.getRows()).toEqual(rows(1, 80))
    grid.refreshQuery()
    expect(resolve(grid, { error: 'Server unavailable', rows: rows(1) })).toBe(true)
    expect(grid.getRows()).toEqual([])
    expect(resolve(grid)).toBe(false)
  })

  it('reconciles controlled props without echo and supports reentrant immediate results', () => {
    const grid = setup()
    const listener = vi.fn(() => { resolve(grid, { rows: rows(1) }) })
    grid.onQueryChange(listener)
    grid.setPage(1)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(grid.getRows()).toEqual(rows(1))
    const controlled = initial({ requestId: 99, query: { ...query, pageIndex: 4 } })
    expect(grid.setExternalState(controlled)).toBe(true)
    expect(grid.setExternalState(controlled)).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(grid.getPagination().pageIndex).toBe(4)
  })

  it('clears reused indexes and scope identities, preserves keyed same-page refresh references', () => {
    const grid = setup()
    grid.selectRowByKey(1)
    grid.setExternalState(initial({ requestId: 2, rows: rows(20) }))
    expect(grid.getSelectionSnapshot().rows.map(row => row.key)).toEqual([1])
    grid.setExternalState(initial({ requestId: 3, rows: rows(20, 100) }))
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    expect(grid.selectRowByKey(1)).toBe(false)
    grid.selectRowByKey(100)
    grid.setConfig({ queryMode: 'external', selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-b' } })
    expect(grid.getRows()).toEqual([])
    expect(grid.getSelectionSnapshot()).toMatchObject({ scopeKey: 'site-b', rows: [] })
    expect(grid.setExternalState(initial({ requestId: 3 }))).toBe(false)
    expect(resolve(grid)).toBe(true)
    expect(grid.getSelectionSnapshot().rows).toEqual([])
  })

  it('rejects invalid results atomically and freezes query containers', () => {
    const grid = setup()
    const before = grid.getRows()
    for (const invalid of [initial({ requestId: 2, rows: rows(21) }), initial({ requestId: 2, total: { kind: 'known', totalRows: -1 } }), initial({ requestId: 2, query: { ...query, pageIndex: -1 } }), initial({ requestId: 2, rows: rows(3), total: { kind: 'known', totalRows: 2 } })]) {
      expect(() => grid.setExternalState(invalid)).toThrow(TypeError)
      expect(grid.getRows()).toBe(before)
    }
    expect(() => grid.setFilter({ columnKey: 'amount', operator: 'equals', value: {} })).toThrow(TypeError)
    expect(grid.getRows()).toBe(before)
    expect(Object.isFrozen(grid.getQuery().query.filters)).toBe(true)
    expect(Object.isFrozen(grid.getQuery().query.sort)).toBe(true)
  })

  it('clear actions and repeated no-op intents do not churn requests', () => {
    const grid = setup()
    const listener = vi.fn()
    grid.onQueryChange(listener)
    grid.clearQuickSearch(); grid.clearSort(); grid.clearFilter(); grid.setPageSize(20)
    expect(listener).not.toHaveBeenCalled()
    grid.setQuickSearch('A'); grid.clearQuickSearch(); grid.clearQuickSearch()
    grid.setFilter({ columnKey: 'id', operator: 'equals', value: 1 }); grid.clearFilter('id'); grid.clearFilter('id')
    grid.sortBy('id', 'asc'); grid.clearSort(); grid.clearSort()
    expect(listener).toHaveBeenCalledTimes(6)
  })

  it('orders reentrant selection/query requests monotonically for every listener', () => {
    const grid = setup()
    const first: number[] = [], second: number[] = []
    grid.selectRow(0)
    grid.onSelectionChange(() => { grid.setQuickSearch('selection follow-up') })
    grid.onQueryChange(event => { first.push(event.requestId); if (event.requestId === 2) grid.sortBy('id', 'desc') })
    grid.onQueryChange(event => second.push(event.requestId))
    grid.setPage(1)
    expect(first).toEqual([2, 3, 4])
    expect(second).toEqual(first)
    expect(grid.getQuery().query).toMatchObject({ search: 'selection follow-up', sort: { columnKey: 'id', direction: 'desc' }, pageIndex: 0 })
  })
})
