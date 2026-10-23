// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import type { GridExternalState, GridQueryChangeDetail } from '@tipolox/litgrid-core'

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers() })
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


it('keeps loading, empty, error and out-of-range messages inside an absolute viewport overlay', async () => {
  const grid = await setup()
  grid.theme = 'dark'
  await grid.updateComplete
  const frame = grid.renderRoot.querySelector('.viewport-frame') as HTMLElement
  const viewport = frame.querySelector('.viewport') as HTMLElement
  const header = grid.renderRoot.querySelector('.header-shell') as HTMLElement
  const footer = grid.renderRoot.querySelector('.pagination') as HTMLElement
  const search = grid.renderRoot.querySelector('.quick-search') as HTMLElement
  expect(frame.parentElement).toBe(header.parentElement)
  expect(frame.parentElement).toBe(footer.parentElement)
  expect(search.parentElement).toBe(frame.parentElement)
  expect(frame.contains(header)).toBe(false)
  expect(frame.contains(footer)).toBe(false)
  expect(viewport.getAttribute('role')).toBe('grid')

  // This checks DOM/CSS contracts. Actual box geometry needs a real browser.
  const cssText = DataGrid.styles.map(style => style.cssText).join('\n')
  expect(cssText).toMatch(/\.viewport-frame\s*\{[^}]*position:\s*relative/s)
  expect(cssText).toMatch(/\.external-status\s*\{[^}]*position:\s*absolute/s)
  expect(cssText).toMatch(/\.external-status\s*\{[^}]*pointer-events:\s*none/s)
  expect(cssText).toContain('prefers-reduced-motion: reduce')

  grid.setQuickSearch('Alpha')
  await grid.updateComplete
  const pending = grid.renderRoot.querySelector('.external-status') as HTMLElement
  expect(pending.parentElement).toBe(frame)
  expect(pending.classList.contains('loading')).toBe(true)
  expect(pending.getAttribute('role')).toBe('status')
  expect(pending.textContent).toBe('Loading results.')
  expect(grid.renderRoot.querySelector('.shell')?.getAttribute('aria-busy')).toBe('true')
  expect(grid.renderRoot.querySelector('.header-shell')).toBe(header)
  expect(grid.renderRoot.querySelector('.viewport')).toBe(viewport)
  expect(grid.renderRoot.querySelector('.pagination')).toBe(footer)
  expect(grid.renderRoot.querySelector('.quick-search')).toBe(search)

  const { requestId, query } = grid.getQuery()
  expect(grid.setExternalState({ requestId, query, rows: [], total: { kind: 'known', totalRows: 0 } })).toBe(true)
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('.external-status')?.textContent).toBe('No results.')
  expect(grid.renderRoot.querySelector('.external-status')?.getAttribute('role')).toBe('status')
  expect(grid.renderRoot.querySelector('.shell')?.getAttribute('aria-busy')).toBe('false')
  expect(grid.renderRoot.querySelector('.header-shell')).toBe(header)

  // Known out-of-range controlled pages use the same body overlay.
  const current = grid.getQuery()
  expect(grid.setExternalState({ requestId: current.requestId + 1,
    query: { ...current.query, pageIndex: 3 }, rows: [],
    total: { kind: 'known', totalRows: 0 } })).toBe(true)
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('.external-status')?.textContent).toContain('out of range')
  expect(grid.renderRoot.querySelector('.external-status')?.parentElement).toBe(frame)
  expect(grid.renderRoot.querySelector('.header-shell')).toBe(header)

  grid.refreshQuery()
  const next = grid.getQuery()
  expect(grid.setExternalState({ requestId: next.requestId, query: next.query, rows: [],
    total: { kind: 'unknown', hasMore: false }, error: 'Server unavailable' })).toBe(true)
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('.external-status')?.getAttribute('role')).toBe('alert')
  expect(grid.renderRoot.querySelector('.external-status')?.textContent).toBe('Server unavailable')
  expect(grid.renderRoot.querySelector('.external-status')?.parentElement).toBe(frame)
  expect(grid.renderRoot.querySelector('.header-shell')).toBe(header)
  expect(grid.renderRoot.querySelector('.viewport')).toBe(viewport)

  grid.refreshQuery()
  const recovery = grid.getQuery()
  expect(grid.setExternalState({ requestId: recovery.requestId + 1,
    query: { ...recovery.query, pageIndex: 0 },
    rows: [{ id: 'done', name: 'Recovered', amount: '1.00' }], total: { kind: 'known', totalRows: 1 } })).toBe(true)
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('.external-status')).toBeNull()
  expect(text(grid)).toContain('Recovered')
})

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

it('does not offer a no-op quick-search visibility toggle in external header menus', async () => {
  const grid = await setup()
  const search = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')
  expect(search).not.toBeNull()

  const menuButtons = grid.renderRoot.querySelectorAll<HTMLButtonElement>('[aria-label="Show column actions"]')
  expect(menuButtons.length).toBeGreaterThan(0)
  for (const menuButton of menuButtons) {
    menuButton.click()
    await grid.updateComplete
    const menu = grid.renderRoot.querySelector<HTMLElement>('.header-menu')
    expect(menu).not.toBeNull()
    const labels = [...menu!.querySelectorAll('button')].map(el => el.textContent?.trim())
    expect(labels).not.toContain('Show Quick Search')
    expect(labels).not.toContain('Hide Quick Search')
    expect(labels).toContain('Columns')
    // Retain the Best Fit separator, but do not insert an extra search-toggle separator.
    expect(menu!.querySelectorAll('.header-menu-divider')).toHaveLength(1)
    // The built-in search remains visible and usable in external mode.
    expect(grid.renderRoot.querySelector('[aria-label="Quick search"]')).toBe(search)
  }

  grid.setQuickSearch('Northwind')
  await grid.updateComplete
  expect(grid.getQuery().query.search).toBe('Northwind')
  expect(grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')?.value).toBe('Northwind')
})


it('exposes truthfully scoped labels, placeholders and uniquely associated visible help', async () => {
  const grid = await setup()
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: {
    label: 'Search code or name', placeholder: 'Code or name starts with…',
    description: 'Path and status are not included.'
  } }
  await grid.updateComplete
  const input = grid.renderRoot.querySelector<HTMLInputElement>('.quick-search input')!
  expect(input.getAttribute('aria-label')).toBe('Search code or name')
  expect(input.placeholder).toBe('Code or name starts with…')
  const id = input.getAttribute('aria-describedby')
  expect(id).toBeTruthy()
  expect(grid.renderRoot.querySelector('[id="' + id + '"]')?.textContent).toBe('Path and status are not included.')
  const other = await setup()
  other.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: { description: 'Different server scope' } }
  await other.updateComplete
  expect(other.renderRoot.querySelector('.quick-search input')?.getAttribute('aria-describedby')).not.toBe(id)
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: { label: 'New search scope', placeholder: '' } }
  await grid.updateComplete
  expect(input.getAttribute('aria-label')).toBe('New search scope')
  expect(input.placeholder).toBe('')
  expect(input.hasAttribute('aria-describedby')).toBe(false)
  expect(grid.renderRoot.querySelector('[id="' + id + '"]')).toBeNull()
})

it('hides the external search without mutating committed server state, pagination or other controls', async () => {
  const grid = await setup()
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  grid.setQuickSearch('Nor')
  await grid.updateComplete
  const before = grid.getQuery()
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: { visible: false } }
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('.quick-search')).toBeNull()
  expect(grid.renderRoot.querySelector('[aria-label="Quick search"]')).toBeNull()
  expect(grid.renderRoot.querySelector('.header-action-button')).not.toBeNull()
  expect(grid.renderRoot.querySelector('[aria-label="Rows per page"]')).not.toBeNull()
  expect(grid.getQuery()).toEqual(before)
  expect(events).toHaveLength(1)
  grid.setQuickSearch('Nort')
  await grid.updateComplete
  expect(grid.getQuery().query.search).toBe('Nort')
  expect(events).toHaveLength(2)
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: { visible: true } }
  await grid.updateComplete
  expect(grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')?.value).toBe('Nort')
  expect(events).toHaveLength(2)
})

it('preserves a pending draft on wording updates but cancels it on hiding without issuing a query', async () => {
  const grid = await setup()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const onQueryChange = vi.fn()
  grid.addEventListener('query-change', onQueryChange)
  const input = typeSearch(grid, 'Nor')
  input.focus()
  expect(vi.getTimerCount()).toBe(1)
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: { label: 'Search code', placeholder: 'Starts with' } }
  await grid.updateComplete
  expect(input.value).toBe('Nor')
  expect(input.getAttribute('aria-label')).toBe('Search code')
  expect(vi.getTimerCount()).toBe(1)
  grid.config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'site-a' }, quickSearch: { visible: false } }
  await grid.updateComplete
  expect(vi.getTimerCount()).toBe(0)
  vi.advanceTimersByTime(250)
  expect(onQueryChange).not.toHaveBeenCalled()
  expect(grid.getQuickSearch()).toBe('')
  expect(grid.renderRoot.querySelector('.quick-search')).toBeNull()
  expect(grid.shadowRoot?.activeElement).not.toBe(input)
  expect(grid.shadowRoot?.activeElement?.getAttribute('aria-label')).toBe('Show column actions')
  grid.config = { queryMode: 'external' }
  await grid.updateComplete
  expect(grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')?.value).toBe('')
})

it('delegates public search, header sort/filter/clear and respects monetary column flags', async () => {
  const grid = await setup()
  grid.quickSearchDebounceMs = 0
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

function typeSearch(grid: DataGrid, value: string) {
  const input = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')!
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return input
}

it('debounces rapid external typing on a small page and preserves focus and request identities', async () => {
  const grid = await setup()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  const input = typeSearch(grid, 'A')
  input.focus()
  vi.advanceTimersByTime(100)
  typeSearch(grid, 'Al')
  vi.advanceTimersByTime(100)
  typeSearch(grid, 'Alpha')
  await grid.updateComplete
  expect(events).toEqual([])
  expect(grid.getQuery().requestId).toBe(1)
  expect(input.value).toBe('Alpha')
  expect(grid.shadowRoot?.activeElement).toBe(input)
  vi.advanceTimersByTime(149)
  expect(events).toEqual([])
  vi.advanceTimersByTime(1)
  await grid.updateComplete
  expect(events).toEqual([expect.objectContaining({ requestId: 2, reason: 'search', query: expect.objectContaining({ search: 'Alpha', pageIndex: 0 }) })])
  expect(grid.shadowRoot?.activeElement).toBe(input)
  typeSearch(grid, 'Alpha')
  vi.advanceTimersByTime(150)
  expect(events).toHaveLength(1)
  expect(grid.getQuery().requestId).toBe(2)
})

it.each(['success', 'error'] as const)('preserves a newer pending search while the prior %s response settles', async responseType => {
  const grid = await setup()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))

  grid.setQuickSearch('Nor')
  const previous = grid.getQuery()
  expect(previous).toMatchObject({ requestId: 2, query: { search: 'Nor' } })
  const input = typeSearch(grid, 'Nort')
  input.focus()
  await grid.updateComplete
  expect(vi.getTimerCount()).toBe(1)

  vi.advanceTimersByTime(50)
  const response: GridExternalState = responseType === 'success'
    ? { requestId: previous.requestId, query: previous.query,
        rows: [{ id: 'northwind', name: 'Northwind', amount: '12.00' }],
        total: { kind: 'known', totalRows: 1 } }
    : { requestId: previous.requestId, query: previous.query,
        rows: [], total: { kind: 'unknown', hasMore: false }, error: 'Server failed' }
  expect(grid.setExternalState(response)).toBe(true)
  await grid.updateComplete

  // The response to "Nor" may update the rows/status, but not the "Nort" draft.
  expect(grid.getQuery()).toMatchObject({ requestId: 2, query: { search: 'Nor' } })
  expect(input.value).toBe('Nort')
  expect(grid.shadowRoot?.activeElement).toBe(input)
  expect(vi.getTimerCount()).toBe(1)
  vi.advanceTimersByTime(99)
  expect(events).toHaveLength(1)
  vi.advanceTimersByTime(1)
  await grid.updateComplete
  expect(events.map(event => [event.requestId, event.query.search])).toEqual([[2, 'Nor'], [3, 'Nort']])
  expect(grid.getQuery()).toMatchObject({ requestId: 3, query: { search: 'Nort' } })
  expect(grid.setExternalState(response)).toBe(false)
  expect(grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')!.value).toBe('Nort')
})

it('emits immediate external typing intents only when delay is zero', async () => {
  const grid = await setup()
  grid.quickSearchDebounceMs = 0
  grid.quickSearchDebounceThreshold = Number.MAX_SAFE_INTEGER
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  typeSearch(grid, 'A'); typeSearch(grid, 'AB'); typeSearch(grid, 'ABC')
  expect(events.map(event => [event.requestId, event.query.search])).toEqual([[2, 'A'], [3, 'AB'], [4, 'ABC']])
  expect(vi.getTimerCount()).toBe(0)
})

it('clears search immediately and cancels pending input without consuming an extra ID', async () => {
  const grid = await setup()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  grid.setQuickSearch('Existing')
  typeSearch(grid, 'Pending')
  await grid.updateComplete
  button(grid, 'Clear').click()
  vi.advanceTimersByTime(300)
  await grid.updateComplete
  expect(events.map(event => [event.requestId, event.query.search])).toEqual([[2, 'Existing'], [3, '']])
  expect(grid.getQuickSearch()).toBe('')
  expect(grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Quick search"]')!.value).toBe('')
  typeSearch(grid, 'Never applied')
  grid.clearQuickSearch()
  vi.advanceTimersByTime(300)
  expect(events).toHaveLength(2)
  expect(grid.getQuery().requestId).toBe(3)
})

it('cancels pending input on imperative or accepted controlled search replacement', async () => {
  const grid = await setup()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  typeSearch(grid, 'Pending')
  grid.setQuickSearch('Imperative')
  vi.advanceTimersByTime(300)
  expect(events.map(event => [event.requestId, event.query.search])).toEqual([[2, 'Imperative']])
  typeSearch(grid, 'Also pending')
  grid.externalState = initial({ requestId: 3, query: { ...initial().query, search: 'Controlled' } })
  vi.advanceTimersByTime(300)
  expect(events).toHaveLength(1)
  expect(grid.getQuery()).toMatchObject({ requestId: 3, query: { search: 'Controlled' } })
})

it('cancels pending external input on disconnect and does not replay it on reconnect', async () => {
  const grid = await setup()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const listener = vi.fn()
  grid.addEventListener('query-change', listener)
  typeSearch(grid, 'Pending')
  expect(vi.getTimerCount()).toBe(1)
  grid.remove()
  expect(vi.getTimerCount()).toBe(0)
  vi.advanceTimersByTime(300)
  document.body.append(grid)
  await grid.updateComplete
  vi.advanceTimersByTime(300)
  expect(listener).not.toHaveBeenCalled()
  expect(grid.getQuery().requestId).toBe(1)
})

it.each([0, 1, 100_000])('ignores legacy data of length %i during an external debounce', async length => {
  const grid = await setup()
  grid.quickSearchDebounceThreshold = 0
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const events: GridQueryChangeDetail[] = []
  grid.addEventListener('query-change', event => events.push(event.detail))
  typeSearch(grid, 'A')
  vi.advanceTimersByTime(100)
  grid.data = new Array(length)
  typeSearch(grid, 'AB')
  expect(events).toEqual([])
  vi.advanceTimersByTime(100)
  grid.data = []
  vi.advanceTimersByTime(49)
  expect(events).toEqual([])
  vi.advanceTimersByTime(1)
  expect(events.map(event => [event.requestId, event.query.search])).toEqual([[2, 'AB']])
  expect(grid.getPagination().totalRows).toBe(-1)
})

it.each([{ count: 2, delay: 150, immediate: true }, { count: 3, delay: 150, immediate: false }, { count: 4, delay: 150, immediate: false }, { count: 4, delay: 0, immediate: true }])('retains local threshold behavior: $count rows, $delay ms', async ({ count, delay, immediate }) => {
  const grid = await setup()
  grid.config = { pagination: { enabled: true, pageSize: 20 } }
  grid.quickSearchDebounceThreshold = 3
  grid.quickSearchDebounceMs = delay
  grid.data = Array.from({ length: count }, (_, id) => ({ id, name: `Alpha ${id}` }))
  await grid.updateComplete
  grid.renderRoot.querySelector<HTMLButtonElement>('[aria-label="Show column actions"]')!.click()
  await grid.updateComplete
  button(grid, 'Show Quick Search').click()
  await grid.updateComplete
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const listener = vi.fn()
  grid.addEventListener('query-change', listener)
  typeSearch(grid, 'A'); typeSearch(grid, 'Al')
  expect(grid.getQuickSearch()).toBe(immediate ? 'Al' : '')
  vi.advanceTimersByTime(150)
  expect(grid.getQuickSearch()).toBe('Al')
  expect(listener).not.toHaveBeenCalled()
})
