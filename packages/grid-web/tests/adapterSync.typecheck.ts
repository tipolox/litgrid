import { createGridEngine, normalizeConfig } from '@tipolox/litgrid-core'
import { synchronizeGridInputs, type GridAdapterInputs, type DataGridElement } from '@tipolox/litgrid-web'
import type { DataGridProps as ReactProps } from '@tipolox/litgrid-react'
import type { DataGridProps as VueProps } from '@tipolox/litgrid-vue'
import type { DataGridComponent } from '@tipolox/litgrid-angular'

const react: ReactProps = { data: [], dataRevision: 0 }
const vue: VueProps = { data: [], dataRevision: 'revision' }
declare const angular: DataGridComponent
angular.dataRevision = 1
declare const grid: DataGridElement
declare const inputs: GridAdapterInputs
synchronizeGridInputs(grid, inputs)
grid.updateData?.(react.data, true)
createGridEngine(normalizeConfig({})).setData(vue.data, true)
