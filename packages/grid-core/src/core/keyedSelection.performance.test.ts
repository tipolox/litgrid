import { describe, expect, it } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

const config = { selection: { mode: 'multi-row' as const, rowKey: 'id', scopeKey: 'a' } }

describe('key index validation and reuse', () => {
  it.each([30_000, 100_000])('validates %i identities once per sync and never on first interaction', count => {
    let reads = 0
    const rows = Array.from({ length: count }, (_, id) => ({ get id() { reads++; return id } }))
    const engine = createGridEngine(config)
    engine.setData(rows)
    expect(reads).toBe(count)
    engine.setData(rows)
    expect(reads).toBe(count * 2)
    // Replacement objects with unchanged identities can reuse the index, but
    // snapshots must expose the replacement record and notify its listeners.
    engine.selectRowByKey(count - 1)
    reads = 0
    engine.selectRowByKey(0)
    expect(reads).toBeLessThan(10)
    const replacement = rows.map(row => ({ id: row.id }))
    engine.setData(replacement)
    expect(engine.getSelectionSnapshot().rows[0].row).toBe(replacement[0])
    expect(engine.getSelectableRowCount()).toBe(count)
  })

  it('revalidates same-reference changes, duplicates (including third occurrences), missing and invalid keys', () => {
    const rows: Array<{ id?: unknown }> = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]
    const engine = createGridEngine(config)
    engine.setData(rows)
    engine.selectRowByKey(1)
    rows[1].id = 0
    rows[2].id = 0
    delete rows[3].id
    engine.setData(rows)
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey(0)).toBe(false)
    expect(engine.getSelectableRowCount()).toBe(0)
    rows.push({ id: NaN }, { id: Infinity }, { id: {} }, { id: false }, { id: null }, { id: '0' }, { id: 4 })
    engine.setData(rows)
    engine.selectAllRows()
    expect(engine.getSelectionSnapshot().rows.map(row => row.key)).toEqual(['0', 4])
    // A removed duplicate makes the surviving identity usable again.
    rows.splice(0, 2)
    engine.setData(rows)
    expect(engine.selectRowByKey(0)).toBe(true)
    rows.reverse()
    engine.setData(rows)
    expect(engine.getSelectionSnapshot().rows[0].row).toBe(rows.at(-1))
    expect(engine.getSelectionSnapshot().rows[0].key).toBe(0)
    rows.length = 0
    engine.setData(rows)
    expect(engine.getSelectableRowCount()).toBe(0)
  })

  it('does not reuse original positions after sorting, filtering, paging or a rowKey/scope switch', () => {
    const rows = [{ id: 1, other: 'x', name: 'c' }, { id: 2, other: 'y', name: 'a' }, { id: 3, other: 'z', name: 'b' }]
    const engine = createGridEngine(config)
    engine.setData(rows)
    engine.selectRowByKey(1)
    engine.sortBy('name', 'asc')
    engine.setData(rows)
    expect(engine.getSelectionSnapshot().rows[0].rowIndex).toBe(2)
    engine.setFilter({ columnKey: 'id', operator: 'greaterThan', value: 1 })
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey(1)).toBe(false)
    engine.clearFilter()
    engine.setConfig({ ...config, pagination: { enabled: true, pageSize: 1 } })
    expect(engine.selectRowByKey(2)).toBe(true)
    engine.setPage(1)
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey(3)).toBe(true)
    engine.setConfig({ selection: { mode: 'multi-row', rowKey: 'other', scopeKey: 'a' } })
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(engine.selectRowByKey('x')).toBe(true)
    engine.setConfig({ selection: { mode: 'multi-row', rowKey: 'other', scopeKey: 'b' } })
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    engine.setData([{ id: 1, other: 'x', name: 'different scope' }])
    expect(engine.getSelectionSnapshot().rows).toEqual([])
  })

  it('keeps duplicate rejection global when the duplicate is filtered or off-page', () => {
    const engine = createGridEngine({ ...config, pagination: { enabled: true, pageSize: 1 } })
    engine.setData([{ id: 1, name: 'a' }, { id: 1, name: 'b' }, { id: 2, name: 'c' }])
    expect(engine.selectRowByKey(1)).toBe(false)
    engine.setFilter({ columnKey: 'name', operator: 'equals', value: 'a' })
    expect(engine.selectRowByKey(1)).toBe(false)
    expect(engine.getSelectableRowCount()).toBe(0)
  })

  it('keeps no-op transformed arrays detached from caller data', () => {
    const rows = [{ id: 1 }]
    const engine = createGridEngine(config)
    engine.setData(rows)
    expect(engine.getRows()).not.toBe(rows)
    engine.getRows().push({ id: 2 })
    expect(rows).toHaveLength(1)
    engine.setData(rows)
    expect(engine.getRows()).toHaveLength(1)
  })

  it('bounds keyed external validation to loaded rows regardless of declared total', () => {
    let reads = 0
    const rows = Array.from({ length: 20 }, (_, id) => ({ get id() { reads++; return id } }))
    const engine = createGridEngine({ ...config, queryMode: 'external' })
    engine.setExternalState({ requestId: 1, query: engine.getQuery().query, rows, total: { kind: 'known', totalRows: 1_000_000_000 } })
    expect(reads).toBe(20)
    expect(engine.getSelectableRowCount()).toBe(20)
    reads = 0
    expect(engine.selectRowByKey(19)).toBe(true)
    expect(reads).toBeLessThan(10)
  })
})
