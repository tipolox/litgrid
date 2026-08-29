import '@tipolox/litgrid-web'
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType
} from 'vue'
import type {
  BestFitColumnWidth,
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail,
  DataGridElement,
  GridColumn,
  GridColumnState,
  GridConfig,
  GridFilter,
  GridPaginationState,
  GridSelection,
  GridTheme,
  SelectionIntent
} from '@tipolox/litgrid-web'
import { syncGridInputs } from './gridBindings'

export type DataGridProps = {
  data: unknown[]
  columns?: GridColumn[]
  config?: GridConfig
  theme?: GridTheme
  ariaLabel?: string
  ariaDescription?: string
  screenReaderAnnouncements?: boolean
  height?: number
  rowHeight?: number
  overscan?: number
  columnOverscan?: number
  bestFitSampleSize?: number
  quickSearchDebounceThreshold?: number
  quickSearchDebounceMs?: number
  columnStateStorageKey?: string
}

export type DataGridInstance = {
  readonly gridElement: DataGridElement | null
  getRowHeight(rowIndex: number): number
  getColumnWidth(column: GridColumn): number
  setRowHeight(rowIndex: number, height: number): void
  resetRowHeight(rowIndex: number): void
  resetAllRowHeights(): void
  setColumnWidth(columnKey: string, width: number): void
  resetColumnWidth(columnKey: string): void
  resetAllColumnWidths(): void
  moveColumn(columnKey: string, targetIndex: number): void
  getColumnOrder(): string[]
  setColumnOrder(columnKeys: string[]): void
  resetColumnOrder(): void
  setColumnVisible(columnKey: string, visible: boolean): void
  isColumnVisible(columnKey: string): boolean
  getVisibleColumnKeys(): string[]
  resetColumnVisibility(): void
  getColumnState(): GridColumnState
  setColumnState(state: GridColumnState): void
  resetColumnState(): void
  bestFitColumn(columnKey: string): number | null
  bestFitAllColumns(): BestFitColumnWidth[]
  copySelectedCells(): Promise<boolean>
  copySelectedRows(): Promise<boolean>
  setQuickSearch(query: string): void
  clearQuickSearch(): void
  getQuickSearch(): string
  setFilter(filter: GridFilter): void
  clearFilter(columnKey?: string): void
  getFilters(): GridFilter[]
  setPage(pageIndex: number): void
  setPageSize(pageSize: number): void
  getPagination(): GridPaginationState
  getTotalRowCount(): number
  selectRow(rowIndex: number, intent?: SelectionIntent): void
  selectAllRows(): void
  clearSelection(): void
  getSelection(): GridSelection
  isRowSelected(rowIndex: number): boolean
  isCellSelected(rowIndex: number, columnKey: string): boolean
}

const GRID_UNAVAILABLE_MESSAGE = 'LitGrid is not available before the Vue component is mounted.'

export const DataGrid = defineComponent({
  name: 'LitGridDataGrid',
  props: {
    data: { type: Array as PropType<unknown[]>, required: true },
    columns: { type: Array as PropType<GridColumn[]>, default: () => [] },
    config: { type: Object as PropType<GridConfig>, default: () => ({}) },
    theme: { type: String as PropType<GridTheme>, default: 'light' },
    ariaLabel: { type: String, default: 'Data grid' },
    ariaDescription: { type: String, default: '' },
    screenReaderAnnouncements: { type: Boolean, default: true },
    height: { type: Number, default: 320 },
    rowHeight: { type: Number, default: 36 },
    overscan: { type: Number, default: 4 },
    columnOverscan: { type: Number, default: 2 },
    bestFitSampleSize: { type: Number, default: 10 },
    quickSearchDebounceThreshold: { type: Number, default: 10_000 },
    quickSearchDebounceMs: { type: Number, default: 150 },
    columnStateStorageKey: { type: String, default: undefined }
  },
  emits: {
    'column-state-change': (_detail: ColumnStateChangeDetail) => true,
    'column-reorder': (_detail: ColumnReorderDetail) => true,
    'column-visibility-change': (_detail: ColumnVisibilityChangeDetail) => true
  },
  setup(props, { emit, expose }) {
    const gridRef = ref<DataGridElement | null>(null)

    const requireGridElement = (): DataGridElement => {
      if (!gridRef.value) throw new Error(GRID_UNAVAILABLE_MESSAGE)
      return gridRef.value
    }

    const syncInputs = () => {
      const grid = gridRef.value
      if (!grid) return

      syncGridInputs(grid, props)
    }

    watch(() => props.data, syncInputs)
    watch(() => props.columns, syncInputs)
    watch(() => props.config, syncInputs)
    watch(() => props.theme, syncInputs)
    watch(() => props.ariaLabel, syncInputs)
    watch(() => props.ariaDescription, syncInputs)
    watch(() => props.screenReaderAnnouncements, syncInputs)
    watch(() => props.height, syncInputs)
    watch(() => props.rowHeight, syncInputs)
    watch(() => props.overscan, syncInputs)
    watch(() => props.columnOverscan, syncInputs)
    watch(() => props.bestFitSampleSize, syncInputs)
    watch(() => props.quickSearchDebounceThreshold, syncInputs)
    watch(() => props.quickSearchDebounceMs, syncInputs)
    watch(() => props.columnStateStorageKey, syncInputs)

    const handleColumnStateChange = (event: Event) => {
      emit('column-state-change', (event as CustomEvent<ColumnStateChangeDetail>).detail)
    }
    const handleColumnReorder = (event: Event) => {
      emit('column-reorder', (event as CustomEvent<ColumnReorderDetail>).detail)
    }
    const handleColumnVisibilityChange = (event: Event) => {
      emit('column-visibility-change', (event as CustomEvent<ColumnVisibilityChangeDetail>).detail)
    }

    onMounted(() => {
      syncInputs()
      const grid = requireGridElement()
      grid.addEventListener('column-state-change', handleColumnStateChange)
      grid.addEventListener('column-reorder', handleColumnReorder)
      grid.addEventListener('column-visibility-change', handleColumnVisibilityChange)
    })

    onBeforeUnmount(() => {
      const grid = gridRef.value
      if (!grid) return
      grid.removeEventListener('column-state-change', handleColumnStateChange)
      grid.removeEventListener('column-reorder', handleColumnReorder)
      grid.removeEventListener('column-visibility-change', handleColumnVisibilityChange)
    })

    expose({
      get gridElement() { return gridRef.value },
      getRowHeight: (rowIndex: number) => requireGridElement().getRowHeight(rowIndex),
      getColumnWidth: (column: GridColumn) => requireGridElement().getColumnWidth(column),
      setRowHeight: (rowIndex: number, height: number) => requireGridElement().setRowHeight(rowIndex, height),
      resetRowHeight: (rowIndex: number) => requireGridElement().resetRowHeight(rowIndex),
      resetAllRowHeights: () => requireGridElement().resetAllRowHeights(),
      setColumnWidth: (columnKey: string, width: number) => requireGridElement().setColumnWidth(columnKey, width),
      resetColumnWidth: (columnKey: string) => requireGridElement().resetColumnWidth(columnKey),
      resetAllColumnWidths: () => requireGridElement().resetAllColumnWidths(),
      moveColumn: (columnKey: string, targetIndex: number) => requireGridElement().moveColumn(columnKey, targetIndex),
      getColumnOrder: () => requireGridElement().getColumnOrder(),
      setColumnOrder: (columnKeys: string[]) => requireGridElement().setColumnOrder(columnKeys),
      resetColumnOrder: () => requireGridElement().resetColumnOrder(),
      setColumnVisible: (columnKey: string, visible: boolean) => requireGridElement().setColumnVisible(columnKey, visible),
      isColumnVisible: (columnKey: string) => requireGridElement().isColumnVisible(columnKey),
      getVisibleColumnKeys: () => requireGridElement().getVisibleColumnKeys(),
      resetColumnVisibility: () => requireGridElement().resetColumnVisibility(),
      getColumnState: () => requireGridElement().getColumnState(),
      setColumnState: (state: GridColumnState) => requireGridElement().setColumnState(state),
      resetColumnState: () => requireGridElement().resetColumnState(),
      bestFitColumn: (columnKey: string) => requireGridElement().bestFitColumn(columnKey),
      bestFitAllColumns: () => requireGridElement().bestFitAllColumns(),
      copySelectedCells: () => requireGridElement().copySelectedCells(),
      copySelectedRows: () => requireGridElement().copySelectedRows(),
      setQuickSearch: (query: string) => requireGridElement().setQuickSearch(query),
      clearQuickSearch: () => requireGridElement().clearQuickSearch(),
      getQuickSearch: () => requireGridElement().getQuickSearch(),
      setFilter: (filter: GridFilter) => requireGridElement().setFilter(filter),
      clearFilter: (columnKey?: string) => requireGridElement().clearFilter(columnKey),
      getFilters: () => requireGridElement().getFilters(),
      setPage: (pageIndex: number) => requireGridElement().setPage(pageIndex),
      setPageSize: (pageSize: number) => requireGridElement().setPageSize(pageSize),
      getPagination: () => requireGridElement().getPagination(),
      getTotalRowCount: () => requireGridElement().getTotalRowCount(),
      selectRow: (rowIndex: number, intent?: SelectionIntent) => requireGridElement().selectRow(rowIndex, intent),
      selectAllRows: () => requireGridElement().selectAllRows(),
      clearSelection: () => requireGridElement().clearSelection(),
      getSelection: () => requireGridElement().getSelection(),
      isRowSelected: (rowIndex: number) => requireGridElement().isRowSelected(rowIndex),
      isCellSelected: (rowIndex: number, columnKey: string) => requireGridElement().isCellSelected(rowIndex, columnKey)
    } satisfies DataGridInstance)

    return () => h('yc-grid', { ref: gridRef })
  }
})
