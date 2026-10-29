import { expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

it('keeps an external NaN scope stable across presentation configuration changes', () => {
  const config = { queryMode: 'external' as const, selection: { mode: 'row' as const, rowKey: 'id', scopeKey: Number.NaN } }
  const grid = createGridEngine(config)
  grid.setExternalState({ requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 50 }, rows: [{ id: 1 }], total: { kind: 'known', totalRows: 1 } })
  grid.selectRowByKey(1)
  const query = grid.getQuery()
  const change = vi.fn()
  grid.onSelectionChange(change)
  grid.setConfig({ ...config, quickSearch: { label: 'Find people' } })
  expect(grid.getQuery()).toEqual(query)
  expect(grid.getSelectionSnapshot().rows[0].key).toBe(1)
  expect(change).not.toHaveBeenCalled()
})

it('does not emit a selection change for an unchanged local NaN scope', () => {
  const grid = createGridEngine({ selection: { mode: 'row', rowKey: 'id', scopeKey: Number.NaN } })
  const rows = [{ id: 1 }]
  grid.setData(rows)
  grid.selectRowByKey(1)
  const change = vi.fn()
  grid.onSelectionChange(change)
  grid.setData(rows)
  expect(change).not.toHaveBeenCalled()
  expect(grid.getSelectionSnapshot().rows[0].key).toBe(1)
})
