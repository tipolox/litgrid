export type SelectionMode = 'none' | 'row' | 'multi-row' | 'cell' | 'multi-cell'

export type GridPaginationConfig = {
  enabled?: boolean
  pageSize?: number
  pageIndex?: number
}

/** Presentation-only quick-search options; server search scope remains consumer-owned. */
export type GridQuickSearchConfig = {
  /** External mode only: false hides the built-in search field and toolbar. */
  visible?: boolean
  /** Input accessible name. Defaults to 'Quick search'. */
  label?: string
  /** Input placeholder. Defaults to 'Search all columns'. */
  placeholder?: string
  /** Optional visible help, connected by aria-describedby. */
  description?: string
}

export type GridConfig = {
  /** Opt in to atomic server page results and query intents. Defaults to local. */
  queryMode?: 'local' | 'external'
  /** External visibility and shared quick-search wording; local Show/Hide remains unchanged. */
  quickSearch?: GridQuickSearchConfig
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
  quickSearch: { visible: boolean; label: string; placeholder: string; description: string }
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
    quickSearch: {
      visible: config.quickSearch?.visible !== false,
      label: typeof config.quickSearch?.label === 'string' && config.quickSearch.label.trim() ? config.quickSearch.label : 'Quick search',
      placeholder: typeof config.quickSearch?.placeholder === 'string' ? config.quickSearch.placeholder : 'Search all columns',
      description: typeof config.quickSearch?.description === 'string' ? config.quickSearch.description.trim() : ''
    },
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
