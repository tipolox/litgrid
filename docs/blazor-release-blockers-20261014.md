# LitGrid v1.1.0 P1 correction report — 14 October 2026

Both identified P1 blockers have been corrected and are ready for an independent
QA rerun. This report does **not** determine final release readiness. Versions
remain 1.0.3 and HEAD remains the authorized checkpoint
`2e9a845dfade567dcf827eae56e5e837c2926ab5`. No commit, push, PR, publication,
deployment, version change or `.serena/` modification occurred.

## Confirmed Server cause and reproduction

The exact QA handoff and command file were read first. Before production edits,
the preserved package-installed, published Interactive Server consumer was started
and the actual QA refresh driver replayed into new evidence under
`packages/grid-blazor/experiments/b11-reconnect/`. Native socket events were
`open, close, open`. A no-fault refresh completed; a delayed refresh became
in-flight, networking was set offline, and the actual `_blazor` socket was closed.
After 1.8 seconds offline, `Blazor.reconnect()` returned true for the retained
circuit. After a further 15 seconds the first refresh was still incomplete and
interop count was one. A second refresh also remained pending. Disposal released
the work and subscriptions; remount recovered. No original QA evidence was edited.

The confirmed cause is the explicit **component-lifetime cancellation token**
passed to `initGrid` and `updateInputs`. `JSRuntime.InvokeAsync` documents that
the explicit-token overload overrides its default cancellation/timeout. A lost
Server acknowledgment therefore had no operation deadline; synchronization awaited
it while holding the semaphore. The gate was not missing a `finally` release:
the awaited operation had not completed, so that release was never reached.
Reconnection did not replay/acknowledge that lost call. No unexpected browser
exception was needed for the stall; the operation remained pending without failure.

A separate real Server control configured the framework deadline to five seconds.
In the same interrupted circuit, a direct **no-token runtime call** completed with
`TaskCanceledException`, while the original grid refresh and its queued follower
remained pending. This reproduces the overload difference independently of mocked
exceptions. The test decorator originally forwarded no-token calls as explicit
`CancellationToken.None`; it was corrected to preserve overload semantics. That
decorator was not the sole cause: production itself passed its lifetime token.

## Correction and safety

Synchronization now invokes the JS module without overriding the framework
deadline, then awaits the resulting task with component-lifetime cancellation.
Disposal can still cancel the component's wait and release the gate promptly.
There is no new production timeout, Server-specific registration, synchronization
framework or unbounded retry loop. The ordinary Server deadline is one minute;
the host's configured value is honored. WASM has no newly imposed operation timeout.

Only a successful awaited invocation advances snapshots. Cancellation/failure
retains pending data and touched input fields, including reverted values and
schema/order state. The existing semaphore's `finally` releases the gate, and
later operations capture current source/revision/notification state. The runtime
discards a late acknowledgment after its timeout; a .NET regression verifies
that it cannot restore failed successful-state bookkeeping.

Explicit `RefreshDataAsync()` reports timeout/disconnect failures to the caller.
Import, initial binding, render and notification synchronization log recognized
timeout/disconnect failures and remain pending for a later render, notification
or refresh. This preserves the retained circuit without hiding unexpected setter
exceptions. An expired circuit is not reported as recovered. JS cancellation
does not roll back applied setters, so existing partial-payload reconciliation
remains necessary and covered. Initialization also replaces existing JS event
listeners after a successful retry, preventing duplicate callbacks when the first
initialization applied but its acknowledgment was lost.

## Before/after evidence

| Check | Before | After |
| --- | --- | --- |
| Original QA sequence | Retained circuit recovered; original refresh and second refresh pending | With the normal 60-second deadline, original call canceled; in-flight count zero; second refresh completed without remount |
| Five-second framework control | Direct runtime call canceled, grid gate stayed occupied | Grid calls canceled and queued work released |
| Repeated real transport interruption | Confirmed stall | 56 checks, three cycles per Automatic/Legacy mode, two grids, current DOM data |
| Offline notifications | Could queue behind lost refresh | Remain retryable; later refresh and resumed Automatic notifications display current rows |
| Disposal | Required to release the original lost call | Connected/offline disposal completes, subscriptions detach, repeated disposal safe |
| Expired circuit | Not certified by original QA | Five checks pass; reconnect returns false; reload creates a working new circuit |

Primary evidence and reproducible commands are in the new
[experiment README](../packages/grid-blazor/experiments/b11-reconnect/README.md).
The original 60-second-deadline replay observes for 70 seconds, rather than assuming
reconnection immediately finishes a lost interop operation. Repeated test cycles
use the accelerated five-second framework setting solely in the test host.

## Tests, builds and release notes

| Validation | Final result |
| --- | --- |
| JavaScript | 213 tests / 29 files pass; repeated-init callback test strengthened |
| Release .NET | 120 tests pass, zero skipped; seven new cases using actual `JSRuntime` timeout behavior |
| TypeScript | Old-shaped structural fixture, Blazor and Web checks pass |
| WASM existing browser suite | 13 scenarios pass; 20 large-grid focus cycles / 60 exact-cell checks, plus wide-grid checks |
| Final WASM correctness | Seven retry/schema + 58 mode + 13 B1.1 checks pass |
| Final Interactive Server correctness | Seven retry/schema + 58 mode + 13 B1.1 checks pass |
| Server fault regression | 56 checks / six retained-circuit cycles pass; five separate expiry checks pass |
| Release builds | Library/tests, Server host, both published trimmed non-AOT WASM hosts pass |
| Workspace compilation | All eight package/playground build scripts pass with failing Windows cleanup lifecycle disabled |
| Shipping assets | JS/map regenerated; both final WASM copies and actual Server HTTP hashes match; index/binding map sources current |
| Changelog extraction | `node scripts/extract-changelog.mjs 1.1.0` succeeds; dry run only |
| Versions/whitespace | All manifests/library remain 1.0.3; Git whitespace check passes |

The seven added .NET cases cover Automatic/Legacy queued-refresh timeout recovery,
late acknowledgment, render timeout/revision reversion, actual item notification,
import timeout, initialization timeout and cancellation/disposal. Existing retry,
subscription, duplicate-row, source replacement, column persistence and lifecycle
coverage remains. No expensive performance matrix was rerun.

Initial broad Vitest discovery also ran archived QA source copies and produced
duplicate/mock-resolution failures. The actual repository suite excludes
`**/.qa-*/**`, `**/bin/**` and `**/obj/**` and passes all 213 tests; archived QA
copies were not edited. An early Server correctness run passed all data scenarios
but failed its console-error guard on the new host's favicon 404. A favicon
declaration fixed the host; the final run passes without filtering that error.

Normal `pnpm build` prebuild cleanup hit Windows `ENOTEMPTY`/`EPERM` deleting and
recreating ignored `dist` directories. No production build script was changed.
`pnpm.cmd -r --config.enable-pre-post-scripts=false build` successfully compiled
every workspace project and regenerated the shipping bundle. A normal clean build
in release CI remains a validation qualification; this workaround is not an artifact
packaging certification. The supported .NET 8.0.426 SDK was used for WASM publishing;
its optional wasm-tools/native-optimization warning remains visible. Server and
.NET tests use the installed SDK 10.0.402. No performance baseline was regenerated.

`CHANGELOG.md` now has the exact required `## 1.1.0` heading and nonempty notes.
It covers declarative columns, independent/Automatic synchronization, collection
and item notifications, optional revision, refresh, Legacy and relevant fixes.
A prominent warning discloses the changed v1.0.3 plain-list/parent-render behavior,
shows `DataSyncMode="DataSyncMode.Legacy"`, and records the product owner's deliberate
breaking minor-release exception. Release workflow validation/extraction was
inspected; no release command was executed.

## Modified files and remaining qualifications

Production and shipping assets:

- `packages/grid-blazor/src/Components/DataGrid.razor.cs`
- `packages/grid-blazor/src/index.ts`
- `packages/grid-blazor/src/wwwroot/{litgrid-blazor.js,litgrid-blazor.js.map}`

Tests/instrumentation:

- `packages/grid-blazor/src/index.test.ts`
- `packages/grid-blazor/tests/{InteropTimeoutTests.cs,DeclarativeComponentTests.cs,DataSynchronizationTests.cs}`
- `packages/grid-blazor/experiments/b1-synchronization/ObservedRuntime.cs`
- New `experiments/b11-reconnect/` host, fixtures, portable drivers, verification script, README and evidence

Documentation: `CHANGELOG.md`, `docs/blazor-data-synchronization.md` and this report.
Historical reports, original QA output and `.serena/` remain intact.

A lost call may occupy the gate until the host's configured deadline. Deliberately
disabling that deadline disables the bound. This correction does not add a circuit
monitor or immediate automatic reconnect refresh. Recovery is through subsequent
render/notification/refresh; terminated circuits require normal application reload.
Real WAN/loss conditions, all-browser Server navigation and manual accessibility
remain outside these focused runs, along with prior QA P2 qualifications. The
tests demonstrate Chromium loopback retained-circuit recovery and explicit expiry,
not every production transport scenario. No additional public synchronization
parameter or feature was introduced. Final release readiness belongs to the separate
independent QA rerun, not this correction pass.
