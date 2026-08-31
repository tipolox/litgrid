import { describe, expect, it } from 'vitest'
import type { GridSelection } from '@tipolox/litgrid-core'
import { serializeSelectedCells } from './serializeSelectedCells.js'

const columns = [{ key: 'name' }, { key: 'age' }, { key: 'status' }]
const rows = [
  { name: 'Ada', age: 37, status: 'Active' },
  { name: 'Grace', age: 28, status: 'Pending' }
]

function getCellKey(rowIndex: number, columnKey: string) {
  return `${rowIndex}:${columnKey}`
}

function createSelection(mode: GridSelection['mode'], cells: string[] = []): GridSelection {
  return {
    mode,
    rowIndex: null,
    columnKey: null,
    anchorRowIndex: null,
    rowIndexes: new Set(),
    cells: new Set(cells)
  }
}

function serialize(cells: string[]) {
  const selection = createSelection('multi-cell', cells)

  return serializeSelectedCells({
    selection,
    rows,
    columns,
    getCellValue: (column, row) => (row as Record<string, unknown>)[column.key],
    formatValue: (value) => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  })
}

describe('serializeSelectedCells', () => {
  it('serializes selected cells as TSV in displayed row and column order', () => {
    expect(serialize([
      getCellKey(1, 'status'),
      getCellKey(0, 'age'),
      getCellKey(0, 'name')
    ])).toBe('Ada\t37\t\n\t\tPending')
  })

  it('preserves sparse selected-cell positions with empty TSV fields', () => {
    expect(serialize([
      getCellKey(0, 'name'),
      getCellKey(0, 'status'),
      getCellKey(1, 'age')
    ])).toBe('Ada\t\tActive\n\t28\t')
  })

  it('returns null for an empty or row selection', () => {
    expect(serialize([])).toBeNull()

    const rowSelection = createSelection('multi-row')
    rowSelection.rowIndexes.add(0)
    expect(serializeSelectedCells({
      selection: rowSelection,
      rows,
      columns,
      getCellValue: (column, row) => (row as Record<string, unknown>)[column.key],
      formatValue: String
    })).toBeNull()
  })
})
