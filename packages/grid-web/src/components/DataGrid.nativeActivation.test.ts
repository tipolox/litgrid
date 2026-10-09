// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { html } from 'lit'
import { DataGrid } from './DataGrid.js'

afterEach(() => document.body.replaceChildren())

async function setup(content: ReturnType<typeof html>, rows = 3) {
  const grid = new DataGrid()
  grid.config = { selection: { mode: 'multi-row' } }
  grid.viewportHeight = 96
  grid.data = Array.from({ length: rows }, (_, index) => ({ name: `Row ${index}` }))
  grid.columns = [{ key: 'name', render: () => content }]
  document.body.append(grid)
  await grid.updateComplete
  const viewport = grid.renderRoot.querySelector<HTMLElement>('.viewport')!
  await key(grid, viewport, 'Home', { ctrlKey: true })
  const cell = grid.renderRoot.querySelector<HTMLElement>('.cell')!
  cell.focus()
  return { grid, cell, viewport }
}

async function key(grid: DataGrid, target: Element, value: string, modifiers: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: value, bubbles: true, composed: true, cancelable: true, ...modifiers
  })
  target.dispatchEvent(event)
  await grid.updateComplete
  return event
}

describe('custom cell native keyboard activation', () => {
  it('enters a nested link with F2, preserves native Enter, and returns with Escape', async () => {
    const { grid, cell } = await setup(html`<a href="#target"><span>Link</span></a>`)
    const link = cell.querySelector('a')!
    const updates = vi.spyOn(grid, 'requestUpdate')
    expect((await key(grid, cell, 'F2')).defaultPrevented).toBe(true)
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(link)
    expect(updates).not.toHaveBeenCalled()
    expect((await key(grid, link.querySelector('span')!, 'Enter')).defaultPrevented).toBe(false)
    expect(grid.isRowSelected(0)).toBe(false)
    expect((await key(grid, link.querySelector('span')!, 'Escape')).defaultPrevented).toBe(true)
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(cell)
    expect(updates).not.toHaveBeenCalled()
    await key(grid, cell, 'ArrowDown')
    expect((grid.renderRoot as ShadowRoot).activeElement?.getAttribute('data-row-index')).toBe('1')
  })

  it('preserves button Enter/Space and arrow keys after F2', async () => {
    const { grid, cell } = await setup(html`<button><span>Button</span></button>`)
    const button = cell.querySelector('button')!
    await key(grid, cell, 'F2')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(button)
    for (const value of ['Enter', ' ', 'ArrowDown', 'Home', 'End', 'PageDown']) {
      expect((await key(grid, button.querySelector('span')!, value)).defaultPrevented).toBe(false)
      expect((grid.renderRoot as ShadowRoot).activeElement).toBe(button)
      expect(grid.isRowSelected(0)).toBe(false)
    }
  })

  it('keeps Tab cell-oriented until F2 and limits interaction Tab to the owning cell', async () => {
    const { grid, cell } = await setup(html`<a href="#target">Link</a><button>Button</button>`)
    const link = cell.querySelector('a')!
    const button = cell.querySelector('button')!
    await key(grid, cell, 'Tab')
    expect((grid.renderRoot as ShadowRoot).activeElement?.getAttribute('data-row-index')).toBe('1')
    await key(grid, (grid.renderRoot as ShadowRoot).activeElement!, 'Tab', { shiftKey: true })
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(cell)
    await key(grid, cell, 'F2')
    await key(grid, link, 'Tab')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(button)
    await key(grid, button, 'Tab', { shiftKey: true })
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(link)
    await key(grid, link, 'Tab', { shiftKey: true })
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(cell)
    await key(grid, cell, 'F2')
    await key(grid, link, 'Tab')
    await key(grid, button, 'Tab')
    expect((grid.renderRoot as ShadowRoot).activeElement?.getAttribute('data-row-index')).toBe('1')
  })

  it('skips disabled, hidden, and inert controls and honors a widget-consumed Escape', async () => {
    const { grid, cell } = await setup(html`
      <button disabled>Disabled</button><input type="hidden">
      <div hidden><a href="#hidden">Hidden</a></div>
      <div inert><button>Inert</button></div><button tabindex="-1">Usable</button>
    `)
    const button = cell.querySelector<HTMLElement>('button[tabindex]')!
    await key(grid, cell, 'F2')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(button)
    button.addEventListener('keydown', (event) => event.preventDefault(), { once: true })
    await key(grid, button, 'Escape')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(button)
    await key(grid, button, 'Escape')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(cell)
  })

  it('enters a focusable shadow widget host and preserves its native keys', async () => {
    const { grid, cell } = await setup(html`<div tabindex="0" class="widget"></div>`)
    const host = cell.querySelector<HTMLElement>('.widget')!
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<button><span>Nested button</span></button>'
    await key(grid, cell, 'F2')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(host)
    shadow.querySelector('button')!.focus()
    expect((await key(grid, shadow.querySelector('span')!, 'Enter')).defaultPrevented).toBe(false)
    expect((await key(grid, shadow.querySelector('span')!, 'Tab')).defaultPrevented).toBe(false)
    await key(grid, shadow.querySelector('span')!, 'Escape')
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(cell)
  })

  it('allows native forward Tab out of the final cell after its last control', async () => {
    const { grid, cell } = await setup(html`<button>Button</button>`, 1)
    await key(grid, cell, 'F2')
    expect((await key(grid, cell.querySelector('button')!, 'Tab')).defaultPrevented).toBe(false)
  })

  it.each(['Enter', ' '])('ordinary cells retain %s selection and F2 is a no-op', async (value) => {
    const { grid, cell } = await setup(html`<span>Plain text</span>`)
    expect((await key(grid, cell, 'F2')).defaultPrevented).toBe(false)
    expect((grid.renderRoot as ShadowRoot).activeElement).toBe(cell)
    expect((await key(grid, cell, value)).defaultPrevented).toBe(true)
    expect(grid.isRowSelected(0)).toBe(true)
  })

  it('does not look up embedded controls during rendering, scrolling, or arrow navigation', async () => {
    const { grid, cell, viewport } = await setup(html`<a href="#target">Link</a>`, 10_000)
    const controls = vi.spyOn(grid as unknown as { getCellControls(cell: HTMLElement): HTMLElement[] }, 'getCellControls')
    const rendered = grid.renderRoot.querySelectorAll('.cell').length
    expect(rendered).toBeLessThan(100)
    await key(grid, cell, 'ArrowDown')
    viewport.scrollTop = 32_000
    viewport.dispatchEvent(new Event('scroll'))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await grid.updateComplete
    expect(grid.renderRoot.querySelectorAll('.cell').length).toBeLessThan(100)
    expect(Number(grid.renderRoot.querySelector<HTMLElement>('.cell')!.dataset.rowIndex)).toBeGreaterThan(100)
    expect(controls).not.toHaveBeenCalled()
  })

  it.each(['a', 'button', 'input', 'select', 'textarea', 'editable', 'focusable', 'summary', 'shadow'])('%s retains its keys', async (kind) => {
    const content = {
      a: html`<a href="#target"><span>Link</span></a>`,
      button: html`<button><span>Button</span></button>`,
      input: html`<input>`, select: html`<select><option>One</option></select>`,
      textarea: html`<textarea></textarea>`,
      editable: html`<div contenteditable="true"><span>Edit</span></div>`,
      focusable: html`<div tabindex="0"><span>Control</span></div>`,
      summary: html`<details><summary><span>Details</span></summary></details>`,
      shadow: html`<div class="custom-control"></div>`
    }[kind]
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name', render: () => content }]
    document.body.append(grid)
    await grid.updateComplete
    const cell = grid.renderRoot.querySelector('.cell') as HTMLElement
    let target = cell.querySelector('span, input, select, textarea') ?? cell.firstElementChild!
    if (kind === 'shadow') {
      const root = target.attachShadow({ mode: 'open' })
      root.innerHTML = '<button><span>Shadow button</span></button>'
      target = root.querySelector('span')!
    }
    for (const key of ['Enter', ' ', 'ArrowDown', 'Tab']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true })
      target.dispatchEvent(event)
      await grid.updateComplete
      expect(event.defaultPrevented).toBe(false)
      expect(grid.isRowSelected(0)).toBe(false)
    }
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })
    cell.dispatchEvent(event)
    await grid.updateComplete
    expect(event.defaultPrevented).toBe(true)
    expect(grid.isRowSelected(0)).toBe(true)
  })
})
