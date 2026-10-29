// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { DataGrid as WebGrid } from '../../grid-web/src/components/DataGrid.js'
import type { GridColumn } from '@tipolox/litgrid-web'

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

it('retains active navigation through unrelated React rerenders and synchronizes replacement and in-place changes', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let data = [{ name: 'Ada' }, { name: 'Grace' }]
  let columns: GridColumn[] = [{ key: 'name' }]
  const render = (props = {}) => act(() => root.render(<DataGrid data={data} columns={columns} config={{ selection: { mode: 'multi-row' } }} {...props} />))
  try {
    render()
    const grid = container.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await grid.updateComplete
    const id = viewport.getAttribute('aria-activedescendant')
    const setData = vi.spyOn(WebGrid.prototype, 'updateData')
    const setColumns = vi.spyOn(WebGrid.prototype, 'columns', 'set')
    const setConfig = vi.spyOn(WebGrid.prototype, 'config', 'set')
    const setHeight = vi.spyOn(WebGrid.prototype, 'viewportHeight', 'set')
    for (const props of [{ theme: 'dark' }, { ariaLabel: 'People' }, { ariaDescription: 'Instructions' }, { screenReaderAnnouncements: false }]) {
      render(props)
      await grid.updateComplete
      expect(viewport.getAttribute('aria-activedescendant')).toBe(id)
    }
    expect(setData).toHaveBeenCalledTimes(4)
    expect(setColumns).not.toHaveBeenCalled()
    expect(setConfig).not.toHaveBeenCalled()
    expect(setHeight).not.toHaveBeenCalled()
    data.push({ name: 'Katherine' })
    data[0].name = 'Updated Ada'
    columns[0].header = 'Full name'
    render({ theme: 'dark' })
    await grid.updateComplete
    expect(viewport.getAttribute('aria-activedescendant')).toBe(id)
    expect(viewport.getAttribute('aria-rowcount')).toBe('4')
    expect(grid.renderRoot.querySelector('.cell')!.textContent).toContain('Updated Ada')
    expect(grid.renderRoot.querySelector('.header-label')!.textContent).toContain('Full name')
    setData.mockClear()
    setColumns.mockClear()
    data = [{ name: 'Lin' }]
    columns = [{ key: 'name', header: 'Person' }]
    render()
    await grid.updateComplete
    expect(setData).toHaveBeenCalledTimes(1)
    expect(setColumns).not.toHaveBeenCalled()
    expect(grid.renderRoot.querySelector('.cell')!.textContent).toContain('Lin')
    expect(grid.renderRoot.querySelector('.header-label')!.textContent).toContain('Person')
    render({ config: { selection: { mode: 'cell' } } })
    await grid.updateComplete
    expect(setConfig).toHaveBeenCalledTimes(1)
    expect(grid.getSelection().mode).toBe('cell')
  } finally { act(() => root.unmount()) }
})

it('preserves legacy same-reference mutation synchronization when column/config props are omitted', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const data = [{ name: 'Ada' }]
  try {
    act(() => root.render(<DataGrid data={data} />))
    const grid = container.querySelector('yc-grid') as WebGrid
    await grid.updateComplete
    const setColumns = vi.spyOn(WebGrid.prototype, 'columns', 'set')
    data[0].name = 'Updated Ada'
    data.push({ name: 'Grace' })
    act(() => root.render(<DataGrid data={data} />))
    await grid.updateComplete
    expect(setColumns).not.toHaveBeenCalled()
    expect(grid.renderRoot.querySelector('.cell')!.textContent).toContain('Updated Ada')
    expect(grid.renderRoot.querySelector('.viewport')!.getAttribute('aria-rowcount')).toBe('3')
  } finally { act(() => root.unmount()) }
})

  it.each([30_000, 100_000])('preserves same-reference mutation synchronization across %i-row rerenders', async count => {
    const data = Array.from({ length: count }, (_, id) => ({ id, name: `row ${id}` }))
    const config = { selection: { mode: 'multi-row' as const, rowKey: 'id', scopeKey: 'a' } }
    const columns = [{ key: 'name' }]
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const render = async (label: string, fresh = false) => {
      await act(async () => {
        root.render(<DataGrid data={data} columns={columns} config={fresh ? { ...config } : config} ariaLabel={label} />)
      })
      const grid = host.querySelector('yc-grid') as WebGrid
      await grid.updateComplete
      return grid
    }
    try {
      const grid = await render('initial')
      expect(grid.selectRowByKey(count - 1)).toBe(true)
      await render('unrelated update')
      expect(grid.getSelectionSnapshot().rows[0].key).toBe(count - 1)
      data[count - 1].name = 'edited in place'
      await render('same identity', true)
      expect(grid.getSelectionSnapshot().rows[0].row).toBe(data[count - 1])
      // The duplicate is outside the rendered viewport; validation must still
      // reject it during synchronization, before any subsequent user click.
      data[count - 1].id = 0
      await render('duplicate mutation')
      expect(grid.getSelectionSnapshot().rows).toEqual([])
      expect(grid.selectRowByKey(0)).toBe(false)
      data[count - 1].id = count + 1
      await render('changed identity', true)
      expect(grid.selectRowByKey(count + 1)).toBe(true)
      config.selection.scopeKey = 'b'
      await render('scope mutation')
      expect(grid.getSelectionSnapshot().rows).toEqual([])
      expect(grid.shadowRoot!.querySelectorAll('.cell').length).toBeLessThan(100)
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
