import { describe, expect, it } from 'vitest'
import { createGridEngine } from './createGridEngine'

describe('createGridEngine', () => {
  it('applies sorting through the derived data pipeline', () => {
    const engine = createGridEngine()
    const data = [
      { name: 'Bravo' },
      { name: 'alpha' },
      { name: 'Charlie' }
    ]

    engine.setData(data)
    engine.sortBy('name', 'asc')

    expect(engine.getRows()).toEqual([
      { name: 'alpha' },
      { name: 'Bravo' },
      { name: 'Charlie' }
    ])

    engine.clearSort()

    expect(engine.getRows()).toEqual(data)
  })

  it('filters rows using column filters without mutating the source data', () => {
    const engine = createGridEngine()
    const data = [
      { name: 'Ada', age: 37, team: 'Core' },
      { name: 'Grace', age: 28, team: 'Core' },
      { name: 'Linus', age: 55, team: 'Platform' },
      { name: '', age: 41, team: 'Platform' }
    ]

    engine.setData(data)
    engine.setFilter({ columnKey: 'team', operator: 'equals', value: 'core' })
    engine.setFilter({ columnKey: 'age', operator: 'greaterThan', value: '30' })

    expect(engine.getRows()).toEqual([{ name: 'Ada', age: 37, team: 'Core' }])
    expect(data).toHaveLength(4)
    expect(engine.getFilters()).toEqual([
      { columnKey: 'team', operator: 'equals', value: 'core' },
      { columnKey: 'age', operator: 'greaterThan', value: '30' }
    ])

    engine.clearFilter('age')
    expect(engine.getRows()).toEqual([
      { name: 'Ada', age: 37, team: 'Core' },
      { name: 'Grace', age: 28, team: 'Core' }
    ])

    engine.clearFilter()
    expect(engine.getRows()).toEqual(data)
  })

  it('quick-searches primitive row values before column filters, sorting, and pagination', () => {
    const engine = createGridEngine({ pagination: { enabled: true, pageSize: 1 } })
    engine.setData([
      { name: 'Ada', team: 'Core', active: true },
      { name: 'Grace', team: 'Core', active: false },
      { name: 'Linus', team: 'Platform', active: true },
      'Core utilities'
    ])
    engine.setPage(1)

    engine.setQuickSearch(' core ')
    expect(engine.getQuickSearch()).toBe(' core ')
    expect(engine.getPagination()).toMatchObject({ pageIndex: 0, totalRows: 3, pageCount: 3 })

    engine.setFilter({ columnKey: 'active', operator: 'equals', value: true })
    engine.sortBy('name', 'asc')
    expect(engine.getRows()).toEqual([{ name: 'Ada', team: 'Core', active: true }])

    engine.clearQuickSearch()
    expect(engine.getQuickSearch()).toBe('')
    expect(engine.getTotalRowCount()).toBe(2)
  })

  it('treats a blank quick-search query as inactive without mutating source data', () => {
    const engine = createGridEngine()
    const data = [{ name: 'Ada' }, { name: 'Grace' }]
    engine.setData(data)

    engine.setQuickSearch('   ')

    expect(engine.getRows()).toEqual(data)
    expect(data).toHaveLength(2)
  })

  it('supports text, empty-value, and comparison filter operators before sorting', () => {
    const engine = createGridEngine()
    engine.setData([
      { name: 'Ada Lovelace', age: 37 },
      { name: 'Grace Hopper', age: 28 },
      { name: '', age: 41 },
      { name: null, age: 55 }
    ])

    engine.setFilter({ columnKey: 'name', operator: 'startsWith', value: 'grace' })
    expect(engine.getRows()).toEqual([{ name: 'Grace Hopper', age: 28 }])

    engine.setFilter({ columnKey: 'name', operator: 'isEmpty' })
    expect(engine.getRows()).toEqual([
      { name: '', age: 41 },
      { name: null, age: 55 }
    ])

    engine.setFilter({ columnKey: 'age', operator: 'lessThanOrEqual', value: 41 })
    engine.sortBy('age', 'desc')
    expect(engine.getRows()).toEqual([{ name: '', age: 41 }])

    engine.setFilter({ columnKey: 'name', operator: 'isNotEmpty' })
    engine.setFilter({ columnKey: 'name', operator: 'endsWith', value: 'hopper' })
    expect(engine.getRows()).toEqual([{ name: 'Grace Hopper', age: 28 }])
  })

  it('paginates filtered and sorted rows while retaining the transformed total', () => {
    const engine = createGridEngine({ pagination: { enabled: true, pageSize: 2 } })
    engine.setData([
      { name: 'Delta', team: 'Core' },
      { name: 'Bravo', team: 'Core' },
      { name: 'Alpha', team: 'Core' },
      { name: 'Charlie', team: 'Platform' }
    ])
    engine.setFilter({ columnKey: 'team', operator: 'equals', value: 'core' })
    engine.sortBy('name', 'asc')

    expect(engine.getRows()).toEqual([
      { name: 'Alpha', team: 'Core' },
      { name: 'Bravo', team: 'Core' }
    ])
    expect(engine.getTotalRowCount()).toBe(3)
    expect(engine.getPagination()).toMatchObject({
      enabled: true,
      pageIndex: 0,
      pageSize: 2,
      totalRows: 3,
      pageCount: 2
    })

    engine.setPage(1)
    expect(engine.getRows()).toEqual([{ name: 'Delta', team: 'Core' }])
  })

  it('clamps pages and resets to the first page when transformed data changes', () => {
    const engine = createGridEngine({ pagination: { enabled: true, pageSize: 2 } })
    engine.setData([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }])
    engine.setPage(99)

    expect(engine.getPagination().pageIndex).toBe(2)
    engine.setPageSize(3)
    expect(engine.getPagination().pageIndex).toBe(0)
    expect(engine.getRows()).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])

    engine.setPage(1)
    engine.setFilter({ columnKey: 'id', operator: 'lessThanOrEqual', value: 2 })
    expect(engine.getPagination()).toMatchObject({ pageIndex: 0, totalRows: 2, pageCount: 1 })
    expect(engine.getRows()).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('replaces the selected row in single-row mode regardless of selection intent', () => {
    const engine = createGridEngine({ selection: { mode: 'row' } })

    engine.selectRow(1)
    engine.selectRow(3, 'toggle')
    expect(engine.getSelection()).toMatchObject({
      mode: 'row',
      rowIndex: 3,
      anchorRowIndex: 3,
      rowIndexes: new Set([3])
    })
    expect(engine.isRowSelected(1)).toBe(false)
    expect(engine.isRowSelected(3)).toBe(true)

    engine.selectRow(2, 'range')
    expect(engine.getSelection().rowIndexes).toEqual(new Set([2]))
  })

  it('supports multi-row selection intents', () => {
    const engine = createGridEngine({ selection: { mode: 'multi-row' } })

    engine.selectRow(2)
    engine.selectRow(4, 'range')
    engine.selectRow(3, 'toggle')

    expect(engine.getSelection().rowIndexes).toEqual(new Set([2, 4]))
  })

  it('replaces a multi-row selection with a single row on a plain click', () => {
    const engine = createGridEngine({ selection: { mode: 'multi-row' } })

    engine.selectRow(1)
    engine.selectRow(3, 'toggle')
    engine.selectRow(5, 'toggle')
    expect(engine.getSelection().rowIndexes).toEqual(new Set([1, 3, 5]))

    engine.selectRow(2)

    expect(engine.getSelection()).toMatchObject({
      rowIndex: 2,
      anchorRowIndex: 2,
      rowIndexes: new Set([2])
    })
  })

  it('supports a realistic ctrl-click then shift-click multi-row sequence', () => {
    const engine = createGridEngine({ selection: { mode: 'multi-row' } })

    // Plain click selects row 1 and anchors the selection there.
    engine.selectRow(1)
    // Ctrl-click toggles row 4 into the selection without losing row 1.
    engine.selectRow(4, 'toggle')
    expect(engine.getSelection().rowIndexes).toEqual(new Set([1, 4]))

    // Shift-click extends a contiguous range from the last anchor (row 4).
    engine.selectRow(6, 'range')
    expect(engine.getSelection().rowIndexes).toEqual(new Set([4, 5, 6]))

    // Ctrl-click removes a row from the current range selection.
    engine.selectRow(5, 'toggle')
    expect(engine.getSelection().rowIndexes).toEqual(new Set([4, 6]))
  })

  it('clears single-row selection when the selection mode changes', () => {
    const engine = createGridEngine({ selection: { mode: 'row' } })
    engine.selectRow(1)

    engine.setConfig({ selection: { mode: 'none' } })

    expect(engine.getSelection()).toMatchObject({
      mode: 'none',
      rowIndex: null,
      anchorRowIndex: null,
      rowIndexes: new Set()
    })
  })

  it('supports cell and multi-cell selection', () => {
    const cellEngine = createGridEngine({ selection: { mode: 'cell' } })
    cellEngine.selectCell(1, 'name')

    expect(cellEngine.isCellSelected(1, 'name')).toBe(true)

    const multiCellEngine = createGridEngine({ selection: { mode: 'multi-cell' } })
    multiCellEngine.selectCell(1, 'name')
    multiCellEngine.selectCell(2, 'status')
    multiCellEngine.selectCell(1, 'name')

    expect(multiCellEngine.isCellSelected(1, 'name')).toBe(false)
    expect(multiCellEngine.isCellSelected(2, 'status')).toBe(true)
  })

  it('selects all rows in the current displayed page only for multi-row selection', () => {
    const engine = createGridEngine({
      selection: { mode: 'multi-row' },
      pagination: { enabled: true, pageSize: 2 }
    })
    engine.setData([{ id: 1 }, { id: 2 }, { id: 3 }])

    engine.selectAllRows()
    expect(engine.getSelection().rowIndexes).toEqual(new Set([0, 1]))

    const rowEngine = createGridEngine({ selection: { mode: 'row' } })
    rowEngine.setData([{ id: 1 }])
    rowEngine.selectAllRows()
    expect(rowEngine.getSelection().rowIndexes).toEqual(new Set())
  })

  it('ignores unsupported selection operations', () => {
    const engine = createGridEngine({ selection: { mode: 'none' } })
    engine.selectRow(1)
    engine.selectCell(1, 'name')

    expect(engine.getSelection().rowIndexes).toEqual(new Set())
    expect(engine.getSelection().cells).toEqual(new Set())
  })

  it('replaces a column filter and safely clears an unknown filter', () => {
    const engine = createGridEngine()
    engine.setData([
      { name: 'Ada', team: 'Core' },
      { name: 'Grace', team: 'Platform' }
    ])

    engine.setFilter({ columnKey: 'team', operator: 'equals', value: 'core' })
    engine.setFilter({ columnKey: 'team', operator: 'equals', value: 'platform' })
    engine.clearFilter('missing')

    expect(engine.getFilters()).toEqual([
      { columnKey: 'team', operator: 'equals', value: 'platform' }
    ])
    expect(engine.getRows()).toEqual([{ name: 'Grace', team: 'Platform' }])
  })

  it('keeps empty pagination state valid and ignores invalid page sizes', () => {
    const engine = createGridEngine({ pagination: { enabled: true, pageSize: 2 } })

    engine.setPage(4)
    engine.setPageSize(0)
    engine.setPageSize(Number.NaN)

    expect(engine.getRows()).toEqual([])
    expect(engine.getPagination()).toMatchObject({
      pageIndex: 0,
      pageSize: 2,
      totalRows: 0,
      pageCount: 0
    })
  })

  it('resets selection when switching between cell selection modes', () => {
    const engine = createGridEngine({ selection: { mode: 'multi-cell' } })
    engine.selectCell(1, 'name')
    engine.selectCell(2, 'status')

    engine.setConfig({ selection: { mode: 'cell' } })

    expect(engine.getSelection()).toMatchObject({
      mode: 'cell',
      rowIndex: null,
      anchorRowIndex: null,
      rowIndexes: new Set(),
      cells: new Set()
    })
  })
})
