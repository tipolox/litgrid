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
// @ts-expect-error inline alignment retains the shared enum
export const badAlign = { field:'name', align:'justify' } satisfies LitGridColumnProps
// @ts-expect-error inline date formatting requires an explicit timezone
export const badFormat = { field:'name', format:{kind:'dateTime',locale:'en-GB',options:{dateStyle:'short'}} } satisfies LitGridColumnProps
