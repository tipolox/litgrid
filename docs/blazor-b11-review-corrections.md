# B1.1 review corrections and v1.1.0 QA handoff

Date: **14 October 2026, Asia/Singapore**. Branch:
`feat/blazor-declarative-columns`. Current coordinated versions remain **1.0.3**.
This records the corrections following the independent **APPROVE WITH CHANGES**
review. Historical B1/B1.1 reports and measurements remain unchanged.

## 1. P1: JavaScript partial-failure retry

The old cache advanced only after complete success, but subsequent comparisons
still trusted that cache when setters had already changed the live grid. Reverting
an aria value or declaration mode to the cached value could skip its setter,
leaving the grid/DOM in the failed operation's state. A setter can also modify
configuration before throwing.

The adapter now records fields touched before each potentially mutating setter
or schema operation. Failure makes those fields uncertain and propagates the
original exception. Explicit retry values override the successful snapshot;
omitted uncertain fields recover from that snapshot. Uncertainty survives repeated
failures and clears only after successful repair. Schema, order and persistence
effects are tracked together; declaration-order invalidation remains sticky until
repaired. Config and column metadata snapshots preserve supported mutable values.
Data is not scanned or deep-cloned for comparison. Successful unchanged scalar
operations still skip setters, and partial patches do not retransmit unrelated data.

The review also exposed a related partial mode/namespace edge: a successful
programmatic schema could be followed by a declaration-mode patch that reused an
older declarative schema. Fallback now uses the latest successful schema from
either mode. Omission and explicit-null namespace behavior remain distinct.

The existing .NET partial-field/order retry contract remains in place. JS can
now repair its own partially applied state instead of incorrectly rejecting the
values that .NET sends for retry.

## 2. P1: transactional subscription reconciliation

The old scan subscribed new rows as it encountered them. An exception after a
yielded prefix left handlers and zero-occurrence dictionary entries behind.
Repeated failures could retain different obsolete rows indefinitely.

Reconciliation stages new membership entries without attaching their handlers.
Only a complete enumeration installs new handlers and commits active duplicate
counts. A failed scan removes introduced entries, preserves prior active counts
and subscriptions, and rethrows. Successfully attached new handlers are also
cleaned up if their installation phase fails. Existing safe-event-accessor
requirements remain applicable. Temporary lists contain only introduced/removed
rows; unchanged membership still reuses its table and avoids a full scratch map.

Tests cover prefixes with duplicates, successive distinct failed prefixes, prior
active subscriptions, successful retry, disposal, and weak collectibility while
the tracker/source remain alive. Existing cancellation/disposal and low-allocation
reconciliation coverage passes.

## 3. Before/after evidence

| Regression | Before correction | Final result |
| --- | --- | --- |
| First seven JS retry tests | **7 failed** | Pass within the final 11-test retry file |
| Real Chromium scalar/config/inference/schema/persistence checks | **0/6 pass** | **7/7 pass** in WASM and Server, including the added schema-mode edge |
| Prefix-scan subscription/weak-reference tests | **2 failed**; all five failed-prefix rows remained alive | **2 pass**; new handlers absent and rows collectible |
| Obsolete source overlap | **Failed**: successful cache held the retired source | Pass; retired source collectible, replacement retry adopts current data |
| Old-shaped TypeScript fixture | TS2322: missing both new members | Compile passes |
| Partial programmatic-to-declarative schema transition | **1 failed / 10 passed** | **11/11 pass** |

All logs, source hashes, pre-change bundle/map copies and browser JSON results are
retained in [the review evidence](../packages/grid-blazor/experiments/b11-review/README.md).
The initial default Vitest worker timed out before running tests; the valid
pre-fix reproduction uses the threads pool and records assertion failures.

## 4. P2: obsolete source retention

An earlier operation could finish after a source replacement and restore its
captured source into `synchronizedData`. A failing replacement then left that
obsolete reference retained.

Source/mode generations distinguish parameter changes across awaits, including
A → B → A. Successful operations retain their captured revision/mode/notification
bookkeeping, but install a source reference only when their captured generation
and reference are still current. Otherwise the reference remains null and the
latest source stays pending. The existing semaphore is retained.

The overlap test delays the original refresh, replaces its source, then fails the
replacement. It verifies the retired source is absent from the cache and becomes
collectible after the original operation completes. A second test switches back
to the original reference while the old operation is pending and verifies the
latest row values synchronize without a redundant subsequent update.

## 5. P2: keyboard timing and focus

Virtualization can schedule a later requestAnimationFrame after the current
`updateComplete` boundary. The old test could inspect `aria-activedescendant`
before the expected virtual row/cell was rendered.

The browser runner now uses a **15-second bounded condition wait** for the exact
row/column, active-cell class, matching ARIA descendant, and actual document/shadow
focus. Large-grid cycles scroll the active row out of the DOM, focus the viewport,
then verify Ctrl+Home, End and ArrowDown recovery. Wide-grid checks also verify
the expected final column and focus. Production navigation and virtualization
logic were not changed.

Four fresh full-suite executions pass: **13 scenarios per run**, **80 large-grid
cycles / 240 expected-cell and focus checks**, plus eight wide-grid focus checks.
No intermittent failure appeared in these runs. This is Chromium evidence on
this machine, not a guarantee across browsers, devices or overloaded systems.

## 6. P2: TypeScript compatibility

The only runtime consumers of the two capabilities are the Blazor adapter and
the concrete production component. `DataGridElement.inferColumns` and
`updateColumnSchema` are now additive optional members. An old-shaped structural
implementation remains assignable without implementing them. The concrete
`DataGrid` class retains required boolean/method typing.

The adapter narrows to an internal extended interface after runtime capability
checks. Legacy-only implementations can use ordinary patches; a declaration
request without the required capabilities fails clearly. Other public members
retain their required types. Compiler fixtures verify both old-shape assignment
and required production typing; a runtime test verifies legacy use and explicit
declaration rejection.

## 7. Final product-owner release decision

**Approved target: coordinated LitGrid v1.1.0 across all six public npm packages
and Blazor NuGet.** `DataSyncMode.Automatic` remains the intended Blazor default;
`Legacy` remains the migration path.

The product owner explicitly accepts the breaking Blazor default in this minor
release as a **deliberate semantic-versioning exception**. The compatibility
switch does not make the change non-breaking. Apps that mutate plain lists or
non-notifying rows and rely on parent rerenders are affected; they must use
Legacy, replacement, supported notifications, optional revision or refresh.

Active synchronization/API/guide/package documentation contains migration
warnings, explains the automatic contract and signals, and records this decision.
The earlier major-release recommendation remains in the historical investigation
report. No package version has been bumped.

## 8. Modified file inventory

Production code:

- `packages/grid-blazor/src/gridBindings.ts`
- `packages/grid-blazor/src/Components/DataChangeTracker.cs`
- `packages/grid-blazor/src/Components/DataGrid.razor.cs`
- `packages/grid-web/src/types.ts` (typing only)

Tests/compiler fixtures:

- `packages/grid-blazor/src/partialFailureRetry.test.ts` (new)
- `packages/grid-blazor/tests/DataChangeTrackerTransactionalTests.cs` (new)
- `packages/grid-blazor/tests/ObsoleteSourceRetentionTests.cs` (new)
- `packages/grid-blazor/tests/browser/run.mjs`
- `packages/grid-web/tests/{oldShape.typecheck.ts,tsconfig.compatibility.json}` (new)

Documentation/assets:

- `docs/{blazor-data-synchronization.md,blazor-guide.md,api-reference.md}`
- `packages/grid-blazor/README.md`
- This correction/decision report
- `packages/grid-blazor/src/wwwroot/{litgrid-blazor.js,litgrid-blazor.js.map}`
- New scripts, README and evidence under `experiments/b11-review/`

Pre-existing work outside these corrections remains present. Historical reports
and raw measurements were not rewritten. `.serena/` was untouched.

## 9. Final validation

| Check | Result |
| --- | --- |
| JavaScript | **213 tests / 29 files pass** (202 previous + 11 new) |
| Release .NET | **113 tests pass** (109 previous + 4 new) |
| Old-shape and production typing fixture | Pass |
| Blazor and Web TypeScript checks | Pass |
| Workspace packages and playground build | Pass |
| Release Blazor library, WASM host, Server host, browser host | Pass |
| Existing browser suite | **13 scenarios × 4 fresh runs pass** |
| Final WASM correctness | **7 retry/schema + 58 mode + 13 B1.1 checks pass** |
| Final Interactive Server correctness | **7 retry/schema + 58 mode + 13 B1.1 checks pass** |
| Asset/source-map freshness | Pass; current source, published WASM and served Server verified |
| Version validation | All current package/library versions remain **1.0.3** |
| Git whitespace validation | Pass |

The small mode matrix uses eight starting rows and covers Automatic/Legacy,
observable/list sources, revisions/null transitions, replacement, refresh,
notifications/bursts/background changes, real displayed rows, subscription release
and disposal. Unchanged Automatic operations assert zero enumeration, visits,
transfer and adoption. The preserved B1.1 runner executes its correctness section
with zero performance contexts. Expensive extreme/performance matrices were not
rerun; previous performance evidence remains historical.

## 10. Build and bundle verification

Both workspace builds pass and regenerate the shipping JS/map. Hashes confirm
they differ from the pre-review copies, match the final published WASM artifacts,
and match actual Server HTTP responses. The map contains the current binding
source. Emitted Web declarations expose the optional capabilities correctly.
Final Release .NET builds have zero compiler warnings/errors.

The machine updated SDK 10.0.401 → 10.0.402 during validation. The new targeting
pack was restored using the owner's cache; final .NET tests/builds pass again.
A running test Server initially locked a copy target; stopping it and rebuilding
resolved that failure. The final Release non-AOT WASM publish succeeds and records
the updated SDK's optional wasm-tools/native-optimization warning. These runs
provide correctness evidence; they do not rebaseline optimized performance.

## 11. Compatibility concerns and remaining risks

The approved Blazor default break remains, with a prominent migration warning.
Custom old structural elements support legacy behavior; requesting new declarative
features requires the checked capabilities. Read-only/invalid setters now surface
errors instead of silently claiming synchronization success.

Existing automatic-contract limits remain: explicit signals for unobservable
mutations, notifying reference declared row types, repeatable side-effect-free
enumerables, conventional event senders/safe accessors, and no concurrent
collection mutation during enumeration. Cross-browser/device/screen-reader QA,
actual Server disconnect/WAN checks and a normal release-CI SDK/workload run remain
unverified release QA. Full-dataset update/initial-ingestion costs remain.

## 12. QA readiness and coordinated RC recommendation

The confirmed P1 defects and relevant P2 findings are corrected and covered;
**no confirmed blocking code defect remains**. The implementation is ready for
final release QA. After that QA and coordinated artifact/API review, prepare a
**LitGrid v1.1.0 release candidate** with the migration warning and explicit Legacy
example. Apply the coordinated version change only in the authorized release
step. No commits, pushes, PRs, publication, deployment, B2 work, native templates
or other-repository modifications occurred.
