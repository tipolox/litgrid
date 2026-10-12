// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => document.body.replaceChildren())

async function setup(checkboxes = false) {
  const grid = new DataGrid()
  grid.config = { selection: { mode: 'multi-row', checkboxes } }
  grid.data = Array.from({ length: 5 }, (_, name) => ({ name }))
  grid.columns = [{ key: 'name' }]
  document.body.append(grid)
  await grid.updateComplete
  return grid
}

async function key(grid: DataGrid, row: number, modifiers: KeyboardEventInit = {}, value = ' ') {
  const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, bubbles: true }))
  for (let index = 0; index < row; index++) {
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  }
  await grid.updateComplete
  const cell = grid.renderRoot.querySelector(`[data-row-index="${row}"]`) as HTMLElement
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, composed: true, cancelable: true, ...modifiers })
  cell.dispatchEvent(event)
  await grid.updateComplete
  return event
}

describe('multi-row keyboard selection', () => {
  it.each([false, true])('replaces selection with Enter/Space (checkboxes: %s)', async (checkboxes) => {
    const grid = await setup(checkboxes)
    grid.selectRow(4)
    expect((await key(grid, 1, {}, 'Enter')).defaultPrevented).toBe(true)
    expect([...grid.getSelection().rowIndexes]).toEqual([1])
    await key(grid, 2)
    expect([...grid.getSelection().rowIndexes]).toEqual([2])
  })

  it.each(['ctrlKey', 'metaKey'])('toggles with %s and gives Shift range precedence', async (modifier) => {
    const grid = await setup()
    await key(grid, 1)
    await key(grid, 3, { [modifier]: true }, 'Enter')
    expect([...grid.getSelection().rowIndexes]).toEqual([1, 3])
    await key(grid, 3, { [modifier]: true })
    expect([...grid.getSelection().rowIndexes]).toEqual([1])
    await key(grid, 0, { [modifier]: true, shiftKey: true })
    expect([...grid.getSelection().rowIndexes]).toEqual([0, 1, 2, 3])
  })

  it('uses the shared pointer anchor for ranges and preserves pointer toggles', async () => {
    const grid = await setup(true)
    const cells = grid.renderRoot.querySelectorAll<HTMLElement>('.cell')
    cells[1].click()
    await key(grid, 3, { shiftKey: true })
    expect([...grid.getSelection().rowIndexes]).toEqual([1, 2, 3])
    cells[4].dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }))
    await grid.updateComplete
    expect([...grid.getSelection().rowIndexes]).toEqual([1, 2, 3, 4])
    const checkbox = grid.renderRoot.querySelectorAll<HTMLInputElement>('.row .selection-checkbox')[2]
    checkbox.click()
    await grid.updateComplete
    expect([...grid.getSelection().rowIndexes]).toEqual([1, 3, 4])
    cells[0].dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }))
    await grid.updateComplete
    expect([...grid.getSelection().rowIndexes]).toEqual([0, 1, 2])
  })

  it('ignores Alt activation and keeps arrow navigation separate from selection', async () => {
    const grid = await setup()
    await key(grid, 1)
    expect((await key(grid, 3, { altKey: true })).defaultPrevented).toBe(false)
    await key(grid, 1, { shiftKey: true }, 'ArrowDown')
    expect([...grid.getSelection().rowIndexes]).toEqual([1])
    await key(grid, 2, { shiftKey: true })
    expect([...grid.getSelection().rowIndexes]).toEqual([1, 2])
  })
})
