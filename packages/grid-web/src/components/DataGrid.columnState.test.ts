// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => {
  localStorage.clear()
  document.body.replaceChildren()
})

describe('DataGrid column state persistence', () => {
  it('persists and restores column order, widths, and visibility', () => {
    const storageKey = 'litgrid-column-state'
    const columns = [{ key: 'name' }, { key: 'role' }, { key: 'location' }]
    const grid = new DataGrid()
    grid.columns = columns
    grid.columnStateStorageKey = storageKey

    grid.setColumnWidth('role', 220)
    grid.moveColumn('location', 0)
    grid.setColumnVisible('role', false)

    expect(JSON.parse(localStorage.getItem(storageKey) ?? '')).toEqual({
      version: 1,
      columns: [
        { key: 'location', visible: true },
        { key: 'name', visible: true },
        { key: 'role', width: 220, visible: false }
      ]
    })

    const restoredGrid = new DataGrid()
    restoredGrid.columnStateStorageKey = storageKey
    restoredGrid.columns = columns

    expect(restoredGrid.getColumnOrder()).toEqual(['location', 'name', 'role'])
    expect(restoredGrid.getColumnWidth({ key: 'role' })).toBe(220)
    expect(restoredGrid.isColumnVisible('role')).toBe(false)
  })

  it('reconciles saved state with changed column definitions and supports snapshots', () => {
    const grid = new DataGrid()
    grid.columns = [{ key: 'name' }, { key: 'role', hidden: true }, { key: 'location' }]

    grid.setColumnState({
      version: 1,
      columns: [
        { key: 'location', width: 200, visible: true },
        { key: 'removed', width: 100, visible: true },
        { key: 'name', visible: false }
      ]
    })

    expect(grid.getColumnOrder()).toEqual(['location', 'name', 'role'])
    expect(grid.getColumnWidth({ key: 'location' })).toBe(200)
    expect(grid.isColumnVisible('name')).toBe(false)
    expect(grid.isColumnVisible('role')).toBe(false)
    expect(grid.getColumnState()).toEqual({
      version: 1,
      columns: [
        { key: 'location', width: 200, visible: true },
        { key: 'name', visible: false },
        { key: 'role', visible: false }
      ]
    })
  })

  it('clears persisted state and emits a typed change event when reset', () => {
    const grid = new DataGrid()
    grid.columns = [{ key: 'name' }, { key: 'role', hidden: true }]
    grid.columnStateStorageKey = 'litgrid-reset-state'
    const events: CustomEvent[] = []
    grid.addEventListener('column-state-change', (event) => events.push(event as CustomEvent))

    grid.setColumnWidth('name', 240)
    grid.setColumnVisible('role', true)
    grid.resetColumnState()

    expect(localStorage.getItem('litgrid-reset-state')).toBeNull()
    expect(grid.getColumnOrder()).toEqual(['name', 'role'])
    expect(grid.getColumnWidth({ key: 'name' })).toBe(160)
    expect(grid.isColumnVisible('role')).toBe(false)
    expect(events.at(-1)?.detail).toEqual({
      reason: 'reset',
      state: {
        version: 1,
        columns: [
          { key: 'name', visible: true },
          { key: 'role', visible: false }
        ]
      }
    })
  })
})
