import type { GridColumn as ReactColumn } from '../../grid-react/src/index.js'
import type { GridColumn as VueColumn } from '../../grid-vue/src/index.js'
import type { GridColumn as AngularColumn } from '../../grid-angular/src/index.js'
import type { GridColumn as BlazorColumn } from '../../grid-blazor/src/index.js'

const monetaryColumn = { key: 'amount', sortable: false, filterable: false }
export const sharedColumnControls: [ReactColumn, VueColumn, AngularColumn, BlazorColumn] =
  [monetaryColumn, monetaryColumn, monetaryColumn, monetaryColumn]
