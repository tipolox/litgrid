import type { GridSelection } from '@tipolox/litgrid-core'
import type { GridColumn } from '../types'

type SerializeSelectedRowsOptions = {
  selection: GridSelection
  rows: unknown[]
  columns: GridColumn[]
  getCellValue: (column: GridColumn, row: unknown, rowIndex: number) => unknown
  formatValue: (value: unknown) => string
}

function isRowSelection(selection: GridSelection) {
  return selection.mode === 'row' || selection.mode === 'multi-row'
}

export function serializeSelectedRows({
  selection,
  rows,
  columns,
  getCellValue,
  formatValue
}: SerializeSelectedRowsOptions): string | null {
  if (!isRowSelection(selection) || selection.rowIndexes.size === 0) {
    return null
  }

  const selectedRowIndexes = [...selection.rowIndexes]
    .filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < rows.length)
    .sort((left, right) => left - right)

  if (selectedRowIndexes.length === 0) {
    return null
  }

  return selectedRowIndexes.map((rowIndex) => {
    const row = rows[rowIndex]

    return columns
      .map((column) => formatValue(getCellValue(column, row, rowIndex)))
      .join('\t')
  }).join('\n')
}
