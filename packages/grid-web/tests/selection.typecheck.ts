import type { GridConfig, DataGridElement, SelectionChangeDetail } from '../src/index.js'
import type { DataGridProps, DataGridRef } from '../../grid-react/src/index.js'

// Existing input shapes remain assignable without the new optional configuration.
export const legacyConfig: GridConfig = { selection: { mode: 'multi-row', checkboxes: true } }
export const legacyReactProps: DataGridProps = { data: [], config: legacyConfig, onColumnReorder: detail => { void detail.columnKey } }
export const keyedConfig: GridConfig = { selection: { mode: 'row', rowKey: 'propertyId', scopeKey: 'account/site' } }
export const props: DataGridProps = { data: [], config: keyedConfig, onSelectionChange: detail => {
  const key: string | number | null | undefined = detail.rows[0]?.key
  const indexes: readonly number[] = detail.rowIndexes
  void [key, indexes]
  // @ts-expect-error snapshots cannot be changed by consumers
  detail.rowIndexes.push(0)
} }
export function subscribe(grid: DataGridElement, ref: DataGridRef) {
  grid.addEventListener('selection-change', event => {
    const detail: SelectionChangeDetail = event.detail
    void detail
  })
  const found: boolean = ref.selectRowByKey('authorized-property-uuid')
  const snapshot: SelectionChangeDetail = grid.getSelectionSnapshot()
  return { found, snapshot }
}
