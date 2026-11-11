import type { LegacyGridEngine, LegacyDataGridRef, LegacyVueInstance } from './v1.2.3-snapshot.js'
import type { GridEngine } from '@tipolox/litgrid-core'
import { DataGrid, type DataGridRef, type DataGridInstance as ReactInstance } from '@tipolox/litgrid-react'
import type { DataGridInstance as VueInstance } from '@tipolox/litgrid-vue'
import { createRef, useRef } from 'react'
import { shallowRef } from 'vue'

// Complete independent v1.2.3 structural implementations. Throwing bodies make
// these compile-only fixtures; no production behavior is supplied by mocks.
function unused(): never { throw new Error('compile-only fixture') }
const engine: GridEngine = {
  setExternalState: unused, getExternalState: unused, getQuery: unused, refreshQuery: unused,
  onQueryChange: unused, setConfig: unused, getConfig: unused, setData: unused, getRows: unused,
  setQuickSearch: unused, clearQuickSearch: unused, getQuickSearch: unused, setFilter: unused,
  clearFilter: unused, getFilters: unused, setPage: unused, setPageSize: unused,
  getPagination: unused, getTotalRowCount: unused, sortBy: unused, clearSort: unused,
  getSort: unused, getRowCount: unused, getSelectableRowCount: unused, getVisibleRows: unused,
  selectRow: unused, selectRowByKey: unused, getSelectionSnapshot: unused, onSelectionChange: unused,
  selectAllRows: unused, selectCell: unused, clearSelection: unused, getSelection: unused,
  isRowSelected: unused, isCellSelected: unused
}
const legacy = {
  setExternalState: unused, getQuery: unused, refreshQuery: unused, sortBy: unused, clearSort: unused,
  gridElement: null, getRowHeight: unused, getColumnWidth: unused, setRowHeight: unused,
  resetRowHeight: unused, resetAllRowHeights: unused, setColumnWidth: unused, resetColumnWidth: unused,
  resetAllColumnWidths: unused, moveColumn: unused, getColumnOrder: unused, setColumnOrder: unused,
  resetColumnOrder: unused, setColumnVisible: unused, isColumnVisible: unused, getVisibleColumnKeys: unused,
  resetColumnVisibility: unused, getColumnState: unused, setColumnState: unused, resetColumnState: unused,
  bestFitColumn: unused, bestFitAllColumns: unused, copySelectedCells: unused, copySelectedRows: unused,
  setQuickSearch: unused, clearQuickSearch: unused, getQuickSearch: unused, setFilter: unused,
  clearFilter: unused, getFilters: unused, setPage: unused, setPageSize: unused, getPagination: unused,
  getTotalRowCount: unused, selectRow: unused, selectAllRows: unused, clearSelection: unused,
  getSelection: unused, getSelectionSnapshot: unused, selectRowByKey: unused, isRowSelected: unused,
  isCellSelected: unused
}
const baselineEngine: LegacyGridEngine = engine
const baselineReact: LegacyDataGridRef = legacy
const baselineVue: LegacyVueInstance = legacy
const react: DataGridRef = legacy
const alias: ReactInstance = legacy
const vue: VueInstance = legacy
const reactRef = createRef<DataGridRef>()
const callback = (value: DataGridRef | null) => { void value }
const vueRef = shallowRef<VueInstance | null>(null)
function LegacyRefConsumer() {
  const ref = useRef<DataGridRef>(null)
  return <DataGrid data={[]} ref={ref} />
}
const views = [<DataGrid data={[]} ref={reactRef} />, <DataGrid data={[]} ref={callback} />, <LegacyRefConsumer />]
void [engine, baselineEngine, baselineReact, baselineVue, react, alias, vue, vueRef, views]
import { createGridEngine, type GridEngineRuntime } from '@tipolox/litgrid-core'
import type { DataGridRuntimeRef } from '@tipolox/litgrid-react'
import type { DataGridRuntimeInstance } from '@tipolox/litgrid-vue'
const runtimeEngine: GridEngineRuntime = createGridEngine()
runtimeEngine.refreshData()
runtimeEngine.getDisplayedRowIndexForKey('key')
const runtimeRef = createRef<DataGridRuntimeRef>()
const runtimeView = <DataGrid data={[]} ref={runtimeRef} />
const vueRuntimeRef = shallowRef<DataGridRuntimeInstance | null>(null)
vueRuntimeRef.value?.refreshRow('key')
function runtimeCalls(reactGrid: DataGridRuntimeRef, vueGrid: DataGridRuntimeInstance) {
  reactGrid.refreshData(); reactGrid.refreshRow('key'); reactGrid.refreshRows(['key']); reactGrid.refreshRange({ start: 0, endExclusive: 1 })
  vueGrid.refreshData(); vueGrid.refreshRow('key'); vueGrid.refreshRows(['key']); vueGrid.refreshRange({ start: 0, endExclusive: 1 })
}
void [runtimeView, runtimeCalls]
