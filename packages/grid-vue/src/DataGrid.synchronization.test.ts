// @vitest-environment jsdom
import { createApp, h, nextTick, shallowRef } from 'vue'
import { expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'

it('batches reactive input changes and preserves mutation signaling', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const data = Array.from({ length: 150 }, (_, id) => ({ id, name: `Person ${id}` }))
  const state = shallowRef({ data, columns: [{ key: 'id' }, { key: 'name' }], config: { selection: { mode: 'row' as const, rowKey: 'id' }, pagination: { enabled: true, pageSize: 25 } }, ariaLabel: 'Initial', theme: 'light' as 'light' | 'dark' })
  const app = createApp({ render: () => h(DataGrid, state.value) })
  const adopt = vi.spyOn(WebGrid.prototype, 'data', 'set')
  try {
    app.mount(host)
    const grid = host.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    grid.setPage(2); grid.selectRowByKey(51); grid.setColumnWidth('name', 240); grid.moveColumn('name', 0)
    adopt.mockClear()
    state.value = { ...state.value }
    await nextTick()
    expect(adopt).not.toHaveBeenCalled()
    state.value = { ...state.value, theme: 'dark', ariaLabel: 'Updated', config: { ...state.value.config }, columns: [...state.value.columns] }
    await nextTick()
    expect(adopt).toHaveBeenCalledTimes(1)
    expect(grid.getPagination().pageIndex).toBe(2)
    expect(grid.getSelectionSnapshot().rows[0].key).toBe(51)
    expect(grid.getColumnWidth({ key: 'name' })).toBe(240)
    expect(grid.getColumnOrder()).toEqual(['name', 'id'])
    data.push({ id: 150, name: 'Added' })
    state.value = { ...state.value, ariaLabel: 'Mutated' }
    await nextTick()
    expect(grid.getTotalRowCount()).toBe(151)
    expect(grid.getPagination().pageIndex).toBe(2)
  } finally { app.unmount(); host.remove(); vi.restoreAllMocks() }
})
