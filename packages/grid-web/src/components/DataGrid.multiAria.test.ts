// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => document.body.replaceChildren())

it('exposes multiselectable only for effective multiple selection modes, including updates', async () => {
  const grid = new DataGrid()
  grid.data = [{ name: 'Ada' }]
  grid.columns = [{ key: 'name' }]
  document.body.append(grid)
  for (const mode of ['multi-row', 'multi-cell', 'row', 'cell', 'none'] as const) {
    grid.config = { selection: { mode } }
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.viewport')!.getAttribute('aria-multiselectable'))
      .toBe(mode.startsWith('multi-') ? 'true' : null)
  }
  grid.config = {}
  await grid.updateComplete
  expect(grid.renderRoot.querySelector('.viewport')!.hasAttribute('aria-multiselectable')).toBe(false)
})
