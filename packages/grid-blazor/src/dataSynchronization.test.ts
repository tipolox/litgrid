// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from '../../grid-web/src/components/DataGrid.js'
import { initGrid, updateInputs, type BlazorGridInputs } from './index.js'

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks() })

it('notification batches and explicit refresh payloads always adopt data even with the same JS reference', async () => {
  const grid = await mount()
  const rows = [{ id: 1, name: 'First' }]
  const adoption = vi.spyOn(DataGrid.prototype, 'data', 'set')
  updateInputs(grid, { data: rows })
  rows[0].name = 'Last'
  updateInputs(grid, { data: rows })
  await grid.updateComplete
  expect(adoption).toHaveBeenCalledTimes(2)
  expect(grid.renderRoot.querySelectorAll('.cell')[1].textContent).toContain('Last')
})

it('a failed data adoption can be retried and independent grid instances do not share state', async () => {
  const first = await mount()
  const second = await mount()
  const adoption = vi.spyOn(DataGrid.prototype, 'data', 'set').mockImplementationOnce(() => { throw new Error('data failed') })
  const rows = [{ id: 1, name: 'Changed' }]
  expect(() => updateInputs(first, { data: rows })).toThrow('data failed')
  updateInputs(first, { data: rows })
  await first.updateComplete
  await second.updateComplete
  expect(adoption).toHaveBeenCalledTimes(2)
  expect(first.renderRoot.querySelectorAll('.cell')[1].textContent).toContain('Changed')
  expect(second.renderRoot.querySelectorAll('.cell')[1].textContent).toContain('Ada')
})
const initial = (declarative = true): BlazorGridInputs => ({
  data: [{ id: 1, name: 'Ada' }], columns: [{ key: 'id', width: 80 }, { key: 'name', width: 180 }],
  declarativeColumns: declarative, config: { selection: { mode: 'cell' } }, theme: 'light',
  ariaLabel: 'People', ariaDescription: '', screenReaderAnnouncements: true,
  height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10,
  quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150, columnStateStorageKey: 'a'
})
async function mount(declarative = true) {
  const grid = new DataGrid(); document.body.append(grid)
  initGrid(grid, { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }, initial(declarative))
  await grid.updateComplete
  return grid
}

it.each([false, true])('partial scalar/config patches preserve data, columns and persistence (declarative: %s)', async declarative => {
  const grid = await mount(declarative)
  grid.setColumnWidth('name', 333)
  const data = vi.spyOn(DataGrid.prototype, 'data', 'set')
  const columns = vi.spyOn(DataGrid.prototype, 'columns', 'set')
  const config = vi.spyOn(DataGrid.prototype, 'config', 'set')
  const schema = vi.spyOn(grid, 'updateColumnSchema')
  updateInputs(grid, { ariaLabel: 'Updated' })
  updateInputs(grid, { config: { selection: { mode: 'multi-cell' } } })
  updateInputs(grid, {})
  await grid.updateComplete
  expect(data).not.toHaveBeenCalled(); expect(columns).not.toHaveBeenCalled(); expect(schema).not.toHaveBeenCalled()
  expect(config).toHaveBeenCalledTimes(1)
  expect(grid.columnStateStorageKey).toBe('a')
  expect(grid.getColumnWidth({ key: 'name' })).toBe(333)
  expect(grid.getSelection().mode).toBe('multi-cell')
})

it('declarative schema and namespace patches reconcile together without adopting rows', async () => {
  localStorage.setItem('b', JSON.stringify({ version: 1, columns: [{ key: 'name', width: 290, visible: false }, { key: 'id', width: 95, visible: true }] }))
  const grid = await mount()
  grid.setColumnWidth('name', 333)
  const savedA = localStorage.getItem('a')
  const data = vi.spyOn(DataGrid.prototype, 'data', 'set')
  updateInputs(grid, { columns: [{ key: 'id', width: 80 }, { key: 'name', header: 'Person', width: 180 }], columnStateStorageKey: 'b' })
  await grid.updateComplete
  expect(grid.getColumnWidth({ key: 'name' })).toBe(290)
  expect(localStorage.getItem('a')).toBe(savedA)
  updateInputs(grid, { columnStateStorageKey: 'a' })
  await grid.updateComplete
  expect(grid.getColumnWidth({ key: 'name' })).toBe(333)
  updateInputs(grid, { columnStateStorageKey: null })
  await grid.updateComplete
  expect(grid.columnStateStorageKey).toBeNull()
  expect(data).not.toHaveBeenCalled()
})

it('failed schema/config setters remain retryable with partial inputs', async () => {
  const grid = await mount()
  const columns = [{ key: 'id', header: 'Identifier' }]
  const schema = vi.spyOn(grid, 'updateColumnSchema').mockImplementationOnce(() => { throw new Error('schema failed') })
  expect(() => updateInputs(grid, { columns })).toThrow('schema failed')
  updateInputs(grid, { columns })
  await grid.updateComplete
  expect(schema).toHaveBeenCalledTimes(2)
  const config = vi.spyOn(DataGrid.prototype, 'config', 'set').mockImplementationOnce(() => { throw new Error('config failed') })
  expect(() => updateInputs(grid, { config: { selection: { mode: 'row' } } })).toThrow('config failed')
  updateInputs(grid, { config: { selection: { mode: 'row' } } })
  await grid.updateComplete
  expect(config).toHaveBeenCalledTimes(2)
  expect(grid.getSelection().mode).toBe('row')
})

it('data-only updates preserve active navigation and customized columns', async () => {
  const grid = await mount()
  grid.setColumnWidth('name', 333)
  const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await grid.updateComplete
  const active = viewport.getAttribute('aria-activedescendant')
  updateInputs(grid, { data: [{ id: 1, name: 'Edited' }] })
  await grid.updateComplete
  expect(viewport.getAttribute('aria-activedescendant')).toBe(active)
  expect(grid.getColumnWidth({ key: 'name' })).toBe(333)
  expect(grid.renderRoot.querySelectorAll('.cell')[1].textContent).toContain('Edited')
})
