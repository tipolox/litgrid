// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import type { GridExternalState, GridQueryChangeDetail } from '@tipolox/litgrid-core'

afterEach(() => document.body.replaceChildren())
const initial = (overrides: Partial<GridExternalState> = {}): GridExternalState => ({ requestId: 1,
  query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 2, pageSize: 20 },
  rows: [{ id: 'a', name: 'Zebra', amount: '9007199254740993.01' }, { id: 'b', name: 'Alpha', amount: '-2.00' }],
  total: { kind: 'known', totalRows: 352 }, ...overrides })
async function setup(state = initial()) {
  const grid = new DataGrid()
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' } }
  grid.columns = [{ key: 'name' }, { key: 'amount', sortable: false, filterable: false }]
  grid.externalState = state
  document.body.append(grid)
  await grid.updateComplete
  return grid
}
const text = (grid: DataGrid) => grid.renderRoot.textContent!
const button = (grid: DataGrid, label: string) => [...grid.renderRoot.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent!.trim() === label)!

it('renders server rows in order, exact totals and always-available external search', async () => {
  const grid = await setup()
  expect(text(grid)).toContain('352 rows')
  expect(text(grid)).toContain('Page 3 of 18')
  expect(grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')).not.toBeNull()
  expect([...grid.renderRoot.querySelectorAll('.cell')].map(el => el.textContent!.trim())).toEqual(['Zebra', '9007199254740993.01', 'Alpha', '-2.00'])
  const listener = vi.fn()
  grid.addEventListener('query-change', listener)
  grid.data = [{ name: 'Wrong page' }]
  grid.theme = 'dark'
  await grid.updateComplete
  expect(listener).not.toHaveBeenCalled()
  expect(text(grid)).toContain('Zebra')
  expect(text(grid)).toContain('Page 3 of 18')
})

it('delegates public search, header sort/filter/clear and respects monetary column flags', async () => {
  const grid = await setup()
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  const search = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')!
  search.value = 'Not on page'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  await grid.updateComplete
  expect(events.at(-1)).toMatchObject({ reason: 'search', query: { search: 'Not on page', pageIndex: 0 } })
  expect(text(grid)).toContain('Loading results.')
  expect(grid.renderRoot.querySelector('.shell')?.getAttribute('aria-busy')).toBe('true')
  button(grid, 'Clear').click()
  await grid.updateComplete
  expect(events.at(-1)?.query.search).toBe('')
  // Use rendered controls rather than private handlers.
  grid.renderRoot.querySelectorAll<HTMLButtonElement>('[aria-label="Show column actions"]')[0].click()
  await grid.updateComplete
  button(grid, 'Sort Asc').click()
  await grid.updateComplete
  expect(events.at(-1)).toMatchObject({ reason: 'sort', query: { sort: { columnKey: 'name', direction: 'asc' } } })
  grid.setFilter({ columnKey: 'amount', operator: 'greaterThan', value: '9007199254740993.00000001' })
  expect(events.at(-1)?.query.filters[0].value).toBe('9007199254740993.00000001')
  grid.clearFilter('amount')
  expect(events.at(-1)?.query.filters).toEqual([])
  grid.renderRoot.querySelectorAll<HTMLButtonElement>('[aria-label="Show column actions"]')[1].click()
  await grid.updateComplete
  expect(button(grid, 'Sort Asc')).toBeUndefined()
  expect(button(grid, 'Apply Filter')).toBeUndefined()
})

it('shows truthful unknown, error, empty and out-of-range statuses', async () => {
  const grid = await setup(initial({ total: { kind: 'unknown', hasMore: false } }))
  expect(text(grid)).toContain('Total unknown')
  expect(text(grid)).toContain('Page 3')
  expect(text(grid)).not.toContain('of -1')
  expect(button(grid, 'Next').disabled).toBe(true)
  grid.externalState = initial({ requestId: 2, error: 'Access unavailable', rows: [] })
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('[role="alert"]')?.textContent).toBe('Access unavailable')
  expect(grid.renderRoot.querySelectorAll('.cell')).toHaveLength(0)
  grid.externalState = initial({ requestId: 3, rows: [], total: { kind: 'known', totalRows: 0 } })
  await grid.updateComplete
  expect(text(grid)).toContain('Requested page is out of range')
  expect(grid.getPagination().pageIndex).toBe(2)
  grid.externalState = initial({ requestId: 4, query: { ...initial().query, pageIndex: 0 }, rows: [], total: { kind: 'known', totalRows: 0 } })
  await grid.updateComplete
  expect(text(grid)).toContain('No results.')
})

it('restores pagination focus when Next becomes unavailable and rejects stale DOM updates', async () => {
  const grid = await setup(initial({ total: { kind: 'unknown', hasMore: true } }))
  const next = button(grid, 'Next')
  next.focus()
  next.click()
  const pending = grid.getQuery()
  await grid.updateComplete
  expect(grid.shadowRoot?.activeElement?.getAttribute('aria-label') === 'Rows per page' || grid.shadowRoot?.activeElement === button(grid, 'Previous')).toBe(true)
  expect(grid.setExternalState(initial())).toBe(false)
  expect(grid.setExternalState({ ...initial(), ...pending })).toBe(true)
  await grid.updateComplete
  expect(text(grid)).toContain('Page 4')
})
