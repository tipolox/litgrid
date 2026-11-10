import type { GridColumn, GridColumnAlign } from '@tipolox/litgrid-web'
import type * as React from '@tipolox/litgrid-react'
import type * as Vue from '@tipolox/litgrid-vue'
import type * as Angular from '@tipolox/litgrid-angular'
interface Row { amount: number; name: string }
export const columns = [{key:'amount',align:'right'}, {key:'name',align:'start'},
  {key:'computed',align:'center',accessor:row=>row.amount/100,render:(_value,row)=>row.name}
] satisfies GridColumn<Row>[]
export const react: React.GridColumn[] = columns
export const vue: Vue.GridColumn[] = columns
export const angular: Angular.GridColumn[] = columns
export const alignments: (React.GridColumnAlign & Vue.GridColumnAlign & Angular.GridColumnAlign & GridColumnAlign)[] = ['start','center','end','left','right']
// @ts-expect-error unknown model key remains rejected
export const badKey = {key:'amout',align:'end'} satisfies GridColumn<Row>
// @ts-expect-error alignment is bounded
export const badAlign = {key:'amount',align:'justify'} satisfies GridColumn<Row>
