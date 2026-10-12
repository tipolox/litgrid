import type {
  DataGridElement,
  GridColumn,
  GridConfig,
  GridTheme
} from '@tipolox/litgrid-web'

export type BlazorGridInputs = {
  data: unknown[]
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
  columnStateStorageKey?: string | null
}

const synchronizedInputs = new WeakMap<DataGridElement, Record<string, unknown>>()

export function syncGridInputs(
  grid: DataGridElement,
  inputs: BlazorGridInputs
): void {
  // Blazor collections may be mutated in place. Resend them as before rather
  // than inferring content equality from references or scanning row data.
  grid.data = inputs.data
  grid.columns = inputs.columns
  const { data: _, columns: __, ...scalars } = inputs
  const values = { ...scalars, columnStateStorageKey: inputs.columnStateStorageKey ?? null }
  const previous = synchronizedInputs.get(grid) ?? {}
  const propertyNames: Record<string, string> = {
    height: 'viewportHeight', rowHeight: 'virtualRowHeight', overscan: 'overscanCount',
    columnOverscan: 'columnOverscanCount'
  }
  for (const [key, input] of Object.entries(values)) {
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
