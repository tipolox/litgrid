import type * as Web from '@tipolox/litgrid-web'
import type * as React from '@tipolox/litgrid-react'
import type * as Vue from '@tipolox/litgrid-vue'
import type * as Angular from '@tipolox/litgrid-angular'

type Events<T extends {
  state: unknown; reorder: unknown; visibility: unknown; selection: unknown; query: unknown
}> = T
type WebEvents = Events<{
  state: Web.ColumnStateChangeDetail
  reorder: Web.ColumnReorderDetail
  visibility: Web.ColumnVisibilityChangeDetail
  selection: Web.SelectionChangeDetail
  query: Web.GridQueryChangeDetail
}>
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T
export type ReactEvents = Assert<Equal<WebEvents, {
  state: React.ColumnStateChangeDetail; reorder: React.ColumnReorderDetail
  visibility: React.ColumnVisibilityChangeDetail; selection: React.SelectionChangeDetail
  query: React.GridQueryChangeDetail
}>>
export type VueEvents = Assert<Equal<WebEvents, {
  state: Vue.ColumnStateChangeDetail; reorder: Vue.ColumnReorderDetail
  visibility: Vue.ColumnVisibilityChangeDetail; selection: Vue.SelectionChangeDetail
  query: Vue.GridQueryChangeDetail
}>>
export type AngularEvents = Assert<Equal<WebEvents, {
  state: Angular.ColumnStateChangeDetail; reorder: Angular.ColumnReorderDetail
  visibility: Angular.ColumnVisibilityChangeDetail; selection: Angular.SelectionChangeDetail
  query: Angular.GridQueryChangeDetail
}>>

// The obsolete fixtures must remain rejected, including in built declarations.
// @ts-expect-error column state is a versioned snapshot, not parallel arrays/maps
const oldState: Web.ColumnStateChangeDetail = { source: 'reorder', order: ['id'], widths: {} }
// @ts-expect-error reordering uses previousIndex/currentIndex/columnOrder
const oldReorder: Web.ColumnReorderDetail = { columnKey: 'id', fromIndex: 1, toIndex: 0, order: ['id'] }
// @ts-expect-error visibleColumnKeys is required
const oldVisibility: Web.ColumnVisibilityChangeDetail = { columnKey: 'id', visible: true, visibleKeys: ['id'] }
void [oldState, oldReorder, oldVisibility]
