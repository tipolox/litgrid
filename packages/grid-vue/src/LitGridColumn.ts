import { defineComponent, type PropType } from 'vue'
import type { GridColumn } from '@tipolox/litgrid-web'

/** Metadata consumed by DataGrid's default slot; no column or cell instances mount. */
export const LitGridColumn = defineComponent({
  name: 'LitGridColumn',
  props: {
    field: String,
    column: Object as PropType<GridColumn>,
    header: String,
    width: [Number, String],
    hidden: { type: Boolean, default: undefined },
    sortable: { type: Boolean, default: undefined },
    filterable: { type: Boolean, default: undefined },
    accessor: Function as PropType<GridColumn['accessor']>,
    render: Function as PropType<GridColumn['render']>
  },
  setup(): () => null {
    throw new Error('LitGridColumn must be a direct DataGrid default-slot declaration (fragments are supported).')
  }
})

export type LitGridColumnProps = InstanceType<typeof LitGridColumn>['$props']
