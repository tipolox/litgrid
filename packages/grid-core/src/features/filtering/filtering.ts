import type { GridFilter } from '../../model/GridState.js'

function getRowFilterValue(row: unknown, columnKey: string) {
  if (row && typeof row === 'object' && !Array.isArray(row) && columnKey in row) {
    return (row as Record<string, unknown>)[columnKey]
  }

  return row
}

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === ''
}

function normalizeText(value: unknown) {
  return String(value ?? '').toLocaleLowerCase()
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === 'number') {
    const numericRight = typeof right === 'number' ? right : Number(right)
    if (!Number.isNaN(numericRight)) {
      return left - numericRight
    }
  }

  return normalizeText(left).localeCompare(normalizeText(right))
}

function matchesFilter(value: unknown, filter: GridFilter) {
  switch (filter.operator) {
    case 'isEmpty':
      return isEmpty(value)
    case 'isNotEmpty':
      return !isEmpty(value)
    case 'contains':
      return normalizeText(value).includes(normalizeText(filter.value))
    case 'equals':
      return compareValues(value, filter.value) === 0
    case 'startsWith':
      return normalizeText(value).startsWith(normalizeText(filter.value))
    case 'endsWith':
      return normalizeText(value).endsWith(normalizeText(filter.value))
    case 'greaterThan':
      return compareValues(value, filter.value) > 0
    case 'greaterThanOrEqual':
      return compareValues(value, filter.value) >= 0
    case 'lessThan':
      return compareValues(value, filter.value) < 0
    case 'lessThanOrEqual':
      return compareValues(value, filter.value) <= 0
  }
}

export function applyFilterData(data: unknown[], filters: GridFilter[]) {
  if (filters.length === 0) {
    return data.slice()
  }

  return data.filter((row) =>
    filters.every((filter) => matchesFilter(getRowFilterValue(row, filter.columnKey), filter))
  )
}
