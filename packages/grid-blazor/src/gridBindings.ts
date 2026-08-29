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

export function syncGridInputs(
  grid: DataGridElement,
  inputs: BlazorGridInputs
): void {
  grid.data = inputs.data
  grid.columns = inputs.columns
  grid.config = inputs.config
  grid.theme = inputs.theme
  grid.ariaLabel = inputs.ariaLabel
  grid.ariaDescription = inputs.ariaDescription
  grid.screenReaderAnnouncements = inputs.screenReaderAnnouncements
  grid.viewportHeight = inputs.height
  grid.virtualRowHeight = inputs.rowHeight
  grid.overscanCount = inputs.overscan
  grid.columnOverscanCount = inputs.columnOverscan
  grid.bestFitSampleSize = inputs.bestFitSampleSize
  grid.quickSearchDebounceThreshold = inputs.quickSearchDebounceThreshold
  grid.quickSearchDebounceMs = inputs.quickSearchDebounceMs
  grid.columnStateStorageKey = inputs.columnStateStorageKey ?? null
}
