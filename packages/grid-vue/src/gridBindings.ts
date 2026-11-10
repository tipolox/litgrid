import type { DataGridElement, GridColumn, GridConfig, GridExternalState, GridTheme } from '@tipolox/litgrid-web'

/** Input contract for the framework adapter. */
export type VueGridInputs = {
  externalState?: GridExternalState
  data: unknown[]
  columns?: GridColumn[]
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
  externalState: GridExternalState | undefined
}

const synchronized = new WeakMap<DataGridElement, Snapshot>()
const EMPTY_COLUMNS: GridColumn[] = []
const columnFields = ['key', 'header', 'width', 'hidden', 'sortable', 'filterable', 'accessor', 'render', 'align'] as const

// Fixed-size supported values, normalized exactly like the core. No row scan
// or JSON encoding: numeric scope values retain Object.is distinctions.
function configurationValues(config: GridConfig): unknown[] {
  const search = config.quickSearch
  const size = config.pagination?.pageSize
  const index = config.pagination?.pageIndex
  return [
    config.queryMode === 'external' ? 'external' : 'local',
    search?.visible !== false,
    typeof search?.label === 'string' && search.label.trim() ? search.label : 'Quick search',
    typeof search?.placeholder === 'string' ? search.placeholder : 'Search all columns',
    typeof search?.description === 'string' ? search.description.trim() : '',
    config.selection?.mode ?? 'none', config.selection?.checkboxes ?? false,
    config.selection?.rowKey, config.selection?.scopeKey,
    config.rowHeader?.enabled ?? false, config.rowHeader?.width ?? 56,
    config.pagination?.enabled ?? false,
    Number.isFinite(size) && size! > 0 ? Math.max(1, Math.floor(size!)) : 50,
    Number.isFinite(index) && index! >= 0 ? Math.floor(index!) : 0
  ]
}

function sameValues(previous: unknown[], next: unknown[]) {
  return previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]))
}


// Detached primitive snapshots detect nested option edits at existing sync points.
// No Intl construction, row scan, JSON serialization or deep watcher here.
function snapshotColumn(column: GridColumn): GridColumn {
  return column.format === undefined ? { ...column } : {
    ...column, format: { ...column.format, ...(column.format.options === undefined ? {} : { options: { ...column.format.options } }) } as GridColumn['format']
  }
}
function sameObject(left: object | undefined, right: object | undefined): boolean {
  if (!left || !right) return left === right
  if (Object.getPrototypeOf(right) !== Object.prototype && Object.getPrototypeOf(right) !== null) return false
  const keys = Reflect.ownKeys(left)
  return keys.length === Reflect.ownKeys(right).length && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(right, key)
    return descriptor && descriptor.enumerable && 'value' in descriptor && Object.is(Reflect.get(left, key), descriptor.value)
  })
}
function sameFormat(left: GridColumn['format'], right: GridColumn['format']): boolean {
  if (!left || !right) return left === right
  if (Object.getPrototypeOf(right) !== Object.prototype && Object.getPrototypeOf(right) !== null) return false
  const options = Object.getOwnPropertyDescriptor(right, 'options')
  if (options && !('value' in options)) return false
  const { options: _, ...previous } = left
  // Inspect data descriptors so invalid getters are rejected by schema adoption.
  const fields = Object.getOwnPropertyDescriptors(right)
  delete fields.options
  if (Reflect.ownKeys(fields).length !== Reflect.ownKeys(previous).length || Object.getOwnPropertySymbols(right).length) return false
  return Object.keys(previous).every(key => fields[key] && fields[key].enumerable && 'value' in fields[key] && Object.is(Reflect.get(previous, key), fields[key].value)) && sameObject(left.options, options?.value)
}

function sameColumns(previous: GridColumn[], next: GridColumn[]) {
  return previous.length === next.length && previous.every((column, index) =>
    (!('align' in next[index] || 'format' in next[index]) || ['align', 'format'].every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(next[index], key)
      return !descriptor || 'value' in descriptor
    })) && columnFields.every(key => Object.is(column[key], next[index][key])) && sameFormat(column.format, next[index].format))
}

/** Guard structural/presentation setters while preserving local mutation synchronization. */
export function syncGridInputs(grid: DataGridElement, inputs: VueGridInputs, applyColumnOrder = false): void {
  const previous = synchronized.get(grid)
  const columns = inputs.columns ?? EMPTY_COLUMNS
  const config = inputs.config
  const external = config.queryMode === 'external'
  const configValues = configurationValues(config)
  // Only these configuration changes reset the external-query controller.
  const resetValues = [external, config.selection?.mode ?? 'none', config.selection?.rowKey, config.selection?.scopeKey]
  const storageKey = typeof inputs.columnStateStorageKey === 'string' && inputs.columnStateStorageKey.trim()
    ? inputs.columnStateStorageKey : null
  const columnsChanged = !previous || !sameColumns(previous.columns, columns)
  if (columnsChanged || previous.storageKey !== storageKey) {
    if (grid.updateColumnSchema) grid.updateColumnSchema(columns, applyColumnOrder, storageKey)
    else {
      // Retain support for older structural DataGridElement implementations.
      grid.columns = columns
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
  } else {
    // Every existing local synchronization remains a mutation opportunity.
    // The engine validates keys and preserves/clamps same-reference pages.
    grid.data = inputs.data
  }
  // Commit only after successful setters so a failed update can be retried.
  synchronized.set(grid, {
    values, configValues, resetValues, columns: columnsChanged ? columns.map(snapshotColumn) : previous.columns,
    storageKey, externalState: inputs.externalState
  })
}
