// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from '../../grid-web/src/components/DataGrid.js'
import { initGrid, updateInputs, disposeGrid, type BlazorGridInputs } from './index.js'

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks() })

const inputs = (columns = [{ key: 'id', width: 80 }, { key: 'name', width: 220 }, { key: 'department', width: 180 }]): BlazorGridInputs => ({
  data: [{ id: 2, name: 'Grace', department: null }, { id: 1, name: 'Ada', department: 'Computing' }],
  columns, declarativeColumns: true, config: { selection: { mode: 'cell' } },
  theme: 'light', ariaLabel: 'Employees', ariaDescription: '', screenReaderAnnouncements: true,
  height: 320, rowHeight: 36, overscan: 4, columnOverscan: 2, bestFitSampleSize: 10,
  quickSearchDebounceThreshold: 10000, quickSearchDebounceMs: 150
})

const mount = async (settings = inputs()) => {
  const grid = new DataGrid()
  document.body.append(grid)
  const helper = { invokeMethodAsync: vi.fn().mockResolvedValue(undefined) }
  initGrid(grid, helper, settings)
  await grid.updateComplete
  return { grid, helper }
}

it('keeps customization and active-cell identity on unchanged schemas and selective metadata changes', async () => {
  const settings = inputs()
  const { grid, helper } = await mount(settings)
  grid.setColumnWidth('name', 333)
  grid.moveColumn('name', 0)
  grid.setColumnVisible('department', false)
  await grid.updateComplete
  const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await grid.updateComplete
  const active = viewport.getAttribute('aria-activedescendant')
  const schema = vi.spyOn(grid, 'updateColumnSchema')
  const data = vi.spyOn(DataGrid.prototype, 'data', 'set')
  helper.invokeMethodAsync.mockClear()
  for (let i = 0; i < 10; i++) {
    const { columns: _, ...unchanged } = settings
    updateInputs(grid, JSON.parse(JSON.stringify(unchanged)))
    await grid.updateComplete
  }
  expect(schema).not.toHaveBeenCalled()
  expect(data).toHaveBeenCalledTimes(10)
  expect(grid.getColumnOrder()).toEqual(['name', 'id', 'department'])
  expect(grid.getColumnWidth({ key: 'name' })).toBe(333)
  expect(grid.isColumnVisible('department')).toBe(false)
  expect(viewport.getAttribute('aria-activedescendant')).toBe(active)

  // A column-only update must not resend row data or emit interaction callbacks.
  const { data: _, ...columnOnly } = settings
  updateInputs(grid, { ...columnOnly, columns: settings.columns!.map(column => ({ ...column, header: 'Changed' })) })
  await grid.updateComplete
  expect(data).toHaveBeenCalledTimes(10)
  expect(grid.getColumnWidth({ key: 'name' })).toBe(333)
  expect(grid.isColumnVisible('department')).toBe(false)
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
  disposeGrid(grid)
})

it('applies explicit width/visibility/order changes independently and removes stale state', async () => {
  const settings = inputs()
  const { grid } = await mount(settings)
  grid.setColumnWidth('name', 333)
  grid.setColumnWidth('id', 111)
  grid.moveColumn('name', 0)
  grid.setColumnVisible('department', false)
  updateInputs(grid, { ...settings, columns: [{ key: 'id', width: 80 }, { key: 'name', width: 250 }, { key: 'department', width: 180, hidden: false }] })
  await grid.updateComplete
  expect(grid.getColumnWidth({ key: 'name', width: 250 })).toBe(250)
  expect(grid.getColumnWidth({ key: 'id' })).toBe(111)
  expect(grid.isColumnVisible('department')).toBe(true)
  expect(grid.getColumnOrder()).toEqual(['name', 'id', 'department'])
  updateInputs(grid, { ...settings, columnOrderChanged: true, columns: [{ key: 'department', width: 180, hidden: false }, { key: 'id', width: 80 }, { key: 'new', width: 150, hidden: true }] })
  await grid.updateComplete
  expect(grid.getColumnOrder()).toEqual(['department', 'id', 'new'])
  expect(grid.getColumnWidth({ key: 'id' })).toBe(111)
  expect(grid.isColumnVisible('new')).toBe(false)
  expect(grid.getColumnState().columns.some(column => column.key === 'name')).toBe(false)
  updateInputs(grid, { ...settings, columns: [] })
  await grid.updateComplete
  expect(grid.getColumnState().columns).toEqual([])
  expect(grid.renderRoot.querySelectorAll('.header-cell')).toHaveLength(0)
  expect(grid.renderRoot.querySelectorAll('.cell')).toHaveLength(0)
})

it('restores persistence once, then persists reconciled defaults without restoring old declarations', async () => {
  localStorage.setItem('schema-test', JSON.stringify({ version: 1, columns: [{ key: 'name', width: 333, visible: false }, { key: 'id', width: 111, visible: true }] }))
  const settings = { ...inputs(), columnStateStorageKey: 'schema-test' }
  const { grid, helper } = await mount(settings)
  expect(grid.getColumnOrder()).toEqual(['name', 'id', 'department'])
  expect(grid.getColumnWidth({ key: 'name' })).toBe(333)
  helper.invokeMethodAsync.mockClear()
  updateInputs(grid, { ...settings, columns: [{ key: 'id', width: 80 }, { key: 'name', width: 260, hidden: false }] })
  await grid.updateComplete
  expect(grid.getColumnWidth({ key: 'name', width: 260 })).toBe(260)
  expect(grid.isColumnVisible('name')).toBe(true)
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
  const persisted = JSON.parse(localStorage.getItem('schema-test')!)
  expect(persisted.columns.map((column: { key: string }) => column.key)).toEqual(['name', 'id'])
  disposeGrid(grid)
  grid.remove()
  const { grid: restored } = await mount({ ...settings, columns: [{ key: 'id', width: 80 }, { key: 'name', width: 260, hidden: false }] })
  expect(restored.isColumnVisible('name')).toBe(true)
  expect(restored.getColumnWidth({ key: 'id' })).toBe(111)
})

it('preserves legacy inference and literal programmatic keys, including after switching modes', async () => {
  const settings = { ...inputs([]), declarativeColumns: false }
  const { grid } = await mount(settings)
  expect(grid.getColumnOrder()).toEqual(['id', 'name', 'department'])
  updateInputs(grid, { ...settings, declarativeColumns: true, columns: [] })
  await grid.updateComplete
  expect(grid.getColumnOrder()).toEqual([])
  updateInputs(grid, { ...settings, columns: [{ key: 'Name' }] })
  await grid.updateComplete
  expect(grid.getColumnOrder()).toEqual(['Name'])
})

it('cancels an in-flight resize silently when a schema update arrives', async () => {
  const settings = inputs()
  const { grid, helper } = await mount(settings)
  grid.renderRoot.querySelector('.resize-handle')!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 80, bubbles: true }))
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: 120 }))
  helper.invokeMethodAsync.mockClear()
  updateInputs(grid, { ...settings, columns: [{ key: 'name', width: 220 }] })
  await grid.updateComplete
  window.dispatchEvent(new MouseEvent('pointerup'))
  expect(helper.invokeMethodAsync).not.toHaveBeenCalled()
  expect(grid.getColumnState().columns.map(column => column.key)).toEqual(['name'])
})

it('keeps row and column virtualization bounded for 30,000 rows and 120 columns', async () => {
  const columns = Array.from({ length: 120 }, (_, i) => ({ key: `c${i}`, width: 100 }))
  const settings = { ...inputs(columns), data: Array.from({ length: 30000 }, (_, i) => Object.fromEntries(columns.map(column => [column.key, i]))) }
  const { grid } = await mount(settings)
  const schema = vi.spyOn(grid, 'updateColumnSchema')
  const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  for (let i = 0; i < 10; i++) {
    viewport.scrollTop = i * 10000
    viewport.scrollLeft = i * 1000
    viewport.dispatchEvent(new Event('scroll'))
  }
  await new Promise(resolve => setTimeout(resolve, 30))
  await grid.updateComplete
  expect(grid.renderRoot.querySelectorAll('.row').length).toBeLessThan(30)
  expect(grid.renderRoot.querySelectorAll('.header-cell').length).toBeLessThan(20)
  expect(schema).not.toHaveBeenCalled()
})
