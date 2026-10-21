// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DataGrid, type DataGridRef } from './DataGrid.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

it('uses current callbacks for synchronous input changes and cleans up on unmount', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const first = vi.fn(), latest = vi.fn()
  let ref: DataGridRef | null = null
  const data = [{ id: 'same-id', name: 'Site A' }]
  const render = (callback = first, scopeKey = 'site-a', rows = data) => act(() => root.render(
    <DataGrid ref={(value: DataGridRef | null) => { ref = value }} data={rows} columns={[{ key: 'name' }]}
      config={{ selection: { mode: 'row', rowKey: 'id', scopeKey } }} onSelectionChange={callback} />
  ))
  try {
    render()
    const grid = container.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    expect(first.mock.calls[0][0]).toMatchObject({ mode: 'row', rows: [] })
    first.mockClear()
    act(() => { ref!.selectRowByKey('same-id') })
    expect(first).toHaveBeenCalledTimes(1)
    render(latest, 'site-b', [{ id: 'same-id', name: 'Site B' }])
    expect(first).toHaveBeenCalledTimes(1)
    expect(latest).toHaveBeenCalledTimes(1)
    expect(latest.mock.calls[0][0].rows).toEqual([])
    act(() => { ref!.selectRowByKey('same-id') })
    expect(latest.mock.calls[1][0].rows[0].row.name).toBe('Site B')
    expect(ref!.getSelectionSnapshot().rows[0].key).toBe('same-id')
    const remove = vi.spyOn(grid, 'removeEventListener')
    act(() => root.unmount())
    expect(remove.mock.calls.some(([type]) => type === 'selection-change')).toBe(true)
    grid.clearSelection()
    expect(latest).toHaveBeenCalledTimes(2)
  } finally { if (container.childNodes.length) act(() => root.unmount()); container.remove() }
})
