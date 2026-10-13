// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import type { DataGridElement, GridColumn, GridColumnState } from '@tipolox/litgrid-web'
import type { BlazorGridInputs } from './gridBindings'
// Exercise the self-contained asset that NuGet consumers actually load.
// @ts-ignore The generated shipping bundle has no TypeScript declarations.
import { initGrid, updateInputs, disposeGrid } from './wwwroot/litgrid-blazor.js'

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks() })

const schemaA: GridColumn[] = [{ key: 'id', width: 80 }, { key: 'name', width: 220 }]
const schemaB: GridColumn[] = [{ key: 'department', width: 180 }, { key: 'id', width: 90 }, { key: 'salary', width: 120 }]
const savedA: GridColumnState = { version: 1, columns: [
  { key: 'name', width: 333, visible: false }, { key: 'id', width: 111, visible: true }
] }
const savedB: GridColumnState = { version: 1, columns: [
  { key: 'salary', width: 222, visible: true }, { key: 'department', width: 444, visible: false },
  { key: 'obsolete', width: 777, visible: true }, { key: 'id', width: 555, visible: true }
] }
const effectiveB: GridColumnState = { version: 1, columns: savedB.columns.filter(column => column.key !== 'obsolete') }
const settings = (columns = schemaA, key: string | null = 'A'): BlazorGridInputs => ({
  data: [{ id: 1, name: 'Ada', department: 'Computing', salary: 100 }],
  columns, columnStateStorageKey: key, declarativeColumns: true,
  config: {}, theme: 'light', ariaLabel: 'Employees', ariaDescription: '',
  screenReaderAnnouncements: true, height: 320, rowHeight: 36, overscan: 4,
  columnOverscan: 2, bestFitSampleSize: 10, quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150
})
const seed = () => {
  localStorage.setItem('A', JSON.stringify(savedA))
  localStorage.setItem('B', JSON.stringify(savedB))
}
const read = (key: string) => JSON.parse(localStorage.getItem(key)!)
const mount = async (inputs = settings()) => {
  const grid = document.createElement('yc-grid') as DataGridElement & { updateComplete: Promise<boolean> }
  document.body.append(grid)
  const helper = { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }
  initGrid(grid, helper, inputs)
  await grid.updateComplete
  helper.invokeMethodAsync.mockClear()
  return { grid, helper }
}

it('atomically switches schema and namespace A -> B -> A without overwriting either saved view', async () => {
  seed()
  const { grid, helper } = await mount()
  const writes = vi.spyOn(Storage.prototype, 'setItem')
  updateInputs(grid, settings(schemaB, 'B'))
  await grid.updateComplete
  expect(read('A')).toEqual(savedA)
  expect(read('B')).toEqual(savedB)
  expect(grid.getColumnState()).toEqual(effectiveB)
  updateInputs(grid, settings(schemaA, 'A'))
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual(savedA)
  expect(read('A')).toEqual(savedA)
  expect(read('B')).toEqual(savedB)
  expect(writes).not.toHaveBeenCalled()
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
  disposeGrid(grid)
})

it('uses new schema defaults when the target namespace has no preferences', async () => {
  localStorage.setItem('A', JSON.stringify(savedA))
  const { grid, helper } = await mount()
  updateInputs(grid, settings(schemaB, 'B'))
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual({ version: 1, columns: schemaB.map(column => ({ key: column.key, visible: true })) })
  expect(grid.getColumnWidth(schemaB[1])).toBe(90)
  expect(localStorage.getItem('B')).toBeNull()
  expect(read('A')).toEqual(savedA)
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})

it('switches key -> null -> key with simultaneous schemas without writing the old namespace', async () => {
  seed()
  const { grid, helper } = await mount()
  const writes = vi.spyOn(Storage.prototype, 'setItem')
  updateInputs(grid, settings(schemaB, null))
  await grid.updateComplete
  expect(grid.columnStateStorageKey).toBeNull()
  expect(grid.getColumnOrder()).toEqual(schemaB.map(column => column.key))
  grid.setColumnWidth('id', 999)
  expect(read('A')).toEqual(savedA)
  expect(read('B')).toEqual(savedB)
  helper.invokeMethodAsync.mockClear()
  updateInputs(grid, settings(schemaA, 'A'))
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual(savedA)
  expect(writes).not.toHaveBeenCalled()
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})

it('switches only the namespace when unchanged column metadata is omitted from interop', async () => {
  seed()
  const { grid, helper } = await mount()
  const { columns: _, ...keyOnly } = settings(schemaA, 'B')
  updateInputs(grid, keyOnly)
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual({ version: 1, columns: [
    { key: 'id', width: 555, visible: true }, { key: 'name', visible: true }
  ] })
  expect(read('A')).toEqual(savedA)
  expect(read('B')).toEqual(savedB)
  updateInputs(grid, { ...keyOnly, columnStateStorageKey: 'A' })
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual(savedA)
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})

it('preserves same-namespace schema reconciliation and skips unchanged rerender storage writes', async () => {
  seed()
  const { grid, helper } = await mount()
  const writes = vi.spyOn(Storage.prototype, 'setItem')
  updateInputs(grid, settings([{ key: 'id', width: 80 }, { key: 'name', width: 260 }], 'A'))
  await grid.updateComplete
  expect(grid.getColumnWidth({ key: 'name', width: 260 })).toBe(260)
  expect(grid.isColumnVisible('name')).toBe(false)
  expect(read('A')).toEqual(grid.getColumnState())
  expect(read('B')).toEqual(savedB)
  expect(writes).toHaveBeenCalledTimes(1)
  writes.mockClear()
  const { columns: _, ...unchanged } = settings(schemaA, 'A')
  updateInputs(grid, unchanged)
  await grid.updateComplete
  expect(writes).not.toHaveBeenCalled()
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})

it('persists resize, reorder and visibility only in the selected namespace after switching', async () => {
  seed()
  const { grid, helper } = await mount()
  updateInputs(grid, settings(schemaB, 'B'))
  await grid.updateComplete
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
  grid.setColumnWidth('department', 606)
  grid.moveColumn('id', 0)
  grid.setColumnVisible('department', true)
  await grid.updateComplete
  expect(read('A')).toEqual(savedA)
  expect(read('B')).toEqual(grid.getColumnState())
  expect(read('B').columns.map((column: { key: string }) => column.key)).toEqual(['id', 'salary', 'department'])
  expect(read('B').columns[2]).toEqual({ key: 'department', width: 606, visible: true })
  expect(helper.invokeMethodAsync).toHaveBeenCalledWith('HandleColumnReorder', expect.anything())
  helper.invokeMethodAsync.mockClear()
  updateInputs(grid, settings(schemaA, 'A'))
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual(savedA)
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})

it('keeps both namespaces intact when transitioning to an explicit empty schema', async () => {
  seed()
  const { grid, helper } = await mount()
  updateInputs(grid, settings([], 'B'))
  await grid.updateComplete
  expect(grid.getColumnState().columns).toEqual([])
  expect(read('A')).toEqual(savedA)
  expect(read('B')).toEqual(savedB)
  updateInputs(grid, settings(schemaA, 'A'))
  await grid.updateComplete
  expect(grid.getColumnState()).toEqual(savedA)
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
})
