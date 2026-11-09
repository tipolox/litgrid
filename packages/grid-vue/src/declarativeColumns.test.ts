// @vitest-environment jsdom
import { Comment, Fragment, createApp, h, nextTick, shallowRef, type VNode } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '@tipolox/litgrid-web'
import { DataGrid, type DataGridInstance } from './DataGrid.js'
import { LitGridColumn } from './LitGridColumn.js'
import { readDeclarativeColumns } from './declarativeColumns.js'

const cleanup: (() => void)[] = []
afterEach(() => { cleanup.splice(0).forEach(fn => fn()); localStorage.clear() })
const column = (field: string, props = {}) => h(LitGridColumn, { field, ...props })

async function mount(content: () => VNode[], initial: Record<string, unknown> = {}) {
  const props = shallowRef(initial)
  const component = shallowRef<DataGridInstance | null>(null)
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({ render: () => h(DataGrid, {
    data: [{ id: 1, name: 'Ada', role: 'Engineer' }], ...props.value, ref: component
  }, { default: content }) })
  const errors: unknown[] = []
  app.config.errorHandler = error => { errors.push(error) }
  app.mount(host)
  cleanup.push(() => { app.unmount(); host.remove() })
  await nextTick()
  const api = component.value!
  const grid = api.gridElement!
  return { api, grid, props, host, errors }
}

describe('Vue declarative columns', () => {
  it('reads deterministic fragments, comments, Boolean attributes, callbacks and typed columns', () => {
    interface Person { name: string }
    const typed = { key: 'label', accessor: (row: Person) => row.name } satisfies GridColumn<Person>
    expect(readDeclarativeColumns([
      h(Comment), h(Fragment, [column('id', { width: 80, hidden: '' }),
        h(Fragment, [h(LitGridColumn, { column: typed, key: 'vue-identity' })])])
    ])).toEqual([{ key: 'id', width: 80, hidden: true }, typed])
  })

  it('rejects duplicate/empty keys, mixed marker props and unsupported wrappers', () => {
    expect(() => readDeclarativeColumns([column('id'), column('id')])).toThrow('Duplicate LitGridColumn key: id')
    expect(() => readDeclarativeColumns([column(' ')])).toThrow('nonempty')
    expect(() => readDeclarativeColumns([h(LitGridColumn, { column: { key: 'id' }, field: 'id' })])).toThrow('not both')
    expect(() => readDeclarativeColumns([h('div', [column('id')])])).toThrow('only direct')
    expect(() => readDeclarativeColumns([h({ render: () => column('id') })])).toThrow('only direct')
    expect(() => readDeclarativeColumns([h(LitGridColumn, { field: 'id' }, { default: () => 'cell' })])).toThrow('metadata only')
    expect(readDeclarativeColumns([h(Fragment), h(Fragment, [null, false, [' ', column('id')]])])).toEqual([{ key: 'id' }])
  })

  it('initializes metadata without mounting child instances or DOM', async () => {
    const { grid, api, host } = await mount(() => [column('id', { header: 'ID', width: 80 }), column('name')])
    expect(api.getColumnOrder()).toEqual(['id', 'name'])
    expect(grid.inferColumns).toBe(false)
    expect(api.getColumnWidth({ key: 'id', width: 80 })).toBe(80)
    expect(host.querySelector('yc-grid')!.childNodes).toHaveLength(0)
  })

  it('reconciles v-if/v-for membership, reorders, dynamic fields and Vue keys', async () => {
    const fields = shallowRef(['id', 'name'])
    const show = shallowRef(true)
    const vueKey = shallowRef('first')
    const { api } = await mount(() => [h(Fragment, fields.value.map(field => column(field, { key: `${vueKey.value}-${field}` }))),
      show.value ? column('role') : h(Comment)])
    fields.value = ['name', 'id']; await nextTick()
    expect(api.getColumnOrder()).toEqual(['name', 'id', 'role'])
    show.value = false; await nextTick()
    expect(api.getColumnOrder()).toEqual(['name', 'id'])
    fields.value = ['role', 'id']; await nextTick()
    expect(api.getColumnOrder()).toEqual(['role', 'id'])
    vueKey.value = 'second'; await nextTick()
    expect(api.getColumnOrder()).toEqual(['role', 'id'])
    fields.value = []; await nextTick()
    expect(api.getColumnOrder()).toEqual([])
    fields.value = ['name']; await nextTick()
    expect(api.getColumnOrder()).toEqual(['name'])
  })

  it('preserves user order, widths and visibility across metadata changes; applies declaration reorders', async () => {
    const fields = shallowRef(['id', 'name', 'role'])
    const header = shallowRef('Name')
    const width = shallowRef(220)
    const { api, grid } = await mount(() => fields.value.map(field => column(field,
      field === 'name' ? { header: header.value, width: width.value } : {})))
    api.moveColumn('role', 0)
    api.setColumnWidth('name', 333)
    api.setColumnVisible('id', false)
    const sync = vi.spyOn(grid, 'updateColumnSchema')
    header.value = 'Person'; await nextTick()
    expect(sync).toHaveBeenCalledTimes(1)
    expect(sync.mock.calls[0][1]).toBe(false)
    expect(api.getColumnOrder()).toEqual(['role', 'id', 'name'])
    expect(api.getColumnState().columns.find(c => c.key === 'name')?.width).toBe(333)
    expect(api.isColumnVisible('id')).toBe(false)
    fields.value = ['name', 'id', 'role']; await nextTick()
    expect(api.getColumnOrder()).toEqual(fields.value)
    expect(api.isColumnVisible('id')).toBe(false)
    width.value = 240; await nextTick()
    expect(api.getColumnState().columns.find(c => c.key === 'name')?.width).toBeUndefined()
  })

  it('gives explicit arrays precedence without evaluating the slot and restores inference on source switch', async () => {
    const slot = vi.fn(() => [column('name'), column('name')])
    const { api, grid, props } = await mount(slot, { columns: [] })
    expect(slot).not.toHaveBeenCalled()
    expect(api.getColumnOrder()).toEqual(['id', 'name', 'role'])
    props.value = { columns: [{ key: 'role' }] }; await nextTick()
    expect(api.getColumnOrder()).toEqual(['role'])
    expect(grid.inferColumns).toBe(true)
  })

  it('keeps the array path unchanged when only an ignored slot is replaced', async () => {
    const version = shallowRef(0)
    const api = shallowRef<DataGridInstance | null>(null)
    const data = [{ id: 1 }]
    const columns = [{ key: 'id' }]
    const slot = vi.fn(() => [column('unused')])
    const host = document.createElement('div'); document.body.append(host)
    const app = createApp({ render: () => {
      // Force a parent update that supplies a fresh unused slot function.
      void version.value
      return h(DataGrid, { ref: api, data, columns }, { default: () => slot() })
    } })
    app.mount(host)
    cleanup.push(() => { app.unmount(); host.remove() })
    await nextTick()
    const grid = api.value!.gridElement!
    const assignData = vi.spyOn(grid, 'data', 'set')
    const schema = vi.spyOn(grid, 'updateColumnSchema')
    version.value++; await nextTick()
    expect(slot).not.toHaveBeenCalled()
    expect(assignData).not.toHaveBeenCalled()
    expect(schema).not.toHaveBeenCalled()
  })

  it('uses an explicit empty slot and restores inference when switching to an empty array', async () => {
    const { api, grid, props } = await mount(() => [])
    expect(api.getColumnOrder()).toEqual([])
    props.value = { columns: [] }; await nextTick()
    expect(grid.inferColumns).toBe(true)
    expect(api.getColumnOrder()).toEqual(['id', 'name', 'role'])
    props.value = {}; await nextTick()
    expect(grid.inferColumns).toBe(false)
    expect(api.getColumnOrder()).toEqual([])
  })

  it('does not synchronize unchanged metadata on slot rerenders or Vue key changes', async () => {
    const key = shallowRef(0)
    const { grid, props } = await mount(() => [column('id', { key: key.value })])
    const sync = vi.spyOn(grid, 'updateColumnSchema')
    key.value++; await nextTick()
    props.value = { height: 420 }; await nextTick()
    expect(sync).not.toHaveBeenCalled()
  })

  it('retains the mounted grid and recovers from invalid declarations without losing listeners or state', async () => {
    const fields = shallowRef(['id', 'name'])
    const onSelectionChange = vi.fn()
    const { api, grid, errors, host } = await mount(() => fields.value.map(field => column(field)), { onSelectionChange })
    api.setColumnWidth('name', 333)
    const sync = vi.spyOn(grid, 'updateColumnSchema')
    fields.value = ['id', 'id']; await nextTick()
    expect(String(errors[0])).toContain('Duplicate LitGridColumn key: id')
    expect(sync).not.toHaveBeenCalled()
    expect(host.querySelector('yc-grid')).toBe(grid)
    expect(api.getColumnOrder()).toEqual(['id', 'name'])
    fields.value = ['name', 'id']; await nextTick()
    expect(api.gridElement).toBe(grid)
    expect(api.getColumnOrder()).toEqual(['name', 'id'])
    expect(api.getColumnState().columns.find(c => c.key === 'name')?.width).toBe(333)
    grid.dispatchEvent(new CustomEvent('selection-change', { detail: {} }))
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
  })

  it('recovers after an invalid initial declaration with one mounted grid', async () => {
    const fields = shallowRef(['id', 'id'])
    const { api, grid, errors } = await mount(() => fields.value.map(field => column(field)))
    expect(errors).toHaveLength(1)
    fields.value = ['name']; await nextTick()
    expect(api.gridElement).toBe(grid)
    expect(api.getColumnOrder()).toEqual(['name'])
  })

  it('recovers from an invalid slot by removing it, restores inference and isolates a fresh mount', async () => {
    const enabled = shallowRef(true)
    const fields = shallowRef(['id', 'id'])
    const api = shallowRef<DataGridInstance | null>(null)
    const host = document.createElement('div'); document.body.append(host)
    const app = createApp({ render: () => h(DataGrid, { ref: api, data: [{ id: 1, name: 'Ada' }] },
      enabled.value ? { default: () => fields.value.map(field => column(field)) } : undefined) })
    const errors: unknown[] = []
    app.config.errorHandler = error => { errors.push(error) }
    app.mount(host)
    cleanup.push(() => { app.unmount(); host.remove() })
    await nextTick()
    expect(errors).toHaveLength(1)
    const grid = api.value!.gridElement!
    enabled.value = false; await nextTick()
    expect(api.value!.gridElement).toBe(grid)
    expect(grid.inferColumns).toBe(true)
    expect(api.value!.getColumnOrder()).toEqual(['id', 'name'])
    fields.value = ['id']; enabled.value = true; await nextTick()
    expect(grid.inferColumns).toBe(false)
    expect(api.value!.getColumnOrder()).toEqual(['id'])
    const other = await mount(() => [column('role')])
    expect(other.api.getColumnOrder()).toEqual(['role'])
    expect(api.value!.getColumnOrder()).toEqual(['id'])
  })
})
