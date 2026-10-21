# Selection notifications and row identity

Selection belongs to the currently displayed, transformed page. Displayed indexes are positions, never property, site, or account identifiers. The shared Web Component owns selection; adapters forward its snapshots.

Configure `selection.rowKey` to name a property containing a unique string (including UUIDs) or finite number. Strings and numbers are distinct keys. Keys must be unique across the **entire loaded input**, including filtered rows and other local pages. Missing, nonfinite, and duplicate keys cannot be selected in keyed mode; range and Select All skip them. Keep keys stable and resubmit edited data through the data setter to refresh the identity index.

```ts
grid.config = {
  selection: { mode: 'row', rowKey: 'propertyId', scopeKey: JSON.stringify([accountId, siteId, permissionRevision]) }
}
grid.addEventListener('selection-change', event => {
  const { scopeKey, rows } = event.detail
  if (scopeKey !== currentAuthorizedScope) return
  const propertyId = rows[0]?.key
  showPropertyDetails(typeof propertyId === 'string' ? propertyId : null)
})
grid.data = authorizedProperties
// Restore after application authorization and loading the displayed record.
const found = grid.selectRowByKey(authorizedPropertyId)
```

`scopeKey` is an optional string or number. Set a new scope **before** replacing data on account, site, or authorization transitions, or call `clearSelection()` first. The adapters apply scope configuration before data. A scope change clears selection even if the new data reuses a key. The grid cannot detect tenant or permission changes from row data alone. Selection never grants authorization, permits a write, or substitutes for application access checks. Recheck the current scope when completing asynchronous detail requests.

## Event contract

`selection-change` is a synchronous, bubbling, composed `CustomEvent<SelectionChangeDetail>`. Attach listeners before changing inputs if initial mode/scope notifications matter. Mode or scope changes emit even with empty selection. Each effective engine operation emits once, before the DOM update; await Lit's `updateComplete` before inspecting rendered ARIA state. Rendering and scrolling alone do not emit.

```ts
type SelectionChangeDetail = Readonly<{
  scopeKey?: string | number
  mode: SelectionMode
  rowIndex: number | null
  columnKey: string | null
  anchorRowIndex: number | null
  rowIndexes: readonly number[]
  cells: readonly string[] // existing "displayedIndex:columnKey" encoding
  rows: readonly Readonly<{
    rowIndex: number
    row: unknown
    key: string | number | null
  }>[]
}>
```

`rows` maps selected row indexes, or distinct rows containing selected cells, to exact displayed input references, including virtualized rows outside the DOM. Keys are null without configured valid identities. Multi-row ordering follows selection insertion order. `rowIndex` identifies the active selected row when non-null; toggles or reconciliation may leave it null while other rows remain selected.

The detail, arrays, and row-entry containers are frozen and detached from later selection operations. **Input row objects remain references**, without deep cloning or freezing. Caller edits remain visible; copy business data separately for historical records. `getSelectionSnapshot()` returns the current frozen detail. Existing `getSelection()` retains its `GridSelection` shape, with defensive copies of its Sets.

Repeated identical single/range/Select All operations, clearing already empty selection, and unchanged data/view operations emit nothing when the full snapshot is unchanged. A toggle, active row/anchor change, index remapping, or replacement selected row object emits. In-place edits with unchanged row reference/key/mapping do not emit a selection event; there is no deep content comparison.

`selectRowByKey(key, intent?)` returns false for absent, filtered, off-page, invalid, or ambiguous keys and non-row selection modes. True means the operation was accepted: a repeat may be a no-op, and a toggle may deselect. It selects no unloaded rows.

Repeated `clearSelection()` calls are silent. Clearing retained anchor metadata after the final row is toggled off can emit even though the selected-row list is already empty.

## Transition rules

| Operation | With `rowKey` | Without `rowKey` |
| --- | --- | --- |
| Sort/filter/search/page/page-size | Keep valid displayed keys and remap indexes | Keep each input row only at its original displayed index and reference |
| Replace data | Keep valid displayed keys; notify for changed selected references/indexes | Keep only identical references at the same displayed indexes |
| Remove rows or introduce invalid/duplicate keys | Remove affected selections | Remove affected selections |
| Clear filter or return to an earlier page | Do not resurrect dropped selection | Do not resurrect dropped selection |
| Change mode, row-key property, or scope | Clear selection | Clear selection |
| Transform/replace selected cells | Clear all selected cells if any selected row reference/index/key mapping changes | Same rule |
| Scroll/virtualize | Preserve selection | Preserve selection |

Active row and range anchor follow surviving selected identities; an absent anchor resets. Legacy no-key core index calls still accept indexes before data is loaded; such positions have no row identity snapshot. The Web Component continues validating displayed indexes. These local page rules implement no remote query or server pagination (#35); future page replacements can use the same data/scope boundaries.

## Framework adapters

React exposes `onSelectionChange?: (detail: SelectionChangeDetail) => void`, plus ref methods `getSelectionSnapshot()` and `selectRowByKey(key, intent?)`. Subscription precedes input synchronization, callbacks use committed current props, and unmount removes listeners. Existing column events retain their behavior.

```tsx
<DataGrid data={authorizedProperties}
  config={{ selection: { mode: 'row', rowKey: 'propertyId', scopeKey: authorizedScope } }}
  onSelectionChange={detail => {
    if (detail.scopeKey === authorizedScope) setSelectedPropertyId(detail.rows[0]?.key ?? null)
  }} />
```

Vue forwards `@selection-change`; Angular exposes `(selectionChange)`. Both expose the same snapshot/key methods. Blazor exposes `OnSelectionChange`, `GetSelectionSnapshotAsync()`, and `SelectRowByKeyAsync(string key, SelectionIntent? intent)`. Its optional `GridSelectionConfig.RowKey` and `ScopeKey` are strings; callback row/key/scope values use `JsonElement`. TypeScript interop also accepts numeric keys. JS/.NET delivery is asynchronous; recheck current scope before applying results.

Core exposes `onSelectionChange(listener)` returning an unsubscribe function, snapshot/key methods, and `getSelectableRowCount()` for checkbox coordination. The shared state path covers pointer, keyboard, checkboxes, imperative calls, transforms, config, and data replacement. Existing focus handling, ARIA selection, announcements, and native custom-cell keyboard activation remain in the Web Component. Custom controls can stop click propagation to keep pointer activation from selecting their containing row, as before.

## Cost and verification

Key validation is O(input rows) on data/key-config changes. The displayed-key index is O(displayed rows) on view changes. Selection/snapshot comparisons cost O(selected rows/cells), without dataset scans or index rebuilding per click. Range/Select All necessarily process the selected range. Virtualization and delegated event handling remain in use.

Run `pnpm test`, `pnpm run build`, the Blazor tests/build, and `pnpm exec tsc -p packages/grid-web/tests/tsconfig.selection.json`. Browser regression: serve local Vite on port 5174, then run `scripts/selection-browser-check.mjs` with Playwright installed. Its optional first argument is a file URL to Playwright's `index.mjs`; `LITGRID_TEST_URL` overrides the server URL. Local tooling can be installed without a repository dependency using `npm install --prefix .private/selection-browser-tools --no-save --package-lock=false playwright`. The script verifies keyboard/focus, keys, ARIA, custom controls, scope reset, and 30,000/100,000-row virtualization. Local timings are observations, not an SLA or assistive-technology certification.
