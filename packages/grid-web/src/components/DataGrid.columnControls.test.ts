// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import type { GridColumn } from '../types.js'
import { createGridEngine } from '@tipolox/litgrid-core'

const amounts = ['-10.00', '-2.0', '0', '0.00', '2.00', '9.00', '10.00', '2.000',
  '90071992547409931234567890.01', '90071992547409931234567890.02', null]
const rows = amounts.map((amount, id) => ({ amount, name: `Item ${id}` }))
afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const schemas = new WeakMap<DataGrid, GridColumn[]>()

async function setup(options: Partial<GridColumn> = {}) {
  const grid = new DataGrid()
  grid.data = rows
  const columns = [{ key: 'amount', ...options }, { key: 'name' }]
  schemas.set(grid, columns)
  grid.columns = columns
  document.body.append(grid)
  await grid.updateComplete
  return grid
}
function button(grid: DataGrid, label: string) {
  return [...grid.renderRoot.querySelectorAll<HTMLButtonElement>('.header-menu button')]
    .find(button => button.textContent?.trim() === label)
}
async function open(grid: DataGrid, key = 'amount') {
  const trigger = grid.renderRoot.querySelector<HTMLButtonElement>(`[data-column-key="${key}"] .header-action-button`)!
  trigger.click()
  await grid.updateComplete
  return trigger
}

describe('column query UI capabilities', () => {
  it.each([
    [{}, true, true],
    [{ sortable: true, filterable: true }, true, true],
    [{ sortable: false }, false, true],
    [{ filterable: false }, true, false],
    [{ sortable: false, filterable: false }, false, false]
  ] as const)('renders independent opt-outs for %j', async (options, sorting, filtering) => {
    const grid = await setup(options)
    const trigger = await open(grid)
    for (const label of ['Sort Asc', 'Sort Desc', 'Clear Sort']) expect(!!button(grid, label)).toBe(sorting)
    for (const label of ['Apply Filter', 'Clear Filter']) expect(!!button(grid, label)).toBe(filtering)
    expect(!!grid.renderRoot.querySelector('[aria-label="Filter operator"]')).toBe(filtering)
    expect(!!grid.renderRoot.querySelector('[aria-label="Filter value"]')).toBe(filtering)
    for (const label of ['Columns', 'Best Fit', 'Best Fit All Columns', 'Show Quick Search']) expect(button(grid, label)).toBeDefined()
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(button(grid, 'Show Quick Search'))
    grid.renderRoot.querySelector('.header-menu')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await grid.updateComplete
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(trigger)
    await open(grid, 'name')
    expect(button(grid, 'Sort Asc')).toBeDefined()
    expect(button(grid, 'Apply Filter')).toBeDefined()
  })

  it('preserves default lexical sorting and text filtering', async () => {
    const grid = await setup()
    await open(grid)
    button(grid, 'Sort Asc')!.click()
    await grid.updateComplete
    const values = [...grid.renderRoot.querySelectorAll('.row')].map(row => row.querySelector('.cell')!.textContent!.trim())
    expect(values.indexOf('10.00')).toBeLessThan(values.indexOf('2.00'))
    await open(grid, 'name')
    const input = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Filter value"]')!
    input.value = 'Item 0'
    input.dispatchEvent(new Event('input'))
    button(grid, 'Apply Filter')!.click()
    await grid.updateComplete
    expect(grid.getTotalRowCount()).toBe(1)
  })

  it.each((['same-reference', 'replacement', 'schema'] as const).flatMap(mode =>
    [{ sortable: false }, { filterable: false }, { sortable: false, filterable: false }].map(flags => [mode, flags] as const)
  ))('retains active queries and restores focus on %s capability changes %j', async (mode, flags) => {
    const grid = await setup()
    await open(grid)
    button(grid, 'Sort Desc')!.click()
    grid.setFilter({ columnKey: 'amount', operator: 'isNotEmpty' })
    await grid.updateComplete
    const before = [...grid.renderRoot.querySelectorAll('.cell')].map(cell => cell.textContent)
    const trigger = await open(grid)
    button(grid, 'Apply Filter')!.focus()
    const columns = schemas.get(grid)!
    if (mode === 'replacement') grid.columns = columns.map(column => column.key === 'amount' ? { ...column, ...flags } : column)
    else {
      Object.assign(columns[0], flags)
      if (mode === 'schema') grid.updateColumnSchema(columns)
      else grid.columns = columns
    }
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(trigger)
    expect(grid.getFilters()).toEqual([{ columnKey: 'amount', operator: 'isNotEmpty' }])
    expect(grid.renderRoot.querySelector('[data-column-key="amount"]')!.getAttribute('aria-sort')).toBe('descending')
    expect(grid.renderRoot.querySelector('.header-filter-indicator')).not.toBeNull()
    expect([...grid.renderRoot.querySelectorAll('.cell')].map(cell => cell.textContent)).toEqual(before)
    grid.updateColumnSchema([{ key: 'amount' }, { key: 'name' }])
    await grid.updateComplete
    await open(grid)
    expect(button(grid, 'Sort Asc')).toBeDefined()
    expect(grid.renderRoot.querySelector<HTMLSelectElement>('[aria-label="Filter operator"]')!.value).toBe('isNotEmpty')
  })

  it.each(['Sort Asc', 'Sort Desc', 'Clear Sort', 'Apply Filter', 'Clear Filter'])('guards a stale %s action before rerendering', async label => {
    const grid = await setup()
    grid.setFilter({ columnKey: 'amount', operator: 'isNotEmpty' })
    await open(grid)
    const stale = button(grid, label)!
    const before = [...grid.renderRoot.querySelectorAll('.cell')].map(cell => cell.textContent)
    const columns = schemas.get(grid)!
    columns[0].sortable = false
    columns[0].filterable = false
    grid.columns = columns
    stale.click()
    await grid.updateComplete
    expect(grid.getFilters()).toEqual([{ columnKey: 'amount', operator: 'isNotEmpty' }])
    expect(grid.renderRoot.querySelector('[data-column-key="amount"]')!.getAttribute('aria-sort')).toBe('none')
    expect([...grid.renderRoot.querySelectorAll('.cell')].map(cell => cell.textContent)).toEqual(before)
  })

  it.each((['columns', 'schema'] as const).flatMap(method =>
    (['remove', 'rename', 'hide'] as const).map(change => [method, change] as const)
  ))('closes an opted-out column menu after %s %s and retains queries', async (method, change) => {
    const grid = await setup()
    await open(grid)
    button(grid, 'Sort Asc')!.click()
    grid.setFilter({ columnKey: 'amount', operator: 'isNotEmpty' })
    const columns: GridColumn[] = [{ key: 'amount', sortable: false, filterable: false }, { key: 'name' }]
    grid.columns = columns
    await grid.updateComplete
    await open(grid)
    button(grid, 'Best Fit')!.focus()
    const next = change === 'remove' ? columns.slice(1) : columns.map(column => column.key === 'amount'
      ? { ...column, ...(change === 'rename' ? { key: 'renamed' } : { hidden: true }) } : column)
    if (method === 'schema') grid.updateColumnSchema(next)
    else grid.columns = next
    await grid.updateComplete

    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    const fallback = grid.renderRoot.querySelector<HTMLButtonElement>('.header-action-button')!
    expect(fallback.isConnected).toBe(true)
    expect(fallback.disabled).toBe(false)
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(fallback)
    expect(grid.getFilters()).toEqual([{ columnKey: 'amount', operator: 'isNotEmpty' }])

    // Reintroducing the same key must not resurrect a stale open menu.
    grid.updateColumnSchema(columns)
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    expect(grid.renderRoot.querySelector('[data-column-key="amount"]')!.getAttribute('aria-sort')).toBe('ascending')
    expect(grid.renderRoot.querySelector('.header-filter-indicator')).not.toBeNull()
    await open(grid)
    expect(button(grid, 'Sort Asc')).toBeUndefined()
    expect(button(grid, 'Apply Filter')).toBeUndefined()
  })

  it.each(['visibility', 'state', 'persisted-state'] as const)('closes a hidden opted-out column menu through %s and falls back to Columns', async method => {
    const grid = await setup({ sortable: false, filterable: false })
    grid.setColumnVisible('name', false)
    await grid.updateComplete
    await open(grid)
    button(grid, 'Best Fit')!.focus()
    if (method === 'visibility') grid.setColumnVisible('amount', false)
    else {
      const state = grid.getColumnState()
      state.columns.forEach(column => { column.visible = false })
      if (method === 'state') grid.setColumnState(state)
      else {
        localStorage.setItem('hidden-money-menu', JSON.stringify(state))
        grid.columnStateStorageKey = 'hidden-money-menu'
      }
    }
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    const fallback = grid.renderRoot.querySelector<HTMLButtonElement>('.columns-button')!
    expect(fallback.isConnected).toBe(true)
    expect(fallback.getAttribute('type')).toBe('button')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(fallback)
    grid.setColumnVisible('amount', true)
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    expect(grid.renderRoot.querySelector('.header-action-button')!.getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps imperative filters, quick search and exact clipboard strings unchanged', async () => {
    const grid = await setup({ sortable: false, filterable: false,
      render: value => value === null ? '—' : `EUR ${String(value).replace('.', ',')}` })
    grid.config = { selection: { mode: 'multi-row' } }
    grid.selectAllRows()
    await grid.updateComplete
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await grid.copySelectedRows()
    const text = writeText.mock.calls[0][0] as string
    for (const amount of amounts) if (amount !== null) expect(text).toContain(amount)
    expect(grid.renderRoot.querySelector('.cell')!.textContent).toContain('EUR -10,00')
    expect(text).not.toContain('EUR')
    grid.setFilter({ columnKey: 'amount', operator: 'equals', value: amounts[9] })
    await grid.updateComplete
    expect(grid.getTotalRowCount()).toBe(1)
    grid.clearFilter('amount')
    grid.setQuickSearch('90071992547409931234567890.01')
    await grid.updateComplete
    expect(grid.getTotalRowCount()).toBe(1)
    grid.clearQuickSearch()
    expect(rows.map(row => row.amount)).toEqual(amounts)
    for (const value of ['0', '0.00', '2.00', '2.000', amounts[8], amounts[9]]) {
      grid.setFilter({ columnKey: 'amount', operator: 'equals', value })
      expect(grid.getTotalRowCount()).toBe(1)
    }
    grid.setFilter({ columnKey: 'amount', operator: 'isEmpty' })
    expect(grid.getTotalRowCount()).toBe(1) // Null retains the existing empty-value policy.
    // Core has no column schema: imperative queries retain v1.1.0 semantics.
    const engine = createGridEngine()
    engine.setData([{ amount: '2.00' }, { amount: '10.00' }, { amount: '9.00' }])
    engine.sortBy('amount', 'asc')
    expect(engine.getRows()).toEqual([{ amount: '10.00' }, { amount: '2.00' }, { amount: '9.00' }])
    engine.setFilter({ columnKey: 'amount', operator: 'greaterThan', value: '9.00' })
    expect(engine.getRows()).toEqual([])
  })

  it('keeps capabilities in the schema through persistence, reorder, visibility, sizing and virtualization', async () => {
    const grid = await setup({ sortable: false, filterable: false })
    grid.columnStateStorageKey = 'money-controls'
    grid.data = Array.from({ length: 100_000 }, (_, id) => ({ amount: amounts[id % amounts.length], name: `Item ${id}` }))
    grid.setColumnWidth('amount', 180)
    grid.moveColumn('amount', 1)
    grid.setColumnVisible('name', false)
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.row').length).toBeLessThan(30)
    expect(grid.getColumnWidth(schemas.get(grid)![0])).toBe(180)
    expect(localStorage.getItem('money-controls')).not.toMatch(/sortable|filterable/)
    const state = grid.getColumnState()
    grid.setColumnState(state)
    grid.updateColumnSchema([{ key: 'amount', sortable: false, filterable: false }, { key: 'name' }])
    await grid.updateComplete
    await open(grid)
    expect(button(grid, 'Sort Asc')).toBeUndefined()
    expect(button(grid, 'Apply Filter')).toBeUndefined()
    button(grid, 'Columns')!.click()
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.column-chooser-dialog input').length).toBe(2)
    const restored = await setup({ sortable: false, filterable: false })
    restored.columnStateStorageKey = 'money-controls'
    await restored.updateComplete
    expect(restored.getColumnOrder()).toEqual(['name', 'amount'])
    expect(restored.isColumnVisible('name')).toBe(false)
    await open(restored)
    expect(button(restored, 'Sort Asc')).toBeUndefined()
    expect(button(restored, 'Apply Filter')).toBeUndefined()
  })
})
