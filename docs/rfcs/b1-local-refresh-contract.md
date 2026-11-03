# B1 RFC — Local data refresh and targeted update boundaries

> **Status: PROPOSED / DESIGN-ONLY; NOT APPROVED OR IMPLEMENTED.** Issue [#62](https://github.com/tipolox/litgrid/issues/62), parent [#27](https://github.com/tipolox/litgrid/issues/27). Inspected base `main` `861c6a702e4ced1549e0f2fae8507af67e823e68` on 2026-11-03. No shipping API, type declarations, tests, version, packages or runtime code change in this RFC.

## 1. Recommendation

**Revised with founder feedback: B1 must include first-class row and row-range refresh as a high-priority feature, not defer it indefinitely.** Deliver B1a full local `refreshData()` as the correctness baseline and **B1b targeted `refreshRow` / `refreshRows` / `refreshRange`** in the same planned milestone (staged implementation/validation gates). A common editing and asynchronous-validation update should not rebuild an entire local grid model or reevaluate every mounted cell when the row identity, derived membership and layout stay stable. Keep correctness-preserving fallback for cases that affect those properties.

This is intentionally narrower than adding a suite of methods because ordinary immutable array replacement is already supported, and Blazor already implements `RefreshDataAsync()`. Prior A1 experimentation introduced and then removed a shared `dataRevision`/updateData surface; **do not reintroduce it**. Blazor's independently released `DataRevision` is a framework-specific existing feature, not a reason to add a JS prop.

The newly identified consumer use cases — editing one row, updating row validation/status asynchronously, and refreshing a contiguous range — justify designing B1b alongside B1a. **The goal is a true targeted path for safe cases**, not a `requestUpdate()` convenience method that still reevaluates all mounted cells. Full `refreshData()` remains O(n) when model-wide reconciliation is necessary.

## 2. Verified current behavior (main, not proposals)

| Surface | Current behavior | Gap / caveat |
|---|---|---|
| Core `createGridEngine` | `setData(array)` revalidates keyed identities, transforms and recalculates local views. Same-reference assignment retains/clamps page; replacement resets to page 0. `getRows()` returns displayed rows, **not** source rows. | No public `refreshData()` or source getter; a refresh method must access the original source internally. |
| Web Component `<yc-grid>` | `data` is assigned via a **setter**; it also reconciles inferred schema, resets best-fit widths, updates announcements and requests Lit rendering. | Public `DataGridElement.data` is typed as a property, but the production class has a setter with no getter: `grid.data = grid.data` is **not a reliable refresh pattern**. |
| React | A forwarded ref exposes `DataGridRef`; data synchronization runs on the existing input effect; immutable replacement synchronizes. | Mutation of an unchanged array **alone** does not schedule an effect. Ref method would need to target the **last adopted** input, not an uncommitted render. |
| Vue | Shallow prop watchers batch input synchronization; exposed ref methods are available. | Mutation alone without a changed prop does not schedule a watcher. |
| Angular | `@Input()` data syncs on `ngOnChanges` and initialization. | Unchanged inputs during ordinary change detection do not trigger data adoption. |
| Blazor | **`RefreshDataAsync()` already exists**, synchronizing via its established lifecycle/JS interop; `DataRevision`, `DataSyncMode` and observable-data notifications are existing Blazor features. | Do **not** introduce a conflicting `RefreshDataAsync` overload or change its return type/exception behavior. |
| External mode | `refreshQuery()` emits a versioned request/query intent; the app fetches and commits `externalState`, stale responses are rejected. | Local refresh must never fetch, transform or accept unauthorized remote rows. |

Primary source: `packages/grid-core/src/core/createGridEngine.ts`, `GridEngine.ts`, `packages/grid-web/src/components/DataGrid.ts`, `packages/grid-web/src/types.ts`, React/Vue/Angular `gridBindings.ts`, `packages/grid-blazor/src/Components/DataGrid.razor.cs`, `docs/adapter-synchronization.md`, `docs/blazor-data-synchronization.md`. Earlier overview: `docs/data-update-api-design-notes.md`.

## 3. Candidate B1a contract (UNRELEASED)

```ts
// DESIGN SKETCH ONLY — these methods do not exist in current JS packages.
interface GridEngine {
  refreshData(): boolean
}
interface DataGridElement {
  refreshData?(): boolean // optional structural capability for old mocks/elements
}
interface DataGridRef {
  refreshData(): boolean
}
```

**Recommended meaning:** `true` = local source was synchronized synchronously; `false` = the grid is configured for `queryMode: 'external'` and was not modified. An empty local dataset still returns `true`. Do not emit `query-change` in either case. A wrapper can fail clearly when an older underlying Web Component lacks the optional capability; it must not silently report success. No data/revision argument, no row index, no requested byte/row-count budget, and no new event type.

- **Core:** reprocess the *most recently adopted local source*, preserving source identity, through the exact semantic equivalent of existing `setData(sameReference)`. Synchronous full unique-key/duplicate validation, quick-search/filter/sort transforms, page retention/clamping and selection reconciliation, including selection events. Do not obtain source via `getRows()` (which is filtered/paged); no async deferral of identity validation to first click.
- **Web Component:** follow the same observable refresh path as reassigning the *last successfully adopted local `data` source*: inferred columns, row count, best-fit invalidation, Lit update and accessibility announcement decisions. The last accepted local source reference must be explicit internal state or an equivalent Core-internal access; **never read the setter-only `grid.data` back**. If a local source was never adopted, behave as an empty local dataset. On query-mode transitions, never revive data from a previous tenant, mode or stale remote result.
- **React/Vue/Angular:** expose `refreshData(): boolean` through the existing imperative ref/component surface; *do not* add `dataRevision`, deep-watched props or automatic mutation observers. The method acts on **last committed/adopted input**, not pending props. After a genuine immutable prop replacement, ordinary synchronization is preferable; explicit refresh is for controlled same-reference mutation. Do not cause duplicate full refreshes from wrapper bookkeeping.
- **Blazor:** keep published `ValueTask RefreshDataAsync()` as-is and test parity of *meaning*, not method signatures. Document its current lifecycle errors/interop retry/notification behavior accurately; do not add a bool return or a second JS revision input to Blazor.
- **Errors/lifecycle:** Existing wrapper conventions for calls before mount/after disposal remain. For Core/Web external mode, return false without altering data, query request identity, focus, or selection. Handle internal getter/transform errors in line with current `setData` behavior; do not claim atomic rollback that the existing engine does not provide. On failure, do not record a wrapper synchronization snapshot as successful.
- **Performance:** O(number of loaded local source rows) validation is **required** by the current in-place mutation contract. No promise of O(1) row-level work or fewer transformations; retaining the same source deliberately avoids a replacement-array page reset. External mode does no local scan.

### Illustrative, non-executable-until-approved consumer calls

```ts
// Web: rows[0].name = 'Updated'; grid.refreshData()  // PROPOSED
// React: rows[0].name = 'Updated'; gridRef.current?.refreshData()
// Vue: rows[0].name = 'Updated'; gridRef.value?.refreshData()
// Angular: rows[0].name = 'Updated'; gridComponent.refreshData()
// Blazor EXISTING: await grid.RefreshDataAsync(); // already supported
// Server query EXISTING: grid.refreshQuery(); // emits intent, not local refresh
```

## 4. API decision matrix

| Candidate | Primary intention | Risk / architectural constraint | B1 disposition |
|---|---|---|---|
| Existing immutable `data` replacement | Adopt consumer-owned source | Correct full transforms; replacement resets page; do not override | **Keep as default** |
| **Proposed `refreshData()`** | Explicit same-source local re-evaluation | O(n) identity and transforms, selection events, schema/focus/lifecycle | **Recommend B1a** |
| **Proposed `refreshRow(rowKey)` / `refreshRows(rowKeys)`** | Update one/few edited rows or validation indicators; avoid all-grid work where safe | Require stable identity and derived-view membership; if identity/sort/filter/search/row geometry might change, explicitly promote to full model refresh or reject render-only request | **B1b priority — same milestone, gated** |
| **Proposed `refreshRange({ start, endExclusive })`** | Refresh a contiguous span of currently displayed row indexes | Define end-exclusive displayed-row coordinates, bounds, offscreen handling and virtualization; do not confuse with source-array or server-total indexes | **B1b priority — same milestone, gated** |
| `refreshCells(rows?, columns?)` | Targeted individual cell repaint | Requires a separate column dependency, focus/aria and layout contract | **Defer distinct cell API** |
| `applyTransaction({add, update, remove})` | Atomic batch structural changes | Framework vs grid ownership, conflict resolution, duplicate global keys, page/selection, rollback and event ordering | **Defer B1c** |
| Existing `refreshQuery()` | Request another server-side fetch | Monotonic request ID and controlled result protocol; no automatic fetch | **Keep unchanged** |

### Why row/range refresh belongs in B1 (revised)

For a change confined to **presentation-only row state** (e.g., validation spinner, an error annotation or an ordinary field not used by active transforms), **rerunning identity verification and model transforms for all 100k rows is unnecessary**. We should explicitly support fast row/range invalidation while using existing keyed lookup and virtualized rendered rows. However, a changed row key or a sort/filter/search-dependent value can change membership, ordering or selection. In those cases the implementation must fall back to full reconciliation, or clearly reject a caller-requested strict display-only operation. **We will not call a whole-grid `requestUpdate()` a proven targeted-render optimization without measuring unaffected cell-renderer invocation counts.**

### Why not start with `applyTransaction`?

Current React/Vue/Angular adapters accept **framework-owned** data arrays. A grid-mutating transaction would create two owners; the next framework render could silently overwrite it. Future options to investigate are: (A) a **transaction proposal event** that the framework owner accepts and applies immutably, or (B) explicit *opt-in grid-owned local data* with atomic validation and clear re-adoption rules. Neither is part of B1a.

## 5. Required acceptance tests for B1a + targeted B1b implementation gates

**Contract/invariants:**
1. Local same-reference mutable row edit, insertion, deletion, reorder and identity edit (including duplicates after third occurrence, invalid/missing keys and off-page/filtered duplicates); full validation, no stale selection or resurrected identity.
2. Active sort/filter/search applied once per successful explicit refresh; changed membership and ordering reflected; retaining/clamping same-array page, contrasted with reset on immutable replacement.
3. Repeated refresh without data change has no unintended selection events; changed row identity emits the existing normalized selection event/snapshot once as appropriate. Scope changes `NaN`/infinity/signed-zero obey existing rules; no cross-site selection resurrection.
4. `refreshData()` in external mode returns `false`, emits **no query intent**, does not consume or advance request IDs, does not mutate accepted controlled pages, and preserves late-response rejection/known-unknown totals.
5. Web inferred column changes, explicit schemas, best-fit widths, screen-reader announcements, focus/active cell and virtualized row bounds match the existing local setter path. Call-before-first-local-data and local⇄external transitions must not resurrect old data or leak tenants.
6. Real React StrictMode, Vue batched updates, Angular `ngOnChanges`, Blazor Server/WASM `RefreshDataAsync`: no duplicate adoption or stale props; mounted/unmounted error behavior; source/published-declaration contract and older structural `DataGridElement` mocks.
7. JS/TS strict gates, all package builds, 383+ JS tests baseline, 129+ Blazor tests baseline and actual Chromium adapter lifecycle; no accidental public surface aside from approved additive method.

**Evidence/budgets:** compare correct full-refresh work vs the current same-reference setter on **20 loaded external rows**, 10k/30k/100k keyed local rows, with and without transforms, and with 120/200 columns in browser. Record environment, p50/p95 and raw samples, first click/scroll/selection, heap/allocations where useful. Verify no unexpected additional O(n) passes; do not set a post-hoc production SLA or claim rendered-screen paint from two rAFs.

## 6. Specific open design decisions (for product-owner approval before code)

1. **Approve B1a (full refresh) plus prioritized B1b (row/rows/range) as the implementation scope**, with a mandatory design gate for model vs render-only semantics; the precise signatures below remain unapproved. Cell-specific repaint and transactions remain out of scope.
2. When an older structural `DataGridElement` lacks this capability, wrappers should report unsupported clearly (preferred) rather than silently falling back; document the error type and package-version pairing.
3. On local→external→local transitions, decide whether the caller must explicitly rebind the local source (recommended for tenant safety). Do not reuse cached previous-tenant rows.
4. **Caller timing:** document that imperative refresh acts on the last committed grid adoption, not on a concurrent pending React/Vue/Angular prop change. Build lifecycle tests for this boundary.
5. External `false` return avoids a throw for an otherwise valid grid; keep Blazor's existing `ValueTask` contract unchanged. A public TS change needs explicit owner consent.

## 7. Comparative context (external products, not LitGrid commitments)

AG Grid documents distinct **refreshCells/redrawRows** for view refresh and **rowData/single-row/transaction** for data updates. TanStack's editable React example updates caller-owned state and controls pagination reset. Handsontable documents direct cell APIs while warning that externally mutated source references may bypass internal update machinery. Those products have different ownership/renderers; **the distinction is useful, not their exact API shapes**.

- https://www.ag-grid.com/javascript-data-grid/view-refresh/
- https://www.ag-grid.com/javascript-data-grid/data-update/
- https://tanstack.com/table/v8/docs/framework/react/examples/editable-data
- https://handsontable.com/docs/javascript-data-grid/binding-to-data/

## 8. Architectural disposition and next gate

**Revised recommendation:** B1a full local refresh **and B1b row/rows/range refresh as a planned priority**, with separate safety and rendering-performance gates. **This design RFC is not permission to code or merge.** Review the proposed API and trusted-invalidation vs model-fallback contract first; then open isolated implementation draft PR(s) with failing acceptance tests, and require explicit founder approval before merge/release.

Keep [#32](https://github.com/tipolox/litgrid/issues/32) (typed columns) as a separate potentially higher-return DX milestone and [#43](https://github.com/tipolox/litgrid/issues/43) (cold keyed startup/real paint) as unresolved independent performance scope. Do not block ordinary releases solely on this speculative API.


## 9. Founder-driven B1b design — targeted row(s) and displayed range (2026-11-03)

### Use cases and performance intent

- **Inline editing:** after editing a cell or row, refresh only that row when its key, row membership, ordering and layout are unchanged.
- **Asynchronous validation:** refresh a row when it enters `validating`, then refresh again on success/error. Protect against outdated validation results arriving after a later edit; validation status is application-owned.
- **Small batch:** after receiving 5 changed rows, refresh 5 keyed rows without revalidating 100k unrelated identities.
- **Visible range:** refresh a displayed interval (e.g., current editor selection or a batch from index 100 through 129), without conflating this with the original source indexes or a server-reported total.

### Tentative surface (unapproved / not implemented)

```ts
// The following methods DO NOT EXIST in released LitGrid.
interface ProposedGridRefresh {
  refreshData(): boolean
  refreshRow(key: GridRowKey, options?: { mode?: 'auto' | 'render-only' }): boolean
  refreshRows(keys: readonly GridRowKey[], options?: { mode?: 'auto' | 'render-only' }): number
  refreshRange(range: { start: number; endExclusive: number }, options?: { mode?: 'auto' | 'render-only' }): number
}
```

**Return types, names, overload shapes, and the mode option are proposals for review, not established contracts.** A more explicit distinction between `invalidateRows()` (render-only) and `refreshRows()` (model-aware) remains under consideration. The user's desired behavior is nonnegotiable for B1b: a valid targeted refresh must **not** calculate/render all unrelated visible rows, and untouched logical rows must retain their DOM identity/focus where safe.

**Default `auto` behavior under review:** For a known, uniquely keyed *already loaded* row with unchanged key, unchanged scope, no active membership/order-affecting transforms and no row-geometry/schema invalidation, update its displayed representation only. Under active sort/filter/search, changed key/duplicate, inferred column-shape change or row-height invalidation, the implementation must perform the correct model-wide refresh or explicitly signal that targeted-only operation is unsupported. Do **not** silently leave stale ordering, membership, or selection. Unknown external source keys and off-page targets must never trigger synthetic selection or unauthorized fetching.

**Strict `render-only` behavior under review:** An advanced caller could promise that the key, derived order/membership and layout have not changed; perform only presentation invalidation and **never** implicitly change the model. An unsupported/unsafe scenario should be rejected rather than silently returning a misleading success. If we offer this option, documentation must explain the trust boundary and why it is inappropriate for key/sort/filter/search edits.

**Batching:** `refreshRows(keys)` should deduplicate keys and commit one scheduled render, not k unrelated component-wide updates. `refreshRange({start,endExclusive})` addresses *current displayed-row indexes*, inclusive start/exclusive end; bounds clamped or rejected by a documented policy. If rows are offscreen, update no unnecessary DOM now and render correct values when scrolled into view; the same call should not visit server-side unloaded rows.

### Render architecture gate

Current `DataGrid.render()` maps its virtualized visible rows to `renderCell()` for visible columns. A simple `requestUpdate()` therefore risks recalculating **every mounted cell**, even though virtualization prevents creation of the entire 100k-row DOM. B1b must add selective invalidation/caching (or an equivalently bounded render mechanism) with correct invalidation when any of these change: data source, visible row indices, columns/column widths, column visibility/order, selection and focus/ARIA state, theme, row height, scrolling/virtual window, filtered/sorted ordering or scope. Never cache unauthorized data across sites or use a stale index after a reordering.

**Acceptance metric:** instrument `accessor`/`render` callback counts and row element identity. With, say, 100k loaded rows / 200 logical columns but ~15 virtualized visible rows, refreshing one visible row should reevaluate **only that row's visible cells** (or fewer) and retain unaffected row DOM/focus, absent an intentional fallback. A 20-row loaded external-page case must be inexpensive and must not request a server refresh. Benchmark 1, 5 and 50 row keys, a contiguous displayed range, offscreen keys, and an active-filter fallback; capture p50/p95, allocations and first interaction. This is a target, **not a measured claim**.

### Async validation correctness example (illustrative only)

```ts
// Fictional application state: validation is owned by the caller.
const version = new Map<string, number>()
async function checkName(row: { id: string; name: string; validation?: string }) {
  const generation = (version.get(row.id) ?? 0) + 1
  version.set(row.id, generation)
  row.validation = 'validating'
  grid.refreshRow(row.id) // proposed API
  const outcome = await validateNameOnServer(row.name)
  if (version.get(row.id) !== generation) return // older result
  row.validation = outcome.ok ? 'valid' : 'invalid'
  grid.refreshRow(row.id) // proposed API; no query-change
}
```

**Caveat:** if validation mutates a column used in active sort/filter/search, or updates a row identity, call full model refresh (or use the approved model-reconciliation path), not an unchecked render-only invalidation. The grid does not manage network cancellation or authorize validation responses.

### Additional B1b tests and release gates

1. Targeted refresh of one edited visible keyed row; invoke callbacks only for that row's currently visible columns, with **no full source identity scan** on the proven fast path; verify DOM stability of other rows and keyboard focus.
2. Two or more rows and an interval; dedupe overlap, batch a single render, verify boundaries, counts and offscreen behavior. Invalid/duplicate/not-loaded keys never target a different row.
3. Sorting/filtering/search changes and rowKey mutation trigger safe model fallback or explicit rejection, with existing selection, pagination and event semantics; no cross-scope leakage.
4. Async validation renders pending/error/success, ignores stale results at the app boundary, preserves selection and does not trigger a new external query/request identity.
5. React StrictMode, Vue batching, Angular changes, Web Component, Blazor integration: no double refresh, stale ref, hidden copy, or premature refresh; older structural implementations fail clearly if an optional method is absent.
6. Virtualization, A11y/ARIA, screen-reader announcements, focused editing cells and variable row height/column changes invalidate affected visual caches correctly.
7. Verify actual per-row performance and memory behavior against current `main`; no unmeasured O(1) claims. **Production implementation requires its own owner-approved scope and draft PR.**
