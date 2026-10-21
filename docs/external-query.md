# External queries (Issue #35, proposed v1.2.0)

This additive mode is opt-in with `config.queryMode: 'external'`. Omission or
`'local'` retains the local transform/pagination and adapter mutation contracts.
LitGrid never fetches data.

## Public contract (recorded before implementation)

`externalState: GridExternalState` is one atomic controlled input on the Web
Component and adapters. It contains `requestId`, `query`, `rows`, `total`,
`loading`, and `error`. `query` contains `search`, `filters`, `sort`, `pageIndex`
(zero based), and `pageSize`. `total` is either
`{ kind: 'known', totalRows: 352 }` or `{ kind: 'unknown', hasMore: true }`.
Rows are the authorized server page in server order, never transformed or sliced
again. The legacy `data` input is ignored in external mode. Use immutable
external-state replacements, including for row changes; no deep row comparisons
or same-reference mutation detection is promised for this new input.

`query-change` / React `onQueryChange` emits a detached `GridQueryChangeDetail`
containing `query`, monotonically increasing numeric `requestId`, and `reason`
(`search`, `filter`, `sort`, `page`, `page-size`, `refresh`). UI and imperative
query operations share this path. Search/filter/sort/page-size changes reset to
page index 0; no-ops emit nothing. `refreshQuery()` explicitly requests the same
page again. `getQuery()` returns the current query and request identity.

Before emitting, the grid commits query state, clears displayed rows/selection,
and marks loading. Synchronous `selection-change` precedes `query-change` when
selection actually changes. Render follows asynchronously. Controlled inputs
never emit query intents. Listeners may synchronously commit a response.
Reentrant query intents are queued until the current notification finishes, so
all subscribers observe the same identity order. A result commit attempted from
inside a synchronous selection notification returns false; commit results from
the query callback or subsequent application work instead.

`setExternalState(state): boolean` atomically validates and commits a response;
the property setter uses the same guard. Lower request IDs are rejected. The
current ID must carry exactly the current query; a greater ID can establish a
new controlled query without an event. IDs are safe nonnegative integers and
must remain monotonic for the mounted grid, including scope changes and mode
transitions. Do not reuse an ID for multiple asynchronous attempts: use refresh.
After a settled success/error, further results with that same ID are rejected;
loading updates may precede one terminal response. Reassignment of the same
object is a no-op. Malformed states throw before modifying grid state.

Mode/scope/row-key transitions clear the external result and invalidate the old
request identity. Read `getQuery()` or allocate a larger application ID before
committing the new scope. Scope is application state, never inferred from rows.

## Totals and statuses

Known totals drive truthful page counts (352 / 20 = 18). Unknown totals use only
Previous and Next (`hasMore`) and show `Page N` and `Total unknown`. Existing
numeric pagination APIs use the explicit sentinel **-1** for unknown `totalRows`
and `pageCount`, with additive `totalKnown: false` and `hasMore`; local results
keep their existing shape. `getTotalRowCount()` likewise returns -1 when unknown.
Never infer server totals from page length.

Loading and error states display no rows, an accessible status/alert, and
`aria-busy` while loading. An empty successful page says no rows; an exact zero
total says no results. A known out-of-range controlled page stays at the requested
index, shows an explicit status, and offers Previous; it never silently relabels
rows or requests a different page. Applications may commit a corrected query
with a greater ID. Overfull or contradictory server pages are rejected.

## Imperative and framework behavior

`setQuickSearch`, `clearQuickSearch`, `setFilter`, `clearFilter`, `sortBy`,
`clearSort`, `setPage`, `setPageSize`, and `refreshQuery` request external work.
`sortable: false` / `filterable: false` continue to suppress corresponding UI
actions; imperative calls remain explicit application intent. Monetary filter
strings pass through unchanged; exact comparison and allowed operators belong
to the server. Query filters support JSON scalar values, not executable objects.

React subscribes before initial synchronization, uses committed callback refs,
and synchronizes external state by reference. Theme/ARIA/callback changes do not
reassign page data. Local mode's legacy same-reference data/column synchronization
is preserved. In external mode replace external-state/column references to signal
updates. In Next.js use a client component; do not import the custom element in
a server component. Vue/Angular/Blazor forward the same contract where supported.

## Concurrency and security responsibilities

The application owns AbortController cancellation, BFF requests, tenant/account/
site scope, allowlisted columns/operators, authorization, and `cache: 'no-store'`.
Abort previous work and retain a consumer commit guard in addition to the grid's
request-ID guard (especially across unmount/remount). Capture scope and identity
before awaiting, and recheck both and authorization after asynchronous work.
The BFF must authorize every request and recheck before returning sensitive data.
Never put authorization decisions in grid filters or selection. Selection only
references supplied displayed rows; `rowKey` and `scopeKey` retain #36 semantics.

## React and Next.js example

In a Next.js client boundary, load the adapter on the client (its registration
uses browser custom-element globals):

```tsx
'use client'
import dynamic from 'next/dynamic'
import type { GridQueryChangeDetail } from '@tipolox/litgrid-react'
const DataGrid = dynamic(
  () => import('@tipolox/litgrid-react').then(module => module.DataGrid),
  { ssr: false }
)
```

The following is the query handler portion of a client component. Initialize
`externalState` from an authorized initial response, with `requestId: 1` and a
full query. Fetch that first response in application code; controlled initialization
does not emit an intent. Here `currentScope` is an application-owned ref; scope
includes tenant/account/site and changes invalidate `active` and abort work.

```tsx
const onQueryChange = async ({ requestId, query }: GridQueryChangeDetail) => {
  active.current?.controller.abort()
  const controller = new AbortController()
  const scope = currentScope.current
  const attempt = { requestId, scope, controller }
  active.current = attempt
  const stillCurrent = () => active.current === attempt &&
    currentScope.current === scope && !controller.signal.aborted
  try {
    const response = await fetch('/api/property-query', {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, scope })
    })
    if (!response.ok) throw new Error('Unable to load properties.')
    const result = await response.json() // validate the BFF response at this boundary
    if (!stillCurrent()) return
    setExternalState({ requestId, query, rows: result.rows, total: result.total })
  } catch (error) {
    if (!stillCurrent()) return
    setExternalState({ requestId, query, rows: [],
      total: { kind: 'unknown', hasMore: false }, error: 'Unable to load properties.' })
  }
}

return <DataGrid data={[]} config={{ queryMode: 'external',
  selection: { mode: 'row', rowKey: 'id', scopeKey } }}
  columns={[{ key: 'name' }, { key: 'amount' }]}
  externalState={externalState} onQueryChange={onQueryChange} />
```

The BFF must derive/authorize scope from the authenticated session, allowlist
query fields/operators, perform exact decimal comparisons, and recheck access
after async operations. Client scope input is not authorization. Abort and clear
`active` on unmount. On scope changes, also clear detail/selection application
state; either remount the grid with `key={scopeKey}` and a fresh scoped initial
state, or keep IDs monotonic and establish the new scope with a greater ID after
the configuration transition. A component remount creates a new request-ID space,
so the consumer guard remains mandatory.

Web Component applications use the same `externalState` property and
`addEventListener('query-change', event => handle(event.detail))`.
`setExternalState` returns false for stale, duplicate, or query-mismatched results;
it throws `TypeError` for malformed current/new states. Unknown forward page jumps
are limited to the next page with `hasMore`; Previous can return to an earlier
index. Known totals allow direct page requests within the exact bounds.

Vue uses `:external-state` / `@query-change`; Angular uses `[externalState]` /
`(queryChange)`. Their instances expose the query methods listed above. Blazor
uses `ExternalState="..."`, `Config.QueryMode = "external"`, and `OnQueryChange`;
models are `GridExternalState<TItem>`, `GridQuery`, `GridExternalTotal`, and
`GridQueryChangeDetail`. Use `GetQueryAsync`, `SetExternalStateAsync`,
`RefreshQueryAsync`, `SortByAsync` and `ClearSortAsync` for imperative coordination.
The Blazor `TotalRows`/`TotalPages` unknown sentinel is also -1, with nullable
`TotalKnown`/`HasMore` populated for external results. Blazor request IDs must fit
JavaScript's safe integer range. Mutating an existing external-state instance is
unsupported; replace it, including its rows when refreshing.

See [validation evidence](external-query-validation.md) for browser, framework,
typecheck and performance results. This proposed API has not been released.
