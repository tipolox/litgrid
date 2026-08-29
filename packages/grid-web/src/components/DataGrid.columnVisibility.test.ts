// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { DataGrid } from './DataGrid'

afterEach(() => {
  document.body.replaceChildren()
})

describe('DataGrid column visibility', () => {
  it('honors initial hidden columns and exposes visibility APIs', async () => {
    const grid = new DataGrid()
    grid.data = [{ id: 1, name: 'Ada' }]
    grid.columns = [{ key: 'id', hidden: true }, { key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    expect(grid.getVisibleColumnKeys()).toEqual(['name'])
    expect(grid.isColumnVisible('id')).toBe(false)
    expect(grid.renderRoot.querySelector('[data-column-key="id"]')).toBeNull()

    grid.setColumnVisible('id', true)
    await grid.updateComplete
    expect(grid.getVisibleColumnKeys()).toEqual(['id', 'name'])
    expect(grid.renderRoot.querySelector('[data-column-key="id"]')).not.toBeNull()

    grid.resetColumnVisibility()
    expect(grid.getVisibleColumnKeys()).toEqual(['name'])
  })

  it('preserves widths and dispatches visibility changes', async () => {
    const grid = new DataGrid()
    grid.data = [{ id: 1, name: 'Ada' }]
    grid.columns = [{ key: 'id' }, { key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete
    grid.setColumnWidth('id', 180)
    const eventDetails: unknown[] = []
    grid.addEventListener('column-visibility-change', (event) => {
      eventDetails.push((event as CustomEvent).detail)
    })

    grid.setColumnVisible('id', false)
    grid.setColumnVisible('id', true)
    await grid.updateComplete

    expect(grid.getColumnWidth({ key: 'id' })).toBe(180)
    expect(eventDetails).toEqual([
      { columnKey: 'id', visible: false, visibleColumnKeys: ['name'] },
      { columnKey: 'id', visible: true, visibleColumnKeys: ['id', 'name'] }
    ])
  })

  it('restores hidden columns from the column chooser', async () => {
    const grid = new DataGrid()
    grid.data = [{ id: 1 }]
    grid.columns = [{ key: 'id' }]
    document.body.append(grid)
    await grid.updateComplete

    grid.setColumnVisible('id', false)
    await grid.updateComplete
    expect(grid.getVisibleColumnKeys()).toEqual([])

    const chooserButton = grid.renderRoot.querySelector('.column-chooser-empty button') as HTMLButtonElement
    chooserButton.click()
    await grid.updateComplete
    const checkbox = grid.renderRoot.querySelector('.column-chooser-dialog input') as HTMLInputElement
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await grid.updateComplete

    expect(grid.getVisibleColumnKeys()).toEqual(['id'])
  })
})
