// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { html } from 'lit'
import { DataGrid } from './DataGrid.js'
import type { SelectionChangeDetail } from '../types.js'

afterEach(() => document.body.replaceChildren())

async function setup(mode: 'row' | 'multi-row' = 'row', count = 3) {
  const grid = new DataGrid()
  grid.config = { selection: { mode, rowKey: 'id', scopeKey: 'site-a' } }
  grid.data = Array.from({ length: count }, (_, index) => ({ id: `uuid-${index}`, name: `Property ${index}` }))
  grid.columns = [{ key: 'name' }]
  document.body.append(grid)
  await grid.updateComplete
  return grid
}

describe('public selection-change event', () => {
  it.each(['row', 'multi-row'] as const)('coordinates pointer, keyboard, and imperative selection in %s mode', async mode => {
    const grid = await setup(mode)
    const events: CustomEvent<SelectionChangeDetail>[] = []
    const listener = (event: Event) => { events.push(event as CustomEvent<SelectionChangeDetail>) }
    document.addEventListener('selection-change', listener)
    try {
      grid.renderRoot.querySelector<HTMLElement>('.cell')!.click()
      expect(events[0].detail.rows[0].key).toBe('uuid-0')
      expect(events[0].bubbles && events[0].composed).toBe(true)
      grid.clearSelection()
      const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
      viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, bubbles: true }))
      viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(events.at(-1)!.detail).toEqual(events[0].detail)
      const calls = events.length
      grid.selectRow(0)
      expect(events).toHaveLength(calls)
      expect(grid.selectRowByKey('uuid-2', mode === 'multi-row' ? 'toggle' : 'replace')).toBe(true)
      expect(events.at(-1)!.detail.rows.map(row => row.key)).toEqual(mode === 'multi-row' ? ['uuid-0', 'uuid-2'] : ['uuid-2'])
      const announce = vi.spyOn(grid as any, 'announceScreenReader')
      grid.selectRowByKey('uuid-2')
      announce.mockClear()
      grid.selectRowByKey('uuid-2')
      expect(announce).not.toHaveBeenCalled()
      await grid.updateComplete
      expect(grid.renderRoot.querySelector('.cell[data-row-index="2"]')!.closest('[role="row"]')!.getAttribute('aria-selected')).toBe('true')
      expect(grid.renderRoot.querySelector('[aria-live]')!.textContent).toMatch(/selected/i)
      grid.config = { selection: { mode, rowKey: 'id', scopeKey: 'site-b' } }
      expect(events.at(-1)!.detail.rows).toEqual([])
    } finally { document.removeEventListener('selection-change', listener) }
  })

  it('notifies for offscreen virtualized selection without mounting all rows', async () => {
    const grid = await setup('multi-row', 100_000)
    const changed = vi.fn()
    grid.addEventListener('selection-change', changed)
    grid.selectRowByKey('uuid-99999')
    expect(changed).toHaveBeenCalledTimes(1)
    expect(grid.getSelectionSnapshot().rows[0]).toMatchObject({ rowIndex: 99_999, key: 'uuid-99999' })
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.row').length).toBeLessThan(50)
    grid.setQuickSearch('Property 0')
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    expect(changed).toHaveBeenCalledTimes(2)
  })

  it('leaves interactive cell activation alone and supports header checkbox changes', async () => {
    const grid = await setup('multi-row')
    grid.columns = [{ key: 'name', render: () => html`<button @click=${(event: Event) => event.stopPropagation()}>Open property</button>` }]
    grid.config = { selection: { mode: 'multi-row', rowKey: 'id', checkboxes: true } }
    await grid.updateComplete
    const changed = vi.fn()
    grid.addEventListener('selection-change', changed)
    const button = grid.renderRoot.querySelector<HTMLButtonElement>('.cell button')!
    button.click()
    const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    button.dispatchEvent(key)
    expect(key.defaultPrevented).toBe(false)
    expect(changed).not.toHaveBeenCalled()
    grid.renderRoot.querySelector<HTMLInputElement>('.header-row-header .selection-checkbox')!.click()
    expect(changed).toHaveBeenCalledTimes(1)
    expect(grid.getSelectionSnapshot().rows).toHaveLength(3)
    grid.renderRoot.querySelector<HTMLInputElement>('.header-row-header .selection-checkbox')!.click()
    expect(changed).toHaveBeenCalledTimes(2)
    expect(grid.getSelectionSnapshot().rows).toEqual([])
  })

  it('toggles all selectable rows when displayed keys are missing or duplicated', async () => {
    const grid = await setup('multi-row')
    grid.config = { selection: { mode: 'multi-row', rowKey: 'id', checkboxes: true } }
    grid.data = [{ id: 'duplicate' }, { id: 'duplicate' }, {}, { id: 'valid' }]
    await grid.updateComplete
    const all = grid.renderRoot.querySelector<HTMLInputElement>('.header-row-header .selection-checkbox')!
    all.click()
    await grid.updateComplete
    expect(grid.getSelectionSnapshot().rows.map(row => row.key)).toEqual(['valid'])
    expect(all.checked).toBe(true)
    expect(all.indeterminate).toBe(false)
    all.click()
    await grid.updateComplete
    expect(grid.getSelectionSnapshot().rows).toEqual([])
    grid.data = [{ id: 'duplicate' }, { id: 'duplicate' }]
    await grid.updateComplete
    expect(all.disabled).toBe(true)
  })
})
