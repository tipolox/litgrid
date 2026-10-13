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

const synchronizedInputs = new WeakMap<DataGridElement, Record<string, unknown>>()

export function syncGridInputs(
  grid: DataGridElement,
  inputs: BlazorGridInputs
): void {
  // Blazor collections may be mutated in place. Resend them as before rather
  // than inferring content equality from references or scanning row data.
  if (inputs.data !== undefined) grid.data = inputs.data
  const previous = synchronizedInputs.get(grid) ?? {}
  const declarative = inputs.declarativeColumns === true
  grid.inferColumns = !declarative
  const storageKey = typeof inputs.columnStateStorageKey === 'string' && inputs.columnStateStorageKey.trim()
    ? inputs.columnStateStorageKey : null
  if (declarative) {
    const columns = inputs.columns ?? previous.columnSchema as GridColumn[] | undefined
    if (columns && (inputs.columns !== undefined || grid.columnStateStorageKey !== storageKey)) {
      grid.updateColumnSchema(columns, inputs.columnOrderChanged, storageKey)
      previous.columnSchema = columns.map(column => ({ ...column }))
    }
  } else if (inputs.columns !== undefined) {
    grid.columns = inputs.columns
  }
  previous.declarativeColumns = declarative
  const { data: _, columns: __, declarativeColumns: ___, columnOrderChanged: ____, ...scalars } = inputs
  const values = { ...scalars, columnStateStorageKey: inputs.columnStateStorageKey ?? null }
  const propertyNames: Record<string, string> = {
    height: 'viewportHeight', rowHeight: 'virtualRowHeight', overscan: 'overscanCount',
    columnOverscan: 'columnOverscanCount'
  }
  for (const [key, input] of Object.entries(values)) {
    if (key === 'columnStateStorageKey' && declarative) {
      // The schema operation already installed/restored this namespace. A setter
      // here would restore twice or resolve target preferences against old columns.
      previous[key] = storageKey
      continue
    }
    const value = key === 'columnStateStorageKey' ? input ?? null : input
    // Config is small and serialized anew by .NET. Compare its effective scalar
    // values so an unrelated parameter update doesn't reset engine selection.
    const config = key === 'config' ? input as GridConfig : undefined
    const comparison = config ? JSON.stringify([
      config.selection?.mode ?? 'none', config.selection?.checkboxes ?? false,
      config.rowHeader?.enabled ?? false, config.rowHeader?.width ?? 56,
      config.pagination?.enabled ?? false,
      Number.isFinite(config.pagination?.pageSize) && config.pagination!.pageSize! > 0 ? Math.max(1, Math.floor(config.pagination!.pageSize!)) : 50,
      Number.isFinite(config.pagination?.pageIndex) && config.pagination!.pageIndex! >= 0 ? Math.floor(config.pagination!.pageIndex!) : 0
    ]) : value
    if (!(key in previous) || previous[key] !== comparison) {
      Reflect.set(grid, propertyNames[key] ?? key, value)
      previous[key] = comparison
    }
  }
  synchronizedInputs.set(grid, previous)
}
