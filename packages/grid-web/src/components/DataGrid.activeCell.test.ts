// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

const viewport = (grid: DataGrid) => grid.renderRoot.querySelector<HTMLElement>('.viewport')!
const press = (grid: DataGrid, key: string, options: KeyboardEventInit = {}) =>
  viewport(grid).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }))

async function setup(count = 8, columnCount = 2) {
  const grid = new DataGrid()
  grid.data = Array.from({ length: count }, (_, id) => ({ id, name: `Person ${id}` }))
  grid.columns = Array.from({ length: columnCount }, (_, index) => ({ key: index === 0 ? 'id' : index === 1 ? 'name' : `c${index}`, width: 120 }))
  document.body.append(grid)
  await grid.updateComplete
  Object.defineProperty(viewport(grid), 'clientWidth', { value: 240 })
  Object.defineProperty(viewport(grid), 'offsetWidth', { value: 240 })
  grid.requestUpdate()
  await grid.updateComplete
  await grid.updateComplete
  return grid
}

async function activate(grid: DataGrid, row: number, column = 0) {
  press(grid, 'Home', { ctrlKey: true })
  for (let index = 0; index < row; index++) press(grid, 'ArrowDown')
  for (let index = 0; index < column; index++) press(grid, 'ArrowRight')
  await grid.updateComplete
}

function active(grid: DataGrid) {
  const id = viewport(grid).getAttribute('aria-activedescendant')
  const cell = id ? grid.renderRoot.querySelector<HTMLElement>(`[id="${id}"]`) : null
  if (id) expect(cell).not.toBeNull()
  return cell
}

describe('active cell reconciliation', () => {
  it('clamps after filtering and clears on empty results without stealing filter focus', async () => {
    const grid = await setup()
    await activate(grid, 7, 1)
    grid.renderRoot.querySelector<HTMLButtonElement>('.header-action-button')!.click()
    await grid.updateComplete
    const input = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Filter value"]')!
    input.focus()
    grid.setFilter({ columnKey: 'id', operator: 'lessThan', value: 3 })
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('2')
    expect(active(grid)?.dataset.columnIndex).toBe('1')
    expect(grid.renderRoot.activeElement).toBe(input)
    grid.setFilter({ columnKey: 'id', operator: 'equals', value: -1 })
    await grid.updateComplete
    expect(active(grid)).toBeNull()
    expect(viewport(grid).hasAttribute('aria-activedescendant')).toBe(false)
    grid.clearFilter()
    await grid.updateComplete
    expect(active(grid)).toBeNull()
    viewport(grid).focus()
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('0')
  })

  it('clamps for Quick Search and keeps navigation coherent after clearing', async () => {
    const grid = await setup()
    await activate(grid, 6)
    grid.setQuickSearch('Person 2')
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('0')
    expect(active(grid)?.textContent?.trim()).toBe('2')
    grid.clearQuickSearch()
    await grid.updateComplete
    press(grid, 'ArrowDown')
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('1')
  })

  it('preserves a valid position on page changes and clamps for last page/page-size changes', async () => {
    const grid = await setup(9)
    grid.config = { pagination: { enabled: true, pageSize: 4 } }
    await grid.updateComplete
    await activate(grid, 3)
    grid.setPage(1)
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('3')
    expect(active(grid)?.textContent?.trim()).toBe('7')
    grid.setPage(2)
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('0')
    grid.setPage(0)
    await grid.updateComplete
    await activate(grid, 3)
    grid.setPageSize(2)
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('1')
  })

  it('retains/clamps positions for new data and inferred columns, then clears empty data', async () => {
    const grid = await setup()
    await activate(grid, 7, 1)
    grid.data = [{ id: 10, name: 'Ten' }, { id: 11, name: 'Eleven' }]
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('1')
    expect(active(grid)?.textContent?.trim()).toBe('Eleven')
    grid.data = []
    await grid.updateComplete
    expect(active(grid)).toBeNull()
    expect(grid.renderRoot.activeElement).toBe(viewport(grid))

    const inferred = new DataGrid()
    inferred.data = [{ a: 1, b: 2, c: 3 }]
    document.body.append(inferred)
    await inferred.updateComplete
    await activate(inferred, 0, 2)
    inferred.data = [{ a: 4 }]
    await inferred.updateComplete
    expect(active(inferred)?.dataset.columnIndex).toBe('0')
  })

  it.each(['vertical', 'horizontal'] as const)('omits offscreen references during %s virtualization and retains logical navigation', async (direction) => {
    let frame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1 })
    const grid = await setup(1000, 8)
    grid.viewportHeight = 144
    grid.overscanCount = 0
    grid.columnOverscanCount = 0
    await grid.updateComplete
    await activate(grid, 2, 1)
    const id = active(grid)!.id
    const render = vi.spyOn(grid, 'render')
    const scroll = async (offset: number) => {
      if (direction === 'vertical') viewport(grid).scrollTop = offset
      else viewport(grid).scrollLeft = offset
      viewport(grid).dispatchEvent(new Event('scroll'))
      frame!(0)
      await grid.updateComplete
    }
    await scroll(direction === 'vertical' ? 900 : 480)
    expect(active(grid)).toBeNull()
    expect(grid.renderRoot.activeElement).toBe(viewport(grid))
    expect(render).toHaveBeenCalledTimes(1)
    expect(grid.renderRoot.querySelectorAll('.row').length).toBeLessThan(10)
    expect(grid.renderRoot.querySelectorAll('.row .cell').length).toBeLessThan(30)
    await scroll(direction === 'vertical' ? 1200 : 600)
    expect(render).toHaveBeenCalledTimes(2)
    await scroll(0)
    expect(active(grid)?.id).toBe(id)
    press(grid, 'ArrowDown')
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('3')
    expect(active(grid)?.dataset.columnIndex).toBe('1')
  })

  it('hands off recycled cell focus even when the logical cell stays in the rendered range', async () => {
    let frame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1 })
    const grid = await setup(100)
    grid.viewportHeight = 144
    grid.overscanCount = 0
    await grid.updateComplete
    await activate(grid, 2)
    viewport(grid).scrollTop = 36
    viewport(grid).dispatchEvent(new Event('scroll'))
    frame!(0)
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('2')
    expect(grid.renderRoot.activeElement).toBe(viewport(grid))
  })

  it('fulfills keyboard focus after the requested virtual range arrives', async () => {
    let frame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1 })
    const grid = await setup(1000)
    grid.viewportHeight = 144
    grid.overscanCount = 0
    await grid.updateComplete
    await activate(grid, 1)
    press(grid, 'End', { ctrlKey: true })
    await grid.updateComplete
    expect(active(grid)).toBeNull()
    viewport(grid).dispatchEvent(new Event('scroll'))
    frame!(0)
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('999')
    expect(grid.renderRoot.activeElement).toBe(active(grid))
  })

  it('uses valid fallback row coordinates after custom-height virtualization and data shrink', async () => {
    let frame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1 })
    const grid = await setup(100)
    grid.viewportHeight = 144
    grid.overscanCount = 0
    grid.setRowHeight(0, 72)
    await grid.updateComplete
    viewport(grid).scrollTop = 900
    viewport(grid).dispatchEvent(new Event('scroll'))
    frame!(0)
    await grid.updateComplete
    const cell = grid.renderRoot.querySelector<HTMLElement>('.cell')!
    cell.click()
    cell.focus()
    await grid.updateComplete
    grid.data = [{ id: 10, name: 'Ten' }, { id: 11, name: 'Eleven' }]
    await grid.updateComplete
    expect(active(grid)?.dataset.rowIndex).toBe('1')
    expect(active(grid)?.textContent?.trim()).toBe('11')
    expect([...grid.renderRoot.querySelectorAll<HTMLElement>('.row')].map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3'])
  })

  it('omits active references when all columns become hidden', async () => {
    const grid = await setup()
    await activate(grid, 1)
    grid.setColumnVisible('id', false)
    grid.setColumnVisible('name', false)
    await grid.updateComplete
    expect(active(grid)).toBeNull()
    expect(viewport(grid).hasAttribute('aria-activedescendant')).toBe(false)
    expect(grid.renderRoot.activeElement).toBe(viewport(grid))
  })
})
