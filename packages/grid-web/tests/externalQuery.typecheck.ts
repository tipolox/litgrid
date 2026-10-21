import type { GridExternalState, GridQueryChangeDetail, DataGridElement, GridConfig } from '../src/index.js'
import type { DataGridProps, DataGridRef } from '../../grid-react/src/index.js'
import type { DataGridProps as VueProps, DataGridInstance } from '../../grid-vue/src/index.js'
import type { DataGridComponent } from '../../grid-angular/src/index.js'
import type { BlazorGridInputs } from '../../grid-blazor/src/index.js'

const config: GridConfig = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'account/site' } }
export const externalState: GridExternalState = { requestId: 1,
  query: { search: '', filters: [{ columnKey: 'amount', operator: 'greaterThan', value: '9007199254740993.01' }], sort: { columnKey: 'name', direction: 'asc' }, pageIndex: 2, pageSize: 20 },
  rows: [{ id: 'uuid', amount: '9007199254740993.02' }], total: { kind: 'unknown', hasMore: true } }
export const react: DataGridProps = { data: [], config, externalState, onQueryChange: detail => {
  const id: number = detail.requestId
  const search: string = detail.query.search
  void [id, search]
  // @ts-expect-error detached query containers are readonly
  detail.query.filters.push({ columnKey: 'id', operator: 'equals', value: 1 })
} }
export const vue: VueProps = { data: [], config, externalState }
export const blazor: Partial<BlazorGridInputs> = { config, externalState }
export function methods(grid: DataGridElement, react: DataGridRef, vue: DataGridInstance, angular: DataGridComponent) {
  grid.addEventListener('query-change', event => { const detail: GridQueryChangeDetail = event.detail; void detail })
  for (const ref of [react, vue, angular]) { ref.refreshQuery(); ref.sortBy('amount', 'asc'); ref.clearSort(); ref.setExternalState(externalState); const id: number = ref.getQuery().requestId; void id }
}
