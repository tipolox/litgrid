# Milestone A1: adapter synchronization and column state

## 1. Executive summary

This change addresses [#28](https://github.com/tipolox/litgrid/issues/28) and
[#29](https://github.com/tipolox/litgrid/issues/29) together under
[#27](https://github.com/tipolox/litgrid/issues/27). Both problems originate at
the adapter input boundary, so one shared synchronizer is appropriate.

Baseline `main` was fetched and verified as
`6a0df7b01fd3de0b7e7f5dc386de469f3531d210` (v1.2.3). Work was isolated on
`fix/adapter-sync-state-preservation` in a new worktree. Existing worktrees,
experiments, and consuming applications were preserved.

Confirmed defects were page/selection loss on unrelated updates, unsaved
column order/visibility loss, and outgoing widths appearing in an unsaved
storage namespace. The patch preserves valid interaction state, reconciles
actual schemas, batches Vue updates, and avoids React StrictMode effect replay.
No external-query protocol, virtualization algorithm, package version, or
publication behavior changes.

Optional `dataRevision` enables zero row processing on unrelated updates.
Omitting it retains supported mutation-on-synchronization behavior. This
compatibility mode cannot prove arbitrary mutable content unchanged and still
processes rows. The recommendation is **READY WITH LIMITATIONS**.

## 2. Root causes and reproduction

### Issue #28

- React's `gridBindings.ts` reapplied local `columns` and `data` whenever its
  input effect ran, even though configuration and presentation setters already
  had guards. Stable inputs do not run the effect; omitted columns/config
  create new default references and retain the existing parent-update signal.
- Vue registered a separate shallow watcher for each prop. Multiple prop
  changes in one update could invoke the whole binding repeatedly. Each call
  assigned configuration, columns, and local data.
- Angular calls the binding after view initialization and on `ngOnChanges`.
  Its binding likewise assigned every input. Ordinary change detection with
  unchanged inputs does not invoke `ngOnChanges`; that case was already safe.
- Core `setData` reset the page and refreshed transforms. Local `setConfig`
  rebuilt pagination and refreshed transforms even for presentation changes.
  Vue/Angular could therefore transform the same dataset repeatedly per update.

The initial 12 regression tests failed against unchanged baseline code. The
paired Chromium run reproduced page and selection changes in all adapters at
10k, 30k, and 100k rows. It retained filters and DOM focus/active-descendant IDs;
those suspected independent losses were not reproduced. A retained active ID
does not prevent pagination from changing the row underneath it.

### Issue #29

The Web Component's replacement `columns` setter rebuilds source order and
hidden defaults and restores persisted state. Replaying it loses unsaved
order/visibility. Resized widths are held separately and were **not** generally
lost in the no-storage case. A saved, unchanged namespace restored its own
preferences successfully in baseline browser checks.

Changing to an unsaved storage key was different: a failed/empty restore did
not clear outgoing widths. The supplemental Chromium comparison reproduces
this in all three baseline adapters: a 240px width survives into an unsaved
namespace whose default is 160px. The patch resets to target defaults and
restores saved namespaces without copying or writing outgoing preferences.

React's baseline external binding also left a reordered inferred schema stale
after an accepted server result changed the fields. The supplemental browser
case fails on baseline React and passes after accepted-result reconciliation.
Vue/Angular baseline passed that case by replaying their structural setters.

Baseline external parent updates did not reproduce duplicate query events or
request-ID changes in these cases. The controller and protocol remain intact.

## 3. Implementation and compatibility

`grid-web/src/adapters/synchronizeGridInputs.ts` holds the previous synchronized
inputs in a WeakMap keyed by element. All three existing `gridBindings.ts`
modules delegate to it. Configuration uses exported core `normalizeConfig`;
its fixed-size supported values are compared independently of object identity.
Presentation setters run only for changed values. Column snapshots compare
the eight supported fields, including callback identity, without traversing
rows or cells.

Actual schemas use existing `updateColumnSchema(columns, false, storageKey)`.
Its existing rules retain surviving user order/preferences, append new keys,
remove retired keys, apply changed width/hidden defaults, and follow active
column identity. Renames are remove/add operations. Namespace changes install
target defaults before restoring that namespace and perform no switch-only
write. Empty schemas retain inference. Direct replacement `columns` setters
keep their existing behavior.

Inferred shapes are reconciled on accepted row adoption so removing structural
setter replays does not pin an inferred schema after user reordering. Matching
inferred-to-explicit columns retain their preferences. Removed inferred active
columns keep the existing positional clamping contract.

The additive `updateData(rows, preservePage?)` Web Component capability and
optional core `setData` argument retain/clamp pagination during same-reference
adapter refreshes. Direct data assignment and genuine dataset replacement
still reset to page zero. Key validation and active transforms remain intact.
Local configuration changes repaginate the cached transformed view; changing
selection scope clears selection, and changed pagination defaults apply
deliberately. Mode changes retain their existing reset behavior.

Optional `dataRevision: string | number` exists in React props, Vue props and
Angular inputs. Stable data reference + stable supplied revision skips adoption;
array replacement, revision changes, leaving external mode, and returning to
legacy mode synchronize appropriately. Unsignaled mutations in revision mode
are unsupported. Legacy mode still validates offscreen identity mutations.

Vue now schedules one watcher job per update. React guards only replay of the
same effect closure, preserving later mutation signals and fresh mounts.
Selection/query listeners are still subscribed before initial inputs and
removed on teardown. Controlled external state is replayed only on a new state
reference or a controller-resetting mode/selection configuration change.

Older structural `DataGridElement` implementations remain valid: the new
methods are optional, with the prior setter fallback. Their older state
semantics are retained. The generated Blazor JS bundle/source map was rebuilt
because it embeds the shared Web Component/core; no Blazor synchronization API
was changed.

See [the developer contract and examples](adapter-synchronization.md). Guides
and bounded public-contract fixtures include the new input/capabilities.

## 4. Performance

One paired source-development run used the same Windows machine (Ryzen 5
3550H, 8 logical CPUs, 32GB RAM), Node 22.14.0, Chromium 156.0.8078.4, React
19.2.5, Vue 3.5.41, Angular 22.1.3 and Lit 3.3.2. Versions alternated order by
framework. Each page/version was isolated, with GC before workloads and natural
GC during samples. Tests/builds were stopped during timing.

Each workload uses 120 columns with accessors over compact keyed rows, active
sorting/filtering and pagination. There are 30 stable-reference unrelated
updates, 30 fresh-config/column unrelated updates, and 10 each of dataset
replacement, same-reference edit and schema edit: **3,240 timed updates** across
both versions/frameworks/row counts/modes. Latency includes framework flush
and Lit completion, excluding two-frame waits. Percentiles use nearest rank.

100k rows, stable-reference unrelated updates (p50 / p95 milliseconds):

| Adapter | Mode | Baseline | Patched | Transforms across 30 updates |
| --- | --- | ---: | ---: | ---: |
| React | Legacy | 21.80 / 24.60 | 24.40 / 26.20 | 30 → 30 |
| Vue | Legacy | 150.80 / 225.70 | 22.70 / 28.40 | 294 → 30 |
| Angular | Legacy | 35.50 / 49.70 | 26.60 / 36.40 | 60 → 30 |
| React | Revision | 21.80 / 29.80 | 7.40 / 10.30 | 30 → 0 |
| Vue | Revision | 149.50 / 176.50 | 6.30 / 9.90 | 294 → 0 |
| Angular | Revision | 35.50 / 45.10 | 6.50 / 8.40 | 60 → 0 |

The baseline ignores the new revision input. React legacy did not improve in
this run; no speedup is claimed for it. Baseline also loses state, so these
results do not establish equivalent-correctness performance.

Across these 30 legacy updates, measured transform time totals were
408.2 → 428.7ms (React), 4231.2 → 417.6ms (Vue), and 846.2 → 488.2ms (Angular).
All patched unrelated cases invoked zero configuration/column reconciliation
setters; revision cases also invoked zero data adoption methods/transforms.

[Full tables](performance/evidence/adapter-sync/summary.md) include 10k/30k/100k,
fresh references, actual replacements/mutations/schemas, initial mount/first
selection, scroll waits, main-thread task duration and whole-page heap.
[Raw samples](performance/evidence/adapter-sync/browser.json) retain counters
and latency values. Mount/selection/scroll observations are single samples per
workload, not distributions. Heap deltas do not prove retained allocation,
leaks, or memory savings.

## 5. Validation

- JavaScript: **375/375 tests, 48 files**, no failures. This adds 42 tests and
  updates existing React setter expectations while retaining behavioral and
  offscreen duplicate-key mutation assertions.
- Blazor Release: **129/129 tests**, zero skipped/failed; Release build has
  zero warnings/errors.
- All eight package/application builds pass. Final builds also pass under the
  existing Node **22.22.3** runtime required by Angular's engine declaration.
- Five bounded TypeScript gates pass: `node scripts/typecheck-contracts.mjs`
  and `pnpm exec tsc -p packages/grid-web/tests/tsconfig.{compatibility,columnControls,selection,externalQuery}.json --pretty false`.
- Chromium: **18/18 patched local workloads** pass page, selection, column
  state, focus, active cell, filter, mutation, replacement, schema and
  virtualization checks. The 36 total baseline/patched workloads retain
  bounded rendered cells/columns and complete scroll checks.
- External adapter cases pass **3/3 frameworks** (and baseline controls):
  controlled state, unknown totals, monotonic intent identity, unrelated parent
  updates, late-response rejection, search ordering/wording and teardown.
- Supplemental storage/schema Chromium cases pass **3/3 patched frameworks**;
  all three baseline controls reproduce unsaved-namespace width carryover.
- The existing `scripts/external-query-browser-check.mjs` suite passes,
  including DOM `Nor` → `Nort` typing while accepting the prior response,
  visibility/wording/focus, debouncing and large declared totals.

Commands, per-file test counts, initial regression failures, versions and
machine details are in [validation.json](performance/evidence/adapter-sync/validation.json).
Additional browser evidence is in
[behavior.json](performance/evidence/adapter-sync/behavior.json) and
[external-browser.json](performance/evidence/adapter-sync/external-browser.json).

## 6. Risks and deferred work

Legacy implicit mutation support necessarily retains row processing. Explicit
revision mode is required for zero row work; references alone cannot preserve
arbitrary edits and skip validation simultaneously. React legacy showed a
small latency increase in this single run, requiring broader production
profiling before setting a performance budget.

The browser matrix is Chromium and development source adapters, with Angular
JIT/bootstrap and actual change detection. It is not a production packaged
consumer, cross-browser, physical-device, or assistive-technology matrix.
Dense 12-million-property row allocation is not measured. Initial Angular
timings include root bootstrap followed by `setInput`, rather than a parent
template's initial binding. Single-run timing and whole-page heap measurements
have the limits described above.

Saved inferred-column preferences still do not restore on a fresh mount in the
existing Web Component. Both versions are checked explicitly in supplemental
browser evidence. Use explicit column definitions for cross-mount persistence;
this requires a separate inference/persistence lifecycle change.

Selection scopes and column persistence namespaces remain distinct. Consumers
must remove unauthorized columns and choose account/site storage keys where
isolation is required; hiding columns is not authorization. No speculative
protocol/focus/virtualization changes were made. Root TypeScript backlog stays
with #31. No consuming application or website changes, publishing, version
bump, tags, deployment, merge, or manual Actions dispatch are included.

## 7. Pull request

One draft PR from `fix/adapter-sync-state-preservation` to `main`; its URL and
commit are provided in the delivery message. The issues share one input
synchronization implementation, so a split is unnecessary.

## 8. Recommendation

**READY WITH LIMITATIONS.** Confirmed state defects are fixed across all three
frameworks, real browser checks pass, and released query behavior remains
covered. Revision mode provides measured zero-row-work updates; legacy mode
preserves compatibility and must not be advertised as avoiding all row work.
