import type { GridColumn } from '../types.js'
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './constants.js'

export function normalizeColumnWidth(width: number) {
  return Math.max(MIN_COLUMN_WIDTH, width)
}

export function resolveColumnWidth(
  column: GridColumn,
  resizedWidth: number | undefined
) {
  if (resizedWidth) {
    return resizedWidth
  }

  if (typeof column.width === 'number') {
    return column.width
  }

  if (typeof column.width === 'string' && /^\d+px$/.test(column.width)) {
    return Number.parseInt(column.width, 10)
  }

  return DEFAULT_COLUMN_WIDTH
}
