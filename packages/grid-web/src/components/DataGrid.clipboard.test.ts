// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataGrid } from './DataGrid'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard
})

describe('DataGrid clipboard', () => {
  it('copies selected cells through its public API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })

    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-cell' } }
    grid.data = [{ name: 'Ada', age: 37 }]
    grid.columns = [{ key: 'name' }, { key: 'age' }]
    ;(grid as unknown as { engine: { selectCell: (rowIndex: number, columnKey: string) => void } })
      .engine.selectCell(0, 'name')
    ;(grid as unknown as { engine: { selectCell: (rowIndex: number, columnKey: string) => void } })
      .engine.selectCell(0, 'age')

    await expect(grid.copySelectedCells()).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('Ada\t37')
  })

  it('copies selected rows through its public API in displayed row order', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })

    const grid = new DataGrid()
    grid.config = { selection: { mode: 'multi-row' } }
    grid.data = [{ name: 'Ada', age: 37 }, { name: 'Grace', age: 28 }]
    grid.columns = [{ key: 'name' }, { key: 'age' }]
    ;(grid as unknown as { engine: { selectRow: (rowIndex: number) => void } }).engine.selectRow(1)
    ;(grid as unknown as { engine: { selectRow: (rowIndex: number, intent: 'toggle') => void } })
      .engine.selectRow(0, 'toggle')

    await expect(grid.copySelectedRows()).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('Ada\t37\nGrace\t28')
  })

  it('handles Ctrl/Cmd+C only when cells are selected', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })

    const grid = new DataGrid()
    grid.config = { selection: { mode: 'cell' } }
    grid.data = [{ name: 'Ada' }]
    grid.columns = [{ key: 'name' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const emptyCopy = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true })
    viewport.dispatchEvent(emptyCopy)
    expect(emptyCopy.defaultPrevented).toBe(false)

    ;(grid as unknown as { engine: { selectCell: (rowIndex: number, columnKey: string) => void } })
      .engine.selectCell(0, 'name')
    const copy = new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true, cancelable: true })
    viewport.dispatchEvent(copy)
    await Promise.resolve()

    expect(copy.defaultPrevented).toBe(true)
    expect(writeText).toHaveBeenCalledWith('Ada')
  })

  it('handles Ctrl/Cmd+C only when rows are selected', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })

    const grid = new DataGrid()
    grid.config = { selection: { mode: 'row' } }
    grid.data = [{ name: 'Ada', age: 37 }]
    grid.columns = [{ key: 'name' }, { key: 'age' }]
    document.body.append(grid)
    await grid.updateComplete

    const viewport = grid.renderRoot.querySelector('.viewport') as HTMLElement
    const emptyCopy = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true })
    viewport.dispatchEvent(emptyCopy)
    expect(emptyCopy.defaultPrevented).toBe(false)

    ;(grid as unknown as { engine: { selectRow: (rowIndex: number) => void } }).engine.selectRow(0)
    const copy = new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true, cancelable: true })
    viewport.dispatchEvent(copy)
    await Promise.resolve()

    expect(copy.defaultPrevented).toBe(true)
    expect(writeText).toHaveBeenCalledWith('Ada\t37')
  })
})
