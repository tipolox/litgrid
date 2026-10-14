import type {
  DataGridElement,
  GridColumn,
  GridConfig,
  GridTheme
} from '@tipolox/litgrid-web'

export type BlazorGridInputs = {
  data?: unknown[]
  columns?: GridColumn[]
  declarativeColumns?: boolean
  columnOrderChanged?: boolean
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
  columnStateStorageKey?: string | null
}

export type BlazorGridInputPatch = Partial<BlazorGridInputs>

interface SynchronizationState {
  comparisons: Record<string, unknown>
  values: Record<string, unknown>
  uncertain: Set<string>
}
const synchronizedInputs = new WeakMap<DataGridElement, SynchronizationState>()

type DeclarativeGrid = DataGridElement & {
  inferColumns: boolean
  updateColumnSchema: (columns: GridColumn[], applyOrder?: boolean, storageKey?: string | null) => void
}
function supportsDeclarations(grid: DataGridElement): grid is DeclarativeGrid {
  return typeof grid.inferColumns === 'boolean' && typeof grid.updateColumnSchema === 'function'
}

function captureValue(key: string, value: unknown): unknown {
  if (key === 'columns') return (value as GridColumn[]).map(column => ({ ...column }))
  if (key !== 'config' || !value) return value
  const config = value as GridConfig
  return {
    ...config,
    selection: config.selection && { ...config.selection },
    rowHeader: config.rowHeader && { ...config.rowHeader },
    pagination: config.pagination && { ...config.pagination }
  }
}

export function syncGridInputs(grid: DataGridElement, inputs: BlazorGridInputPatch): void {
  const state = synchronizedInputs.get(grid) ?? { comparisons: {}, values: {}, uncertain: new Set<string>() }
  synchronizedInputs.set(grid, state)
  // A successful cache describes the last complete operation, not partially
  // applied setters. Explicit retry values win; omitted uncertain values recover
  // from that snapshot. Keep unknown fields uncertain until a value is supplied.
  const recovery = Object.fromEntries([...state.uncertain]
    .filter(key => key in state.values && !(key in inputs))
    .map(key => [key, state.values[key]]))
  const effective: BlazorGridInputPatch = { ...recovery, ...inputs }
  const previous = { ...state.comparisons }
  const captured = { ...state.values }
  const touched = new Set<string>()
  try {
    const declarative = effective.declarativeColumns ?? previous.declarativeColumns === true
    const extended = supportsDeclarations(grid) ? grid : undefined
    if (declarative && !extended) throw new Error('LitGrid declarative columns require inferColumns and updateColumnSchema support.')

    // No content-equality inference or row scanning. Explicit data always adopts.
    if (effective.data !== undefined) {
      touched.add('data')
      grid.data = effective.data
      captured.data = effective.data
    }
    if (extended && (previous.declarativeColumns !== declarative || state.uncertain.has('declarativeColumns'))) {
      touched.add('declarativeColumns')
      extended.inferColumns = !declarative
    }

    const keyInput = 'columnStateStorageKey' in effective ? effective.columnStateStorageKey : previous.columnStateStorageKey
    const storageKey = typeof keyInput === 'string' && keyInput.trim() ? keyInput : null
    if (declarative && extended) {
      const columns = effective.columns ?? (captured.columns as GridColumn[] | undefined)
      if (columns && (effective.columns !== undefined || state.uncertain.has('columns') ||
          state.uncertain.has('columnStateStorageKey') || grid.columnStateStorageKey !== storageKey)) {
        touched.add('columns')
        touched.add('columnStateStorageKey')
        const applyOrder = effective.columnOrderChanged === true || state.uncertain.has('columnOrderChanged')
        if (applyOrder) touched.add('columnOrderChanged')
        const snapshot = columns.map(column => ({ ...column }))
        extended.updateColumnSchema(columns, applyOrder, storageKey)
        captured.columns = snapshot
      }
    } else if (effective.columns !== undefined) {
      touched.add('columns')
      const snapshot = effective.columns.map(column => ({ ...column }))
      grid.columns = effective.columns
      captured.columns = snapshot
    }
    previous.declarativeColumns = declarative
    captured.declarativeColumns = declarative
    captured.columnStateStorageKey = storageKey
    const { data: _, columns: __, declarativeColumns: ___, columnOrderChanged: ____, ...scalars } = effective
    const values = { ...scalars, columnStateStorageKey: storageKey }
    const propertyNames: Record<string, string> = {
      height: 'viewportHeight', rowHeight: 'virtualRowHeight', overscan: 'overscanCount',
      columnOverscan: 'columnOverscanCount'
    }
    for (const [key, input] of Object.entries(values)) {
      if (key === 'columnStateStorageKey' && declarative) {
        previous[key] = storageKey
        continue
      }
      const value = key === 'columnStateStorageKey' ? input ?? null : input
      const config = key === 'config' ? input as GridConfig : undefined
      const comparison = config ? JSON.stringify([
        config.selection?.mode ?? 'none', config.selection?.checkboxes ?? false,
        config.rowHeader?.enabled ?? false, config.rowHeader?.width ?? 56,
        config.pagination?.enabled ?? false,
        Number.isFinite(config.pagination?.pageSize) && config.pagination!.pageSize! > 0 ? Math.max(1, Math.floor(config.pagination!.pageSize!)) : 50,
        Number.isFinite(config.pagination?.pageIndex) && config.pagination!.pageIndex! >= 0 ? Math.floor(config.pagination!.pageIndex!) : 0
      ]) : value
      if (!(key in previous) || previous[key] !== comparison || state.uncertain.has(key)) {
        touched.add(key)
        if (!Reflect.set(grid, propertyNames[key] ?? key, value)) throw new TypeError('LitGrid could not set ' + key + '.')
        previous[key] = comparison
      }
      captured[key] = captureValue(key, value)
    }
    state.comparisons = previous
    state.values = captured
    for (const key of touched) state.uncertain.delete(key)
    // A programmatic schema establishes its own order and namespace; it also
    // resolves an order invalidation from an earlier declarative failure.
    if (!declarative && touched.has('columns')) state.uncertain.delete('columnOrderChanged')
  } catch (error) {
    for (const key of touched) state.uncertain.add(key)
    throw error
  }
}
