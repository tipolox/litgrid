import { describe, expect, it } from 'vitest'
import { parseColumnState, resolveColumnState } from '../columnState/columnState'
import { normalizeColumnWidth, resolveColumnWidth } from './columnSizing'
import { normalizeRowHeight } from './rowSizing'

describe('Web sizing and column-state units', () => {
  it('normalizes minimum dimensions and resolves configured column widths', () => {
    expect(normalizeColumnWidth(20)).toBe(64)
    expect(normalizeRowHeight(10)).toBe(28)
    expect(resolveColumnWidth({ key: 'default' }, undefined)).toBe(160)
    expect(resolveColumnWidth({ key: 'px', width: '120px' }, undefined)).toBe(120)
    expect(resolveColumnWidth({ key: 'configured', width: 140 }, 90)).toBe(90)
  })

  it('parses only valid persisted column state', () => {
    expect(parseColumnState('{"version":1,"columns":[{"key":"name","visible":true}]}'))
      .toMatchObject({ version: 1 })
    expect(parseColumnState('{"version":2,"columns":[]}')).toBeNull()
    expect(parseColumnState('{"version":1,"columns":[{"key":"name","visible":"true"}]}')).toBeNull()
    expect(parseColumnState('{"version":1,"columns":[{"key":1,"visible":true}]}')).toBeNull()
    expect(parseColumnState('{not json')).toBeNull()
  })

  it('reconciles saved state with current definitions and ignores duplicate or invalid entries', () => {
    const columns = [{ key: 'name' }, { key: 'status', hidden: true }, { key: 'new' }]
    const resolved = resolveColumnState({
      version: 1,
      columns: [
        { key: 'status', width: 20, visible: true },
        { key: 'name', width: Number.POSITIVE_INFINITY, visible: false },
        { key: 'name', width: 300, visible: true },
        { key: 'removed', visible: false }
      ]
    }, columns)!

    expect(resolved.columns.map((column) => column.key)).toEqual(['status', 'name', 'new'])
    expect([...resolved.widths.entries()]).toEqual([['status', 64]])
    expect([...resolved.hiddenKeys]).toEqual(['name'])
  })
})
