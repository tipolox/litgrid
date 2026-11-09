import { h } from 'vue'
import { LitGridColumn, type GridColumn, type LitGridColumnProps } from '@tipolox/litgrid-vue'
interface Person { id: number; name: string }
const column = { key: 'label', accessor: row => row.name } satisfies GridColumn<Person>
export const typed = h(LitGridColumn, { column })
export const direct = { field: 'name', width: 220, hidden: false } satisfies LitGridColumnProps
// @ts-expect-error column widths retain the core contract
export const badWidth = { field: 'name', width: true } satisfies LitGridColumnProps
// @ts-expect-error the typed object still rejects unknown model fields
export const badColumn = { key: 'naem' } satisfies GridColumn<Person>
