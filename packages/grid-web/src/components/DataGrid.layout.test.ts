// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid.js'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

// jsdom cannot verify wrapping, paint order, or pixel alignment. These tests
// cover the DOM and interactions that the responsive layout must preserve.
describe('DataGrid footer layout', () => {
  it('keeps all pagination controls outside the scrolling viewport and usable in their groups', async () => {
    const grid = new DataGrid()
    grid.config = { pagination: { enabled: true, pageSize: 2 } }
    grid.data = Array.from({ length: 61 }, (_, id) => ({ id }))
    grid.columns = [{ key: 'id', width: 800 }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const footer = grid.renderRoot.querySelector('.pagination') as HTMLElement
    const summary = footer.querySelector('.pagination-summary') as HTMLElement
    const navigation = footer.querySelector('.pagination-navigation') as HTMLElement
    const select = summary.querySelector('select') as HTMLSelectElement
    const [previous, next] = Array.from(navigation.querySelectorAll('button'))

    expect(footer.parentElement).toBe(viewport.parentElement)
    expect(viewport.contains(footer)).toBe(false)
    expect(footer.getAttribute('aria-label')).toBe('Pagination')
    expect(summary.textContent).toContain('61 rows')
    expect(select.getAttribute('aria-label')).toBe('Rows per page')
    expect(select.value).toBe('2')
    expect(navigation.textContent).toContain('Page 1 of 31')
    expect(previous.disabled).toBe(true)
    expect(next.disabled).toBe(false)

    next.click()
    await grid.updateComplete
    expect(navigation.textContent).toContain('Page 2 of 31')
    previous.click()
    await grid.updateComplete
    expect(navigation.textContent).toContain('Page 1 of 31')

    select.value = '25'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await grid.updateComplete
    expect(grid.getPagination()).toMatchObject({ pageSize: 25, pageCount: 3 })
    expect(summary.textContent).toContain('61 rows')
    expect(navigation.textContent).toContain('Page 1 of 3')

    next.click()
    await grid.updateComplete
    next.click()
    await grid.updateComplete
    expect(navigation.textContent).toContain('Page 3 of 3')
    expect(next.disabled).toBe(true)
    expect(previous.disabled).toBe(false)
  })
})

describe('DataGrid horizontal header layout', () => {
  it.each([true, false])('preserves the fixed gutter and virtual header/body columns while scrolling (row header: %s)', async (enabled) => {
    let frame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback
      return 1
    })
    const grid = new DataGrid()
    grid.config = { rowHeader: { enabled } }
    grid.columnOverscanCount = 0
    const columns = Array.from({ length: 8 }, (_, index) => ({ key: `c${index}`, width: 120 }))
    grid.columns = columns
    grid.data = [Object.fromEntries(columns.map((column) => [column.key, column.key]))]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    // Supply viewport measurements for the virtualizer, not a simulated CSS layout.
    Object.defineProperty(viewport, 'clientWidth', { value: 360 })
    Object.defineProperty(viewport, 'offsetWidth', { value: 360 })
    grid.requestUpdate()
    await grid.updateComplete
    await grid.updateComplete

    const gutter = grid.renderRoot.querySelector('.header-row-header') as HTMLElement | null
    const clip = grid.renderRoot.querySelector('.header-clip') as HTMLElement
    expect(Boolean(gutter)).toBe(enabled)
    if (gutter) expect(gutter.parentElement).toBe(clip.parentElement)

    for (const scrollLeft of [240, 480, 0]) {
      viewport.scrollLeft = scrollLeft
      viewport.dispatchEvent(new Event('scroll'))
      const headerRow = grid.renderRoot.querySelector('.header-column-row') as HTMLElement
      expect(headerRow.style.transform).toBe(`translateX(${-scrollLeft}px)`)
      expect(frame).toBeDefined()
      frame!(0)
      await grid.updateComplete

      const headers = Array.from(grid.renderRoot.querySelectorAll('.header-cell'))
      const cells = Array.from(grid.renderRoot.querySelectorAll('.row .cell'))
      expect(headers[0].getAttribute('data-column-key')).toBe(`c${scrollLeft / 120}`)
      expect(headers.length).toBeLessThan(8)
      expect(cells.map((cell) => cell.textContent?.trim())).toEqual(
        headers.map((header) => header.getAttribute('data-column-key'))
      )
      expect(cells.map((cell) => cell.getAttribute('aria-colindex'))).toEqual(
        headers.map((header) => header.getAttribute('aria-colindex'))
      )
      expect(grid.renderRoot.querySelector('.header-row-header')).toBe(gutter)
      if (gutter) {
        expect(headerRow.contains(gutter)).toBe(false)
        expect(gutter.style.transform).toBe('')
      }
      expect(headers.every((header) => header.querySelector('.resize-handle'))).toBe(true)
    }
  })
})
