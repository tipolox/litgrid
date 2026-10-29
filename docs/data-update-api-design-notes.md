# Future data-update API: design notes only

These concepts are not approved contracts and are not implemented in A1.
The goal is the clear separation used by mature grids between repainting a
view and recalculating its data model, while keeping normal immutable framework
inputs automatic and mutable-data compatibility intact.

| Illustrative concept | Purpose and boundary |
| --- | --- |
| `refreshData()` | Re-evaluate the bound local dataset, including complete identity validation and affected transforms. It does not fetch remote results. |
| `refreshRow(rowKey)` | Re-evaluate a uniquely identified local row. A changed key needs an explicit old/new identity policy; invalid or ambiguous keys must not silently target another row. |
| `refreshCells(...)` | Repaint chosen cells when model values/order/membership are already current. It must not conceal stale sorting, filtering, search or pagination. |
| `applyTransaction(...)` | Batch validated additions, updates and removals with an explicit data-ownership contract and one consistent final view. |
| Existing `refreshQuery()` | Emit a new external-query intent. The application still owns fetching, authorization, cancellation and atomic results. Keep this released API distinct. |

Framework-owned arrays should remain the source of truth by default. Immutable
replacement stays automatic; a future explicit refresh can signal mutable edits
without requiring counters. Grid-owned transactions would need an explicit
ownership choice rather than silently mutating React/Vue/Angular inputs. For
framework-owned transactions, define whether the API proposes changes or adopts
an application-produced replacement and how it prevents a later render from
overwriting the transaction.

Stable keys must identify rows across transforms and replacements. Validate
transaction conflicts, duplicates, key changes and removals before committing.
Preserve valid selection, clear it on scope changes, and specify current-page
retention/clamping. Batch events after one consistent result; do not expose
partially updated key indexes, totals or selection.

A changed sort/filter/search value can alter membership and global order.
Refreshing that cell visually is insufficient. Start with a correct full
recalculation fallback, then introduce incremental indexes only where affected
transforms and their costs are proven. Distinguish row-height/column sizing
invalidation from recalculating the data model. Measure large keyed datasets,
transaction bursts, first interaction and retained allocation before promising
targeted-update complexity.

External mode must not reinterpret a local mutation as a server result or
silently apply client sorting/filtering to a remote page. Model refresh concepts
should either reject that mode explicitly or use its released query-intent
boundary. Any optimistic edits or server transactions require a separate
request/conflict design; monotonic identities, scope isolation, late-response
rejection, unknown totals and event ordering remain mandatory.

Introduce any approved APIs additively in a separate milestone with matching
framework methods and clear ownership/error semantics. Preserve legacy mutable
synchronization by default; changing that default would require its own
compatibility decision. A1 does not implement these names, flags or methods.
