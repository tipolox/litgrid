import { describe, expect, it, vi } from 'vitest'
import { createGridEngine } from './createGridEngine.js'

const config = { selection: { mode: 'multi-row' as const, rowKey: 'id', scopeKey: 'site-a' } }

describe('verified displayed-key index reuse', () => {
  it('checks each row getter once on an unchanged configuration or presentation update', () => {
    let reads = 0
    const rows = Array.from({ length: 5000 }, (_, id) => ({
      get id() { reads++; return id },
      name: 'Fictional ' + id
    }))
    const engine = createGridEngine(config)
    engine.setData(rows)

    reads = 0
    engine.setConfig(config)
    expect(reads).toBe(rows.length)
    expect(engine.getSelectableRowCount()).toBe(rows.length)

    reads = 0
    engine.setConfig({ ...config, rowHeader: { enabled: true, width: 64 } })
    expect(reads).toBe(rows.length)
    expect(engine.selectRowByKey(4999)).toBe(true)
    expect(engine.getSelectionSnapshot().rows[0].row).toBe(rows[4999])
  })

  it('rebuilds after in-place key changes without rereading a getter during fallback', () => {
    const ids = [0, 1, 2, 3]
    let reads = 0
    const rows = ids.map((_, index) => ({
      get id() { reads++; return ids[index] }
    }))
    const engine = createGridEngine(config)
    engine.setData(rows)
    ids[2] = 1

    reads = 0
    engine.setConfig(config)
    expect(reads).toBe(rows.length)
    // As before, config-only reconciliation uses the last displayed duplicate
    // until the source is resubmitted for global duplicate validation.
    expect(engine.getSelectableRowCount()).toBe(3)
    expect(engine.selectRowByKey(1)).toBe(true)
    expect(engine.getSelectionSnapshot().rows[0].row).toBe(rows[2])

    engine.clearSelection()
    ids[2] = 2
    reads = 0
    engine.setConfig(config)
    expect(reads).toBe(rows.length)
    expect(engine.getSelectableRowCount()).toBe(4)
    expect(engine.selectRowByKey(2)).toBe(true)
  })

  it('checks proxy-backed rows once and falls back on invalid keys without selecting them', () => {
    const ids: Array<number | undefined> = [0, 1, 2, 3]
    let reads = 0
    const rows = ids.map((_, index) => new Proxy({}, {
      get(_target, property) {
        if (property === 'id') {
          reads++
          return ids[index]
        }
        return undefined
      }
    }))
    const engine = createGridEngine(config)
    engine.setData(rows)
    ids[0] = undefined

    reads = 0
    engine.setConfig(config)
    expect(reads).toBe(rows.length)
    expect(engine.getSelectableRowCount()).toBe(3)
    expect(engine.selectRowByKey(0)).toBe(false)
    expect(engine.selectRowByKey(3)).toBe(true)
  })

  it('still recreates paginated arrays and reconciles selected records and notifications', () => {
    const engine = createGridEngine({ ...config, pagination: { enabled: true, pageSize: 2 } })
    const rows = Array.from({ length: 4 }, (_, id) => ({ id }))
    engine.setData(rows)
    const changed = vi.fn()
    engine.onSelectionChange(changed)
    engine.selectRowByKey(0)
    expect(changed).toHaveBeenCalledTimes(1)

    const page = engine.getRows()
    page[0] = { id: 991 }
    engine.setConfig({ ...config, pagination: { enabled: true, pageSize: 2 } })
    expect(engine.getRows()).not.toBe(page)
    expect(engine.getRows()[0]).toBe(rows[0])
    expect(engine.getSelectionSnapshot().rows[0].key).toBe(0)
    expect(changed).toHaveBeenCalledTimes(1)

    rows[0].id = 1
    engine.setConfig({ ...config, pagination: { enabled: true, pageSize: 2 } })
    expect(engine.getSelectionSnapshot().rows).toEqual([])
    expect(changed).toHaveBeenCalledTimes(2)
    engine.setData(rows)
    expect(engine.selectRowByKey(1)).toBe(false)
  })

  it('preserves mapped selection through filtered and sorted views, scope resets and off-page duplicates', () => {
    const engine = createGridEngine(config)
    const rows = [
      { id: 1, name: 'Z' }, { id: 2, name: 'A' },
      { id: 3, name: 'B' }, { id: 4, name: 'C' }
    ]
    engine.setData(rows)
    engine.sortBy('name', 'asc')
    engine.setFilter({ columnKey: 'id', operator: 'greaterThan', value: 1 })
    expect(engine.selectRowByKey(3)).toBe(true)
    const before = engine.getSelectionSnapshot()
    engine.setConfig({ ...config, quickSearch: { label: 'Find residents' } })
    expect(engine.getSelectionSnapshot()).toBe(before)
    expect(engine.getSelectionSnapshot().rows[0].key).toBe(3)
    engine.setConfig({ selection: { ...config.selection, scopeKey: 'site-b' } })
    expect(engine.getSelectionSnapshot().rows).toEqual([])

    const duplicate = createGridEngine({ ...config, pagination: { enabled: true, pageSize: 1 } })
    duplicate.setData([{ id: 1 }, { id: 1 }, { id: 2 }])
    duplicate.setConfig({ ...config, pagination: { enabled: true, pageSize: 1 } })
    expect(duplicate.selectRowByKey(1)).toBe(false)
    expect(duplicate.getSelectableRowCount()).toBe(0)
  })
})
