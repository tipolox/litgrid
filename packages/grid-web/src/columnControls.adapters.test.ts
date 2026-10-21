// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { DataGrid } from './components/DataGrid.js'
import type { GridColumn } from './types.js'
import { syncGridInputs as react } from '../../grid-react/src/gridBindings.js'
import { syncGridInputs as vue } from '../../grid-vue/src/gridBindings.js'
import { syncGridInputs as angular } from '../../grid-angular/src/gridBindings.js'
import { syncGridInputs as blazor } from '../../grid-blazor/src/gridBindings.js'

afterEach(() => document.body.replaceChildren())

it.each([['React', react], ['Vue', vue], ['Angular', angular], ['Blazor', blazor]] as const)('%s forwards column controls and their same-reference and replacement changes', async (_, sync) => {
  const grid = new DataGrid()
  let columns: GridColumn[] = [{ key: 'amount', sortable: false, filterable: false }]
  const inputs = () => ({ data: [{ amount: '9007199254740993.01' }], columns, config: {}, theme: 'light' as const,
    ariaLabel: 'Money', ariaDescription: '', screenReaderAnnouncements: true, height: 320, rowHeight: 36,
    overscan: 4, columnOverscan: 2, bestFitSampleSize: 10, quickSearchDebounceThreshold: 1000, quickSearchDebounceMs: 100 })
  const menu = async () => {
    grid.renderRoot.querySelector<HTMLButtonElement>('.header-action-button')!.click()
    await grid.updateComplete
    return grid.renderRoot.querySelector('.header-menu')!.textContent!
  }
  sync(grid, inputs())
  document.body.append(grid)
  await grid.updateComplete
  expect(await menu()).not.toContain('Sort Asc')
  expect(grid.renderRoot.querySelector('[aria-label="Filter operator"]')).toBeNull()
  columns[0].sortable = true
  columns[0].filterable = true
  sync(grid, inputs())
  await grid.updateComplete
  expect(await menu()).toContain('Sort Asc')
  expect(grid.renderRoot.querySelector('[aria-label="Filter operator"]')).not.toBeNull()
  columns = [{ key: 'amount', sortable: false, filterable: false }]
  sync(grid, inputs())
  await grid.updateComplete
  expect(await menu()).not.toContain('Apply Filter')
  expect(grid.renderRoot.querySelector('[aria-label="Filter operator"]')).toBeNull()
})
