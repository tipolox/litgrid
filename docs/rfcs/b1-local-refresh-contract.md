# B1 RFC — Local data refresh and targeted update boundaries

> **Status: PROPOSED / DESIGN-ONLY; NOT APPROVED OR IMPLEMENTED.** Issue [#62](https://github.com/tipolox/litgrid/issues/62), parent [#27](https://github.com/tipolox/litgrid/issues/27). Inspected base `main` `861c6a702e4ced1549e0f2fae8507af67e823e68` on 2026-11-03. No shipping API, type declarations, tests, version, packages or runtime code change in this RFC.

## 1. Recommendation

**B1a: design/qualify one explicit full local `refreshData()` capability first. Do not ship `refreshRow`, `refreshCells` or `applyTransaction` in the first implementation.** Their semantics depend on mutable framework input ownership, derived view membership, unique row identity and renderer invalidation. A deceptively fast method that silently leaves search/sort/filter/selection stale is worse than a correct O(n) refresh.

This is intentionally narrower than adding a suite of methods because ordinary immutable array replacement is already supported, and Blazor already implements `RefreshDataAsync()`. Prior A1 experimentation introduced and then removed a shared `dataRevision`/updateData surface; **do not reintroduce it**. Blazor's independently released `DataRevision` is a framework-specific existing feature, not a reason to add a JS prop.

A public API merits implementation only when at least one real consumer use case benefits beyond reassigning `grid.data`. B1a's value is an explicit, portable signal for locally mutable source data in Web/JS wrappers; it **does not** promise sublinear work.

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
| `refreshRow(rowKey)` | Re-evaluate one *uniquely identified* local row | A changed key has no stable target without old-key policy; row may move across filter/sort/page; off-page duplicate invalidation is global | **Defer B1b** |
| `refreshCells(rows?, columns?)` | Presentation repaint | Cannot claim model correctness if a cell affects sort/filter/search or row height; DOM and Core have different responsibilities | **Defer B1b** |
| `applyTransaction({add, update, remove})` | Atomic batch structural changes | Framework vs grid ownership, conflict resolution, duplicate global keys, page/selection, rollback and event ordering | **Defer B1c** |
| Existing `refreshQuery()` | Request another server-side fetch | Monotonic request ID and controlled result protocol; no automatic fetch | **Keep unchanged** |

### Why not start with `refreshRow`?

An update to a value used for sorting/searching/filtering can change the row's position or whether it is displayed. A changed identity can invalidate a key elsewhere, including outside the current page. `refreshRow(rowKey)` cannot truthfully promise only one row scanned under LitGrid's current semantics; it would be a misleading alias for global work until incremental indexes and an explicit old-identity contract exist.

### Why not start with `applyTransaction`?

Current React/Vue/Angular adapters accept **framework-owned** data arrays. A grid-mutating transaction would create two owners; the next framework render could silently overwrite it. Future options to investigate are: (A) a **transaction proposal event** that the framework owner accepts and applies immutably, or (B) explicit *opt-in grid-owned local data* with atomic validation and clear re-adoption rules. Neither is part of B1a.

## 5. Required acceptance tests for a later B1a implementation

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

1. **Approve only B1a `refreshData(): boolean` as an additive shared local API, or stop after this RFC?** No B1b/B1c method is approved here.
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

**Recommendation: B1a as one small, optional full local refresh method; B1b/B1c remain design-only.** This RFC is **not permission to implement**. Review the proposed `boolean` and local↔external lifecycle contract; only after founder acceptance open a **new isolated implementation draft PR**, with failing tests before editing code and no release/merge without explicit authorization.

Keep [#32](https://github.com/tipolox/litgrid/issues/32) (typed columns) as a separate potentially higher-return DX milestone and [#43](https://github.com/tipolox/litgrid/issues/43) (cold keyed startup/real paint) as unresolved independent performance scope. Do not block ordinary releases solely on this speculative API.
