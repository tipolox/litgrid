import { describe, expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

const rows = [{ id: 'property-a', name: 'Zulu' }, { id: 'property-b', name: 'Alpha' }, { id: 'property-c', name: 'Beta' }]
const config = { selection: { mode: 'multi-row' as const, rowKey: 'id', scopeKey: 'site-a' } }

function setup() {
  const engine = createGridEngine(config)
  engine.setData(rows)
  const changed = vi.fn()
  engine.onSelectionChange(changed)
  return { engine, changed }
}

describe('selection identity coordination', () => {
  it('notifies once per effective operation and returns detached frozen snapshots', () => {
    const { engine, changed } = setup()
    engine.selectRow(0)
    const first = changed.mock.calls[0][0]
    expect(first.rows).toEqual([{ rowIndex: 0, row: rows[0], key: 'property-a' }])
    expect(Object.isFrozen(first.rows[0])).toBe(true)
    expect(Object.isFrozen(first.rowIndexes)).toBe(true)
    engine.selectRow(0)
    engine.setData(rows)
    engine.setConfig(config)
    expect(changed).toHaveBeenCalledTimes(1)
    engine.selectRow(2, 'range')
    expect(changed).toHaveBeenCalledTimes(2)
    expect(first.rowIndexes).toEqual([0])
    engine.getSelection().rowIndexes.clear()
    expect(engine.getSelection().rowIndexes.size).toBe(3)
    engine.clearSelection()
    engine.clearSelection()
    expect(changed).toHaveBeenCalledTimes(3)
    const unsubscribe = engine.onSelectionChange(changed)
    unsubscribe()
    engine.selectRow(1)
    expect(changed).toHaveBeenCalledTimes(3)
  })

  it('preserves a key through sorting, clears filtered selection and does not resurrect it', () => {
    const { engine, changed } = setup()
    engine.selectRow(0)
    engine.sortBy('name', 'asc')
    expect(engine.getSelectionSnapshot().rows[0]).toMatchObject({ key: 'property-a', rowIndex: 2 })
    expect(changed).toHaveBeenCalledTimes(2)
    engine.setFilter({ columnKey: 'id', operator: 'equals', value: 'property-b' })
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    engine.clearFilter()
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey('property-a')).toBe(true)
    expect(engine.selectRowByKey('not-loaded-or-authorized')).toBe(false)
  })

  it('clears records leaving the displayed page and handles replacement objects and removal', () => {
    const engine = createGridEngine({ ...config, pagination: { enabled: true, pageSize: 2 } })
    engine.setData(rows)
    engine.selectRowByKey('property-a')
    engine.setPage(1)
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey('property-a')).toBe(false)
    engine.setPage(0)
    engine.selectRowByKey('property-b')
    const next = rows.map(row => ({ ...row }))
    const listener = vi.fn()
    engine.onSelectionChange(listener)
    engine.setData(next)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(engine.getSelectionSnapshot().rows[0].row).toBe(next[1])
    engine.setData([rows[0], rows[2]])
    expect(engine.getSelectionSnapshot().rows).toEqual([])
  })

  it('rejects keys duplicated outside the displayed page, including after a filter', () => {
    const engine = createGridEngine({ ...config, pagination: { enabled: true, pageSize: 1 } })
    engine.setData([rows[0], { ...rows[0], name: 'Hidden duplicate' }])
    expect(engine.selectRowByKey('property-a')).toBe(false)
    engine.setFilter({ columnKey: 'name', operator: 'equals', value: 'Zulu' })
    engine.selectRow(0)
    expect(engine.getSelectionSnapshot().rows).toEqual([])
  })

  it('does not deep-compare in-place edits and clears mutated identities after resubmission', () => {
    const { engine, changed } = setup()
    const data = rows.map(row => ({ ...row }))
    engine.setData(data)
    engine.selectRow(0)
    const prior = engine.getSelectionSnapshot()
    data[0].name = 'Updated'
    engine.setData(data)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(engine.getSelectionSnapshot()).toBe(prior)
    data[0].id = 'different-property'
    engine.setData(data)
    expect(changed).toHaveBeenCalledTimes(2)
    expect(prior.rows[0].key).toBe('property-a')
    expect(engine.getSelectionSnapshot().rows).toEqual([])
  })

  it('rejects duplicate/missing/nonfinite keys across the entire loaded dataset', () => {
    const { engine } = setup()
    engine.selectRowByKey('property-a')
    engine.setData([rows[0], { id: 'property-a' }, {}, { id: NaN }, { id: 7 }, { id: '7' }])
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey('property-a')).toBe(false)
    engine.selectAllRows()
    expect(engine.getSelectionSnapshot().rows.map(row => row.key)).toEqual([7, '7'])
    engine.clearSelection()
    engine.selectRow(4)
    engine.selectRow(5, 'range')
    expect(engine.getSelectionSnapshot().rowIndexes).toEqual([4, 5])
    engine.selectRow(4, 'range')
    expect(engine.getSelectionSnapshot().rowIndexes).toEqual([4])
  })

  it('clears on scope, key configuration, and mode changes even when record keys match', () => {
    const { engine, changed } = setup()
    engine.selectRowByKey('property-a')
    engine.setConfig({ selection: { ...config.selection, scopeKey: 'site-b' } })
    engine.setData([{ id: 'property-a', name: 'Other tenant' }])
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(changed).toHaveBeenCalledTimes(2)
    engine.selectRowByKey('property-a')
    engine.setConfig({ selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-b' } })
    expect(engine.getSelectionSnapshot()).toMatchObject({ mode: 'row', rows: [] })
    engine.selectRow(0)
    engine.setConfig({ selection: { mode: 'row', rowKey: 'name' } })
    expect(engine.getSelectionSnapshot().rows).toEqual([])
  })

  it('keeps legacy index APIs and prevents default indexes from activating another record', () => {
    const engine = createGridEngine({ selection: { mode: 'row' } })
    engine.selectRow(42) // Historical core index API allows indexes before loading data.
    expect(engine.getSelection().rowIndexes.has(42)).toBe(true)
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    engine.setData(rows)
    engine.selectRow(0)
    engine.setData(rows)
    expect(engine.isRowSelected(0)).toBe(true)
    engine.sortBy('name', 'asc')
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    engine.selectRow(0)
    engine.setData(rows.map(row => ({ ...row })))
    expect(engine.getSelectionSnapshot().rows).toEqual([])
  })

  it.each(['cell', 'multi-cell'] as const)('notifies for %s selection and clears displaced cell mappings', mode => {
    const engine = createGridEngine({ selection: { mode, rowKey: 'id' } })
    engine.setData(rows)
    const listener = vi.fn()
    engine.onSelectionChange(listener)
    engine.selectCell(0, 'name')
    expect(engine.getSelectionSnapshot().rows[0].key).toBe('property-a')
    engine.sortBy('name', 'asc')
    expect(engine.getSelectionSnapshot().cells).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('indexes keys at view changes rather than scanning the dataset on selection', () => {
    let reads = 0
    const data = Array.from({ length: 30_000 }, (_, index) => ({ get id() { reads++; return `uuid-${index}` } }))
    const engine = createGridEngine(config)
    engine.setData(data)
    reads = 0
    for (let i = 0; i < 100; i++) engine.selectRowByKey(`uuid-${i}`)
    expect(reads).toBeLessThan(500)
  })
})
