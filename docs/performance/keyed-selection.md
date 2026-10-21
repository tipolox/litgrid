# Keyed selection coordination performance investigation

2026-10-21, Asia/Singapore. Base: `206192e999a38c6b944944eabe2724ef4e9f8cef`.

**Release gate: BLOCKED pending independent review and requalification.** This mitigation is ready for independent performance review, not release approval. No parity or workload-budget PASS is claimed. All package versions remain 1.1.0.

## Root cause

PR [#41](https://github.com/tipolox/litgrid/pull/41), reviewed at `57a1532`, supplies the qualification findings and original harnesses. It has not been modified or merged. A separate clean worktree and branch were created from fetched main; existing worktrees and experiments were preserved.

Main's `setData()` builds a Set of all identities plus a duplicate Set. `refreshData()` then builds a second Map over displayed keys. For unfiltered, unpaged local data this rereads essentially the entire dataset and duplicates the identity-index work. Three inactive transform helpers each copy the whole array. React's effect-triggered synchronization deliberately assigns local data again on unrelated input changes, retriggering these operations. Configuration normalization already suppresses equal React config assignments; React render CPU is small relative to passive synchronization and presentation.

The original qualification workload was reproduced before edits. At 100k rows, main adoption p50/p95 was **37.1/92.7 ms** at 120 columns and **50.2/84.6 ms** at 200 columns (`n=20` each), versus v1.1.0 **8.8/16.9** and **8.9/16.8 ms**. Core keyed `setData` p50/p95 was **45.5/60.2 ms**, versus unkeyed **0.5/0.9 ms** (`n=30`). CPU samples identify `refreshData`, `reconcile`, `setData`, `rebuildKeys`, key reads and GC. Raw data: [reproduction.json](evidence/keyed-selection/reproduction.json) and [react-reproduction.json](evidence/keyed-selection/react-reproduction.json).

v1.1.0 did not implement these keyed identity guarantees. Synchronous validation of every identity remains necessary to detect arbitrary same-reference mutations; its O(n) cost is inherent under the existing contract. Rebuilding multiple indexes, rereading each key, and allocating three unchanged arrays are avoidable costs.

## Optimization

- Build one source key-to-index Map. A negative value marks every occurrence of a duplicate as unselectable, including third/later occurrences; missing and invalid identities never enter the index.
- Cache only primitive identity values in original order. Every `setData()` still reads every identity synchronously. When the complete identity sequence and rowKey property match, reuse the validated index. Changed identity, order, length or rowKey rebuilds it; replacement objects with unchanged keys still reconcile selection and snapshots to their current records.
- Share the source Map with the displayed-key lookup only immediately after validation and only when the engine guarantees the complete original order. Sorting, filtering, paging and later view transitions retain their displayed-index reconciliation. External mode shares only the validated loaded-page index.
- Skip inactive transforms; preserve detached-array behavior with one copy when no transform is active.

No React synchronization assignment was removed. Skipping data assignment solely because its reference is unchanged would silently break the existing in-place mutation contract. No new revision API or asynchronous identity validation was introduced, and no work was deferred into first interaction.

## Correctness validation

The complete JavaScript suite passes **322 tests in 42 files** (313 existing plus 9 focused regressions). New core and React regressions cover 30k/100k identity-read counts, immediate selection, stable-key object replacements, changed keys, third duplicates, missing/invalid IDs, length/order mutations, off-page/filtered duplicates, sorting/filtering/pagination, rowKey/scope transitions, detached arrays and 20-row external pages with a billion-row declared total. Existing cell-selection, notifications, programmatic selection, keyboard/navigation and external stale-response tests also pass.

Chromium source behavior checks pass selection click/keyboard Enter/Control+Space, sorting/filtering, scope changes, 30k/100k datasets, external search/debounce/pagination/status/concurrency and page-bounded data handling. Separate first-click checks assert the selected key on every cold grid. Local tarballs and a NuGet were built without version changes; archive validation and installed-package checks are recorded in the validation evidence.

## Performance before/after

Comparison below is **keyed main versus keyed optimized**, not v1.1.0. Three paired runs alternate versions within each workload, `n=60` per version/workload (480 adoption samples total). Tables show p50 / p95 milliseconds and min–max. [All tables](evidence/keyed-selection/tables.md) and [machine-readable summary](evidence/keyed-selection/summary.json) retain presentation, scroll, selection, GC protocol, heap, core controls, React and first-click samples.

| Rows / columns | Main p50 / p95 (range) | Optimized p50 / p95 (range) |
|---|---|---|
| 30k / 120 | 18.4 / 47.1 (8.4–113.6) | 11.6 / 30.3 (5.1–34.7) |
| 30k / 200 | 17.7 / 34.8 (7.2–41.7) | 12.5 / 23.0 (4.7–31.1) |
| 100k / 120 | 46.9 / 94.5 (21.1–164.4) | 28.9 / 58.2 (10.4–67.2) |
| 100k / 200 | 53.4 / 101.1 (21.1–125.3) | 30.1 / 48.2 (10.5–80.3) |

Core profiled controls, natural-GC batches, 100k rows (`n=30` per operation/version):

| Operation | Main p50 / p95 (range) | Optimized p50 / p95 (range) |
|---|---|---|
| Cold keyed setData | 56.1 / 75.0 (30.5–83.5) | 24.7 / 45.2 (17.1–56.0) |
| Same array, same keys | 59.0 / 81.0 (43.3–100.5) | 2.8 / 4.8 (2.2–5.8) |
| Replacement objects, same keys | 30.5 / 64.7 (17.9–70.5) | 2.6 / 4.5 (2.0–4.7) |
| Changed last key | 53.9 / 78.5 (41.2–86.8) | 24.3 / 29.8 (20.2–33.4) |
| Duplicate last key | 60.5 / 74.1 (34.6–75.0) | 24.0 / 38.5 (17.6–41.3) |
| Config only | 40.3 / 50.9 (29.3–59.6) | 44.5 / 54.2 (34.0–58.6) |

Config-only refresh remains a full displayed-key pass and is not improved in this sample. These profiled core controls are separate from qualification's unprofiled browser adoption measurements; do not pool their samples.

React 19.2.5 development Profiler, 50 updates per version/case, identical local data/two columns, changing ariaLabel on every update:

| Rows / config | Main update p50 / p95 (range) | Optimized update p50 / p95 (range) |
|---|---|---|
| 100k / stable | 44.8 / 74.6 (26.2–77.5) | 33.2 / 34.6 (19.1–34.7) |
| 100k / fresh | 46.9 / 101.3 (30.2–131.3) | 33.1 / 34.6 (19.7–35.0) |

30k update p95 stays about 34–35 ms. React actual render p95 is 0.2–0.4 ms across the cases; update timing includes effects and two animation frames, not just React CPU or compositor paint.

First DOM click on a cold mounted 100k grid, before scroll/selection (`n=20` per version/width): optimized dispatch p95 **0.3/0.4 ms** for 120/200 columns, click-through-Lit-update p95 **10.2/12.0 ms**, ranges **3.3–10.3 / 3.0–12.8 ms**. Main click-through-update p95 is **9.4/8.2 ms**. These results do not demonstrate a click speedup, but there is no dataset-sized first-click stall. Core immediate single-row selection p95 is about 0.1 ms in the optimized keyed natural-GC cases. Physical input-device latency and compositor paint are not measured.

Whole-page heap snapshots after grid removal, before the next collection (`n=120` per version/protocol): forced-GC-sample heap p50/p95 **10.9/19.9 → 9.9/17.6 MiB**, ranges **5.6–20.3 → 5.7–18.1 MiB**. Natural-GC snapshots **23.7/50.1 → 23.5/42.6 MiB**, ranges **2.5–61.2 → 2.5–58.2 MiB**. These are not retained-leak measurements.

Separate CDP allocation sampling (32768-byte interval, including collected objects, 30 syncs/case) estimates 100k cold allocation **216.8 → 156.4 MiB** and repeated same-key allocation **216.1 → 11.5 MiB**. These are approximate allocated totals, not exact counts or retained heap. CPU-profile GC sample attribution and raw profiles are retained; mixed-operation 100k natural-GC profiles attribute **327.6 → 244.0 ms** to GC samples, over **10.2 → 4.5 seconds** of total profiled work. Sampling/forced collections and fixture work prevent interpreting these as exact production GC pauses or percentages proving a universal improvement. At 30k, natural-GC sampled time is **49.3 → 54.7 ms**, so GC results are not uniformly better.

External timing remains page-bounded: only 20 supplied rows are processed, regardless of declared total. All observed cells remain virtualized; exact commit and mounted-cell results are in the full tables.

## Validation and CI

- Frozen dependency install: pass, original lockfile.
- Complete JS suite: 322/322, 42 files.
- Scoped public API and changed-test typecheck: pass, zero diagnostics, real framework types/Bundler resolution; Node declarations reused from the qualification tool installation without dependency changes. Exact local config is retained in evidence.
- Broad root TypeScript before builds: **exit 2, 162 diagnostics**. This remains the existing #31 area (ambient React shim, adapter fixture shapes, test typings and legacy resolution); it is not a green root gate. After builds the broad check still exits 2 with 172 diagnostics, including generated declarations. Raw diagnostics are retained separately from the scoped result.
- Standard recursive package/playground builds: pass.
- Blazor Release tests: 129/129; Release build: zero warnings/errors, net8.0, local SDK 10.0.402.
- Six local npm tarballs and one NuGet at 1.1.0: archive validation pass. No publication.
- Chromium source selection/keyboard/external-query checks: pass.
- Installed-package strict API typecheck and Chromium smoke: pass. The browser loaded local tarballs, checked 100k cold/repeated identity passes (100001 key reads with one selected row), real cell click, scope/duplicate safety and a 20-row external page. Local results/artifact hashes are in [validation.json](evidence/keyed-selection/validation.json). GitHub Verify is reported on the draft PR for the exact reviewed head.

The tracked Blazor bundle/source map are regenerated by the standard build so NuGet consumers receive the same optimized core. Unrelated qualification fixture/typecheck/workflow changes from #41 are excluded.

## Conditions and reproduction

Same machine as #41: Windows 10.0.26200, AMD Ryzen 5 3550H, 8 logical CPUs, 29.94 GiB RAM. Node 22.14.0, pnpm 10.33.0, TypeScript 6.0.3, Chromium 156.0.8078.4. Headless browser, viewport 1280×900, default browser launch flags, no CPU throttling, fictional local rows, local Vite, no backend requests. Tests/builds were stopped during timing and allocation sampling. The protocol does not control Windows power/thermal scheduling or claim cross-hardware generality.

The source snapshot used as main reference is the preserved qualification candidate at `.private/v120-candidate`; `git diff 206192e -- packages/grid-core/src packages/grid-web/src/components/DataGrid.ts packages/grid-react/src/DataGrid.tsx packages/grid-react/src/gridBindings.ts` is empty. Its package metadata was prepared during #41, but relevant shipping source is identical to main. The old v1.1.0 snapshot is used only for the initial reproduction. `candidate`/`v110` in paired raw files mean optimized/main respectively; the original harness labels were preserved to keep workload code identical.

See [scripts/performance/README.md](../../scripts/performance/README.md). The original qualification and React harnesses were copied from #41 without workload changes. Additional independent harnesses cover profiled core operations, allocation sampling and cold first click. No fixture allocation or module loading is included in adoption timers. Forced GC occurs before the first ten adoption samples per workload/version; ten subsequent samples use natural GC, repeated over three runs. Core profiled control GC occurs before each operation batch, not before every sync. Do not compare or combine those GC protocols as if identical.

## Remaining limitations and recommendation

Cold 100k keyed adoption still costs materially more than historical unkeyed v1.1.0. A first initialization or changed identity sequence must rebuild a complete index. Same-key synchronization still checks every identity. Active local transforms, config-only refreshes and large selection snapshots retain full-data/selection work. No explicit performance budget has been accepted.

The React benchmark is a development-profiler workload, not new packaged Next production/StrictMode qualification. Angular 22 peers were tested with Node 22.14 below their declared supported engine minimum; this session does not establish a supported Angular runtime matrix. Broad root TypeScript, real screen-reader speech, Safari/touch and Blazor WASM caveats from #41 remain. No Property Management files/services were changed.

**Recommendation: independent review, then repeat release qualification on the accepted workloads and supported environments. Release gate remains BLOCKED. Do not merge either PR, change versions, tag, publish or deploy as part of this session.**
