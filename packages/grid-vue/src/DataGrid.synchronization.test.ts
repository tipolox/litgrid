// @vitest-environment jsdom
import { createApp, h, nextTick, shallowRef } from 'vue'
import { expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'

it.each([undefined, 0])('batches reactive input changes and preserves mutation signaling (revision %s)', async revision => {
  const host = document.createElement('div')
  document.body.append(host)
  const data = Array.from({ length: 150 }, (_, id) => ({ id, name: `Person ${id}` }))
  const state = shallowRef({ data, dataRevision: revision, columns: [{ key: 'id' }, { key: 'name' }], config: { selection: { mode: 'row' as const, rowKey: 'id' }, pagination: { enabled: true, pageSize: 25 } }, ariaLabel: 'Initial', theme: 'light' as 'light' | 'dark' })
  const app = createApp({ render: () => h(DataGrid, state.value) })
  const adopt = vi.spyOn(WebGrid.prototype, 'updateData')
  try {
    app.mount(host)
    const grid = host.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    grid.setPage(2); grid.selectRowByKey(51); grid.setColumnWidth('name', 240); grid.moveColumn('name', 0)
    adopt.mockClear()
    state.value = { ...state.value, theme: 'dark', ariaLabel: 'Updated', config: { ...state.value.config }, columns: [...state.value.columns] }
    await nextTick()
    expect(adopt).toHaveBeenCalledTimes(revision === undefined ? 1 : 0)
    expect(grid.getPagination().pageIndex).toBe(2)
    expect(grid.getSelectionSnapshot().rows[0].key).toBe(51)
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    expect(grid.getColumnOrder()).toEqual(['name', 'id'])
    data.push({ id: 150, name: 'Added' })
    state.value = { ...state.value, ariaLabel: 'Mutated', dataRevision: revision === undefined ? undefined : 1 }
    await nextTick()
    expect(grid.getTotalRowCount()).toBe(151)
    expect(grid.getPagination().pageIndex).toBe(2)
  } finally { app.unmount(); host.remove(); vi.restoreAllMocks() }
})
