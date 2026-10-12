// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'
import type { GridConfig } from '../types.js'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

async function setup(mode: NonNullable<NonNullable<GridConfig['selection']>['mode']>) {
  const grid = new DataGrid()
  grid.config = { selection: { mode } }
  grid.data = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Lin' }]
  grid.columns = [{ key: 'name' }]
  document.body.append(grid)
  await grid.updateComplete
  return grid
}

const status = (grid: DataGrid) => grid.renderRoot.querySelector('[role="status"]')!.textContent

describe('mode-aware selection guidance and announcements', () => {
  it.each(['none', 'row', 'multi-row', 'cell', 'multi-cell'] as const)('describes %s selection', async (mode) => {
    const grid = await setup(mode)
    const description = grid.renderRoot.querySelector('.screen-reader-only')!.textContent!
    expect(description).toContain('Use arrow keys')
    expect(description).toContain('F2')
    expect(description).toContain('Escape')
    if (mode === 'none') {
      expect(description).not.toMatch(/Enter|Space|copy/)
    } else {
      expect(description).toContain('Enter or Space')
      expect(description).toContain(mode.includes('row') ? 'row' : 'cell')
      expect(description.includes('Shift')).toBe(mode === 'multi-row')
      expect(description.includes('toggle')).toBe(mode.startsWith('multi-'))
    }
    grid.ariaDescription = 'My instructions'
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.screen-reader-only')!.textContent).toBe('My instructions')
  })

  it.each(['none', 'row', 'cell', 'multi-cell'] as const)('does not announce ignored select-all in %s mode', async (mode) => {
    const grid = await setup(mode)
    const before = status(grid)
    grid.selectAllRows()
    await grid.updateComplete
    expect(status(grid)).toBe(before)
    expect(grid.getSelection().rowIndexes.size).toBe(0)
  })

  it('announces replacement, toggle, range and clearing, and suppresses no-ops', async () => {
    const grid = await setup('multi-row')
    const announce = vi.spyOn(grid as unknown as { announceScreenReader(message: string): void }, 'announceScreenReader')
    grid.selectRow(0)
    await grid.updateComplete
    expect(status(grid)).toBe('Row 1 selected.')
    announce.mockClear()
    grid.selectRow(0)
    expect(announce).not.toHaveBeenCalled()
    grid.selectRow(2, 'range')
    await grid.updateComplete
    expect(status(grid)).toBe('Rows 1 through 3 selected.')
    announce.mockClear()
    grid.selectRow(2, 'range')
    grid.selectAllRows()
    expect(announce).not.toHaveBeenCalled()
    grid.selectRow(1, 'toggle')
    await grid.updateComplete
    expect(status(grid)).toBe('Row 2 deselected.')
    grid.selectAllRows()
    await grid.updateComplete
    expect(status(grid)).toBe('All 3 displayed rows selected.')
    grid.clearSelection()
    await grid.updateComplete
    expect(status(grid)).toBe('Selection cleared.')
    announce.mockClear()
    grid.clearSelection()
    grid.selectRow(-1)
    grid.selectRow(3)
    expect(announce).not.toHaveBeenCalled()
  })

  it('ignores row operations in cell mode and retains announcement customization', async () => {
    const grid = await setup('cell')
    const before = status(grid)
    grid.selectRow(0)
    await grid.updateComplete
    expect(status(grid)).toBe(before)
    const cell = grid.renderRoot.querySelector<HTMLElement>('.cell')!
    cell.click()
    await grid.updateComplete
    const announce = vi.spyOn(grid as unknown as { announceScreenReader(message: string): void }, 'announceScreenReader')
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(announce).not.toHaveBeenCalled()
    grid.screenReaderAnnouncements = false
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('[role="status"]')).toBeNull()
  })

  it('does not announce select-all on an empty multi-row grid', async () => {
    const grid = await setup('multi-row')
    grid.data = []
    await grid.updateComplete
    const before = status(grid)
    grid.selectAllRows()
    await grid.updateComplete
    expect(status(grid)).toBe(before)
  })
})
