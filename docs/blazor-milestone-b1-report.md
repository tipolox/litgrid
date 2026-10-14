# Milestone B1: efficient Blazor data synchronization

Date: **13 October 2026 (Asia/Singapore)**. Repository: `D:\Work\litgrid-clean`.
Branch: `feat/blazor-declarative-columns`; baseline commit
`fb6a9cf69383ac452a5bbb16b896ec07ec3f63d9`. Package versions remain **1.0.3**;
the intended future release is 1.1.0. B1 is implemented and validated locally.
B2 was not started. Nothing was committed, pushed, or published to a service.

## 1. Architecture

The existing component synchronization semaphore, render-complete schema capture,
module ownership, lifetime cancellation, disposal, and declaration registry remain
in use. The engine and virtualization implementation are unchanged.

Synchronization now has independent successful state for:

- **Data:** source identity and nullable revision, advanced only after successful
  interop. Null revisions retain parent-update mutation synchronization.
- **Columns:** immutable supported-value snapshots of declarative or programmatic
  keys, titles/headers, numeric/string widths, visibility, and declaration order.
  Mutable lists and `GridColumn` instances are inspected, not compared by identity.
- **Configuration:** copies of supported nested `GridConfig` values, plus scalar
  parameter snapshots. Changed fields alone enter the interop payload.

Unchanged versioned renders issue no synchronization interop. Independent updates
send partial dictionaries. The adapter preserves omitted mode/persistence values,
distinguishes omission from explicit null, and avoids repeated scalar assignments.
Its successful comparison cache is copied before updates and installed only when
the operation finishes successfully.

Each operation records its captured values, never live properties read after an
await. New renders remain pending behind the existing gate. Failed payload fields
remain pending even if later parameters revert to their last successful values:
JavaScript may have applied earlier fields before a later setter failed. A failed
declaration-order update also retains its order invalidation for retry. No new
concurrency framework, custom serializer, or cooperative ingestion path was added.

## 2. Public API additions

`DataRevision: long?` is an optional `[Parameter]`, default null. The caller owns
the token. Non-null unchanged revision **and** unchanged `Data` identity skip all
dataset work. Different revision, different reference, and either null/non-null
transition synchronize. Comparison uses equality, not greater-than ordering.
Incrementing after mutations is the recommended usage.

`RefreshDataAsync(): ValueTask` forces row synchronization through the same gate,
including when identity/revision match. It uses the component dispatcher, checks
mount/disposal availability, honors lifetime cancellation, propagates unexpected
failures, and retains failed refreshes for a subsequent render/refresh. It does
not force unchanged columns/configuration. It does not guarantee browser paint
completion. Before initialization or after disposal it throws the existing
unavailable-component `InvalidOperationException`.

The internal JS-facing API also exports additive `BlazorGridInputPatch`, allowing
partial inputs while preserving the existing full `BlazorGridInputs` type.
See [the contract and Razor example](blazor-data-synchronization.md).

## 3. Backward compatibility

Omitting the revision keeps same-reference row edits and collection changes on
parent updates. A mutation alone does not schedule a render. Revision mode is
explicitly opt-in; reference-only comparison is not the default. Explicit refresh
followed by a separate legacy parent update may transfer twice, as documented.

Declarative registration, typed fields, dynamic schemas, customizations, atomic
schema/persistence namespace reconciliation, inference, programmatic mutation,
keyboard behavior, accessibility, and cancellation remain covered. The original
13-scenario browser suite passes against the final wrapper, including real JSON
names/attributes, filtering/sorting, customization, persistence, large rows/wide
columns, keyboard navigation, and delayed-import disposal/remount.

## 4. Synchronization behavior and counts

Counts below are per successful operation in the primary fixture phase; they
were asserted in both published WASM and Interactive Server.

| Operation | Legacy row transfer/adoption | Versioned row transfer/adoption | Versioned production interop |
| --- | ---: | ---: | ---: |
| Initial mount | 1 / 1 | 1 / 1 | 2: import + init |
| Unchanged parent update | 1 / 1 | **0 / 0** | **0** |
| Item mutation, changed revision | 1 / 1 | 1 / 1 | 1 |
| Collection mutation, changed revision | 1 / 1 | 1 / 1 | 1 |
| New reference, same revision | 1 / 1 | 1 / 1 | 1 |
| Programmatic column change | 1 / 1 | **0 / 0** | 1, columns only |
| Configuration change | 1 / 1 | **0 / 0** | 1, configuration only |
| Scalar or persistence-key change | 1 / 1 | **0 / 0** | 1, changed scalar only |
| Same-reference edit without revision change | 1 / 1 | **0 / 0** | **0** |
| Explicit refresh | 1 / 1 | 1 / 1 | 1, rows only |
| Null/non-null transition | 1 / 1 | 1 / 1 | 1 |
| Declarative child-only schema change | **0 / 0** | **0 / 0** | 1, schema only |

Versioned unchanged/independent updates recorded **zero dataset enumerations and
row visits**, as well as zero transfers/adoptions. Unchanged columns/configuration
were omitted from actual payloads. Dataset adoption was observed at the production
grid's `data` setter. No changed-data path uses a replacement serializer.

## 5. Published non-AOT before/after measurements

The baseline is the actual original production wrapper and shipping bundle, copied
to an isolated ignored library without reverting the working implementation.
Both hosts are independently published Release, partial-trimmed, .NET **8.0.31**,
SDK **10.0.401**, `RunAOTCompilation=false`, `WasmBuildNative=false`.
Their `dotnet.native.wasm` SHA-256 hashes match. Chromium **156.0.8078.4**, Windows,
1280 x 900, external Playwright. These are local single-machine observations.

Fixtures use the original ordinary `AccountRow10` models with Unicode, dates,
nulls, decimal/double values, enums, and `JsonPropertyName`. An instrumented
`IEnumerable<T>` observes actual serializer traversal without pre-serializing.
Test-host model metadata is explicitly preserved for trimming, not a claim that
arbitrary consumer models require no trimming validation.

Three independent contexts per fixture/mode/variant. Boot and model preparation
are excluded. The JS module is preloaded; component import/init and first managed
serializer use are included in initial mount. Completion includes component sync,
Lit `updateComplete`, and two animation frames. No builds/other browser suites ran
during timed sampling. Baseline and after matrices ran sequentially rather than
alternating: machine drift and order effects are limitations. Most cells have
three samples; primary unchanged updates have six. Tail guarantees are not claimed.

The baseline's requested-versioned sessions use its original legacy behavior;
`supportsRevision=false`. The following table compares those matched action
sequences with the new opt-in mode. All values are median milliseconds.

| Workload/action | A before | A versioned after | B before | B versioned after |
| --- | ---: | ---: | ---: | ---: |
| Initial mount | 490.9 | 513.4 | 1,188.3 | 1,210.9 |
| Unchanged parent update | 106.0 | **15.9** | 567.5 | **16.4** |
| Same-reference item + revision | 96.2 | 179.1 | 500.1 | 618.8 |
| Same-reference collection + revision | 95.6 | 130.1 | 566.2 | 519.2 |
| Reference replacement | 146.4 | 98.4 | 592.4 | 548.5 |
| Column-only parent change | 80.1 | **14.3** | 496.1 | **16.4** |
| Configuration-only change | 96.0 | **30.0** | 486.5 | **18.1** |
| Scalar-only change | 99.9 | **16.7** | 516.5 | **17.5** |
| Persistence namespace change | 80.2 | **16.7** | 482.9 | **16.3** |
| Forced refresh / baseline parent refresh | 67.3 | 118.1 | 501.3 | 584.8 |

**Repeated synchronization improved; changed-data ingestion is not a throughput
optimization.** Some changed-data samples are slower, others faster. Small cells,
runtime warmup, and machine variability prevent attributing those differences to
an ingestion improvement or a stable regression. Data transfer is still ordinary
full-enumerable JSON. B1 makes no universally faster changed-data claim.

Pooling the six initial mounts across requested modes gives A **492.4 -> 518.0 ms
(+5.2%)**, B **1,179.2 -> 1,186.3 ms (+0.6%)**: no material median initial-loading
regression in this sample, and no initial-loading improvement claim. Initial
timer-gap outliers remain substantial.

Legacy primary unchanged updates were A **116.1 -> 124.5 ms**, B
**549.2 -> 522.4 ms**. Both still transfer/adopt once on every update. **The default
mode's repeated full-dataset cost remains unresolved.**

## 6. Managed activity and dataset totals

| Primary unchanged update | A baseline / versioned after | B baseline / versioned after |
| --- | ---: | ---: |
| Dataset enumerations | 1 / **0** | 1 / **0** |
| Serialized row visits | 1,000 / **0** | 10,000 / **0** |
| Transfers / adoptions | 1 / **0**, each | 1 / **0**, each |
| Production interop calls | 1 / **0** | 1 / **0** |
| Median cumulative managed allocated bytes | 616,428 / 8,792 | 6,138,392 / 8,792 |

Allocations include normal framework and fixture activity; they are not serializer
CPU, retained heap, or peak memory. Exact exclusive managed serialization elapsed
time is not available at this public interop boundary. Enumeration/row visits and
payload absence establish whether dataset serialization occurred. No duplicate
serializer probe was inserted into the timed path.

Each final WASM matrix has **192 synchronization observations + 12 scrolling
observations = 204 records**. Before: **192 transfers/adoptions**. After:
**138 transfers/adoptions**, including explicit null/versioned transition phases.
In the primary requested-versioned phases alone, transfers fell **72 -> 30**;
the primary legacy phases remained **72 -> 72**. Transition observations are kept
separate from unchanged-mode summaries. Server has **64 sync + 4 scroll = 68
records**, with **46 transfers/adoptions**. All transfer/adoption and enumeration
counts agree, and all semantic assertions pass.

## 7. Browser responsiveness and scrolling

A 10 ms heartbeat records maximum timer gaps, including callback scheduling.
Long Task observations are retained in the raw files. Maximum gaps below refer
to the matched primary requested-versioned observations, in milliseconds.

| Action | A before / after | B before / after |
| --- | ---: | ---: |
| Initial mount | 770.6 / 521.9 | 1,257.1 / **1,712.7** |
| Unchanged parent update | 180.7 / **14.7** | 610.1 / **30.2** |
| Column change | 79.6 / **11.3** | 489.1 / **25.7** |
| Configuration change | 82.5 / **16.5** | 493.5 / **26.2** |
| Scalar change | 85.5 / **18.4** | 500.5 / **25.7** |
| Forced refresh | 69.5 / 105.0 | 514.3 / 680.6 |

Initial loading/refresh can still block the WASM main thread. B1 does not provide
cooperative scheduling or meet a general initial-ingestion responsiveness budget.

Ten scrolling steps per context retained bounded DOM rows (25 in these samples)
and zero data adoption. Across both modes, maximum observed scroll gaps were
A **64.1 -> 75.7 ms**, B **63.1 -> 70.4 ms**. The same renderer/scroll path is used,
and functional virtualization/keyboard tests pass. This checks isolation and
bounded rendering, not a statistically established FPS or real-device guarantee.

## 8. Tests and validation

| Final check | Result |
| --- | --- |
| Workspace JavaScript tests | **200 tests, 28 files, pass** (195 existing + 5 new) |
| Release .NET tests | **87 tests, pass**, zero compilation warnings/errors (68 existing + 19 new) |
| Existing real-WASM Chromium suite | **13 scenarios pass** against final wrapper |
| Additional published-WASM B1 lifecycle/schema suite | **5 scenarios pass** |
| Additional Interactive Server B1 lifecycle/schema suite | **5 scenarios pass** |
| Final published-WASM matrices | **204 before + 204 after observations pass** |
| Interactive Server matrix | **68 observations pass** |
| Blazor TypeScript check | Pass from workspace root with `--rootDir .` |
| Version validation | All package/library versions remain **1.0.3** |
| Git whitespace check | Pass; ordinary CRLF conversion notices only |

New .NET coverage includes initial/no-op behavior, legacy/versioned mutations,
reference replacement, both revision transitions, refresh, failure retry,
partial-failure parameter reversion, overlapping updates, snapshot safety,
disposal, independent configuration/columns, and child-only/namespace changes.
Existing tests cover initialization/import failure and persistence/lifecycle
cleanup. New JS tests exercise partial inputs, omitted versus null namespaces,
customization/navigation preservation, atomic schema/key changes, and setter retry.

New browser correctness checks exercise child-only declarative changes, A/B/A
persistence, a real throwing JS data setter and refresh retry, rapid revisions,
and disposal/remount during a test-delayed synchronization. Server uses a
test-only runtime-observing subclass while inheriting all production rendering,
sync, APIs, and disposal; the circuit's own runtime is unchanged.

Earlier execution notes are retained: initial test fixture injection failed before
being corrected; the intermediate .NET suites then passed 80 and 83 tests before
the final 87-test suite. The first existing browser run reproduced the previously
documented intermittent large-grid keyboard assertion; a retry and the final run
passed all 13. No production keyboard change was made to hide it. Initial browser
launch selected an unavailable binary; the existing launch shim selected installed
Chromium. Initial B1 harness runs had literal scalar/namespace bindings and an
extra legacy render after refresh; corrected final comparisons exclude them.
The first Server instrumentation replaced a circuit-required runtime and timed
out; the corrected test-only observation approach passes.

## 9. Builds and artifacts

Workspace packages/playground build successfully, including regenerated shipping
Blazor JS and source map. Windows Node prebuild cleanup repeatedly failed with
`ENOTEMPTY`/`EPERM` in generated directories. Existing outputs were preserved in
`.private/b1-generated-backup`; directory/license preparation used native
PowerShell, followed by `pnpm --config.enable-pre-post-scripts=false build`.
No source/build-script changes were made for this environment workaround.

Release library, existing WASM browser host, B1 WASM host, and Interactive Server
host builds pass with **zero compiler warnings/errors**. Published final non-AOT
WASM artifacts succeed. The original baseline emits its existing nullable
`CS8604` warning; final production builds do not. SDK target failures from pinning
the runtime during restore are preserved; successful publishes restore using the
SDK build pack, then pin runtime during publish with isolated intermediates.
No AOT build was needed for B1. No NuGet package was published.

Shipping JS matches the final benchmark artifact byte-for-byte. Versions are
unchanged. Existing experiments/reports/raw measurements and the two original
browser-host changes were preserved. `.serena/` was left untouched.
Website/demo repositories were not modified.

## 10. Evidence and known limits

All new evidence is under
[`experiments/b1-synchronization`](../packages/grid-blazor/experiments/b1-synchronization/README.md):

- [`baseline-final-results.json`](../packages/grid-blazor/experiments/b1-synchronization/baseline-final-results.json)
- [`complete-results.json`](../packages/grid-blazor/experiments/b1-synchronization/complete-results.json)
- [`server-results.json`](../packages/grid-blazor/experiments/b1-synchronization/server-results.json)
- [`summary.json`](../packages/grid-blazor/experiments/b1-synchronization/summary.json)
- `wasm-correctness-complete-results.json`, `server-correctness-final-results.json`,
  `regression-browser-complete.log`, publish/build logs and preserved earlier runs.

No arbitrary mutation tracking, row diffing, remote provider, local windowing,
native Razor templates, or serializer infrastructure is introduced. Caller-owned
revision discipline is required in opt-in mode. Source CLR rows and JS datasets
still coexist. Chromium/loopback evidence does not cover all devices, browsers,
WAN conditions, actual disconnected Server circuits, or screen readers. Server
cross-await thread allocation counters can be negative and are not used as memory
evidence. AOT remains optional application guidance with its existing tradeoffs.

## 11. Remaining release gates

B1's zero-dataset-work contract is implemented and passes. Manual API/release
review, cross-browser/device and screen-reader QA, and real Server disconnect/
network testing remain release gates inherited from Milestone A. The intermittent
large-grid browser keyboard assertion remains a validation risk to investigate.
The Windows build-hook workaround should be checked in normal CI.

**Repeated versioned synchronization is improved. Initial ingestion is unchanged
in architecture. Legacy/default full-dataset synchronization and non-AOT initial
main-thread responsiveness remain unresolved performance work.** If the release
requires the wider default responsiveness budgets from the investigations, those
remain blockers; this milestone does not claim to meet them. B2 and all remote/
windowed-loading designs remain separate future work.
