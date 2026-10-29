# Milestone A1: adapter synchronization and column state

## Executive summary

A1 addresses [#28](https://github.com/tipolox/litgrid/issues/28) and
[#29](https://github.com/tipolox/litgrid/issues/29), under
[#27](https://github.com/tipolox/litgrid/issues/27), in the existing feature
worktree and [draft PR #55](https://github.com/tipolox/litgrid/pull/55).
Baseline main was fetched and verified as v1.2.3 commit
`6a0df7b01fd3de0b7e7f5dc386de469f3531d210`.

The final architectural decision preserves the released public API. The
exploratory revision input, public local-data update method, synchronization
helper export, normalizer export and core synchronization argument were
removed. No replacement refresh/transaction API or public flag is introduced.
Existing `refreshQuery()` remains intact.

Confirmed pagination/selection loss, unsaved column order/visibility loss,
namespace width carryover, stale React external inferred schemas and numeric
scope resets are corrected. Structural/presentation setters are guarded, Vue
updates are batched, and React StrictMode does not replay the same adoption.
Supported mutable-data synchronization still validates keys and processes rows.

## Root cause and reproduction

### Issue #28

React reapplied local columns and data whenever its input effect ran, although
configuration/presentation setters already had guards. Stable explicit inputs
did not run that effect; fresh default columns/configuration retained the
existing parent-update mutation opportunity.

Vue registered a shallow watcher for each prop, so one reactive update could
run the whole binding repeatedly. Angular ran its whole binding after view
initialization and on input changes. Ordinary Angular change detection with
unchanged inputs was already safe. Both bindings assigned configuration,
columns and local data on each call.

Core `setData` reset pagination on every assignment, including the same source.
Local `setConfig` rebuilt pagination and transformed rows even for presentation
changes. Vue/Angular therefore repeated transforms unnecessarily, while data
replays could move the page and invalidate displayed selection.

The initial 12 regression cases failed before implementation. Chromium
reproduces baseline page/selection loss at 10k/30k/100k rows. Baseline retained
filters and DOM focus/active-descendant IDs in those cases: an independent
focus-loss defect was not reproduced. Keeping an active ID does not prevent
the old pagination reset from changing the row underneath it.

Two additional failing core regressions established that an unchanged `NaN`
scope was treated as different: a search-label change advanced the external
request ID, and a local refresh emitted an unchanged selection snapshot.
Core scope comparison now treats repeated `NaN` as stable, distinguishes
infinities, and retains the released signed-zero equality semantics. No query
wire format or intent protocol changes.

### Issue #29

The replacement `columns` setter rebuilds order/hidden defaults and restores
saved state. Replaying it loses unsaved order and visibility; widths are stored
separately and were not generally lost without storage. A saved unchanged
namespace restored its preferences successfully in baseline browser checks.

Switching to an unsaved namespace did not clear outgoing widths when restoration
found no saved state. All three baseline adapters carry a 240px width into a
namespace whose default is 160px. Patched adapters install target defaults and
restore its own saved state without copying/writing outgoing preferences.

React's baseline external binding also leaves reordered inferred columns stale
when an accepted result changes fields. Vue/Angular avoid that case by replaying
their structural setters. Accepted-result reconciliation now handles it directly.

## Implementation

- The three existing `gridBindings.ts` modules retain their package boundaries
  and local snapshots; no new public shared helper or internal package entry
  point is needed. Each implements the same tested contract. Fixed-size value
  snapshots normalize configuration defaults and use `Object.is`, without JSON
  equality, deep row comparisons or array hashing. Cross-adapter tests cover
  default normalization, numeric edges, changes and replacements.
- Supported column fields are snapshotted shallowly, including callback identity
  and same-array edits. Genuine changes use existing
  `updateColumnSchema(columns, false, storageKey)`; equivalent replacements and
  unrelated updates do not replay the schema.
- `DataGrid.ts` reconciles inferred shapes on local data adoption and accepted
  external results, using the existing column-state model. Surviving keys retain
  preferences, removed keys disappear, inferred-to-explicit matches retain
  state, and stale external results cannot change the schema.
- Existing core `setData(data)` now retains/clamps pagination when the source
  array is identical; replacement arrays still reset to page zero. Every call
  still validates all identities and runs active transforms. This is the
  intentional correction to the old reset behavior, not a new synchronization
  argument or an assumption that same-reference contents are unchanged.
- Local configuration changes reuse the transformed view and apply genuine
  pagination defaults deliberately. Scope/mode/key changes keep selection and
  query invalidation ordering. Repeated `NaN` scopes no longer cause spurious
  resets/notifications; signed zero retains existing core scope semantics.
- Vue watches the prop sources as one scheduled job. React guards replay of
  the same effect closure. Initial query/selection subscriptions precede inputs
  and teardown removes them. Angular's input/view lifecycle stays unchanged.
- The Blazor embedded JS/source map is regenerated for shared Web Component/core
  changes. No C# synchronization or consuming-application code is changed.

## Performance

Only existing public inputs are benchmarked; there is no opt-in optimization
mechanism. The same Windows machine (Ryzen 5 3550H, 8 logical CPUs, 32GB RAM),
Node 22.14.0, Chromium 156.0.8078.4 and pinned dependencies serve both versions.
Framework versions are React 19.2.5, Vue 3.5.41, Angular 22.1.3 and Lit 3.3.2.

Each of 18 baseline/patched workloads uses 10k/30k/100k rows and 120 accessor
columns with active filters/sorting/pagination. Unchanged parent updates and
unrelated updates with stable/fresh references have 30 samples each. Genuine
configuration changes, replacements, same-reference edits and schema edits
have 10 each: **2,340 timed updates**. Event-loop yields and fixture construction
are outside update timers. Tests/builds are stopped during timing. p50/p95 use
nearest rank and include framework flush plus Lit completion.

100k rows, p50 / p95 milliseconds (30 unrelated samples and 10 configuration samples per version):

| Adapter | Operation | Baseline | Patched | Transforms before → after |
| --- | --- | ---: | ---: | ---: |
| react | Unrelated | 38.00 / 81.70 | 32.80 / 40.30 | 30 → 30 |
| react | Configuration | 52.90 / 67.70 | 19.60 / 25.70 | 20 → 10 |
| vue | Unrelated | 153.70 / 266.00 | 26.70 / 38.00 | 294 → 30 |
| vue | Configuration | 31.90 / 44.20 | 17.90 / 25.90 | 20 → 10 |
| angular | Unrelated | 36.50 / 61.80 | 39.30 / 55.40 | 60 → 30 |
| angular | Configuration | 34.30 / 94.00 | 27.90 / 31.00 | 20 → 10 |

Angular's unrelated-update median was higher in this run despite reduced
structural/transform work; no universal latency speedup is claimed. Sample
sizes and natural GC/scheduling remain visible in the full evidence.

Unchanged stable inputs invoke zero row/structural setters in both versions.
All patched unrelated-update workloads invoke zero configuration/column-schema
setters. Their local data setters and transforms still run once per existing
synchronization opportunity to preserve mutation compatibility.

[Complete tables](performance/evidence/adapter-sync/summary.md) include all row
counts/operations, setter counts, transform totals, mount/first selection,
scroll waits, CDP task duration, PerformanceObserver long tasks and whole-page
heap. [Raw samples](performance/evidence/adapter-sync/browser.json) retain every
latency and counter. Baseline loses state, so timing does not establish
equivalent-correctness performance. Single workload observations and heap
deltas do not establish production budgets, retained allocation or memory savings.

## Tests and validation

- **378/378 JavaScript tests, 49 files**, including existing offscreen identity
  mutation checks and focused lifecycle/state coverage across all adapters.
- **129/129 Blazor Release tests**, none skipped, on the final run. One initial
  run failed the unchanged
  `FrameworkTimeoutReleasesGateAndQueuedRefreshRetriesLatestValues(Automatic)`
  test with a completed `TaskCompletionSource` error. Its two targeted cases and
  subsequent full runs passed. That failure is retained in the evidence; no
  unrelated C# timing-test change is made.
- All eight package/application builds pass under supported Node **22.22.3**;
  Blazor Release build has zero warnings/errors.
- All five bounded TypeScript gates pass: `node scripts/typecheck-contracts.mjs`
  and `pnpm exec tsc -p packages/grid-web/tests/tsconfig.{compatibility,columnControls,selection,externalQuery}.json --pretty false`.
  Type fixtures assert that revision inputs/new local refresh methods/core flags
  are unavailable. The published entry points and structural input types are
  unchanged from v1.2.3.
- Chromium: **9/9 patched local workloads** pass unchanged-input, configuration,
  pagination, selection, columns, focus, active-cell, mutation, replacement,
  schema and virtualization checks. There are 18 total baseline/patched controls.
- All three patched adapters pass controlled-query and storage/schema cases,
  including stable numeric scopes, late rejection, inferred schemas, event
  ordering and teardown. Baseline ordinary unrelated updates did not reproduce
  duplicate query intents; its numeric-scope configuration defect is recorded.
- The released external-query browser suite passes, including loading/error
  presentation, known/unknown totals, search wording/visibility, debouncing,
  focus and the DOM `Nor` → `Nort` typing race.

[validation.json](performance/evidence/adapter-sync/validation.json) records
commands, counts, failures, versions and machine details. Supplemental evidence:
[behavior.json](performance/evidence/adapter-sync/behavior.json) and
[external-browser.json](performance/evidence/adapter-sync/external-browser.json).

## Compatibility assessment and limits

The API shape remains unchanged. Immutable replacements synchronize normally.
Legacy same-reference mutations still process whenever the framework invokes
its existing synchronization path; identities are never trusted solely by
reference. Only the undesired same-source page reset changes intentionally.
Use existing `setPage(0)` for an explicit reset.

Unchanged explicit inputs avoid synchronization, but arbitrary mutable edits
cannot be detected while also skipping all row inspection. Unrelated prop
changes can therefore still incur identity checks and active transforms. This
unavoidable cost is measured, not hidden behind an unsupported immutability
assumption. No guaranteed zero-cost mutable-data updates are advertised.

Selection mode/key/scope invalidation occurs before incoming rows. Controlled
external states still obey monotonic request IDs, atomic acceptance and stale
rejection, including loading/error states and unknown totals. No implicit
network fetching is added; existing `refreshQuery()` stays distinct.

Surviving explicit columns retain user order/width/visibility; additions append,
removals/renames prune preferences, and changed width/hidden defaults override
the corresponding preference. Namespace switches restore target preferences or
defaults without contamination. Use distinct account/site storage keys and
remove unauthorized columns; hiding columns is not authorization.

Saved inferred preferences still do not restore on a fresh mount in either
version. Use explicit schemas for cross-mount persistence. This existing
inference/persistence lifecycle limitation is recorded rather than expanded
into another architecture change.

The browser matrix is one final paired development-source Chromium run. Angular
uses real JIT bootstrap, input changes, outputs and change detection; initial
timings include root bootstrap followed by `setInput`. Production packaged
consumers, cross-browser/devices and dense 12-million-field allocation are not
established by this matrix. Root TypeScript backlog stays under #31.

## Deferred data-update API

[Design notes only](data-update-api-design-notes.md) evaluate local dataset
refresh, identified-row reevaluation, visual cell refresh and transactions,
separately from released external `refreshQuery()`. Recommendations define
ownership, key validation, batch atomicity, selection/page preservation and
transform invalidation before incremental optimization. A sorted/filtered value
change may require broader model recalculation rather than a repaint. No such
APIs are implemented in A1.

## Pull request

Continue [draft PR #55](https://github.com/tipolox/litgrid/pull/55) on
`fix/adapter-sync-state-preservation` against `main`. The final commit SHA is
provided in the delivery message. The fixes share the adapter input/state
boundary; no second competing implementation or PR is needed.

## Final recommendation

**READY WITH LIMITATIONS.** Supported state behavior is corrected consistently,
default-use measurements show where redundant work falls, and validation passes.
Legacy row-processing costs, existing inferred cold-mount persistence and the
single-run browser/performance scope remain explicit. No package versions,
publication, tags, deployment, merge or manual Actions dispatch are included.
