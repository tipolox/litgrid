import { expect, it } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

it('keeps local totals distinct from server totals and preserves same-source refresh pagination', () => {
  const grid = createGridEngine({ pagination: { enabled: true, pageSize: 20 } })
  const page = Array.from({ length: 20 }, (_, id) => ({ id, name: `Property ${19 - id}` }))
  grid.setData(page)
  expect(grid.getPagination()).toMatchObject({ totalRows: 20, pageCount: 1 })
  grid.sortBy('id', 'desc')
  expect(grid.getRows()[0]).toBe(page[19])
  grid.setFilter({ columnKey: 'id', operator: 'greaterThan', value: 18 })
  expect(grid.getRows()).toEqual([page[19]])
  grid.clearFilter()
  grid.setQuickSearch('Property 300')
  expect(grid.getRows()).toEqual([])
  grid.clearQuickSearch()
  grid.setPageSize(5)
  grid.setPage(2)
  expect(grid.getPagination().pageIndex).toBe(2)
  grid.setData(page)
  expect(grid.getPagination().pageIndex).toBe(2)
  grid.setData([...page])
  expect(grid.getPagination().pageIndex).toBe(0)
})
