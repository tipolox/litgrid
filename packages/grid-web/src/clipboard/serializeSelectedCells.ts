import type { GridSelection } from '@tipolox/litgrid-core'
import type { GridColumn } from '../types'

type SerializeSelectedCellsOptions = {
  selection: GridSelection
  rows: unknown[]
  columns: GridColumn[]
  getCellValue: (column: GridColumn, row: unknown, rowIndex: number) => unknown
  formatValue: (value: unknown) => string
}

function isCellSelection(selection: GridSelection) {
  return selection.mode === 'cell' || selection.mode === 'multi-cell'
}

export function serializeSelectedCells({
  selection,
  rows,
  columns,
  getCellValue,
  formatValue
}: SerializeSelectedCellsOptions): string | null {
  if (!isCellSelection(selection) || selection.cells.size === 0) {
    return null
  }

  const selectedRows: number[] = []
  const selectedColumns: number[] = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      if (selection.cells.has(`${rowIndex}:${columns[columnIndex].key}`)) {
        selectedRows.push(rowIndex)
        selectedColumns.push(columnIndex)
      }
    }
  }

  if (selectedRows.length === 0 || selectedColumns.length === 0) {
    return null
  }

  const firstRowIndex = Math.min(...selectedRows)
  const lastRowIndex = Math.max(...selectedRows)
  const firstColumnIndex = Math.min(...selectedColumns)
  const lastColumnIndex = Math.max(...selectedColumns)

  return Array.from({ length: lastRowIndex - firstRowIndex + 1 }, (_, rowOffset) => {
    const rowIndex = firstRowIndex + rowOffset
    const row = rows[rowIndex]

    return Array.from({ length: lastColumnIndex - firstColumnIndex + 1 }, (_, columnOffset) => {
      const column = columns[firstColumnIndex + columnOffset]

      if (!selection.cells.has(`${rowIndex}:${column.key}`)) {
        return ''
      }

      return formatValue(getCellValue(column, row, rowIndex))
    }).join('\t')
  }).join('\n')
}
