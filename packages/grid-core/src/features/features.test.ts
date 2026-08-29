import { describe, expect, it } from 'vitest'
import { applyFilterData } from './filtering/filtering'
import { paginateData, createPaginationState, getPageCount } from './pagination/pagination'
import { applyQuickSearch } from './quick-search/quickSearch'
import { createEmptySelection, getNextCellSelection, getNextRowSelection } from './selection/selection'
import { applySortData } from './sorting/sorting'

describe('Core feature units', () => {
  it('applies every column filter as an AND condition without mutating data', () => {
    const rows = [
      { name: 'Alpha', score: 10, note: '' },
      { name: 'Alpine', score: 20, note: 'ready' },
      { name: 'Beta', score: 30, note: null }
    ]

    expect(applyFilterData(rows, [
      { columnKey: 'name', operator: 'startsWith', value: 'al' },
      { columnKey: 'name', operator: 'endsWith', value: 'a' },
      { columnKey: 'score', operator: 'greaterThanOrEqual', value: '10' },
      { columnKey: 'score', operator: 'lessThan', value: 20 },
      { columnKey: 'note', operator: 'isEmpty' }
    ])).toEqual([rows[0]])
    expect(applyFilterData(rows, [{ columnKey: 'note', operator: 'isNotEmpty' }])).toEqual([rows[1]])
    expect(rows).toHaveLength(3)
  })

  it('sorts object and primitive rows without changing the source array', () => {
    const rows = [{ value: 'Bravo' }, { value: 'alpha' }, { value: '10' }]
    expect(applySortData(rows, { columnKey: 'value', direction: 'asc' }))
      .toEqual([{ value: '10' }, { value: 'alpha' }, { value: 'Bravo' }])
    expect(rows.map((row) => row.value)).toEqual(['Bravo', 'alpha', '10'])
    expect(applySortData([3, 1, 2], { columnKey: 'ignored', direction: 'desc' })).toEqual([3, 2, 1])
  })

  it('searches supported primitive values and excludes nested object values', () => {
    const rows = [
      { name: 'Ada', active: true, details: { team: 'Platform' } },
      { name: 'Grace', active: false, count: 42 },
      'ADA LOVELACE'
    ]

    expect(applyQuickSearch(rows, ' ada ')).toEqual([rows[0], rows[2]])
    expect(applyQuickSearch(rows, 'platform')).toEqual([])
    expect(applyQuickSearch(rows, '42')).toEqual([rows[1]])
  })

  it('creates and slices pagination state at valid boundaries', () => {
    expect(getPageCount(21, 10)).toBe(3)
    expect(createPaginationState(true, 10, 99, 21)).toMatchObject({ pageIndex: 2, pageCount: 3 })
    expect(paginateData([0, 1, 2, 3, 4], createPaginationState(true, 2, 1, 5))).toEqual([2, 3])
    const rows = [0, 1]
    expect(paginateData(rows, createPaginationState(false, 2, 0, 2))).toBe(rows)
  })

  it('maintains selection anchors, toggles cells, and rejects incompatible modes', () => {
    const multiRow = createEmptySelection('multi-row')
    const toggled = getNextRowSelection(multiRow, 'multi-row', 2, 'toggle')!
    const ranged = getNextRowSelection(toggled, 'multi-row', 4, 'range')!
    expect([...ranged.rowIndexes]).toEqual([2, 3, 4])

    const multiCell = createEmptySelection('multi-cell')
    const selected = getNextCellSelection(multiCell, 'multi-cell', 1, 'name')!
    const deselected = getNextCellSelection(selected, 'multi-cell', 1, 'name')!
    expect(deselected.cells.size).toBe(0)
    expect(getNextCellSelection(multiRow, 'row', 1, 'name')).toBeNull()
  })
})
