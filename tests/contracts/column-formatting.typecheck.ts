import type { GridColumn, GridColumnAlign, GridValueFormat } from '@tipolox/litgrid-web'
import type * as React from '@tipolox/litgrid-react'
import type * as Vue from '@tipolox/litgrid-vue'
import type * as Angular from '@tipolox/litgrid-angular'
interface Row { amount: number; instant: number }
export const money = {kind:'number',locale:'en-SG',options:{style:'currency',currency:'SGD',useGrouping:false}} satisfies GridValueFormat
export const columns = [{key:'amount',align:'right',format:money},
  {key:'instant',format:{kind:'dateTime',locale:'en-GB',options:{timeZone:'UTC',dateStyle:'short'}}},
  {key:'computed',accessor:(row)=>row.amount/100,format:money,render:(_value,row)=>row.amount}
] satisfies GridColumn<Row>[]
export const react: React.GridColumn[] = columns
export const vue: Vue.GridColumn[] = columns
export const angular: Angular.GridColumn[] = columns
export const alignment: React.GridColumnAlign & Vue.GridColumnAlign & Angular.GridColumnAlign & GridColumnAlign = 'end'
export const formats: React.GridValueFormat & Vue.GridValueFormat & Angular.GridValueFormat = money
// @ts-expect-error unknown model key remains rejected
export const badKey = {key:'amout',format:money} satisfies GridColumn<Row>
// @ts-expect-error alignment bounded
export const badAlign = {key:'amount',align:'justify'} satisfies GridColumn<Row>
// @ts-expect-error timezone required
export const badDate = {kind:'dateTime',locale:'en-GB',options:{dateStyle:'short'}} satisfies GridValueFormat
// @ts-expect-error unit style deferred
export const badUnit = {kind:'number',locale:'en-GB',options:{style:'unit'}} satisfies GridValueFormat
// @ts-expect-error granular date parts deferred
export const badParts = {kind:'dateTime',locale:'en-GB',options:{timeZone:'UTC',year:'numeric'}} satisfies GridValueFormat
// @ts-expect-error digit counts are numbers
export const badNumber = {kind:'number',locale:'en-GB',options:{maximumFractionDigits:'2'}} satisfies GridValueFormat
