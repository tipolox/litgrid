import { normalizeConfig } from '@tipolox/litgrid-core'
import type { DataGridElement, GridColumn, GridConfig, GridExternalState, GridTheme } from '../types.js'

/** Shared input contract for the thin framework adapters. */
export type GridAdapterInputs = {
  externalState?: GridExternalState
  data: unknown[]
  /** Opt in to explicit mutation notifications; replace data or change this value after edits. */
  dataRevision?: string | number
  columns: GridColumn[]
  config: GridConfig
  theme: GridTheme
  ariaLabel: string
  ariaDescription: string
  screenReaderAnnouncements: boolean
  height: number
  rowHeight: number
  overscan: number
  columnOverscan: number
  bestFitSampleSize: number
  quickSearchDebounceThreshold: number
  quickSearchDebounceMs: number
  columnStateStorageKey?: string
}

type Snapshot = {
  values: Record<string, unknown>
  configValues: unknown[]
  resetValues: unknown[]
  columns: GridColumn[]
  storageKey: string | null
  data: unknown[]
  dataRevision: string | number | undefined
  externalState: GridExternalState | undefined
  external: boolean
}

const synchronized = new WeakMap<DataGridElement, Snapshot>()
const columnFields = ['key', 'header', 'width', 'hidden', 'sortable', 'filterable', 'accessor', 'render'] as const

function sameValues(previous: unknown[], next: unknown[]) {
  return previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]))
}

function sameColumns(previous: GridColumn[], next: GridColumn[]) {
  return previous.length === next.length && previous.every((column, index) =>
    columnFields.every(key => Object.is(column[key], next[index][key])))
}

/** Synchronize only changed effective inputs; never inspect or copy row content. */
export function synchronizeGridInputs(grid: DataGridElement, inputs: GridAdapterInputs): void {
  const previous = synchronized.get(grid)
  const config = normalizeConfig(inputs.config)
  const external = config.queryMode === 'external'
  const configValues = [config.queryMode, ...Object.values(config.quickSearch), ...Object.values(config.selection),
    ...Object.values(config.rowHeader), ...Object.values(config.pagination)]
  // Only these configuration changes reset the external-query controller.
  const resetValues = [config.queryMode, config.selection.mode, config.selection.rowKey, config.selection.scopeKey]
  const storageKey = typeof inputs.columnStateStorageKey === 'string' && inputs.columnStateStorageKey.trim()
    ? inputs.columnStateStorageKey : null
  const columnsChanged = !previous || !sameColumns(previous.columns, inputs.columns)
  if (columnsChanged || previous.storageKey !== storageKey) {
    if (grid.updateColumnSchema) grid.updateColumnSchema(inputs.columns, false, storageKey)
    else {
      // Retain support for older structural DataGridElement implementations.
      grid.columns = inputs.columns
      grid.columnStateStorageKey = storageKey
    }
  }

  const values = {
    theme: inputs.theme, ariaLabel: inputs.ariaLabel, ariaDescription: inputs.ariaDescription,
    screenReaderAnnouncements: inputs.screenReaderAnnouncements,
    viewportHeight: inputs.height, virtualRowHeight: inputs.rowHeight,
    overscanCount: inputs.overscan, columnOverscanCount: inputs.columnOverscan,
    bestFitSampleSize: inputs.bestFitSampleSize,
    quickSearchDebounceThreshold: inputs.quickSearchDebounceThreshold,
    quickSearchDebounceMs: inputs.quickSearchDebounceMs
  }
  if (!previous || !sameValues(previous.configValues, configValues)) grid.config = inputs.config
  for (const [key, value] of Object.entries(values)) {
    if (!previous || !Object.is(previous.values[key], value)) Reflect.set(grid, key, value)
  }
  if (external) {
    if (inputs.externalState && (!previous || previous.externalState !== inputs.externalState || !sameValues(previous.resetValues, resetValues))) {
      grid.externalState = inputs.externalState
    }
  } else if (!previous || previous.external || previous.data !== inputs.data ||
    inputs.dataRevision === undefined || !Object.is(previous.dataRevision, inputs.dataRevision)) {
    // Legacy synchronization remains an explicit mutation opportunity. It must
    // validate all keys and rerun active transforms, even for the same array.
    // A same-reference refresh retains the page (and clamps it if rows shrank).
    const preservePage = !!previous && !previous.external && previous.data === inputs.data
    if (grid.updateData) grid.updateData(inputs.data, preservePage)
    else grid.data = inputs.data
  }
  // Commit only after successful setters so a failed update can be retried.
  synchronized.set(grid, {
    values, configValues, resetValues, columns: columnsChanged ? inputs.columns.map(column => ({ ...column })) : previous.columns,
    storageKey, data: inputs.data, dataRevision: inputs.dataRevision, externalState: inputs.externalState, external
  })
}
