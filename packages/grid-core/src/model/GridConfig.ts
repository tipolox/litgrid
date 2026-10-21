export type SelectionMode = 'none' | 'row' | 'multi-row' | 'cell' | 'multi-cell'

export type GridPaginationConfig = {
  enabled?: boolean
  pageSize?: number
  pageIndex?: number
}

export type GridConfig = {
  /** Opt in to atomic server page results and query intents. Defaults to local. */
  queryMode?: 'local' | 'external'
  selection?: {
    mode?: SelectionMode
    checkboxes?: boolean
    /** Property containing a unique string or finite number identity. */
    rowKey?: string
    /** Change on account/site authorization scope transitions to clear selection. */
    scopeKey?: string | number
  }
  rowHeader?: {
    enabled?: boolean
    width?: number
  }
  pagination?: GridPaginationConfig
}

export type ResolvedGridConfig = {
  queryMode: 'local' | 'external'
  selection: {
    mode: SelectionMode
    checkboxes: boolean
    rowKey?: string
    scopeKey?: string | number
  }
  rowHeader: {
    enabled: boolean
    width: number
  }
  pagination: {
    enabled: boolean
    pageSize: number
    pageIndex: number
  }
}

function normalizePageSize(value: number | undefined) {
  return Number.isFinite(value) && value! > 0 ? Math.max(1, Math.floor(value!)) : 50
}

function normalizePageIndex(value: number | undefined) {
  return Number.isFinite(value) && value! >= 0 ? Math.floor(value!) : 0
}

export function normalizeConfig(config: GridConfig = {}): ResolvedGridConfig {
  return {
    queryMode: config.queryMode === 'external' ? 'external' : 'local',
    selection: {
      mode: config.selection?.mode ?? 'none',
      checkboxes: config.selection?.checkboxes ?? false,
      rowKey: config.selection?.rowKey,
      scopeKey: config.selection?.scopeKey
    },
    rowHeader: {
      enabled: config.rowHeader?.enabled ?? false,
      width: config.rowHeader?.width ?? 56
    },
    pagination: {
      enabled: config.pagination?.enabled ?? false,
      pageSize: normalizePageSize(config.pagination?.pageSize),
      pageIndex: normalizePageIndex(config.pagination?.pageIndex)
    }
  }
}
