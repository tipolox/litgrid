import type { DataGridElement } from '../src/types.js'
import type { DataGrid } from '../src/components/DataGrid.js'

// Published v1.0.3 structural implementations did not have these two members.
export function oldShapedImplementation(old: Omit<DataGridElement, 'inferColumns' | 'updateColumnSchema'>): DataGridElement {
  return old
}
export function productionCapabilities(grid: DataGrid): boolean {
  const infer: boolean = grid.inferColumns
  const schema: (columns: DataGridElement['columns'], order?: boolean, key?: string | null) => void = grid.updateColumnSchema.bind(grid)
  schema([], false, null)
  return infer
}
