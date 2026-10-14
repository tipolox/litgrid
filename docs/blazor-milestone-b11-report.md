# Milestone B1.1: automatic Blazor data change detection

Date: **13 October 2026 (Asia/Singapore)**. Repository: `D:\Work\litgrid-clean`.
Branch: `feat/blazor-declarative-columns`. B1.1 is implemented and validated
locally. Package versions remain **1.0.3**. No commit, push, package/service
publication, website/demo change, B2 work, or virtualization-engine change occurred.
The pre-existing B1 work, experiments, and historical reports were preserved.
`.serena/` was left untouched. Git status was inspected before implementation;
the substantial pre-existing uncommitted changes were retained.

## 1. Architecture implemented

`DataGrid<TItem>` keeps B1's independent successful snapshots for data, columns,
configuration and scalars, its render-complete lifecycle, synchronization semaphore,
module ownership, cancellation and disposal. An internal `DataChangeTracker<TItem>`
owns collection/item subscriptions. A monotonic notification generation invalidates
data; each successful operation records its captured generation, identity, revision
and mode. Notifications during interop therefore remain pending for a later operation.

Events update subscription ownership under a lock and schedule a bounded 1 ms
batch window. Rendering runs on the component dispatcher, then the existing gate
serializes interop. Queued stale renders compare successful state and skip work.
No per-row interop, custom serializer, row diffing or ingestion engine was added.

Failed data operations, including subscription-enumeration failures before interop,
remain pending. Retry is possible on a subsequent render/refresh even when revision
values revert. B1's partial-field retry, declaration-order retry and captured-state
rules remain intact. There is no unbounded automatic error-retry loop.

## 2. New default synchronization behavior

`DataSyncMode.Automatic` is the default. Initial binding, a different source object,
mode change, supported notification, changed revision, or explicit refresh
synchronizes data. Same-source parent updates without those signals perform zero
dataset enumeration, serialization, transfer and grid data adoption. Column and
configuration changes remain independent; child-only declarative changes omit rows.

This is a declared notification/refresh contract. Reference equality does not
establish that arbitrary mutable content is unchanged. Unobservable mutations
require replacement, revision or refresh. Existing source references are not
polled, hashed or scanned during an unchanged update.

## 3. Observable collection behavior

`INotifyCollectionChanged` supports Add, Remove, Replace, Move and Reset. The
collection schedules its own grid update, without a parent render. Add/remove/
replace maintain item reference counts immediately; Move invalidates the dataset
without changing membership. Reset detaches old items and requests reconciliation.
Initial binding, Reset, refresh and revision changes scan membership; ordinary
observable deltas and item changes avoid subscription rescans.

Source replacement and disposal unsubscribe the collection and all items. Obsolete
source references are released from tracking and the successful data cache; an
in-flight operation can necessarily keep its captured source until it finishes.
Notifications from other threads are marshaled to the component dispatcher.
Collections must not be mutated concurrently with enumeration/serialization.

## 4. Item notification behavior

Reference `TItem` types implementing `INotifyPropertyChanged` are tracked
automatically. Every property notification invalidates the whole dataset, regardless
of property name. A shared delegate per tracker avoids one delegate allocation per
row. Duplicate occurrences of the same object have one handler per grid with an
occurrence count. Equal-but-distinct objects have separate subscriptions.

Plain lists of notifying rows reconcile on actual data transfers because their
membership changes have no event stream. Reconciliation reuses its table and stages
scan counts separately from active occurrence counts. A failed enumeration retains
active subscriptions, and a subsequent retry repairs membership. It allocates removal
bookkeeping only when rows actually leave, rather than an entire scratch dictionary
per update. Disposal/source detach release table capacity.

Mutable struct rows, notifying subtypes hidden behind a non-notifying declared
`TItem`, and recursively nested objects are not automatically observed. They use
refresh/revision/replacement. These limits avoid boxed-copy subscriptions and
unconditional inspection of ordinary non-notifying datasets.

## 5. Legacy compatibility strategy

The single additive parameter `DataSyncMode="DataSyncMode.Legacy"` preserves
published v1.0.3 same-reference synchronization on every parent parameter update
when `DataRevision` is null. Legacy does not subscribe to events. A non-null
revision retains B1's opt-in reference/revision behavior. Explicit refresh always
forces synchronization. No overlapping performance or notification flags were added.

## 6. DataRevision interaction and precedence

`DataRevision: long?` remains optional and caller-owned. Equality changes, including
null/non-null transitions, invalidate data; monotonic ordering is not required.
Signals are additive: unchanged revision never suppresses automatic notifications,
source replacement, mode transition, explicit refresh or pending failure retry.
Multiple pending signals can share one operation. Explicit refresh is always a
force request, so separate refresh calls may each transfer. Only successful
interop advances the captured comparison state. A refresh followed by an unchanged
automatic parent update does not retransmit.

## 7. Performance measurements

Primary environment: **published Release, trimmed, non-AOT .NET 8.0.31 WASM**,
SDK 10.0.401, installed Chromium. Three fresh contexts per workload/source/mode;
1,000 and 10,000 rows with ten serialized business properties. Both notifying-list
and observable sources, and Automatic/Legacy, are measured with the production
serializer, component and JS setter. Cold initial binding has no mounted dataset.
Three matched forced refreshes after initial binding warm subsequent update paths
in both modes; warmup is outside observations. A separate no-op quiet validation
window is excluded from elapsed time. Completion includes Lit completion and two
animation frames. Timing is end-to-end, not exclusive serialization CPU.

Final automatic observable medians (milliseconds):

| Operation | 1,000 rows | 10,000 rows | Data transfers/adoptions |
| --- | ---: | ---: | ---: |
| Cold initial binding | 459.4 | 1,055.2 | 1 / 1 |
| Unchanged parent update | **10.0** | **17.8** | **0 / 0** |
| Reference replacement | 76.9 | 488.9 | 1 / 1 |
| Collection Add | 141.5 | 454.4 | 1 / 1 |
| Item property change | 61.9 | 466.3 | 1 / 1 |
| Explicit refresh | 60.0 | 454.7 | 1 / 1 |
| 100 item notifications in one burst | 76.4 | 483.3 | **1 / 1** |
| 100 collection additions in one burst | 76.2 | 418.9 | **1 / 1** |
| Complete grid disposal | 20.8 | 39.9 | 0 / 0 |

Every automatic unchanged update asserts **zero enumerations, visits, production
interop calls, transfers and adoptions**, in WASM and Server. Initial/replacement/
refresh of notifying data enumerate once for subscriptions and once for the actual
serializer. Observable deltas/item notifications enumerate only for serialization.
Non-notifying row types require no item subscription enumeration.

Matched changed-data medians, final Automatic / Legacy (milliseconds):

| Workload | 1,000 rows | 10,000 rows |
| --- | ---: | ---: |
| Notifying list, replacement | 75.5 / 77.1 | **505.3 / 438.1** |
| Notifying list, refresh | 59.9 / 57.2 | **453.8 / 432.0** |
| Observable source, replacement | 76.9 / 91.7 | **488.9 / 391.3** |
| Observable source, refresh | 60.0 / 60.0 | **454.7 / 434.5** |

Changed data is not universally faster. At 10,000 rows these replacement samples
are about 15% and 25% slower, and refresh about 5% slower. Subscription setup/detach
and enumeration add real work, especially on replacement. Three samples are not
statistical evidence of an intrinsic percentage regression across devices; raw
ranges are retained. Removing per-update scratch tables brought 1,000-row list
updates close to the matched Legacy path, but does not establish a general
changed-data performance guarantee. Ordinary non-notifying datasets have no
tracking scan. Initial/changed full-dataset transfers can still block the WASM
main thread. Timer-gap observations are in the raw results.

Interactive Server uses the same assertions on loopback, including true Task.Run
notifications. Its timings are secondary functional evidence, not WAN benchmarks.
Historical B1 data and earlier B1.1 cold/warm probes are preserved and excluded
from the final implementation's authoritative comparison.

## 8. Test counts and results

| Check | Result |
| --- | --- |
| Release .NET | **109 tests pass** (87 B1 + 22 B1.1) |
| Workspace JavaScript | **202 tests, 28 files pass** (200 B1 + 2 B1.1) |
| Existing real-WASM regression suite | **13 scenarios pass** |
| Final published-WASM matrix | **288 observations + 13 correctness checks pass** |
| Final Interactive Server matrix | **96 observations + 13 correctness checks pass** |
| Blazor TypeScript check | Pass with workspace `--rootDir .` |
| Release library/WASM/Server builds | Pass; no compiler warnings/errors |
| Version validation | Every package/library remains **1.0.3** |
| Git whitespace validation | Pass |

Coverage includes ordinary List, observable/non-notifying rows, notifying rows,
reference and dynamic source replacement, refresh, optional revisions, both modes,
multiple grids, bursts, duplicate/equal references, Reset/repopulation, disposal,
background notifications, failed JS interop/retry, enumeration failure with revision
reversion, overlapping updates, and subscription release/collectibility. Browser
checks use a real throwing data setter, delayed synchronization, and cancellation
during disposal. Existing virtualization, keyboard, accessibility assertions,
declarative/programmatic columns and column persistence tests are retained.

## 9. Lifecycle and memory findings

Isolated WASM measurements use the actual production tracker, keeping the source
and disposed tracker alive. Medians:

| Tracking cost | 1,000 unique rows | 10,000 unique rows |
| --- | ---: | ---: |
| Setup | 3.3 ms | 15.6 ms |
| Disposal | 1.9 ms | 7.0 ms |
| Setup allocation | 103,816 bytes | 943,496 bytes |
| Retained managed tracking memory | 55,504 bytes | 491,712 bytes |
| Residual after disposal | 1,416 bytes | 1,416 bytes |
| Item handlers before / after disposal | 1,000 / **0** | 10,000 / **0** |

Staged scan counts increase retained table size versus the earlier scratch-table
prototype (about 352 KB at 10,000 rows), in exchange for eliminating O(rows)
temporary dictionaries on repeated updates and preserving active counts on failure.
The .NET allocation test verifies ten 1,000-row reconciliations allocate less than
10 KB total. A weak-reference test confirms a disposed tracker is collectible while
its publisher remains alive. Collection accessor counters and item counters verify
unsubscription on replacement/mode change/disposal. The small fixed residual
includes the deliberately live tracker/reflection diagnostic objects, not retained
row handlers. Measurements are managed retained heap/allocation, not peak heap or
JS storage. Server process-wide heap differences are noisy and are not used as
memory-release evidence.

## 10. Breaking-change assessment

The default change is **breaking** for v1.0.3 apps that mutate plain lists/rows and
expect an unrelated parent update to synchronize them. The explicit Legacy switch
provides a migration path but does not remove the semver concern. Existing B1
revision users also gain additive notifications in Automatic mode; choose Legacy
if exact revision-only behavior is required.

## 11. Remaining limitations

- Arbitrary in-place mutations without signals require refresh/revision/replacement.
- Item tracking requires a notifying reference declared TItem; structs, hidden
  notifying subtypes and recursive nested-object observation use explicit signals.
- Concurrent collection mutation during enumeration is unsupported; dispatch writes.
- Conventional event senders and safe event accessors are required.
- Changed data remains a full-dataset transfer; initial and changed-data responsiveness
  is not solved by B1.1. No remote/windowed loading or native templates were added.
- Automated browsers are Chromium. Cross-browser/device/screen-reader QA and actual
  Server disconnect/WAN testing remain release QA. WASM Task.Run is not evidence
  of multithreaded WASM execution.

## 12. Versioning and release recommendation

Release this new default in **2.0.0**, with the documented migration contract and
Legacy example. Do not silently include it in a 1.0.x patch or 1.1 minor. If a 1.x
release is required, retain the old default and offer automatic behavior explicitly;
that would be a different release configuration from the requested implementation.
Keep package versions unchanged until the authorized release process. Review the
measured replacement cost and do broader browser/device QA before shipping; do
not claim improved initial ingestion or universal changed-data speedups.

Working examples and the signal-precedence table are in
[the synchronization guide](blazor-data-synchronization.md). Full reproducible
commands, authoritative raw data, medians/ranges and preserved diagnostic logs
are in [the B1.1 experiments](../packages/grid-blazor/experiments/b11-automatic/README.md),
especially `wasm-validated-results.json`, `server-validated-results.json` and
`validated-summary.json`.
