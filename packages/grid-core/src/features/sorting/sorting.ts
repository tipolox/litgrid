import type { GridSortState } from '../../model/GridState.js'

function getRowSortValue(row: unknown, columnKey: string) {
  if (row && typeof row === 'object' && !Array.isArray(row) && columnKey in row) {
    return (row as Record<string, unknown>)[columnKey]
  }

  return row
}

function normalizeSortValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return value
  }

  return String(value).toLowerCase()
}

function compareValues(left: unknown, right: unknown) {
  const normalizedLeft = normalizeSortValue(left)
  const normalizedRight = normalizeSortValue(right)

  if (typeof normalizedLeft === 'number' && typeof normalizedRight === 'number') {
    return normalizedLeft - normalizedRight
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight))
}

export function applySortData(data: unknown[], sort: GridSortState) {
  if (!sort.columnKey || !sort.direction) {
    return data.slice()
  }

  return data.slice().sort((a, b) => {
    const left = getRowSortValue(a, sort.columnKey!)
    const right = getRowSortValue(b, sort.columnKey!)
    const comparison = compareValues(left, right)

    return sort.direction === 'asc' ? comparison : -comparison
  })
}
