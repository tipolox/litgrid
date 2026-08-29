import type { GridColumn } from '../types'
import { normalizeColumnWidth } from '../sizing/columnSizing'

export type GridColumnStateColumn = {
  key: string
  width?: number
  visible: boolean
}

export type GridColumnState = {
  version: 1
  columns: GridColumnStateColumn[]
}

export type ColumnStateChangeDetail = {
  reason: 'resize' | 'reorder' | 'visibility' | 'restore' | 'reset' | 'set'
  state: GridColumnState
}

export type ResolvedColumnState = {
  columns: GridColumn[]
  widths: Map<string, number>
  hiddenKeys: Set<string>
}

export function createColumnState(
  columns: GridColumn[],
  widths: Map<string, number>,
  hiddenKeys: Set<string>
): GridColumnState {
  return {
    version: 1,
    columns: columns.map((column) => {
      const width = widths.get(column.key)
      return {
        key: column.key,
        ...(width === undefined ? {} : { width }),
        visible: !hiddenKeys.has(column.key)
      }
    })
  }
}

export function resolveColumnState(
  state: unknown,
  sourceColumns: GridColumn[]
): ResolvedColumnState | null {
  if (!isGridColumnState(state)) return null

  const sourceByKey = new Map(sourceColumns.map((column) => [column.key, column]))
  const consumedKeys = new Set<string>()
  const columns: GridColumn[] = []
  const widths = new Map<string, number>()
  const hiddenKeys = new Set<string>()

  for (const entry of state.columns) {
    const column = sourceByKey.get(entry.key)
    if (!column || consumedKeys.has(entry.key)) continue

    consumedKeys.add(entry.key)
    columns.push(column)
    if (!entry.visible) hiddenKeys.add(entry.key)
    if (typeof entry.width === 'number' && Number.isFinite(entry.width)) {
      widths.set(entry.key, normalizeColumnWidth(entry.width))
    }
  }

  for (const column of sourceColumns) {
    if (consumedKeys.has(column.key)) continue

    columns.push(column)
    if (column.hidden) hiddenKeys.add(column.key)
  }

  return { columns, widths, hiddenKeys }
}

export function parseColumnState(value: string | null): GridColumnState | null {
  if (!value) return null

  try {
    const state: unknown = JSON.parse(value)
    return isGridColumnState(state) ? state : null
  } catch {
    return null
  }
}

function isGridColumnState(value: unknown): value is GridColumnState {
  if (!value || typeof value !== 'object') return false

  const state = value as { version?: unknown; columns?: unknown }
  if (state.version !== 1 || !Array.isArray(state.columns)) return false

  return state.columns.every((column) => {
    if (!column || typeof column !== 'object') return false
    const entry = column as { key?: unknown; width?: unknown; visible?: unknown }
    return typeof entry.key === 'string' &&
      typeof entry.visible === 'boolean' &&
      (entry.width === undefined || typeof entry.width === 'number')
  })
}
