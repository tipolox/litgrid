# Opt-in row types for columns (#32)

## Architecture decision

Add one optional type parameter, `GridColumn<TRow = unknown>`, and use native
TypeScript `satisfies` for authoring. No JavaScript helper, discriminator, row
transform, or runtime validation is needed. Existing imports and unparameterized
`GridColumn[]` keep their string keys and `unknown` callback parameters.

| Option | Decision |
| --- | --- |
| A. Generic `GridColumn<TRow>` | Choose: one existing public type gains an optional parameter, shared by all adapters. |
| B. Separate type-only helpers/builders | Reject: a second column vocabulary adds exports without improving inference here. A runtime builder would add code solely for inference. |
| C. `satisfies` alone | Insufficient: the existing type cannot check model keys or contextually type rows. Use it with A to check definitions without a type assertion. |
| D. Minimal combination | Choose A plus native `satisfies`; no helper API. |

### Contract

- With a row type, a column without an accessor must use a string key from
  `keyof TRow`. Optional model properties are valid keys. Numeric and symbol keys
  are excluded because the grid's public keys are strings.
- A synthetic/custom key is explicit through a **required accessor**. This uses
  an existing runtime capability. An accessor also permits transforming a model
  field. A misspelled key with an accessor is therefore deliberately accepted;
  the accessor, rather than field lookup, supplies its value.
- Accessors receive `TRow` and a numeric row index and return `unknown`.
  Renderers receive `unknown`, `TRow`, and a numeric row index and return
  `unknown`, preserving existing rendering behavior (including Lit templates).
  Values are intentionally not inferred as `TRow[key]`: accessors can transform
  them, and absent properties can produce the grid's empty-string fallback.
  Narrow renderer values normally, or read a typed field from the row.
- Opt-in callback definitions use strict function parameters. The default
  (`unknown`/`any`) callback boundary uses TypeScript's method bivariance so typed
  column arrays can pass directly through existing `GridColumn[]` props and
  element properties.
  This preserves contextual `unknown` for unparameterized columns but broadens
  callback assignability. It is an erased integration boundary, not a proof that
  separately supplied `data: unknown[]` matches the column model. Consumers must
  supply matching rows; adapters are intentionally not made generic. Bivariance
  also permits narrower callback annotations (including renderer values) on
  **unparameterized** columns. Opt-in columns reject those narrower annotations.
- `unknown` (the default) and `any` retain unrestricted string keys. Models with
  string index signatures naturally cannot reject misspelled string keys. Union
  rows expose their common keys; use an accessor and narrow a union row otherwise.
- Optional `columns` props, omitted columns, and empty arrays keep their existing
  inference behavior. Use `const columns: GridColumn<Person>[] = []` if an empty
  array will later be populated; `[] satisfies GridColumn<Person>[]` does not
  change TypeScript's empty-array inference. This API does not add readonly-array
  support to existing mutable props. Because synthetic keys permit `string`,
  mutable key properties can widen to `string` even with `satisfies`; use an
  individual `key: 'name' as const` when a literal type is needed downstream.
- JavaScript callers and existing TypeScript callers need no migration. Inferred
  runtime columns, structural element mocks, Web Component behavior, Blazor
  models/interop, selection, refresh, sorting, and rendering are unchanged.

## Usage in every framework

Import `GridColumn` from the Web Component, React, Vue, or Angular package root.
All four exports refer to the same type.

```ts
import type { GridColumn } from '@tipolox/litgrid-web'

interface Person {
  id: number
  name: string
  nickname?: string
}

const columns = [
  { key: 'id', header: 'ID' },
  { key: 'name', render: (_value, row) => row.name.toUpperCase() },
  { key: 'nickname' },
  { key: 'label', accessor: (row, index) => `${index + 1}: ${row.name}` },
] satisfies GridColumn<Person>[]

// { key: 'naem' } satisfies GridColumn<Person> // compile-time error
```

React: `import type { GridColumn } from '@tipolox/litgrid-react'`, then pass
`columns` to `<DataGrid data={people} columns={columns} />`.

Vue: `import type { GridColumn } from '@tipolox/litgrid-vue'`, then pass the same
array using `<DataGrid :data="people" :columns="columns" />`.

Angular: `import type { GridColumn } from '@tipolox/litgrid-angular'`, declare
`columns` on the component, and bind `<litgrid-data-grid [data]="people"
[columns]="columns" />`.

The compile-time fixtures exercise the actual public React and Vue props,
Angular component input, and Web Component property against both source and
freshly built declarations. A strict Angular consumer template is also compiled
with `ngc` in CI. No adapter implementation changes are required.

## Performance and residual risks

Only TypeScript types change in library source. All added type expressions erase
at build time; no additional processing runs when columns or rows render. The
existing APIs still accept arbitrary rows, and opt-in typing cannot validate
external JSON or enforce that a grid instance's data matches its columns.
Renderer value precision and generic adapter/data correlation remain outside
this small change. Method bivariance on the legacy boundary is the intentional
compatibility tradeoff described above; typed definitions remain strict.
