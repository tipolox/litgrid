# Column alignment

```ts
import type { GridColumn, GridColumnAlign } from '@tipolox/litgrid-web'
const alignment: GridColumnAlign = 'end'
const columns = [{ key: 'amount', align: alignment }] satisfies GridColumn[]
```

The additive API is `align?: 'start' | 'center' | 'end' | 'left' | 'right'`.
`GridColumnAlign` and aligned `GridColumn<TRow>` are exported by the Web, React,
Vue and Angular packages. Existing typed keys, callbacks and untyped columns
continue to work.

Alignment positions existing flex body content and the header label. Header
controls and resize handles keep their positions. Logical `start`/`end` follow
text direction, physical `left`/`right` keep their physical meaning, and `center`
centers content. This is text-level direction support. Omitting `align` keeps
the historical layout. No wrapper nodes are added. Custom renderer output uses
the same positioning; it keeps responsibility for its own internal layout.

React and Angular accept `columns` with the same metadata. Vue accepts the
`columns` prop, a typed marker `column`, or inline marker metadata:

```vue
<DataGrid :data="rows">
  <LitGridColumn field="amount" align="right" />
  <LitGridColumn :column="typedColumn" />
</DataGrid>
```

Blazor exposes nullable `string? Align` on both `GridColumn` and
`LitGridColumn<TItem>`. It serializes as `align` and is omitted when null:

```razor
<DataGrid TItem="Invoice" Data="@invoices">
  <LitGridColumn Field="@(invoice => invoice.Amount)" Align="end" />
</DataGrid>
```

Metadata edits at existing adapter synchronization points reconcile keyed
schemas and retain user width/order/visibility, selection and navigation.
Explicit changes to width/hidden/order retain their established semantics.
The entirely unconfigured Blazor programmatic path keeps its replacement setter.
For imperative Web updates that should retain keyed state, use
`grid.updateColumnSchema(columns)`; `grid.columns = columns` keeps its existing
replacement behavior.

Only the five exact strings and omitted/undefined alignment are accepted in
JavaScript. Alignment must be an own data property; getters and inherited
alignment are rejected without evaluating them. Invalid metadata throws a
`TypeError` named `GridColumnAlignmentError` with the column key, before schema,
persistence namespace or active grid state changes. Validation and snapshots
complete before adoption. Correct the inputs and synchronize again, including
in-place edits at the adapters' existing synchronization points.

React reports invalid lifecycle inputs through `console.error` and retains the
mounted grid. Vue uses its existing error handler and Angular its existing
lifecycle error boundary. Blazor logs invalid alignment and retains the last
successful transfer, keeping the circuit and subsequent renders usable.
Imperative schema updates and explicit refresh failures still throw.

Alignment does not change raw values, query behavior, clipboard values or B1
targeted-refresh semantics. See [qualification](column-alignment-qualification.md)
for correctness evidence and the outstanding independent-host performance gate.
