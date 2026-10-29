import { expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'
import * as transforms from '../features/transforms/applyDataTransforms.js'

it('retains pagination and cached transforms on presentation and selection-scope configuration changes', () => {
  const config = { selection: { mode: 'row' as const, rowKey: 'id', scopeKey: 'a' }, pagination: { enabled: true, pageSize: 25 } }
  const grid = createGridEngine(config)
  const rows = Array.from({ length: 200 }, (_, id) => ({ id, name: `Person ${id}` }))
  grid.setData(rows)
  grid.setFilter({ columnKey: 'name', operator: 'contains', value: 'Person' })
  grid.sortBy('id', 'desc')
  grid.setPage(2)
  grid.selectRow(1)
  const transform = vi.spyOn(transforms, 'applyDataTransforms')
  try {
    grid.setConfig({ ...config, quickSearch: { label: 'Find people' } })
    expect(grid.getPagination().pageIndex).toBe(2)
    expect(grid.getSelectionSnapshot().rows[0].key).toBe(148)
    grid.setConfig({ ...config, selection: { ...config.selection, scopeKey: 'b' } })
    expect(grid.getPagination().pageIndex).toBe(2)
    expect(grid.getSelectionSnapshot()).toMatchObject({ scopeKey: 'b', rows: [] })
    expect(grid.getFilters()).toHaveLength(1)
    expect(grid.getSort()).toEqual({ columnKey: 'id', direction: 'desc' })
    expect(transform).not.toHaveBeenCalled()
    grid.setConfig({ ...config, pagination: { enabled: true, pageSize: 50, pageIndex: 1 } })
    expect(grid.getPagination()).toMatchObject({ pageIndex: 1, pageSize: 50 })
    expect(grid.getRows()[0]).toMatchObject({ id: 149 })
    rows.splice(30)
    grid.setData(rows, true)
    expect(grid.getPagination()).toMatchObject({ pageIndex: 0, totalRows: 30, pageCount: 1 })
    expect(grid.getRows()[0]).toMatchObject({ id: 29 })
    expect(transform).toHaveBeenCalledTimes(1)
  } finally { vi.restoreAllMocks() }
})
