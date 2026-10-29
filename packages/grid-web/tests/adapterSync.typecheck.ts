import { createGridEngine } from '@tipolox/litgrid-core'
import type { DataGrid, DataGridElement } from '@tipolox/litgrid-web'
import type { DataGridProps as ReactProps } from '@tipolox/litgrid-react'
import type { DataGridProps as VueProps } from '@tipolox/litgrid-vue'
import type { DataGridComponent } from '@tipolox/litgrid-angular'

const react: ReactProps = { data: [] }
const vue: VueProps = { data: [] }
declare const angular: DataGridComponent
angular.data = react.data
declare const grid: DataGridElement
grid.data = vue.data
createGridEngine().setData(react.data)
// A1 must not extend the public mutable-data API.
// @ts-expect-error Revision inputs are not part of the React contract.
const rejectedReact: ReactProps = { data: [], dataRevision: 1 }
// @ts-expect-error Revision inputs are not part of the Vue contract.
const rejectedVue: VueProps = { data: [], dataRevision: 1 }
// @ts-expect-error Revision inputs are not part of the Angular contract.
angular.dataRevision = 1
// @ts-expect-error No public synchronization flag is added to core setData.
createGridEngine().setData([], true)
// @ts-expect-error No public local refresh capability is added.
grid.updateData([])
declare const web: DataGrid
// @ts-expect-error No public local refresh method is added to the Web Component.
web.updateData([])
