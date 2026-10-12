import type {
  DataGridElement,
  GridColumn,
  GridConfig,
  GridTheme
} from '@tipolox/litgrid-web'

export type ReactGridInputs = {
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
  columnStateStorageKey?: string
}

const synchronizedInputs = new WeakMap<DataGridElement, Record<string, unknown>>()

export function syncGridInputs(
  grid: DataGridElement,
  inputs: ReactGridInputs
): void {
  // Keep the existing effect-triggered synchronization contract, including
  // in-place mutations. Navigation is retained by the structural grid setters.
  grid.data = inputs.data
  grid.columns = inputs.columns
  const values = {
    config: inputs.config,
    theme: inputs.theme, ariaLabel: inputs.ariaLabel, ariaDescription: inputs.ariaDescription,
    screenReaderAnnouncements: inputs.screenReaderAnnouncements,
    viewportHeight: inputs.height, virtualRowHeight: inputs.rowHeight,
    overscanCount: inputs.overscan, columnOverscanCount: inputs.columnOverscan,
    bestFitSampleSize: inputs.bestFitSampleSize,
    quickSearchDebounceThreshold: inputs.quickSearchDebounceThreshold,
    quickSearchDebounceMs: inputs.quickSearchDebounceMs,
    columnStateStorageKey: inputs.columnStateStorageKey ?? null
  }
  // Snapshot only the fixed-size configuration, never row data or column content.
  const config = inputs.config
  const configKey = JSON.stringify([
    config.selection?.mode ?? 'none', config.selection?.checkboxes ?? false,
    config.rowHeader?.enabled ?? false, config.rowHeader?.width ?? 56,
    config.pagination?.enabled ?? false,
    Number.isFinite(config.pagination?.pageSize) && config.pagination!.pageSize! > 0 ? Math.max(1, Math.floor(config.pagination!.pageSize!)) : 50,
    Number.isFinite(config.pagination?.pageIndex) && config.pagination!.pageIndex! >= 0 ? Math.floor(config.pagination!.pageIndex!) : 0
  ])
  const previous = synchronizedInputs.get(grid)
  for (const [key, value] of Object.entries(values)) {
    if (!previous || (key === 'config' ? previous.configKey !== configKey : previous[key] !== value)) {
      Reflect.set(grid, key, value)
    }
  }
  synchronizedInputs.set(grid, { ...values, configKey })
}
