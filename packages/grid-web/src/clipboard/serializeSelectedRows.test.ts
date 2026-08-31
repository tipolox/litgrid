import { describe, expect, it } from 'vitest'
import type { GridSelection } from '@tipolox/litgrid-core'
import { serializeSelectedRows } from './serializeSelectedRows.js'

const columns = [{ key: 'name' }, { key: 'age' }]
const rows = [
  { name: 'Ada', age: 37 },
  { name: 'Grace', age: 28 }
]

function createSelection(mode: GridSelection['mode'], rowIndexes: number[] = []): GridSelection {
  return {
    mode,
    rowIndex: null,
    columnKey: null,
    anchorRowIndex: null,
    rowIndexes: new Set(rowIndexes),
    cells: new Set()
  }
}

function serialize(selection: GridSelection) {
  return serializeSelectedRows({
    selection,
    rows,
    columns,
    getCellValue: (column, row) => (row as Record<string, unknown>)[column.key],
    formatValue: (value) => value == null ? '' : String(value)
  })
}

describe('serializeSelectedRows', () => {
  it('serializes selected rows as TSV in displayed row order', () => {
    expect(serialize(createSelection('multi-row', [1, 0]))).toBe('Ada\t37\nGrace\t28')
  })

  it('uses column accessors and formatted values', () => {
    const selection = createSelection('row', [0])

    expect(serializeSelectedRows({
      selection,
      rows,
      columns: [{ key: 'label', accessor: (row) => `${(row as { name: string }).name}!` }],
      getCellValue: (column, row, rowIndex) => column.accessor?.(row, rowIndex),
      formatValue: (value) => `[${String(value)}]`
    })).toBe('[Ada!]')
  })

  it('returns null without an eligible row selection', () => {
    expect(serialize(createSelection('multi-row'))).toBeNull()
    expect(serialize(createSelection('cell', [0]))).toBeNull()
    expect(serialize(createSelection('row', [10]))).toBeNull()
  })
})
