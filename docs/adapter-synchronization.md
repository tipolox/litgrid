# Framework input synchronization

React, Vue, and Angular share the same input synchronization rules. The grid
keeps ownership of interaction state; the wrappers do not maintain a second
copy of pagination, selection, or column preferences.

## Data changes

Replacing `data` synchronizes the new dataset and resets local pagination to
the first page. Sorting and filters remain active. Row keys are validated
against the entire dataset; duplicate or invalid identities are not selectable.

For compatibility, omitting `dataRevision` keeps mutation-on-synchronization
behavior. When a framework update triggers input synchronization, same-array
additions, removals, row edits, and identity edits are processed. These refreshes
retain the current page and clamp it if the dataset shrinks. This mode must
validate keys and rerun active transforms even when the array reference is
unchanged. It cannot infer that arbitrary mutable row content is unchanged.

For large datasets, opt into explicit notifications with optional
`dataRevision: string | number`. An unchanged data reference and revision skips
data adoption on unrelated updates. Genuine configuration changes can still
reconcile selection or validate a changed row-key property. Replace the array
or change the revision after **every**
in-place data edit, including edits to row keys. Do not mutate row identities
without signaling a change: the existing key index describes the last
synchronized dataset. Removing `dataRevision` returns to legacy behavior.

```tsx
// React: increment revision in the same state update that edits mutable rows.
<DataGrid data={rows} dataRevision={revision} columns={columns} />
```

```html
<!-- Vue -->
<DataGrid :data="rows" :data-revision="revision" :columns="columns" />
<!-- Angular -->
<litgrid-data-grid [data]="rows" [dataRevision]="revision" [columns]="columns" />
```

Mutation alone does not schedule a framework update. React synchronizes in
its input effect when a dependency changes; an unchanged render with stable
inputs does not run it. Omitting columns/config still supports the existing
React parent-update mutation behavior. Development StrictMode effect replay
does not adopt the same render twice. Vue observes prop references, not deep
row mutations, and batches changed props into one synchronization per update.
Angular synchronizes after view initialization and on `ngOnChanges`; ordinary
change detection with unchanged inputs does not resynchronize. A changed
revision provides an explicit trigger in each framework.

## Configuration and presentation

Theme, accessibility, dimensions, overscan, and search debounce setters run
only when their values change. Configuration uses a fixed-size snapshot of
its normalized supported fields, so equivalent object replacements do not
reset the grid. Changing presentation or selection configuration retains
local pagination and cached transforms. Changed pagination defaults are
applied deliberately; data/query-mode changes keep their existing semantics.
Changing selection mode, row key, or scope clears selection before incoming
rows are adopted. Initial query and selection subscriptions are installed
before input synchronization and removed during teardown.

## Column schemas and persistence

Columns are compared by their supported fields (`key`, `header`, `width`,
`hidden`, `sortable`, `filterable`, `accessor`, `render`), including same-array
edits. This is linear in column count and never traverses rows or cells.
Equivalent replacements and unrelated props do not reconcile the schema.

Changed schemas use `updateColumnSchema` with its existing precedence:

- Surviving keys retain user order, resized widths, and visibility.
- New keys append in schema order; removed keys lose their preferences. A
  renamed key is a removed key plus a new key.
- Changed width or hidden defaults override that column's corresponding
  user preference. Other metadata changes retain preferences.
- Active navigation follows the surviving visible column key; removing or
  hiding that column clears its active cell.
- Input array order does not override a user's order. Use the imperative
  `setColumnOrder` or `resetColumnOrder` for a deliberate order reset.
- Empty schemas retain the Web Component's existing inference behavior.

Inferred columns reconcile genuine local-data and accepted external-result
shape changes, retaining preferences for surviving keys. Moving from inferred
to explicit columns also retains matching preferences. Removed inferred active
columns keep the established positional keyboard clamping behavior.
Use explicit columns for persistence across mounts: the existing Web Component
does not restore saved inferred-column preferences on a fresh mount. This
existing limitation is unchanged.

Changing `columnStateStorageKey` atomically installs the target schema and
loads that namespace's saved preferences, or schema defaults when none exist.
It neither copies outgoing preferences nor writes the target namespace merely
because it was selected. Switching back restores that namespace's own state.
Unavailable storage remains supported by the existing Web Component fallback.

Use distinct storage keys for account/site namespaces when preferences must
be isolated. `selection.scopeKey` resets selection; it does not select a column
storage namespace. Remove unauthorized columns from the schema. Column hiding
and browser-local preferences are presentation settings, not authorization.

The direct Web Component `data` and `columns` setters retain their existing
replacement semantics. Additive `updateData(rows, true)` retains/clamps local
pagination while validating and transforming rows. Older structural
`DataGridElement` implementations without the optional reconciliation/refresh
methods retain the setter fallback and its older state behavior.

## External queries

`dataRevision` applies only to local data. External mode continues to use
immutable controlled `externalState`, `query-change`, and request identities.
Unrelated updates and equivalent configuration do not replay a controlled
result or issue queries. A result is reapplied when its reference changes or
a mode/selection-scope change resets the external controller. Late responses,
unknown totals, and search intent ordering retain the released protocol.
