import { createElement } from 'react'
import { h } from 'vue'
import { DataGrid as ReactGrid } from '@tipolox/litgrid-react'
import { DataGrid as VueGrid } from '@tipolox/litgrid-vue'
import type * as Web from '@tipolox/litgrid-web'
import type * as React from '@tipolox/litgrid-react'
import type * as Vue from '@tipolox/litgrid-vue'
import type * as Angular from '@tipolox/litgrid-angular'

interface Person { id: number; name: string; nickname?: string }
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T

export const columns = [
  { key: 'id', header: 'ID', width: 80, sortable: false },
  {
    key: 'name',
    render(value, row, rowIndex) {
      type Value = Assert<Equal<typeof value, unknown>>
      type Row = Assert<Equal<typeof row, Person>>
      type Index = Assert<Equal<typeof rowIndex, number>>
      // @ts-expect-error renderer values require narrowing even for model keys
      value.toUpperCase()
      // @ts-expect-error row has no misspelled model property
      row.naem
      return typeof value === 'string' ? value.toUpperCase() : row.name
    },
  },
  { key: 'nickname', hidden: true },
  {
    key: 'label',
    accessor: (row, rowIndex) => {
      type Row = Assert<Equal<typeof row, Person>>
      type Index = Assert<Equal<typeof rowIndex, number>>
      // @ts-expect-error accessor row has no misspelled model property
      row.naem
      return `${rowIndex + 1}: ${row.name}`
    },
    render: (value, row) => typeof value === 'string' ? value : row.name,
  },
] satisfies Web.GridColumn<Person>[]
// The synthetic branch has key: string, so normal mutable key inference widens.
export type InferredKeys = Assert<Equal<(typeof columns)[number]['key'], string>>
export const annotated: Web.GridColumn<Person>[] = [
  { key: 'name', accessor: row => row.name.length, render: (_value, row) => row.id },
]
export const transformed = {
  key: 'id', accessor: row => String(row.id),
  render: (value, row) => {
    type Value = Assert<Equal<typeof value, unknown>>
    return typeof value === 'string' ? value : String(row.id)
  },
} satisfies Web.GridColumn<Person>

// @ts-expect-error unknown model key needs an explicit accessor
export const typo = { key: 'naem' } satisfies Web.GridColumn<Person>
// @ts-expect-error synthetic columns cannot omit their accessor
export const noAccessor: Web.GridColumn<Person> = { key: 'label', render: (_value, row) => row.name }
// @ts-expect-error undefined does not make a synthetic column explicit
export const undefinedAccessor: Web.GridColumn<Person> = { key: 'label', accessor: undefined }
// @ts-expect-error accessor receives a Person, not a string
export const wrongAccessor: Web.GridColumn<Person> = { key: 'name', accessor: (row: string) => row }
// @ts-expect-error renderer receives a Person, not a string
export const wrongRenderer: Web.GridColumn<Person> = { key: 'name', render: (_value, row: string) => row }
// @ts-expect-error typed renderer values must accept unknown, not just strings
export const narrowValue: Web.GridColumn<Person> = { key: 'name', render: (value: string) => value }
// @ts-expect-error typed accessors cannot require extra row properties
export const narrowRow: Web.GridColumn<Person> = { key: 'name', accessor: (row: Person & { active: boolean }) => row.active }
// @ts-expect-error row indices remain numeric
export const wrongIndex: Web.GridColumn<Person> = { key: 'name', accessor: (_row, index: string) => index }
// @ts-expect-error public column keys remain strings
export const numericKey: Web.GridColumn<{ 0: string }> = { key: 0 }
declare const secret: unique symbol
// @ts-expect-error symbol properties are not public string column keys
export const symbolKey: Web.GridColumn<{ [secret]: string }> = { key: secret }
// @ts-expect-error an empty row model has no field keys
export const emptyModel: Web.GridColumn<{}> = { key: 'name' }
export const emptyModelComputed: Web.GridColumn<{}> = { key: 'label', accessor: () => 'label' }
type UnionRow = { kind: 'person'; name: string } | { kind: 'team'; title: string }
export const commonKey: Web.GridColumn<UnionRow> = { key: 'kind' }
// @ts-expect-error a union's field keys must exist on every member
export const nonCommonKey: Web.GridColumn<UnionRow> = { key: 'name' }
export const unionComputed: Web.GridColumn<UnionRow> = {
  key: 'label', accessor: row => row.kind === 'person' ? row.name : row.title,
}
export const dictionary: Web.GridColumn<Record<string, number>> = { key: 'arbitrary' }

// Legacy callbacks still infer unknown and custom keys remain unrestricted.
export const legacy: Web.GridColumn[] = [
  { key: 'custom' },
  {
    key: 'anything',
    accessor: (row, index) => {
      type Row = Assert<Equal<typeof row, unknown>>
      type Index = Assert<Equal<typeof index, number>>
      // @ts-expect-error unparameterized rows still require narrowing
      row.name
      return index
    },
    render: (value, row) => {
      type Value = Assert<Equal<typeof value, unknown>>
      type Row = Assert<Equal<typeof row, unknown>>
      return value
    },
  },
]
export const unknownColumns: Web.GridColumn<unknown>[] = legacy
export const anyColumns: Web.GridColumn<any>[] = [{ key: 'anything' }]
export const legacyBoundary: Web.GridColumn[] = columns
export const annotatedBoundary: Web.GridColumn[] = annotated
export const empty: Web.GridColumn<Person>[] = []
empty.push({ key: 'id' })
// @ts-expect-error populating an annotated empty array still checks field keys
empty.push({ key: 'naem' })
export const emptySatisfies = [] satisfies Web.GridColumn<Person>[]

// Re-exports preserve the generic in source and freshly built declarations.
export type ReactExport = Assert<Equal<React.GridColumn<Person>, Web.GridColumn<Person>>>
export type VueExport = Assert<Equal<Vue.GridColumn<Person>, Web.GridColumn<Person>>>
export type AngularExport = Assert<Equal<Angular.GridColumn<Person>, Web.GridColumn<Person>>>
export const reactColumns = [{ key: 'name', accessor: row => row.name }] satisfies React.GridColumn<Person>[]
export const vueColumns = [{ key: 'nickname', render: (_value, row) => row.nickname ?? row.name }] satisfies Vue.GridColumn<Person>[]
export const angularColumns = [{ key: 'label', accessor: row => row.name }] satisfies Angular.GridColumn<Person>[]
// @ts-expect-error React root export checks model keys
export const reactTypo = { key: 'naem' } satisfies React.GridColumn<Person>
// @ts-expect-error Vue root export checks model keys
export const vueTypo = { key: 'naem' } satisfies Vue.GridColumn<Person>
// @ts-expect-error Angular root export checks model keys
export const angularTypo = { key: 'naem' } satisfies Angular.GridColumn<Person>

const people: Person[] = [{ id: 1, name: 'Ada' }]
export const reactProps = { data: people, columns } satisfies React.DataGridProps
export const reactExample = createElement(ReactGrid, reactProps)
export const vueProps = { data: people, columns } satisfies Vue.DataGridProps
export const vueExample = h(VueGrid, vueProps)
export const angularInputs = { data: people, columns } satisfies Pick<Angular.DataGridComponent, 'data' | 'columns'>
export const webInputs = { data: people, columns } satisfies Pick<Web.DataGridElement, 'data' | 'columns'>
export const optionalReact: Pick<React.DataGridProps, 'columns'> = {}
export const optionalVue: Pick<Vue.DataGridProps, 'columns'> = { columns: undefined }
export const emptyReact: React.DataGridProps = { data: people, columns: emptySatisfies }
export const emptyVue: Vue.DataGridProps = { data: people, columns: [] }
export const emptyAngular: Pick<Angular.DataGridComponent, 'columns'> = { columns: [] }

// Deliberate bivariance across the existing erased boundary is additive.
const narrow: Web.GridColumn<Person & { active: boolean }> = { key: 'id', accessor: row => row.active }
export const erasedNarrow: Web.GridColumn[] = [narrow]
// @ts-expect-error typed arrays retain strict row variance before the erased boundary
export const typedNarrow: Web.GridColumn<Person>[] = [narrow]
