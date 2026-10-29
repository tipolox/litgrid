// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { syncGridInputs as react, type ReactGridInputs } from '../../../grid-react/src/gridBindings.js'
import { syncGridInputs as vue } from '../../../grid-vue/src/gridBindings.js'
import { syncGridInputs as angular } from '../../../grid-angular/src/gridBindings.js'

function inputs(pageSize = 25): ReactGridInputs {
  return {
    data: Array.from({ length: 400 }, (_, id) => ({ id, name: `Person ${id}`, role: 'Engineer' })),
    columns: [{ key: 'id' }, { key: 'name' }, { key: 'role' }],
    config: { selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'a' }, pagination: { enabled: true, pageSize } },
    theme: 'light', ariaLabel: 'People', ariaDescription: '', screenReaderAnnouncements: true,
    height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10,
    quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150
  }
}

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); document.body.replaceChildren() })

describe.each([['React', react], ['Vue', vue], ['Angular', angular]] as const)('%s input synchronization', (_name, sync) => {
  it.each([25, 50, 100])('preserves page, selection, navigation and unsaved columns on unrelated updates (%i rows/page)', async pageSize => {
    const grid = new DataGrid()
    document.body.append(grid)
    const value = inputs(pageSize)
    sync(grid, value)
    grid.setFilter({ columnKey: 'role', operator: 'equals', value: 'Engineer' })
    grid.sortBy('id', 'asc')
    grid.setPage(2)
    grid.selectRow(1)
    grid.setColumnWidth('name', 240)
    grid.moveColumn('role', 0)
    grid.setColumnVisible('id', false)
    await grid.updateComplete
    const viewport = grid.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await grid.updateComplete
    const active = viewport.getAttribute('aria-activedescendant')
    const focused = grid.shadowRoot!.activeElement
    const state = grid.getColumnState()
    const selection = grid.getSelectionSnapshot()
    const columns = vi.spyOn(DataGrid.prototype, 'columns', 'set')
    const schema = vi.spyOn(grid, 'updateColumnSchema')
    const config = vi.spyOn(DataGrid.prototype, 'config', 'set')
    for (const change of [{ theme: 'dark' as const }, { ariaLabel: 'Updated' }, { ariaDescription: 'Help' },
      { screenReaderAnnouncements: false }, { height: 400 }, { config: { ...value.config } }]) {
      sync(grid, { ...value, ...change })
      await grid.updateComplete
      expect(grid.getPagination().pageIndex).toBe(2)
      expect(grid.getSelectionSnapshot()).toEqual(selection)
      expect(grid.getColumnState()).toEqual(state)
      expect(viewport.getAttribute('aria-activedescendant')).toBe(active)
      expect(grid.shadowRoot!.activeElement).toBe(focused)
      expect(grid.getFilters()).toEqual([{ columnKey: 'role', operator: 'equals', value: 'Engineer' }])
    }
    expect(columns).not.toHaveBeenCalled()
    expect(schema).not.toHaveBeenCalled()
    expect(config).not.toHaveBeenCalled()
  })

  it('reconciles schema edits by key and isolates saved and unsaved namespaces', () => {
    const grid = new DataGrid()
    const value = inputs()
    sync(grid, value)
    grid.setColumnWidth('name', 240)
    grid.moveColumn('role', 0)
    grid.setColumnVisible('id', false)
    value.columns[1].header = 'Full name'
    value.columns.push({ key: 'added', hidden: true })
    sync(grid, value)
    expect(grid.getColumnOrder()).toEqual(['role', 'id', 'name', 'added'])
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    expect(grid.isColumnVisible('id')).toBe(false)
    expect(grid.isColumnVisible('added')).toBe(false)
    sync(grid, { ...value, columnStateStorageKey: 'other' })
    expect(grid.getColumnOrder()).toEqual(['id', 'name', 'role', 'added'])
    expect(grid.getColumnWidth({ key: 'name' })).toBe(160)
    expect(grid.isColumnVisible('id')).toBe(true)
    expect(localStorage.getItem('other')).toBeNull()
  })

  it('skips row adoption with a stable revision, processes explicit mutations and replacements, and clears scoped selection', () => {
    const grid = new DataGrid()
    const value = { ...inputs(), dataRevision: 0 }
    sync(grid, value)
    grid.setPage(2)
    grid.selectRow(1)
    const adopt = vi.spyOn(grid, 'updateData')
    const schema = vi.spyOn(grid, 'updateColumnSchema')
    const config = vi.spyOn(DataGrid.prototype, 'config', 'set')
    sync(grid, { ...value, config: structuredClone(value.config), columns: value.columns.map(column => ({ ...column })), theme: 'dark' })
    expect(adopt).not.toHaveBeenCalled()
    expect(schema).not.toHaveBeenCalled()
    expect(config).not.toHaveBeenCalled()
    expect(grid.getPagination().pageIndex).toBe(2)
    value.data.push({ id: 400, name: 'Added', role: 'Engineer' })
    sync(grid, { ...value, dataRevision: 1 })
    expect(adopt).toHaveBeenCalledTimes(1)
    expect(grid.getTotalRowCount()).toBe(401)
    expect(grid.getPagination().pageIndex).toBe(2)
    value.config.selection!.scopeKey = 'b'
    sync(grid, { ...value, dataRevision: 1 })
    expect(grid.getSelectionSnapshot()).toMatchObject({ scopeKey: 'b', rows: [] })
    // Numeric scope keys must not collide through JSON's null encoding.
    grid.selectRowByKey(51)
    value.config.selection!.scopeKey = Number.NaN
    sync(grid, { ...value, dataRevision: 1 })
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    grid.selectRowByKey(51)
    value.config.selection!.scopeKey = Number.POSITIVE_INFINITY
    sync(grid, { ...value, dataRevision: 1 })
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    // Replacements synchronize even if the revision did not change.
    sync(grid, { ...value, dataRevision: 1, data: [{ id: 900, name: 'Replacement' }] })
    expect(adopt).toHaveBeenCalledTimes(2)
    expect(grid.getPagination().pageIndex).toBe(0)
    expect(grid.getTotalRowCount()).toBe(1)
  })

  it('preserves surviving preferences, honors changed defaults, removes retired keys and keeps namespaces independent', () => {
    const grid = new DataGrid()
    const value = { ...inputs(), columnStateStorageKey: 'a' }
    sync(grid, value)
    grid.setColumnWidth('name', 240)
    grid.setColumnVisible('role', false)
    grid.moveColumn('role', 0)
    const savedA = localStorage.getItem('a')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    sync(grid, { ...value, columnStateStorageKey: 'b', columns: [{ key: 'name' }, { key: 'renamed' }] })
    expect(grid.getColumnOrder()).toEqual(['name', 'renamed'])
    expect(grid.getColumnWidth({ key: 'name' })).toBe(160)
    expect(write).not.toHaveBeenCalled()
    grid.setColumnWidth('name', 300)
    sync(grid, value)
    expect(grid.getColumnOrder()).toEqual(['role', 'id', 'name'])
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    expect(grid.isColumnVisible('role')).toBe(false)
    expect(localStorage.getItem('a')).toBe(savedA)
    value.columns[1].width = 180
    value.columns[2].hidden = true
    sync(grid, value)
    expect(grid.getColumnWidth(value.columns[1])).toBe(180)
    expect(grid.isColumnVisible('role')).toBe(false)
    value.columns[2].hidden = false
    sync(grid, value)
    expect(grid.isColumnVisible('role')).toBe(true)
    sync(grid, { ...value, columns: [{ key: 'name', width: 180 }, { key: 'new', hidden: true }] })
    expect(grid.getColumnOrder()).toEqual(['name', 'new'])
    expect(grid.getColumnState().columns.map(column => column.key)).not.toContain('role')
  })

  it('retains inferred and 120-column virtualized state across equivalent input replacements', async () => {
    const grid = new DataGrid()
    document.body.append(grid)
    const value = { ...inputs(), columns: [] }
    sync(grid, value)
    grid.setColumnWidth('name', 240)
    sync(grid, { ...value, columns: [], ariaLabel: 'Inferred' })
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    grid.moveColumn('role', 0)
    grid.setColumnVisible('id', false)
    const inferredData = [{ name: 'New schema', added: 'New field' }]
    sync(grid, { ...value, data: inferredData })
    expect(grid.getColumnOrder()).toEqual(['name', 'added'])
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    expect(grid.isColumnVisible('id')).toBe(false)
    sync(grid, { ...value, data: inferredData, columns: [{ key: 'name', header: 'Declared name' }, { key: 'added' }] })
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    const remote = new DataGrid()
    const remoteValue = inputs()
    remoteValue.columns = []
    remoteValue.config.queryMode = 'external'
    remoteValue.externalState = { requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 25 }, rows: remoteValue.data.slice(0, 25), total: { kind: 'unknown', hasMore: true } }
    sync(remote, remoteValue)
    remote.moveColumn('role', 0)
    remote.setColumnWidth('name', 240)
    const previousResult = remoteValue.externalState
    sync(remote, { ...remoteValue, externalState: { ...previousResult, requestId: 2, rows: [{ id: 999, name: 'Remote', added: 'New field' }] } })
    expect(remote.getColumnOrder()).toEqual(['id', 'name', 'added'])
    expect(remote.getColumnWidth({ key: 'name' })).toBe(240)
    expect(remote.setExternalState(previousResult)).toBe(false)
    expect(remote.getColumnOrder()).toEqual(['id', 'name', 'added'])
    const columns = Array.from({ length: 120 }, (_, id) => ({ key: `c${id}`, width: 100 }))
    sync(grid, { ...value, columns })
    grid.moveColumn('c119', 0)
    grid.setColumnWidth('c20', 220)
    grid.setColumnVisible('c30', false)
    const state = grid.getColumnState()
    sync(grid, { ...value, columns: columns.map(column => ({ ...column })), height: 400 })
    await grid.updateComplete
    expect(grid.getColumnState()).toEqual(state)
    expect(grid.shadowRoot!.querySelectorAll('.column-header').length).toBeLessThan(120)
  })

  it.each([25, 50, 100])('does not replay controlled external results or emit queries on unrelated updates (%i rows/page)', pageSize => {
    const grid = new DataGrid()
    const value = inputs(pageSize)
    value.config.queryMode = 'external'
    value.externalState = { requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize }, rows: value.data.slice(0, pageSize), total: { kind: 'unknown', hasMore: true } }
    const queries = vi.fn()
    grid.addEventListener('query-change', queries)
    sync(grid, value)
    grid.setPage(1)
    const pending = grid.getQuery()
    const external = vi.spyOn(DataGrid.prototype, 'externalState', 'set')
    sync(grid, { ...value, config: structuredClone(value.config), columns: [...value.columns], ariaLabel: 'Changed' })
    expect(queries).toHaveBeenCalledTimes(1)
    expect(external).not.toHaveBeenCalled()
    expect(grid.getQuery()).toEqual(pending)
    sync(grid, { ...value, externalState: { ...value.externalState, ...pending } })
    expect(grid.getPagination().pageIndex).toBe(1)
    expect(grid.setExternalState(value.externalState)).toBe(false)
    expect(grid.getQuery().requestId).toBe(pending.requestId)
  })

  it('adopts local data after leaving external mode even with an unchanged revision', () => {
    const grid = new DataGrid()
    const value = { ...inputs(), dataRevision: 0 }
    sync(grid, value)
    sync(grid, { ...value, config: { ...value.config, queryMode: 'external' } })
    const adopt = vi.spyOn(grid, 'updateData')
    sync(grid, value)
    expect(adopt).toHaveBeenCalledTimes(1)
    expect(grid.getTotalRowCount()).toBe(400)
  })

  it('keeps the active column key on schema reorder and clears a removed active column', async () => {
    const grid = new DataGrid()
    document.body.append(grid)
    const value = inputs()
    sync(grid, value)
    await grid.updateComplete
    const viewport = grid.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await grid.updateComplete
    const activeId = viewport.getAttribute('aria-activedescendant')!
    const activeColumn = grid.getVisibleColumnKeys()[Number(grid.shadowRoot!.getElementById(activeId)!.getAttribute('data-column-index'))]
    sync(grid, { ...value, columns: [{ key: 'role' }, { key: 'name', header: 'Full name' }] })
    await grid.updateComplete
    const retainedId = viewport.getAttribute('aria-activedescendant')!
    expect(grid.getVisibleColumnKeys()[Number(grid.shadowRoot!.getElementById(retainedId)?.getAttribute('data-column-index'))]).toBe(activeColumn)
    sync(grid, { ...value, columns: value.columns.filter(column => column.key !== activeColumn) })
    await grid.updateComplete
    expect(viewport.hasAttribute('aria-activedescendant')).toBe(false)
  })
})
