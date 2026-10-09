// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

async function setup(hidden = false) {
  const grid = new DataGrid()
  grid.data = [{ name: 'Ada', age: 42 }]
  grid.columns = [{ key: 'name', hidden }, { key: 'age', hidden }]
  document.body.append(grid)
  await grid.updateComplete
  return grid
}

function button(grid: DataGrid, label: string) {
  return [...grid.renderRoot.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.trim() === label)!
}

describe('column action focus recovery', () => {
  it.each(['Sort Asc', 'Sort Desc', 'Clear Sort', 'Apply Filter', 'Clear Filter', 'Best Fit', 'Best Fit All Columns', 'Show Quick Search', 'Hide Quick Search'])('restores the trigger after %s', async (label) => {
    const grid = await setup()
    vi.spyOn(grid, 'bestFitColumn').mockReturnValue(100)
    vi.spyOn(grid, 'bestFitAllColumns').mockReturnValue([])
    const trigger = grid.renderRoot.querySelector<HTMLButtonElement>('.header-action-button')!
    if (label === 'Hide Quick Search') {
      trigger.click()
      await grid.updateComplete
      button(grid, 'Show Quick Search').click()
      await grid.updateComplete
    }
    trigger.click()
    await grid.updateComplete
    if (label === 'Apply Filter') {
      const input = grid.renderRoot.querySelector<HTMLInputElement>('[aria-label="Filter value"]')!
      input.value = 'Ada'
      input.dispatchEvent(new Event('input'))
    }
    button(grid, label).focus()
    button(grid, label).click()
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    expect(grid.renderRoot.activeElement).toBe(trigger)
  })

  it.each([false, true])('falls back when the originating column is hidden (all: %s)', async (all) => {
    const grid = await setup()
    grid.renderRoot.querySelector<HTMLButtonElement>('.header-action-button')!.click()
    await grid.updateComplete
    button(grid, 'Columns').click()
    await grid.updateComplete
    const checkboxes = grid.renderRoot.querySelectorAll<HTMLInputElement>('.column-chooser-dialog input')
    checkboxes[0].click()
    if (all) checkboxes[1].click()
    await grid.updateComplete
    grid.renderRoot.querySelector<HTMLButtonElement>('.column-chooser-close')!.click()
    await grid.updateComplete
    expect(grid.renderRoot.activeElement).toBe(grid.renderRoot.querySelector(all ? '.columns-button' : '.header-action-button'))
  })

  it.each([false, true])('restores standalone Columns focus with Escape (show column: %s)', async (show) => {
    const grid = await setup(true)
    const trigger = grid.renderRoot.querySelector<HTMLButtonElement>('.columns-button')!
    trigger.click()
    await grid.updateComplete
    if (show) {
      grid.renderRoot.querySelector<HTMLInputElement>('.column-chooser-dialog input')!.click()
      await grid.updateComplete
    }
    grid.renderRoot.querySelector('.column-chooser-dialog')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.column-chooser-dialog')).toBeNull()
    expect(grid.renderRoot.activeElement).toBe(show ? grid.renderRoot.querySelector('.header-action-button') : trigger)
  })

  it('does not steal focus after pointer dismissal', async () => {
    const grid = await setup()
    grid.renderRoot.querySelector<HTMLButtonElement>('.header-action-button')!.click()
    await grid.updateComplete
    const cell = grid.renderRoot.querySelector<HTMLElement>('.cell')!
    cell.focus()
    cell.click()
    await grid.updateComplete
    expect(grid.renderRoot.activeElement).toBe(cell)
  })
})
