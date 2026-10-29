// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from '../../grid-web/src/components/DataGrid.js'
import { initGrid, updateInputs, disposeGrid, type BlazorGridInputs } from './index.js'

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks() })

it('preserves navigation for full serialized parameter updates and syncs replacement collections/config changes', async () => {
  const grid = new DataGrid()
  document.body.append(grid)
  const inputs: BlazorGridInputs = {
    data: [{ name: 'Ada' }, { name: 'Grace' }], columns: [{ key: 'name' }],
    config: { selection: { mode: 'multi-row' } }, theme: 'light', ariaLabel: 'People',
    ariaDescription: '', screenReaderAnnouncements: true, height: 320, rowHeight: 36,
    overscan: 4, columnOverscan: 2, bestFitSampleSize: 10,
    quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150
  }
  initGrid(grid, { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }, inputs)
  await grid.updateComplete
  grid.columnStateStorageKey = 'navigation-test'
  grid.setColumnState({ version: 1, columns: [{ key: 'name', width: 160, visible: true }] })
  await grid.updateComplete
  const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  grid.selectRow(1)
  await grid.updateComplete
  const id = viewport.getAttribute('aria-activedescendant')
  const setData = vi.spyOn(DataGrid.prototype, 'data', 'set')
  const setColumns = vi.spyOn(DataGrid.prototype, 'columns', 'set')
  const setConfig = vi.spyOn(DataGrid.prototype, 'config', 'set')
  const setHeight = vi.spyOn(DataGrid.prototype, 'viewportHeight', 'set')
  for (const change of [{ theme: 'dark' }, { ariaLabel: 'New label' }, { ariaDescription: 'Help' }, { screenReaderAnnouncements: false }]) {
    // .NET resends mutable collections as new JS arrays on each parameter update.
    updateInputs(grid, JSON.parse(JSON.stringify({ ...inputs, ...change })) as BlazorGridInputs)
    await grid.updateComplete
    expect(viewport.getAttribute('aria-activedescendant')).toBe(id)
  }
  expect(setData).toHaveBeenCalledTimes(4)
  expect(setColumns).toHaveBeenCalledTimes(4)
  expect(setConfig).not.toHaveBeenCalled()
  expect(setHeight).not.toHaveBeenCalled()
  setData.mockClear()
  setColumns.mockClear()
  updateInputs(grid, { ...inputs, data: [{ name: 'Lin' }], columns: [{ key: 'name', header: 'Person' }] })
  await grid.updateComplete
  expect(setData).toHaveBeenCalledTimes(1)
  expect(setColumns).toHaveBeenCalledTimes(1)
  expect(grid.renderRoot.querySelector('.cell')!.textContent).toContain('Lin')
  expect(grid.renderRoot.querySelector('.header-label')!.textContent).toContain('Person')
  updateInputs(grid, { ...inputs, config: { selection: { mode: 'cell' } } })
  await grid.updateComplete
  expect(setConfig).toHaveBeenCalledTimes(1)
  expect(grid.getSelection().mode).toBe('cell')
  disposeGrid(grid)
})

it.each([false, true])('synchronizes same-reference row/column mutations (serialized: %s)', async (serialize) => {
  const grid = new DataGrid()
  document.body.append(grid)
  const inputs: BlazorGridInputs & Required<Pick<BlazorGridInputs, 'data' | 'columns'>> = {
    data: [{ name: 'Ada' }, { name: 'Grace' }], columns: [{ key: 'name' }],
    config: {}, theme: 'light', ariaLabel: 'People', ariaDescription: '',
    screenReaderAnnouncements: true, height: 320, rowHeight: 36, overscan: 4,
    columnOverscan: 2, bestFitSampleSize: 10, quickSearchDebounceThreshold: 10000,
    quickSearchDebounceMs: 150
  }
  const send = () => updateInputs(grid, serialize ? JSON.parse(JSON.stringify(inputs)) : inputs)
  initGrid(grid, { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }, inputs)
  await grid.updateComplete
  viewportFor(grid).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await grid.updateComplete
  const id = viewportFor(grid).getAttribute('aria-activedescendant')
  inputs.data.push({ name: 'Katherine', team: 'Science' })
  Object.assign(inputs.data[0]!, { name: 'Updated Ada', team: 'Computing' })
  inputs.columns[0].header = 'Full name'
  inputs.columns.push({ key: 'team', header: 'Team' })
  send()
  await grid.updateComplete
  expect(viewportFor(grid).getAttribute('aria-activedescendant')).toBe(id)
  expect(viewportFor(grid).getAttribute('aria-rowcount')).toBe('4')
  expect(grid.renderRoot.querySelector('.cell')!.textContent).toContain('Updated Ada')
  expect(grid.renderRoot.querySelector('.header-label')!.textContent).toContain('Full name')
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(2)
  inputs.data.splice(2)
  inputs.columns.splice(1)
  send()
  await grid.updateComplete
  const activeId = viewportFor(grid).getAttribute('aria-activedescendant')!
  expect(grid.renderRoot.querySelector(`[id="${activeId}"]`)!.getAttribute('data-row-index')).toBe('1')
  expect(viewportFor(grid).getAttribute('aria-rowcount')).toBe('3')
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(1)
  disposeGrid(grid)
})

const viewportFor = (grid: DataGrid) => grid.renderRoot.querySelector<HTMLElement>('.viewport')!
