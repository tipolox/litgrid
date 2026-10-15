// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from '../../grid-web/src/components/DataGrid.js'
import { initGrid, updateInputs, syncGridInputs, type BlazorGridInputs } from './index.js'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); localStorage.clear() })
const original = (declarativeColumns = true): BlazorGridInputs => ({
  data: [{ id: 1, name: 'Ada' }], columns: [{ key: 'id', header: 'ID' }, { key: 'name', header: 'Name' }],
  declarativeColumns, config: { selection: { mode: 'cell' } }, theme: 'light',
  ariaLabel: 'Original', ariaDescription: '', screenReaderAnnouncements: true,
  height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10,
  quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150, columnStateStorageKey: 'A'
})
async function mount(declarative = true) {
  const grid = new DataGrid(); document.body.append(grid)
  initGrid(grid, { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }, original(declarative))
  await grid.updateComplete; return grid
}
function failConfigAfterApplying() {
  const setter = Object.getOwnPropertyDescriptor(DataGrid.prototype, 'config')!.set!
  return vi.spyOn(DataGrid.prototype, 'config', 'set').mockImplementationOnce(function(value) {
    setter.call(this, value); throw new Error('config after apply')
  })
}

it.each([false, true])('restores reverted aria and configuration after a later setter fails (declarative=%s)', async declarative => {
  const grid = await mount(declarative)
  const config = failConfigAfterApplying()
  expect(() => updateInputs(grid, { ariaLabel: 'Changed', config: { selection: { mode: 'row' } } })).toThrow('config after apply')
  await grid.updateComplete
  expect(grid.ariaLabel).toBe('Changed'); expect(grid.getSelection().mode).toBe('row')
  updateInputs(grid, { ariaLabel: 'Original', config: { selection: { mode: 'cell' } } })
  await grid.updateComplete
  expect(grid.ariaLabel).toBe('Original')
  expect(grid.renderRoot.querySelector('.viewport')!.getAttribute('aria-label')).toBe('Original')
  expect(grid.getSelection().mode).toBe('cell')
  expect(config).toHaveBeenCalledTimes(2)
  updateInputs(grid, { ariaLabel: 'Original', config: { selection: { mode: 'cell' } } })
  expect(config).toHaveBeenCalledTimes(2)
})

it('repairs omitted uncertain fields to successful state without retransmitting unrelated data', async () => {
  const grid = await mount(); failConfigAfterApplying()
  expect(() => updateInputs(grid, { ariaLabel: 'Changed', config: { selection: { mode: 'row' } } })).toThrow()
  const data = vi.spyOn(DataGrid.prototype, 'data', 'set')
  updateInputs(grid, { ariaDescription: 'Retry' }); await grid.updateComplete
  expect(grid.ariaLabel).toBe('Original'); expect(grid.getSelection().mode).toBe('cell')
  expect(grid.renderRoot.querySelector('.viewport')!.getAttribute('aria-label')).toBe('Original')
  expect(data).not.toHaveBeenCalled()
})

it('restores inference after a failed declarative mode transition and value reversion', async () => {
  const grid = await mount(false); failConfigAfterApplying()
  expect(() => updateInputs(grid, { declarativeColumns: true, columns: [{ key: 'id' }], config: { selection: { mode: 'row' } } })).toThrow()
  expect(grid.inferColumns).toBe(false)
  updateInputs(grid, { declarativeColumns: false, columns: [], config: { selection: { mode: 'cell' } } })
  await grid.updateComplete
  expect(grid.inferColumns).toBe(true)
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(2)
  expect(grid.renderRoot.querySelectorAll('.cell')[1].textContent).toContain('Ada')
})

it.each(['A', null])('restores schema and persistence after failure with retry key %s', async key => {
  localStorage.setItem('B', JSON.stringify({ version: 1, columns: [{ key: 'name', width: 290, visible: true }] }))
  const grid = await mount(); failConfigAfterApplying()
  const savedA = localStorage.getItem('A'), savedB = localStorage.getItem('B')
  expect(() => updateInputs(grid, { columns: [{ key: 'name', header: 'Changed' }], columnStateStorageKey: 'B', config: { selection: { mode: 'row' } } })).toThrow()
  updateInputs(grid, { ...original(), columnStateStorageKey: key }); await grid.updateComplete
  expect(grid.columnStateStorageKey).toBe(key)
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(2)
  expect(grid.renderRoot.querySelectorAll('.header-cell')[1].textContent).toContain('Name')
  expect(grid.getSelection().mode).toBe('cell')
  expect(localStorage.getItem('A')).toBe(savedA); expect(localStorage.getItem('B')).toBe(savedB)
})

it('retries omitted schema after a helper mutates the grid and then throws', async () => {
  const grid = await mount()
  const helper = grid.updateColumnSchema.bind(grid)
  vi.spyOn(grid, 'updateColumnSchema').mockImplementationOnce((...args) => { helper(...args); throw new Error('schema after apply') })
  expect(() => updateInputs(grid, { columns: [{ key: 'id', header: 'Changed' }] })).toThrow('schema after apply')
  updateInputs(grid, { ariaDescription: 'Retry' }); await grid.updateComplete
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(2)
  expect(grid.renderRoot.querySelectorAll('.header-cell')[0].textContent).toContain('ID')
})

it('retains uncertainty across a second failure and restores the original scalar on a third retry', async () => {
  const grid = await mount(); const config = failConfigAfterApplying()
  expect(() => updateInputs(grid, { ariaLabel: 'Changed', config: { selection: { mode: 'row' } } })).toThrow()
  const setter = Object.getOwnPropertyDescriptor(DataGrid.prototype, 'config')!.set!
  config.mockImplementationOnce(function(value) { setter.call(this, value); throw new Error('second failure') })
  expect(() => updateInputs(grid, { ariaLabel: 'Second', config: original().config })).toThrow('second failure')
  updateInputs(grid, {}); await grid.updateComplete
  expect(grid.ariaLabel).toBe('Original'); expect(grid.getSelection().mode).toBe('cell')
})

it('restores declaration order after a schema helper applies order and then fails', async () => {
  const grid = await mount(); const helper = grid.updateColumnSchema.bind(grid)
  vi.spyOn(grid, 'updateColumnSchema').mockImplementationOnce((...args) => { helper(...args); throw new Error('order after apply') })
  expect(() => updateInputs(grid, { columns: [...original().columns!].reverse(), columnOrderChanged: true })).toThrow()
  expect(grid.getColumnOrder()).toEqual(['name', 'id'])
  updateInputs(grid, { columns: original().columns }); await grid.updateComplete
  expect(grid.getColumnOrder()).toEqual(['id', 'name'])
  expect(grid.renderRoot.querySelectorAll('.header-cell')[0].textContent).toContain('ID')
})

it('supports an old-shaped runtime for legacy patches and explicitly rejects missing declarative capabilities', () => {
  const element = document.createElement('div')
  // A legacy-only custom implementation can still use the structural API.
  const legacy = Object.assign(element, { data: [], columns: [], config: {}, columnStateStorageKey: null })
  syncGridInputs(legacy as unknown as Parameters<typeof syncGridInputs>[0], { data: [{ id: 1 }], declarativeColumns: false })
  expect(legacy.data).toEqual([{ id: 1 }]); expect('inferColumns' in legacy).toBe(false)
  expect(() => syncGridInputs(legacy as unknown as Parameters<typeof syncGridInputs>[0], { declarativeColumns: true })).toThrow('require inferColumns and updateColumnSchema support')
})

it('uses the latest successful programmatic schema when a mode/namespace patch omits columns', async () => {
  const grid = await mount()
  updateInputs(grid, { declarativeColumns: false, columns: [{ key: 'name', header: 'Programmatic' }] })
  updateInputs(grid, { declarativeColumns: true, columnStateStorageKey: 'B' })
  await grid.updateComplete
  expect(grid.columnStateStorageKey).toBe('B')
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(1)
  expect(grid.renderRoot.querySelector('.header-cell')!.textContent).toContain('Programmatic')
})
