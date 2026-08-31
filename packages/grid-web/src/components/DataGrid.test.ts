// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { html } from 'lit'
import { DataGrid } from './DataGrid.js'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('DataGrid ARIA support', () => {
  it('exposes the logical grid structure, coordinates, and configured label', async () => {
    const grid = new DataGrid()
    grid.ariaLabel = 'Employee directory'
    grid.config = { selection: { mode: 'row' }, rowHeader: { enabled: true } }
    grid.data = [{ name: 'Ada', role: 'Engineer' }, { name: 'Grace', role: 'Admiral' }]
    grid.columns = [{ key: 'name', header: 'Name' }, { key: 'role', header: 'Role' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const headers = grid.renderRoot.querySelectorAll('.header-cell')
    const row = grid.renderRoot.querySelector('.row') as HTMLElement
    const cell = grid.renderRoot.querySelector('.cell') as HTMLElement

    expect(grid.getAttribute('aria-label')).toBe('Employee directory')
    expect(viewport.getAttribute('role')).toBe('grid')
    expect(viewport.getAttribute('aria-label')).toBe('Employee directory')
    expect(viewport.getAttribute('aria-rowcount')).toBe('3')
    expect(viewport.getAttribute('aria-colcount')).toBe('3')
    const headerRow = grid.renderRoot.querySelector('.header-column-row') as HTMLElement
    expect(headerRow.getAttribute('role')).toBe('row')
    expect(viewport.getAttribute('aria-owns')).toBe(headerRow.id)
    expect(headers[0].getAttribute('role')).toBe('columnheader')
    expect(headerRow.getAttribute('aria-owns')).toBe(
      (grid.renderRoot.querySelector('.header-row-header') as HTMLElement).id
    )
    expect(headers[0].getAttribute('aria-colindex')).toBe('2')
    expect(headers[0].getAttribute('aria-sort')).toBe('none')
    expect(row.getAttribute('role')).toBe('row')
    expect(row.getAttribute('aria-rowindex')).toBe('2')
    expect(row.getAttribute('aria-selected')).toBe('false')
    expect(cell.getAttribute('role')).toBe('gridcell')
    expect(cell.getAttribute('aria-colindex')).toBe('2')
    expect(grid.renderRoot.querySelector('.row-header-cell:not(.header-row-header)')?.getAttribute('role')).toBe('rowheader')
  })

  it('maps sort, selection, and active-cell state to ARIA', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'cell' } }
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name', header: 'Name' }]
    document.body.append(grid)
    await grid.updateComplete

    ;(grid as unknown as { engine: { sortBy: (key: string, direction: 'asc' | 'desc') => void } })
      .engine.sortBy('name', 'asc')
    grid.requestUpdate()
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const cell = grid.renderRoot.querySelector('.cell') as HTMLElement
    cell.click()
    await grid.updateComplete

    expect(grid.renderRoot.querySelector('.header-cell')?.getAttribute('aria-sort')).toBe('ascending')
    expect(cell.getAttribute('aria-selected')).toBe('true')
    expect(viewport.getAttribute('aria-activedescendant')).toBe(cell.id)
  })

  it('exposes header menu state and hides decorative layout controls', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const trigger = grid.renderRoot.querySelector('.header-action-button') as HTMLButtonElement
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
    expect(grid.renderRoot.querySelector('.resize-handle')?.getAttribute('aria-hidden')).toBe('true')
    expect(grid.renderRoot.querySelector('.column-spacer')?.getAttribute('aria-hidden')).toBe('true')

    trigger.click()
    await grid.updateComplete
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const menu = grid.renderRoot.querySelector('.header-menu') as HTMLElement
    expect(menu.getAttribute('role')).toBe('dialog')
    expect(menu.id).toBe(trigger.getAttribute('aria-controls'))
  })

  it('provides instructions and announces active-cell, selection, query, and pagination changes', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' }, pagination: { enabled: true, pageSize: 1 } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }]
    grid.columns = [{ key: 'name', header: 'Name' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const description = grid.renderRoot.querySelector('.screen-reader-only') as HTMLElement
    const status = grid.renderRoot.querySelector('[role="status"]') as HTMLElement

    expect(viewport.getAttribute('aria-describedby')).toBe(description.id)
    expect(description.textContent).toContain('Use arrow keys to move between cells')
    expect(status.getAttribute('aria-live')).toBe('polite')

    viewport.focus()
    await grid.updateComplete
    expect(status.textContent).toContain('Name, row 1 of 1, column 1 of 1, Ada')

    grid.selectRow(0)
    await grid.updateComplete
    expect(status.textContent).toBe('Row 1 selected.')

    grid.setQuickSearch('missing')
    await grid.updateComplete
    expect(status.textContent).toBe('Quick search updated. No matching rows.')

    grid.clearQuickSearch()
    grid.setPage(1)
    await grid.updateComplete
    expect(status.textContent).toBe('Page 2 of 2.')
  })

  it('supports custom instructions and opting out of generated announcements', async () => {
    const grid = new DataGrid()
    grid.ariaDescription = 'Custom grid instructions.'
    grid.screenReaderAnnouncements = false
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const description = grid.renderRoot.querySelector('.screen-reader-only') as HTMLElement

    expect(grid.getAttribute('aria-description')).toBe('Custom grid instructions.')
    expect(description.textContent).toBe('Custom grid instructions.')
    expect(viewport.getAttribute('aria-describedby')).toBe(description.id)
    expect(grid.renderRoot.querySelector('[role="status"]')).toBeNull()
  })
})

describe('DataGrid sizing APIs', () => {
  it('applies and resets normalized row and column sizes', () => {
    const grid = new DataGrid()
    const column = { key: 'name', width: 120 }

    grid.setColumnWidth('name', 1)
    grid.setRowHeight(2, 1)

    expect(grid.getColumnWidth(column)).toBe(64)
    expect(grid.getRowHeight(2)).toBe(28)

    grid.resetColumnWidth('name')
    grid.resetRowHeight(2)

    expect(grid.getColumnWidth(column)).toBe(120)
    expect(grid.getRowHeight(2)).toBe(36)
  })

  it('resets all overridden sizes', () => {
    const grid = new DataGrid()
    const firstColumn = { key: 'first' }
    const secondColumn = { key: 'second' }

    grid.setColumnWidth('first', 200)
    grid.setColumnWidth('second', 220)
    grid.setRowHeight(0, 40)
    grid.setRowHeight(1, 44)

    grid.resetAllColumnWidths()
    grid.resetAllRowHeights()

    expect(grid.getColumnWidth(firstColumn)).toBe(160)
    expect(grid.getColumnWidth(secondColumn)).toBe(160)
    expect(grid.getRowHeight(0)).toBe(36)
    expect(grid.getRowHeight(1)).toBe(36)
  })
})

describe('DataGrid column reordering', () => {
  it('moves columns, preserves keyed widths, emits the change event, and resets to the supplied order', async () => {
    const grid = new DataGrid()
    grid.data = [{ first: 'Ada', second: 'Engineer', third: 'London' }]
    grid.columns = [{ key: 'first' }, { key: 'second' }, { key: 'third' }]
    grid.setColumnWidth('second', 220)
    const events: CustomEvent[] = []
    grid.addEventListener('column-reorder', (event) => events.push(event as CustomEvent))
    document.body.append(grid)
    await grid.updateComplete

    grid.moveColumn('second', 0)
    await grid.updateComplete

    expect(grid.getColumnOrder()).toEqual(['second', 'first', 'third'])
    expect(grid.getColumnWidth({ key: 'second' })).toBe(220)
    expect(events[0].detail).toEqual({
      columnKey: 'second',
      previousIndex: 1,
      currentIndex: 0,
      columnOrder: ['second', 'first', 'third']
    })
    expect(Array.from(grid.renderRoot.querySelectorAll('.header-cell .header-label'))
      .map((element) => element.textContent?.trim())).toEqual(['second', 'first'])

    grid.setColumnOrder(['third', 'missing', 'third'])
    expect(grid.getColumnOrder()).toEqual(['third', 'second', 'first'])

    grid.resetColumnOrder()
    expect(grid.getColumnOrder()).toEqual(['first', 'second', 'third'])
  })
})

describe('DataGrid filtering APIs', () => {
  it('filters through the Core engine and exposes active filter state', () => {
    const grid = new DataGrid()
    grid.data = [
      { name: 'Ada', age: 37 },
      { name: 'Grace', age: 28 }
    ]

    grid.setFilter({ columnKey: 'name', operator: 'contains', value: 'ada' })

    expect(grid.getFilters()).toEqual([
      { columnKey: 'name', operator: 'contains', value: 'ada' }
    ])
    expect((grid as unknown as { engine: { getRows: () => unknown[] } }).engine.getRows()).toEqual([
      { name: 'Ada', age: 37 }
    ])

    grid.clearFilter('name')
    expect(grid.getFilters()).toEqual([])
  })

  it('hydrates a reopened filter menu from the active Core filter', () => {
    const grid = new DataGrid()
    const internals = grid as unknown as {
      engine: { setFilter: (filter: { columnKey: string; operator: 'contains' | 'equals'; value: string }) => void }
      filterDrafts: Map<string, { columnKey: string; operator: string; value?: string }>
      toggleHeaderMenu: (columnKey: string, event: MouseEvent) => void
    }
    const event = new MouseEvent('click')

    internals.filterDrafts.set('status', {
      columnKey: 'status',
      operator: 'contains',
      value: 'Queued'
    })
    internals.engine.setFilter({
      columnKey: 'status',
      operator: 'equals',
      value: 'Queued'
    })

    internals.toggleHeaderMenu('status', event)

    expect(internals.filterDrafts.get('status')).toEqual({
      columnKey: 'status',
      operator: 'equals',
      value: 'Queued'
    })
  })

  it('renders the active filter operator when a menu is reopened', async () => {
    const grid = new DataGrid()
    grid.data = [{ status: 'Queued' }]
    grid.columns = [{ key: 'status' }]
    document.body.append(grid)
    await grid.updateComplete

    grid.setFilter({ columnKey: 'status', operator: 'equals', value: 'Queued' })
    await grid.updateComplete

    const menuButton = grid.renderRoot.querySelector(
      '.header-action-button'
    ) as HTMLButtonElement
    menuButton.click()
    await grid.updateComplete

    expect(
      (grid.renderRoot.querySelector('[aria-label="Filter operator"]') as HTMLSelectElement).value
    ).toBe('equals')
  })
})

describe('DataGrid single-row selection', () => {
  it('selects the clicked row and replaces the previous selection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const rows = () => Array.from(grid.renderRoot.querySelectorAll('.row')) as HTMLElement[]
    rows()[0].click()
    await grid.updateComplete

    expect(rows()[0].classList).toContain('row-selected')
    expect(rows()[1].classList).not.toContain('row-selected')

    rows()[1].click()
    await grid.updateComplete

    expect(rows()[0].classList).not.toContain('row-selected')
    expect(rows()[1].classList).toContain('row-selected')
  })

  it('does not select rows when row selection is disabled', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const row = grid.renderRoot.querySelector('.row') as HTMLElement
    row.click()
    await grid.updateComplete

    expect(row.classList).not.toContain('row-selectable')
    expect(row.classList).not.toContain('row-selected')
  })
})

describe('DataGrid keyboard navigation', () => {
  function pressKey(
    viewport: HTMLElement,
    key: string,
    options: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
  ) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
      ...options
    })
    viewport.dispatchEvent(event)
    return event
  }

  function pressArrow(viewport: HTMLElement, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
    return pressKey(viewport, key)
  }

  it('moves the active cell with arrow keys without changing row selection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' } }
    grid.data = [{ name: 'Ada', role: 'Engineer' }, { name: 'Grace', role: 'Admiral' }]
    grid.columns = [{ key: 'name' }, { key: 'role' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const firstCell = grid.renderRoot.querySelector('.cell') as HTMLElement
    firstCell.click()
    await grid.updateComplete

    const rightEvent = pressArrow(viewport, 'ArrowRight')
    await grid.updateComplete
    expect(rightEvent.defaultPrevented).toBe(true)
    expect(grid.renderRoot.querySelector('.cell-active')?.getAttribute('data-row-index')).toBe('0')
    expect(grid.renderRoot.querySelector('.cell-active')?.getAttribute('data-column-index')).toBe('1')
    expect(grid.getSelection().rowIndexes).toEqual(new Set([0]))

    pressArrow(viewport, 'ArrowDown')
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.cell-active')?.getAttribute('data-row-index')).toBe('1')
    expect(grid.renderRoot.querySelector('.cell-active')?.getAttribute('data-column-index')).toBe('1')
    expect(grid.getSelection().rowIndexes).toEqual(new Set([0]))
  })

  it('moves to row and grid boundaries with Home and End without changing selection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' } }
    grid.data = [
      { name: 'Ada', role: 'Engineer', location: 'London' },
      { name: 'Grace', role: 'Admiral', location: 'New York' },
      { name: 'Linus', role: 'Engineer', location: 'Helsinki' }
    ]
    grid.columns = [{ key: 'name' }, { key: 'role' }, { key: 'location' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const firstCell = grid.renderRoot.querySelector('.cell') as HTMLElement
    const getActiveCell = () => (grid as unknown as {
      activeCell: { rowIndex: number; columnIndex: number } | null
    }).activeCell
    firstCell.click()
    await grid.updateComplete

    pressArrow(viewport, 'ArrowRight')
    await grid.updateComplete
    const endEvent = pressKey(viewport, 'End')
    await grid.updateComplete
    expect(endEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 2 })

    const homeEvent = pressKey(viewport, 'Home')
    await grid.updateComplete
    expect(homeEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 0 })

    const gridEndEvent = pressKey(viewport, 'End', { ctrlKey: true })
    await grid.updateComplete
    expect(gridEndEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 2, columnIndex: 2 })

    const gridHomeEvent = pressKey(viewport, 'Home', { metaKey: true })
    await grid.updateComplete
    expect(gridHomeEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 0 })
    expect(grid.getSelection().rowIndexes).toEqual(new Set([0]))
  })

  it('moves an active cell by a viewport page with Page Up and Page Down', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' } }
    grid.data = Array.from({ length: 20 }, (_, index) => ({ name: `Row ${index}`, role: 'User' }))
    grid.columns = [{ key: 'name' }, { key: 'role' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const getActiveCell = () => (grid as unknown as {
      activeCell: { rowIndex: number; columnIndex: number } | null
    }).activeCell
    ;(grid.renderRoot.querySelector('.cell[data-column-index="1"]') as HTMLElement).click()
    await grid.updateComplete

    const pageDownEvent = pressKey(viewport, 'PageDown')
    await grid.updateComplete
    expect(pageDownEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 8, columnIndex: 1 })
    expect(grid.getSelection().rowIndexes).toEqual(new Set([0]))

    const pageUpEvent = pressKey(viewport, 'PageUp')
    await grid.updateComplete
    expect(pageUpEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 1 })
  })

  it('uses variable row heights and clamps Page Up and Page Down at displayed row boundaries', async () => {
    const grid = new DataGrid()
    grid.data = Array.from({ length: 5 }, (_, index) => ({ name: `Row ${index}` }))
    grid.columns = [{ key: 'name' }]
    grid.setRowHeight(0, 100)
    grid.setRowHeight(1, 100)
    grid.setRowHeight(2, 100)
    grid.setRowHeight(3, 100)
    grid.setRowHeight(4, 100)
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const getActiveCell = () => (grid as unknown as {
      activeCell: { rowIndex: number; columnIndex: number } | null
    }).activeCell
    ;(grid.renderRoot.querySelector('.cell') as HTMLElement).click()
    await grid.updateComplete

    pressKey(viewport, 'PageDown')
    await grid.updateComplete
    expect(getActiveCell()).toEqual({ rowIndex: 3, columnIndex: 0 })

    pressKey(viewport, 'PageDown')
    await grid.updateComplete
    expect(getActiveCell()).toEqual({ rowIndex: 4, columnIndex: 0 })

    pressKey(viewport, 'PageUp')
    await grid.updateComplete
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 0 })

    pressKey(viewport, 'PageUp')
    await grid.updateComplete
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 0 })
  })

  it('moves across displayed cells with Tab and Shift + Tab without changing selection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' } }
    grid.data = [{ name: 'Ada', role: 'Engineer' }, { name: 'Grace', role: 'Admiral' }]
    grid.columns = [{ key: 'name' }, { key: 'role' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const getActiveCell = () => (grid as unknown as {
      activeCell: { rowIndex: number; columnIndex: number } | null
    }).activeCell
    ;(grid.renderRoot.querySelector('.cell') as HTMLElement).click()
    await grid.updateComplete

    const firstTabEvent = pressKey(viewport, 'Tab')
    await grid.updateComplete
    expect(firstTabEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 1 })

    const wrappingTabEvent = pressKey(viewport, 'Tab')
    await grid.updateComplete
    expect(wrappingTabEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 1, columnIndex: 0 })

    const reverseTabEvent = pressKey(viewport, 'Tab', { shiftKey: true })
    await grid.updateComplete
    expect(reverseTabEvent.defaultPrevented).toBe(true)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 1 })
    expect(grid.getSelection().rowIndexes).toEqual(new Set([0]))
  })

  it('allows browser focus traversal when Tab navigation reaches a grid boundary', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada', role: 'Engineer' }, { name: 'Grace', role: 'Admiral' }]
    grid.columns = [{ key: 'name' }, { key: 'role' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const getActiveCell = () => (grid as unknown as {
      activeCell: { rowIndex: number; columnIndex: number } | null
    }).activeCell
    ;(grid.renderRoot.querySelector('.cell') as HTMLElement).click()
    await grid.updateComplete

    const firstBoundaryEvent = pressKey(viewport, 'Tab', { shiftKey: true })
    expect(firstBoundaryEvent.defaultPrevented).toBe(false)
    expect(getActiveCell()).toEqual({ rowIndex: 0, columnIndex: 0 })

    ;(grid.renderRoot.querySelector('.cell[data-row-index="1"][data-column-index="1"]') as HTMLElement).click()
    await grid.updateComplete
    const lastBoundaryEvent = pressKey(viewport, 'Tab')
    expect(lastBoundaryEvent.defaultPrevented).toBe(false)
    expect(getActiveCell()).toEqual({ rowIndex: 1, columnIndex: 1 })
  })

  it('clamps arrow-key navigation at the first and last displayed cells', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    pressArrow(viewport, 'ArrowUp')
    pressArrow(viewport, 'ArrowLeft')
    await grid.updateComplete

    const activeCell = grid.renderRoot.querySelector('.cell-active') as HTMLElement
    expect(activeCell.getAttribute('data-row-index')).toBe('0')
    expect(activeCell.getAttribute('data-column-index')).toBe('0')
  })

  it('initializes an active cell when the viewport receives focus', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    viewport.focus()
    await grid.updateComplete

    expect(grid.renderRoot.querySelector('.cell-active')?.getAttribute('data-row-index')).toBe('0')
    expect(grid.renderRoot.querySelector('.cell-active')?.getAttribute('data-column-index')).toBe('0')
  })

  it('selects the active cell or row with Enter and Space', async () => {
    const cellGrid = new DataGrid()
    cellGrid.config = { selection: { mode: 'cell' } }
    cellGrid.data = [{ name: 'Ada' }]
    cellGrid.columns = [{ key: 'name' }]
    document.body.append(cellGrid)
    await cellGrid.updateComplete

    const cellViewport = cellGrid.renderRoot.querySelector('.viewport') as HTMLElement
    const enterEvent = pressKey(cellViewport, 'Enter')
    await cellGrid.updateComplete
    expect(enterEvent.defaultPrevented).toBe(true)
    expect(cellGrid.isCellSelected(0, 'name')).toBe(true)

    const rowGrid = new DataGrid()
    rowGrid.config = { selection: { mode: 'row' } }
    rowGrid.data = [{ name: 'Grace' }]
    rowGrid.columns = [{ key: 'name' }]
    document.body.append(rowGrid)
    await rowGrid.updateComplete

    const spaceEvent = pressKey(rowGrid.renderRoot.querySelector('.viewport') as HTMLElement, ' ')
    await rowGrid.updateComplete
    expect(spaceEvent.defaultPrevented).toBe(true)
    expect(rowGrid.isRowSelected(0)).toBe(true)
  })

  it('closes a header menu with Escape and restores focus to its trigger', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const trigger = grid.renderRoot.querySelector('.header-action-button') as HTMLButtonElement
    trigger.click()
    await grid.updateComplete

    const menu = grid.renderRoot.querySelector('.header-menu') as HTMLElement
    expect(grid.renderRoot.activeElement).toBe(menu.querySelector('button'))

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, composed: true, cancelable: true
    })
    menu.dispatchEvent(escapeEvent)
    await grid.updateComplete

    expect(escapeEvent.defaultPrevented).toBe(true)
    expect(grid.renderRoot.querySelector('.header-menu')).toBeNull()
    expect(grid.renderRoot.activeElement).toBe(trigger)
  })
})

describe('DataGrid checkbox selection', () => {
  it('renders row and select-all checkboxes for multi-row checkbox selection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row', checkboxes: true } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const checkboxes = grid.renderRoot.querySelectorAll('.selection-checkbox')
    expect(checkboxes).toHaveLength(3)

    const firstRowCheckbox = checkboxes[1] as HTMLInputElement
    firstRowCheckbox.click()
    await grid.updateComplete
    expect(firstRowCheckbox.checked).toBe(true)

    const selectAllCheckbox = checkboxes[0] as HTMLInputElement
    expect(selectAllCheckbox.indeterminate).toBe(true)
    selectAllCheckbox.click()
    await grid.updateComplete

    expect(Array.from(grid.renderRoot.querySelectorAll('.selection-checkbox'))
      .slice(1)
      .every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true)
  })

  it('does not render checkboxes outside multi-row selection mode', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row', checkboxes: true } }
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    expect(grid.renderRoot.querySelector('.selection-checkbox')).toBeNull()
  })
})

describe('DataGrid multi-row selection (ctrl/shift)', () => {
  function clickRow(row: HTMLElement, options: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = {}) {
    row.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ...options }))
  }

  it('replaces the selection on a plain click', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const rows = () => Array.from(grid.renderRoot.querySelectorAll('.row')) as HTMLElement[]
    clickRow(rows()[0])
    await grid.updateComplete
    clickRow(rows()[2])
    await grid.updateComplete

    expect(rows()[0].classList).not.toContain('row-selected')
    expect(rows()[2].classList).toContain('row-selected')
    expect(grid.getSelection().rowIndexes).toEqual(new Set([2]))
  })

  it('toggles individual rows in and out of the selection on ctrl/meta-click', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const rows = () => Array.from(grid.renderRoot.querySelectorAll('.row')) as HTMLElement[]
    clickRow(rows()[0])
    await grid.updateComplete
    clickRow(rows()[2], { ctrlKey: true })
    await grid.updateComplete

    expect(rows()[0].classList).toContain('row-selected')
    expect(rows()[2].classList).toContain('row-selected')
    expect(grid.getSelection().rowIndexes).toEqual(new Set([0, 2]))

    // metaKey (Cmd on macOS) behaves the same as ctrlKey for toggling.
    clickRow(rows()[0], { metaKey: true })
    await grid.updateComplete

    expect(rows()[0].classList).not.toContain('row-selected')
    expect(rows()[2].classList).toContain('row-selected')
    expect(grid.getSelection().rowIndexes).toEqual(new Set([2]))
  })

  it('selects a contiguous range from the anchor row on shift-click', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }, { name: 'Katie' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const rows = () => Array.from(grid.renderRoot.querySelectorAll('.row')) as HTMLElement[]
    clickRow(rows()[0])
    await grid.updateComplete
    clickRow(rows()[3], { shiftKey: true })
    await grid.updateComplete

    expect(grid.getSelection().rowIndexes).toEqual(new Set([0, 1, 2, 3]))
    rows().forEach((row) => expect(row.classList).toContain('row-selected'))
  })

  it('supports combining ctrl-click and shift-click in a single interaction', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = Array.from({ length: 7 }, (_, index) => ({ name: `Row ${index}` }))
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const rows = () => Array.from(grid.renderRoot.querySelectorAll('.row')) as HTMLElement[]
    clickRow(rows()[1])
    await grid.updateComplete
    clickRow(rows()[4], { ctrlKey: true })
    await grid.updateComplete
    expect(grid.getSelection().rowIndexes).toEqual(new Set([1, 4]))

    clickRow(rows()[6], { shiftKey: true })
    await grid.updateComplete
    expect(grid.getSelection().rowIndexes).toEqual(new Set([4, 5, 6]))
  })

  it('prevents the default mousedown behavior for shift-click to avoid native text selection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const row = grid.renderRoot.querySelector('.row') as HTMLElement
    const event = new MouseEvent('mousedown', { bubbles: true, composed: true, shiftKey: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    row.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})

describe('DataGrid selection public API', () => {
  it('exposes selectRow, getSelection, isRowSelected, and clearSelection', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    grid.selectRow(0)
    grid.selectRow(2, 'toggle')
    await grid.updateComplete

    expect(grid.getSelection().rowIndexes).toEqual(new Set([0, 2]))
    expect(grid.isRowSelected(0)).toBe(true)
    expect(grid.isRowSelected(1)).toBe(false)

    grid.clearSelection()
    await grid.updateComplete

    expect(grid.getSelection().rowIndexes).toEqual(new Set())
    expect(grid.isRowSelected(0)).toBe(false)
  })

  it('exposes selectAllRows for the current displayed page', async () => {
    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    grid.selectAllRows()
    await grid.updateComplete

    expect(grid.getSelection().rowIndexes).toEqual(new Set([0, 1, 2]))
  })
})

describe('DataGrid quick-search APIs', () => {
  it('filters through the Core engine and resets vertical scroll', () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }]
    const internals = grid as unknown as {
      pendingScrollTop: number
      previousPendingScrollTop: number
      engine: { getRows: () => unknown[] }
    }
    internals.pendingScrollTop = 36
    internals.previousPendingScrollTop = 36

    grid.setQuickSearch('ada')

    expect(grid.getQuickSearch()).toBe('ada')
    expect(internals.engine.getRows()).toEqual([{ name: 'Ada' }])
    expect(internals.pendingScrollTop).toBe(0)
    expect(internals.previousPendingScrollTop).toBe(0)

    grid.clearQuickSearch()
    expect(grid.getQuickSearch()).toBe('')
    expect(internals.engine.getRows()).toEqual([{ name: 'Ada' }, { name: 'Grace' }])
  })

  it('shows and hides the grid-level quick-search bar from a column menu', async () => {
    const grid = new DataGrid()
    grid.data = [{ name: 'Ada' }, { name: 'Grace' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const menuButton = grid.renderRoot.querySelector('.header-action-button') as HTMLButtonElement
    menuButton.click()
    await grid.updateComplete

    const showQuickSearchButton = Array.from(grid.renderRoot.querySelectorAll('.header-menu button'))
      .find((button) => button.textContent?.trim() === 'Show Quick Search') as HTMLButtonElement
    showQuickSearchButton.click()
    await grid.updateComplete

    const input = grid.renderRoot.querySelector('[aria-label="Quick search"]') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = 'ada'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await grid.updateComplete
    expect(grid.getQuickSearch()).toBe('ada')

    menuButton.click()
    await grid.updateComplete
    const hideQuickSearchButton = Array.from(grid.renderRoot.querySelectorAll('.header-menu button'))
      .find((button) => button.textContent?.trim() === 'Hide Quick Search') as HTMLButtonElement
    hideQuickSearchButton.click()
    await grid.updateComplete

    expect(grid.renderRoot.querySelector('[aria-label="Quick search"]')).toBeNull()
    expect(grid.getQuickSearch()).toBe('ada')
  })

  it('updates the virtual spacer when quick search expands the result set', async () => {
    const grid = new DataGrid()
    grid.data = [
      { name: 'Beta one' },
      { name: 'Beta two' },
      { name: 'Bravo three' },
      { name: 'Bravo four' }
    ]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    grid.setQuickSearch('be')
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.viewport > div')?.getAttribute('style')).toContain('height: 72px')

    grid.setQuickSearch('b')
    await grid.updateComplete
    expect(grid.renderRoot.querySelector('.viewport > div')?.getAttribute('style')).toContain('height: 144px')
  })

  it('debounces quick-search input only at the configured source-row threshold', () => {
    vi.useFakeTimers()

    try {
      const grid = new DataGrid()
      const internals = grid as unknown as {
        handleQuickSearchInput: (query: string) => void
      }
      grid.quickSearchDebounceThreshold = 2
      grid.quickSearchDebounceMs = 150
      grid.data = [{ name: 'Ada' }, { name: 'Grace' }]

      internals.handleQuickSearchInput('a')
      internals.handleQuickSearchInput('ada')
      expect(grid.getQuickSearch()).toBe('')

      vi.advanceTimersByTime(149)
      expect(grid.getQuickSearch()).toBe('')
      vi.advanceTimersByTime(1)
      expect(grid.getQuickSearch()).toBe('ada')

      const smallGrid = new DataGrid()
      smallGrid.quickSearchDebounceThreshold = 2
      smallGrid.data = [{ name: 'Ada' }]
      ;(smallGrid as unknown as { handleQuickSearchInput: (query: string) => void })
        .handleQuickSearchInput('ada')
      expect(smallGrid.getQuickSearch()).toBe('ada')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('DataGrid pagination APIs', () => {
  it('exposes paginated Core rows and resets scroll when changing pages', () => {
    const grid = new DataGrid()
    grid.config = { pagination: { enabled: true, pageSize: 2 } }
    grid.data = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const internals = grid as unknown as { pendingScrollTop: number; previousPendingScrollTop: number }
    internals.pendingScrollTop = 36
    internals.previousPendingScrollTop = 36

    grid.setPage(1)

    expect(grid.getPagination()).toMatchObject({ pageIndex: 1, totalRows: 3, pageCount: 2 })
    expect(grid.getTotalRowCount()).toBe(3)
    expect((grid as unknown as { engine: { getRows: () => unknown[] } }).engine.getRows()).toEqual([{ id: 3 }])
    expect(internals.pendingScrollTop).toBe(0)
    expect(internals.previousPendingScrollTop).toBe(0)
  })

  it('renders pagination controls when enabled', async () => {
    const grid = new DataGrid()
    grid.config = { pagination: { enabled: true, pageSize: 2 } }
    grid.data = [{ id: 1 }, { id: 2 }, { id: 3 }]
    grid.columns = [{ key: 'id' }]
    document.body.append(grid)
    await grid.updateComplete

    expect(grid.renderRoot.querySelector('.pagination')?.textContent).toContain('Page 1 of 2')
    expect((grid.renderRoot.querySelector('.pagination button') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('DataGrid best-fit sizing', () => {
  it('caches widths until data, columns, or sample size change', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 })
    } as unknown as CanvasRenderingContext2D)
    const firstRenderer = vi.fn((value: unknown) => String(value))
    const secondRenderer = vi.fn((value: unknown) => `value: ${String(value)}`)
    const grid = new DataGrid()

    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name', render: firstRenderer }]
    grid.computeColumnBestFit('name')
    grid.computeColumnBestFit('name')

    expect(firstRenderer).toHaveBeenCalledTimes(1)

    grid.data = [{ name: 'Grace' }]
    grid.computeColumnBestFit('name')
    expect(firstRenderer).toHaveBeenCalledTimes(2)

    grid.columns = [{ key: 'name', render: secondRenderer }]
    grid.computeColumnBestFit('name')
    expect(secondRenderer).toHaveBeenCalledTimes(1)

    grid.bestFitSampleSize = 1
    grid.computeColumnBestFit('name')
    expect(secondRenderer).toHaveBeenCalledTimes(2)
  })

  it('measures a Lit TemplateResult renderer', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 })
    } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return (this.textContent?.length ?? 0) * 10
      }
    })

    const grid = new DataGrid()
    grid.data = [{ name: 'grid' }]
    grid.columns = [{
      key: 'name',
      header: 'Name',
      render: (value) => html`<strong>Rendered ${value} cell</strong>`
    }]

    expect(grid.bestFitColumn('name')).toBe(204)
    expect(grid.getColumnWidth({ key: 'name' })).toBe(204)
  })
})
