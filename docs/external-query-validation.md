# External-query validation (Issue #35)

Validation date: 2026-10-21 (Asia/Singapore). Target: proposed v1.2.0; all package
versions remain 1.1.0. Draft: https://github.com/tipolox/litgrid/pull/40.

## Baseline and scope

- Fetched `origin/main`: `015b92b340578eabcf3fa603ca24608719cd48f1`.
- Verified merged PR #38 (`21bc537...`) and #39 (`015b92b...`) through GitHub and
  main's ancestry. Started `feat/p0-external-query-pagination` from that main.
- Contract/baseline commit: `edf6ce8`; implementation commit: `73cbbc2`.
- Initial tracked worktree was clean; existing `.serena/` untracked files and
  all other worktrees were preserved. Only the feature branch was pushed.
- No Property Management source, package versions, release, publishing,
  deployment, merge, or release tags changed.

The pre-implementation baseline run passed 275 tests. The new permanent
`externalQuery.baseline.test.ts` records that 20 supplied rows from a hypothetical
352-record server produce local total=20/pageCount=1, local queries inspect only
those rows, and data replacement resets the page. Existing real React navigation
tests record four repeated data/column setter calls during four unrelated
theme/ARIA updates. Local-mode assertions remain unchanged and pass.

## Contract and controlled behavior

See [the full API and React/Next.js example](external-query.md).

`config.queryMode: 'external'` opts in. Atomic `externalState` contains request ID,
full query, supplied rows, explicit known/unknown totals, loading, and error.
`query-change`/`onQueryChange` carries typed query, reason, and increasing request
ID. Controlled input commits emit no query event; no-ops emit nothing. Explicit
`refreshQuery` requests a new attempt on the same page. Reentrant requests are
queued to preserve subscriber order; matching results may commit synchronously
from a query callback.

External rows are never sorted, filtered, searched, or sliced again. Known total
352/pageSize20 produces 18 pages; API pageIndex2 stays pageIndex2 on arrival.
Search/filter/sort/page-size requests reset to index0. Unknown totals use hasMore,
`Page N`, and `Total unknown`; numeric legacy getters explicitly return -1 for
unknown counts. Out-of-range controlled pages keep their index and show a clear
status. Invalid/overfull/contradictory result envelopes throw before commit.

Pending queries clear rows and selection before query notification. Loading is
visible with aria-busy/status; errors use an alert and display no rows; successful
empty and out-of-range states have distinct messages. Lower-ID, same-ID
query-mismatched, and settled replay results are rejected. A new refresh ID is
required for a new asynchronous attempt. Cancellation, scoped commit guards,
authorization rechecks, no-store fetching and exact monetary comparisons belong
to the application/BFF; no HTTP client is implemented in LitGrid.

Selection uses the merged #36 key/scope rules. Queries clear displayed selection;
keyed same-page controlled replacement remaps only currently supplied keys.
Scope/mode/key transitions invalidate results and clear selection. No unseen
server rows are selected. The #37 column flags continue to suppress UI actions;
imperative requests remain explicit application intent. Decimal-string filter
values pass through intact, including huge and negative values.

## JavaScript, types and builds

- `pnpm test`: **300 tests / 41 files passed**. Focused final rerun also passed
  **22 tests**, including React StrictMode and the final status-label changes.
- Tests cover exact/unknown totals, first/middle/last/empty pages, reset/clear/no-op
  intents, refresh, late/replayed responses, loading/error, reentrant ordering,
  controlled updates, scoped/reused row identities, decimal strings, and adapter
  input/event/lifecycle forwarding.
- Scoped external-query typecheck includes the new core/web/React/adapter tests,
  shared event/API fixture and old structural Web Component shape: **passed**.
  Existing selection/compatibility fixtures also passed during implementation.
- Existing engine, virtualizer and scroll-mapping benchmarks completed, including
  a final run scoped to the repository package sources. Benchmark ratios printed
  by Vitest compare different operations, not main versus feature speedups.
- Every package compiler/bundler and playground build passed locally using
  `pnpm --config.enable-pre-post-scripts=false -r run build`.
- Standard local `pnpm build` was attempted repeatedly but Windows held generated
  dist directory handles (`ENOTEMPTY`/`EPERM`) during cleanup. Old generated outputs
  were preserved under ignored workspace backups. No cleanup workaround or
  build-tool changes were committed.
- GitHub Verify run [39553550916](https://github.com/tipolox/litgrid/actions/runs/39553550916)
  **passed for implementation commit 73cbbc2**, including the standard
  `pnpm run build`, full JavaScript suite, Blazor tests and Release build on Linux.
  Final-head status is reported in the PR/checks and delivery message.
  Follow-up [run 39554331891](https://github.com/tipolox/litgrid/actions/runs/39554331891)
  also passed for `bded9ff`, including final React typing/StrictMode coverage.
- `dotnet test ... -c Release --no-restore`: **129 passed**; Release library build:
  **zero warnings/errors**. An earlier run exposed an existing timeout-test-runtime
  race (126/127); the rerun passed 127/127 before adding the two new tests. Initial
  restricted NuGet restore failed; restore and final tests succeeded with network
  access. No timeout-test or unrelated synchronization redesign was made.
- The tracked Blazor JS bundle/map were regenerated from the shared implementation.

Root TypeScript remains a #31 release-quality limitation. An in-memory comparison
and final raw root run recorded **177 baseline / 172 final raw diagnostics**.
The controlled source comparison
against main, using identical compiler options and excluding ignored scratch and
generated outputs, produced **167 baseline / 162 feature diagnostics with the
root React shim**. Two new diagnostics are the new test's legitimate React19
`act` and `StrictMode` imports, which the stale shim does not export. Explicitly
typed adapter props remove several existing implicit-any diagnostics. With the
shim excluded and real installed React19 types, both baseline and feature have
**68 diagnostics, with zero additions**. Those existing failures include stale
wrapper fixtures, Node/test typing, module-resolution and private/test DOM access.
This does not claim that broad root typechecking passes or that the shim was fixed.

## Actual browser and Next.js evidence (separate from jsdom)

Headless **Chromium 156.0.8078.4 on Windows / Node22.14.0** ran the checked-in
`scripts/external-query-browser-check.mjs` and public browser fixture.

Passed real Enter/Space pagination, quick-search input/clear, header sorting,
filter application, page-size selection, Escape and header-trigger focus restore,
Next-disabled focus fallback, loading/error/unknown-total display, stale A rejection
after B, and scope-safe selection. No page errors occurred. Lit development-mode
warnings also occur on the baseline and are not represented as browser errors.

An isolated, ignored **Next.js16.4.2 / React19.2.5** App Router consumer used built
adapter outputs, a client boundary and `dynamic(..., {ssr:false})`. Its production
webpack build and prerender completed. Chromium against the production server
passed hydration, theme/ARIA page retention, fresh callback closure delivery,
keyboard Next, and rapid A/B search with the consumer commit guard. No page errors
or hydration errors occurred. This is a library fixture, not Property Management
integration, and does not claim React19.3.0 or every Next16 patch was tested.

## Browser performance observations

Compared an archived main source tree and feature source in the same Chromium
page, with separate engine/renderer modules and custom-element registrations.
Each trial used 30k or 100k keyed local rows, **200 columns**, 5 warm-up and 30
measured vertical/horizontal scrolls, and three alternating-order trials per
variant. Timings include requestAnimationFrame/render work and browser scheduling.
Maximum mounted cells: **204** for every local sample; row/column virtualization
remained bounded. Full samples: [initial](evidence/external-query-browser-initial.json)
and [GC-separated repeat](evidence/external-query-browser.json).

Median of three trials, milliseconds (load range retains all outliers):

| Run | Rows | Variant | Load median (range) | Scroll median | Scroll p95 |
| --- | ---: | --- | ---: | ---: | ---: |
| Initial | 30,000 | main | 20.6 (17.5–35.7) | 36.1 | 51.7 |
| Initial | 30,000 | feature | 17.1 (15.6–29.6) | 36.4 | 54.4 |
| Initial | 100,000 | main | 49.6 (37.3–54.0) | 33.7 | 54.1 |
| Initial | 100,000 | feature | 73.6 (44.2–79.5) | 34.3 | 48.5 |
| GC repeat | 30,000 | main | 25.9 (24.7–28.3) | 37.1 | 50.4 |
| GC repeat | 30,000 | feature | 27.8 (17.3–28.8) | 36.7 | 47.3 |
| GC repeat | 100,000 | main | 91.4 (90.6–110.3) | 43.5 | 52.3 |
| GC repeat | 100,000 | feature | 85.4 (81.3–311.0) | 40.3 | 50.2 |

The repeat requests garbage collection between detached grids. Initial-load
results are inconsistent across runs, including a **311ms feature outlier**;
this is neither a speedup claim nor proof of an unchanged performance envelope.
Review broader device/workload measurements before release, including startup
variance. No local transform or virtualizer algorithm was changed.

In the final repeat, 20-row external commits with declared totals 352, 30k, 100k,
and 1b had respective median/p95 times **0.4/2.9, 0.5/1.2, 0.4/1.1, 0.4/0.8ms**,
with 13 mounted rows. External result processing works over the loaded page,
never the declared total. These are small-page observations, not a performance
guarantee. Network/server latency is excluded.

## PR #40 review correction: external quick-search debounce

The independent review of `98ac529` identified that a small returned page took
the local below-threshold path. A focused pre-fix regression reproduced three
immediate search intents (`A`, `Al`, `Alpha`, request IDs 2/3/4) despite the
default 150ms delay. The correction makes external typing depend solely on
`quickSearchDebounceMs`: positive delay debounces, zero remains immediate. Local
source-row threshold behavior is unchanged. The legacy external `data` setter
already returned before updating row counts or timers; new tests protect that
boundary, including ignored inputs of length 0, 1 and 100,000.

The follow-up passed **313 JavaScript tests / 41 files**, **58 focused tests**,
the scoped external-query API/test typecheck, and **129 Blazor Release tests**.
Regression coverage includes final-intent-only rapid typing, request identities,
zero delay, clear and imperative/controlled cancellation, disconnect/reconnect,
React unmount cleanup, ignored legacy data, local threshold boundaries, and
keyboard focus retention. The earlier search delegation test now explicitly
opts into zero delay where immediate dispatch is intended.

Actual **Chromium 156.0.8078.4** passed the updated public browser harness using
real keyboard input and a 300ms window on a two-row external page with a 352-row
server total (the unit regression covers the default 150ms window).
Only the final rapid search emitted after the window; zero delay emitted each
character, Clear canceled pending input, disconnect canceled the timer, focus
stayed in search, and IDs were exactly 2/3/4/5 for the four intentional requests.
Real-browser local-mode checks confirmed below-threshold immediate behavior,
at-threshold debounce and zero-delay input. Evidence:
[debounce browser checks](evidence/external-query-debounce-browser.json).
The earlier paging, header-menu, error/loading, stale-result and scope checks
also passed in this run. No performance improvement is claimed or benchmark
qualification changed by this correction.

Standard local package cleanup again encountered Windows `ENOTEMPTY`. An initial
Release build overlapped the still-running test process and encountered a DLL
lock; the sequential rerun passed with zero warnings/errors. All package
compilers/bundlers and the playground passed with cleanup hooks skipped, and
the tracked Blazor bundle/map were regenerated. Root typechecking still reports
the same **172 diagnostics** as `98ac529`, with **zero additional diagnostics**
after normalizing source locations. Exact-head CI results are recorded in the
PR and delivery response. No network fetching,
framework redesign, version, release or Property Management change was added.

## Remaining review and release gates

Independent API/security/concurrency review, broader performance qualification,
real consumer integration after a reviewed release, and actual assistive-technology
testing remain. Blazor .NET serialization/lifetime and JS interop are tested;
no browser-hosted Blazor Server/WASM roundtrip claim is made. Vue uses a real mount;
Angular forwarding uses the component/real Web Component plus package compilation,
not an Angular browser application. Request IDs are scoped to a mounted grid;
application commit guards remain necessary across remounts. Unknown totals use
an explicit -1 numeric sentinel for backward-compatible getter types. The new
external input requires immutable replacement.

ISSUE #35: READY FOR REVIEW
BACKWARD COMPATIBILITY: PASS (existing local regression suite)
RELEASE: UNCHANGED
PROPERTY MANAGEMENT: UNCHANGED

Stop for independent review. No merge or release authorization is implied.
