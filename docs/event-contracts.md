# Framework event contracts

All three TypeScript wrappers re-export their event detail types from
`@tipolox/litgrid-web`. Callbacks receive the **detail**, while a native Web
Component listener receives a `CustomEvent` and reads `event.detail`.

| Web Component event | React callback | Vue event | Angular output | Detail type |
| --- | --- | --- | --- | --- |
| `column-state-change` | `onColumnStateChange` | `@column-state-change` | `(columnStateChange)` | `ColumnStateChangeDetail` |
| `column-reorder` | `onColumnReorder` | `@column-reorder` | `(columnReorder)` | `ColumnReorderDetail` |
| `column-visibility-change` | `onColumnVisibilityChange` | `@column-visibility-change` | `(columnVisibilityChange)` | `ColumnVisibilityChangeDetail` |
| `selection-change` | `onSelectionChange` | `@selection-change` | `(selectionChange)` | `SelectionChangeDetail` |
| `query-change` | `onQueryChange` | `@query-change` | `(queryChange)` | `GridQueryChangeDetail` |

Column state is `{ reason, state: { version: 1, columns: [...] } }`.
Reorder detail contains `columnKey`, `previousIndex`, `currentIndex`, and
`columnOrder`. Visibility detail contains `columnKey`, `visible`, and
`visibleColumnKeys`. Selection notifications contain detached snapshot arrays
(`rowIndexes`, `cells`, `rows`); the legacy `getSelection()` API returns sets.
Query notifications contain `requestId`, `reason`, and `query`; the search
text is `query.search`. See [selection coordination](selection-coordination.md)
and [external queries](external-query.md) for ownership and scope semantics.

## Web Component

Run this in a TypeScript browser application with `@tipolox/litgrid-web` installed:

```ts
import { DataGrid } from '@tipolox/litgrid-web'
import type { ColumnStateChangeDetail } from '@tipolox/litgrid-web'

const grid = new DataGrid()
grid.columns = [{ key: 'id' }, { key: 'name' }]
grid.data = [{ id: 1, name: 'Ada' }]
const onState = (event: Event) => {
  if (event instanceof CustomEvent) {
    const detail: ColumnStateChangeDetail = event.detail
    console.log(detail.reason, detail.state.columns)
  }
}
grid.addEventListener('column-state-change', onState)
document.body.append(grid)
grid.moveColumn('name', 0)

// Call when disposing this view.
export function dispose() {
  grid.removeEventListener('column-state-change', onState)
  grid.remove()
}
```

Use the complete [React](react-guide.md), [Vue](vue-examples.md#persisted-column-preferences),
and [Angular](angular-guide.md#column-state-outputs) examples for framework setup.
The wrappers subscribe when mounted and remove their native/template event
listeners on teardown. Use their component refs after mounting; subscribe to
framework callbacks instead of adding another listener for the same action.
One reorder or visibility action also emits a column-state notification. Those
are distinct event families, rather than duplicate delivery of one event.

## Blazor

Blazor uses `OnColumnStateChange`, `OnColumnReorder`, `OnColumnVisibilityChange`,
`OnSelectionChange`, and `OnQueryChange`. Its .NET models use PascalCase
properties (`State.Columns`, `PreviousIndex`, `VisibleColumnKeys`, `Rows`, and
`Query.Search`) with JSON names matching the Web Component contract. Follow the
[Blazor guide](blazor-guide.md#events--callbacks) and
[external-query guidance](external-query.md); use the component's async methods
and dispose the owning component normally.

## Contract checks

With the frozen workspace dependencies installed:

```sh
node scripts/typecheck-contracts.mjs
pnpm build
pnpm exec tsc -p tsconfig.published-contracts.json --pretty false
pnpm exec playwright install chromium
node scripts/check-adapter-events.mjs
```

The source gate includes every React, Vue, and Angular test fixture and the
shared browser fixture. The published gate resolves built declarations,
including Angular's `dist/grid-angular` package. Chromium imports built package
entry points and checks two mount cycles per framework in local and external
query modes (12 cases), including refs, callback replacement, exact payloads,
single delivery, pagination, and all listener cleanup paths.

The broad root `tsc --noEmit` has a separate diagnostic backlog; these bounded
checks do not claim that it passes.
