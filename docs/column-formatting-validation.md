# #34 implementation and qualification

**GO for independent architecture review; NO-GO for merge/performance acceptance pending explicit disposition of the remaining threshold flags below.** Correctness and structural qualification pass; this is not a claim of zero default-path regression.

## Provenance and scope

Base main: `0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8`, fetched and independently checked against GitHub.
#66 post-merge [Verify 42649708858](https://github.com/tipolox/litgrid/actions/runs/42649708858) succeeded on this exact SHA, all 23 steps.
Design: separate draft [#67](https://github.com/tipolox/litgrid/pull/67), head `4a8591bfe98fa285ad9f64f32345aa82af239959`, and its [architectural approval](https://github.com/tipolox/litgrid/pull/67#issuecomment-6745283654).
Implementation is isolated in `.worktrees/column-formatting-34-impl`, branch `codex/34-column-formatting`; the exact review head/CI are recorded in the implementation PR.
The RFC branch was not merged. Original workspace and A3 experiments were not edited.

Public API, precedence, input grammar, migration and examples: [column formatting](column-formatting.md).
Only `align`, `format`, their two TypeScript type exports, Vue inline metadata and matching Blazor metadata are added.
No core query/export/width API, dependency/version change, tag, package publication, deployment or issue closure.

## Architecture and the three safeguards

1. Body flex justification and a flexible header-label region implement all five alignments. Chromium measured physical/logical text placement, stable action geometry, custom renderer placement, resize and keyboard/ARIA behavior in LTR and text-level RTL. No full RTL layout claim. [Actual alignment screenshot](assets/column-formatting-alignment.png) was visually inspected. Native bidi ordering is retained; en-GB negative decimals in RTL show the inherited sign ordering, without forced LTR isolation.
2. Blazor logs known managed/native presentation failures without escaping its render lifecycle; invalid child metadata blocks synchronization until corrected or removed, protecting Server circuits. Explicit refresh still surfaces failures. Descriptor validation and formatter creation are staged before active schema/cache adoption. Invalid options/types/locale/zone/currency/alignment retain last valid schema/state. Source arrays are not mutated. Tests exercise Web, React, Vue, Angular, Vue declarations and Blazor programmatic/declarative boundaries and recovery. React specifically reports presentation errors via console.error so an effect exception cannot unmount the valid grid; other errors keep existing behavior.
3. Plain formatting compiles into detached internal render callbacks; consumer renderers win. The cell render method is textually identical to main (verified), and unconfigured schema adoption preserves its original representation. Alignment classes are cached at adoption. Cache entries and generated closures are released on disconnect/removal; reconnect, state resets and namespace restore keep presentation and keyed customization. No global cache, framework cell instance, deep row comparison or per-cell formatter construction.

Core source-field sort/filter/search, accessor behavior, raw clipboard, external query revisions, B1 refresh and virtualization remain. Active-cell live announcements use the plain formatted value. Rich custom renderers retain their existing announcement behavior and accessibility responsibility.

## Validation

Environment: Windows; Node 22.14.0; pnpm 10.33.0; TypeScript 6.0.3; Chromium 156.0.8078.4; .NET SDK 10.0.403 targeting net8.0. CI uses its existing pinned Node 22.22.3 and .NET 8.

| Command/check | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS; lockfile unchanged |
| pnpm typecheck:all | PASS, 128 authored files, both strict projects |
| node scripts/typecheck-contracts.mjs | PASS; source public contracts |
| pnpm test --maxWorkers=2 --pool=forks --testTimeout=15000 | PASS: 468 tests / 55 files on the compiled path |
| pnpm run build | PASS: all packages/playground, including regenerated tracked Blazor bundle/map |
| pnpm exec tsc -p tsconfig.published-contracts.json --pretty false | PASS against fresh package declarations |
| pnpm exec vue-tsc -p tsconfig.vue-columns.json --noEmit --pretty false | PASS: actual strict SFC; inline align/format and negative metadata types |
| pnpm --filter @tipolox/litgrid-angular exec ngc -p ../../tsconfig.typed-columns-angular.json | PASS: actual strict Angular consumer |
| node scripts/check-adapter-events.mjs | PASS: 12 real React/Vue/Angular local/external lifecycle cases |
| node scripts/check-vue-columns.mjs | PASS: compiled template, dynamic schema/order/visibility, external state, persistence, keyboard/B1 and large workloads |
| node scripts/check-column-formatting.mjs | PASS: production geometry/recovery checks; final paired run below also executes them |
| dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj -c Release | PASS: 134 tests, zero failures/skips |
| dotnet build packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj -c Release | PASS: zero warnings/errors |
| dotnet build packages/grid-blazor/tests/browser/BrowserHost.csproj -c Release; node scripts/check-blazor-formatting.mjs | PASS: eight actual .NET WebAssembly JSON/locale/align/option/type recovery cases, timezone and state/focus across both column sources |
| node packages/grid-blazor/tests/browser/run.mjs | PASS: 13 existing real WASM browser cases; optional 3.6-million-value serialization stress was not enabled |
| node scripts/check-column-setters.mjs | PASS: every public setter matched across 46 production workload pairs; DOM observed throughout mutation/scroll/update |
| git diff --check | PASS |

The first loaded Windows jsdom run hit an existing 5-second large-grid test timeout (7.2s). Extended-command runs passed; no repository timeout was relaxed. One slow thread-pool run returned 467 passes after 319s and was initially mistaken for a stall; no process was stopped. Fork-pool confirmation passed, and the final expanded suite above passed. Early harness attempts failed before usable data because Angular JIT initialization order and duplicate baseline React runtimes needed correction; the production runner now loads the compiler first and deduplicates framework runtimes.

## Production performance method

Exact main was built in a separate detached baseline worktree. Both packages and harness bundles are production builds, minified, in the same warmed Chromium runtime with separate pages and shared dependency versions. Each measured page is brought forward; pairs alternate order across **15 rounds**. A forced GC precedes each sample. The first two updates per sample are warmup; ten updates and six vertical/horizontal scroll operations are recorded. These timings include await/render completion, and scrolling includes frame scheduling. Values below are milliseconds, **baseline → candidate**, each pair written **p50/p95**. Quantiles use sorted floor(n × p), consistent with the previous #33 method.

Final matrix: **1,380 samples / 690 pairs**, 46 cases. Each variant/case has 15 mount/metadata/refresh/best-fit samples, **150 update samples**, **90 scroll samples**. Rows: 5k/30k; schema widths: 3/120; Web, React, Vue, Angular, Vue declarations and 3-field inference. Formatted cases cover physical alignment, one/all numeric columns, epoch dates, ISO dates and hoisted-Intl renderers. The 120-column schema uses accessors over compact rows, avoiding millions of fixture values; this is a rendering benchmark, not a full Blazor transfer benchmark.

Native constructor/format calls and schema/data/config/inference operations are counted in the timed harness, symmetrically for both versions. The separate count-only pass instruments **every public setter** and uses MutationObserver on the grid shadow roots to observe peak DOM during all workloads. Peak observed: **19 rows / 247 body cells**, independent of dataset size. Model/schema setter parity passed every timed default pair. Steady updates/scroll construct **zero** Intl instances; unconfigured/alignment-only cases do **zero** Intl work.

Hoisted baseline renderers construct Intl before the timed mount; candidate descriptors construct during adoption. Both constructor counts are retained, but formatted mount timings therefore compare consumer mount behavior rather than total application cold initialization. ISO baseline renderers use Date.parse; candidate descriptors add strict grammar/calendar validation. Do not interpret these as identical parser microbenchmarks. Angular uses the published partial-compiled component with JIT in this test harness; strict template compilation is a separate gate.

### Final default workloads

| Workload | Mount p50/p95 | Update p50/p95 | Scroll p50/p95 |
| --- | --- | --- | --- |
| web, 5,000 / 3 | 6.80/14.40 → 6.60/11.40 | 1.00/2.20 → 1.10/2.50 | 14.00/18.50 → 14.50/18.50 |
| react, 5,000 / 3 | 8.10/17.40 → 7.40/15.50 | 1.50/3.20 → 1.50/2.50 | 12.10/18.60 → 12.50/19.20 |
| vue, 5,000 / 3 | 7.30/28.20 → 7.80/15.70 | 1.40/2.90 → 1.60/3.10 | 13.50/19.50 → 13.30/19.30 |
| angular, 5,000 / 3 † | 8.00/46.00 → 9.30/17.00 | 1.30/2.40 → 1.50/3.50 | 13.60/19.00 → 12.30/19.30 |
| declarative, 5,000 / 3 † | 11.50/18.00 → 9.30/16.50 | 1.90/3.60 → 1.90/3.50 | 10.80/18.80 → 13.10/19.40 |
| inferred, 5,000 / 3 † | 12.70/20.10 → 12.80/18.50 | 1.70/3.20 → 1.70/2.90 | 12.30/19.10 → 13.20/18.80 |
| web, 5,000 / 120 † | 15.10/30.80 → 15.70/41.80 | 3.80/8.20 → 4.00/6.60 | 14.80/27.20 → 15.00/23.60 |
| react, 5,000 / 120 † | 16.60/31.80 → 16.90/33.00 | 4.00/7.00 → 4.20/7.20 | 14.80/26.80 → 14.30/28.30 |
| vue, 5,000 / 120 † | 21.90/33.90 → 18.60/39.80 | 4.40/8.40 → 4.30/8.60 | 15.80/31.40 → 15.90/30.30 |
| angular, 5,000 / 120 † | 17.00/36.60 → 15.50/49.90 | 3.80/6.60 → 4.20/8.20 | 13.90/25.80 → 13.80/22.60 |
| declarative, 5,000 / 120 † | 16.80/40.30 → 19.00/38.10 | 4.30/7.20 → 4.50/9.20 | 15.40/32.20 → 15.40/29.60 |
| web, 30,000 / 3 | 7.20/14.90 → 6.80/9.90 | 1.00/2.10 → 1.10/2.20 | 13.90/18.40 → 13.50/18.20 |
| react, 30,000 / 3 | 7.50/16.40 → 7.60/14.40 | 1.40/2.10 → 1.40/2.20 | 13.50/18.60 → 13.50/18.50 |
| vue, 30,000 / 3 † | 7.70/12.60 → 7.20/9.80 | 1.40/2.30 → 1.50/2.40 | 11.90/18.60 → 12.90/19.00 |
| angular, 30,000 / 3 † | 7.60/15.60 → 8.80/13.70 | 1.30/2.00 → 1.40/2.40 | 13.20/18.60 → 13.80/18.80 |
| declarative, 30,000 / 3 † | 7.90/16.20 → 7.50/17.20 | 1.40/2.90 → 1.50/2.20 | 13.10/18.60 → 13.90/18.50 |
| inferred, 30,000 / 3 † | 7.40/14.10 → 9.00/13.90 | 1.10/3.20 → 1.20/3.00 | 12.90/18.70 → 13.00/19.50 |
| web, 30,000 / 120 † | 15.00/33.10 → 17.20/27.30 | 3.60/5.80 → 3.80/7.00 | 15.50/32.20 → 15.30/29.90 |
| react, 30,000 / 120 † | 16.70/30.80 → 19.60/32.20 | 4.20/6.20 → 4.30/7.00 | 14.30/25.10 → 14.90/26.40 |
| vue, 30,000 / 120 † | 16.80/34.70 → 16.40/37.50 | 4.10/6.90 → 4.10/6.00 | 15.90/27.60 → 14.20/25.00 |
| angular, 30,000 / 120 † | 17.20/37.10 → 16.60/30.60 | 3.90/6.40 → 4.00/6.10 | 15.10/27.80 → 14.00/33.40 |
| declarative, 30,000 / 120 † | 17.10/45.10 → 16.60/28.90 | 4.10/6.60 → 4.40/7.10 | 14.80/27.00 → 15.50/33.60 |

† A provisional metric exceeds max(5% of baseline, 0.5ms); see the exact flags below.

### Final opted-in workloads

Baseline uses equivalent hoisted render functions where descriptors are unavailable. The render control uses hoisted callbacks on both versions; alignment-only baseline has default alignment.

| Workload | Mount p50/p95 | Update p50/p95 | Scroll p50/p95 |
| --- | --- | --- | --- |
| web, 5,000 / 3 · align | 7.20/23.10 → 8.80/17.00 | 1.10/2.50 → 1.50/3.20 | 13.90/18.70 → 12.50/19.10 |
| web, 5,000 / 3 · one-number | 7.30/12.90 → 7.50/16.80 | 1.10/3.20 → 1.30/3.00 | 14.00/18.90 → 13.30/18.90 |
| web, 5,000 / 3 · all-number | 7.20/13.90 → 7.40/12.80 | 1.20/2.60 → 1.20/2.80 | 13.30/19.20 → 13.30/18.60 |
| web, 5,000 / 3 · epoch | 7.10/20.20 → 7.60/9.70 | 1.30/2.80 → 1.30/3.10 | 15.00/17.80 → 14.70/18.30 |
| web, 5,000 / 3 · iso | 7.20/18.70 → 8.20/18.80 | 1.30/2.90 → 1.50/3.70 | 15.10/18.20 → 14.50/18.20 |
| web, 5,000 / 3 · render | 7.70/16.50 → 7.80/15.00 | 1.20/3.10 → 1.30/3.10 | 14.60/18.20 → 12.40/18.90 |
| web, 5,000 / 120 · align | 15.40/29.70 → 17.40/33.10 | 3.80/6.40 → 4.00/6.50 | 15.30/27.60 → 14.30/25.70 |
| web, 5,000 / 120 · one-number | 16.30/50.40 → 17.20/32.10 | 3.70/9.10 → 4.10/7.20 | 15.60/27.20 → 15.30/26.80 |
| web, 5,000 / 120 · all-number | 16.70/30.90 → 18.90/48.90 | 3.70/4.80 → 4.00/7.40 | 12.70/22.50 → 14.40/24.40 |
| web, 5,000 / 120 · epoch | 16.90/37.20 → 30.80/60.60 | 4.10/6.70 → 4.10/8.50 | 14.10/21.90 → 14.70/21.50 |
| web, 5,000 / 120 · iso | 16.50/35.00 → 27.80/43.10 | 4.10/6.00 → 4.50/6.80 | 13.60/20.70 → 13.40/21.40 |
| web, 5,000 / 120 · render | 18.10/27.30 → 16.20/40.90 | 3.90/5.70 → 4.00/7.20 | 14.50/24.70 → 14.90/24.30 |
| web, 30,000 / 3 · align | 7.30/15.40 → 7.00/12.60 | 1.00/2.30 → 1.20/2.40 | 14.00/18.80 → 14.00/18.30 |
| web, 30,000 / 3 · one-number | 7.40/20.60 → 7.30/13.70 | 1.10/2.50 → 1.20/2.70 | 12.40/19.00 → 13.90/19.50 |
| web, 30,000 / 3 · all-number | 8.00/24.90 → 8.00/17.90 | 1.20/2.70 → 1.40/2.80 | 13.60/18.60 → 13.60/18.90 |
| web, 30,000 / 3 · epoch | 7.20/11.90 → 7.40/13.30 | 1.20/2.10 → 1.20/2.60 | 15.00/18.00 → 14.50/18.40 |
| web, 30,000 / 3 · iso | 7.50/14.30 → 8.10/14.50 | 1.30/3.00 → 1.40/2.60 | 13.70/17.80 → 14.20/18.10 |
| web, 30,000 / 3 · render | 8.60/27.50 → 7.40/16.40 | 1.20/2.40 → 1.20/2.80 | 13.70/19.50 → 13.30/18.80 |
| web, 30,000 / 120 · align | 17.00/26.30 → 16.20/21.20 | 3.80/5.50 → 3.90/7.60 | 14.20/25.10 → 14.20/24.80 |
| web, 30,000 / 120 · one-number | 16.30/30.50 → 16.30/35.20 | 3.60/5.90 → 3.90/7.90 | 15.00/29.10 → 13.40/28.10 |
| web, 30,000 / 120 · all-number | 16.50/26.70 → 18.10/31.10 | 3.90/5.80 → 4.00/6.00 | 13.20/23.70 → 13.50/26.20 |
| web, 30,000 / 120 · epoch | 15.60/30.90 → 28.40/59.10 | 3.90/7.40 → 4.10/7.30 | 14.10/20.80 → 13.50/22.60 |
| web, 30,000 / 120 · iso | 15.70/33.60 → 28.10/47.90 | 4.00/7.00 → 4.40/8.00 | 13.50/22.40 → 14.00/21.10 |
| web, 30,000 / 120 · render | 15.20/35.70 → 15.80/23.10 | 3.60/4.70 → 3.70/5.50 | 13.60/23.50 → 14.50/27.60 |

### Locale, B1 and best-fit timings

| Scenario (30k / 120, Web) | Metadata/locale p50/p95 | B1 range refresh p50/p95 | Best fit p50/p95 |
| --- | --- | --- | --- |
| default | 2.90/4.70 → 3.40/8.00 | 0.50/0.70 → 0.50/1.00 | 0.40/0.80 → 0.40/0.70 |
| align | 2.60/8.00 → 3.00/7.90 | 0.50/0.80 → 0.50/0.90 | 0.40/0.50 → 0.40/0.50 |
| one-number | 4.80/9.20 → 4.10/8.60 | 0.70/1.10 → 0.50/0.90 | 0.40/0.70 → 0.40/1.10 |
| all-number | 7.20/11.30 → 7.80/12.50 | 0.50/1.10 → 0.60/0.80 | 0.30/0.40 → 0.40/0.60 |
| epoch | 15.00/45.70 → 16.50/36.60 | 0.60/1.00 → 0.60/1.00 | 0.40/1.20 → 0.40/0.70 |
| iso | 16.70/41.10 → 16.80/26.30 | 0.70/1.10 → 0.60/0.90 | 0.40/0.50 → 0.40/0.50 |
| render | 7.30/9.00 → 7.40/15.70 | 0.60/1.10 → 0.60/1.00 | 0.40/0.60 → 0.40/1.20 |

### Formatter work (first final sample for each listed case)

| Scenario (30k / 120, Web) | Native constructors mount base/head | Format calls mount base/head | Native constructors 12 updates base/head | Format calls 12 updates base/head |
| --- | --- | --- | --- | --- |
| default | 0/0 | 0/0 | 0/0 | 0/0 |
| align | 0/0 | 0/0 | 0/0 | 0/0 |
| one-number | 1/1 | 28/28 | 0/0 | 174/174 |
| all-number | 120/120 | 182/182 | 0/0 | 1914/1914 |
| epoch | 120/120 | 182/182 | 0/0 | 1914/1914 |
| iso | 120/120 | 182/182 | 0/0 | 1914/1914 |
| render | 120/120 | 182/182 | 0/0 | 1914/1914 |

All samples/counters, not just this representative row, are retained in the raw archives. Metadata operations replace locale on formatted columns and header labels otherwise; inference has no schema metadata operation. The cache reuse tests separately verify identical descriptors do not reconstruct formatters, including nested option edits and recovery.

### Paired differences

Each summary JSON also includes within-round candidate-minus-baseline deltas for mount and per-sample update/scroll medians, with p50/p95 and positive-pair counts. This preserves the paired analysis rather than relying only on differences between pooled quantiles. Absolute timings from different runs should not be compared as if machine/JIT/frame conditions were fixed.

### Threshold disposition and investigation

The final matrix flags **17 default workloads / 24 metrics**. These are review triggers, not automatic proof of causation. Do not average them away or claim zero overhead.

| Workload | Metric | Base → candidate (ms) | Delta (ms) |
| --- | --- | --- | --- |
| angular, 5,000 / 3 | mount p50 | 8.00 → 9.30 | +1.30 |
| angular, 5,000 / 3 | update p95 | 2.40 → 3.50 | +1.10 |
| declarative, 5,000 / 3 | scroll p50 | 10.80 → 13.10 | +2.30 |
| inferred, 5,000 / 3 | scroll p50 | 12.30 → 13.20 | +0.90 |
| web, 5,000 / 120 | mount p95 | 30.80 → 41.80 | +11.00 |
| react, 5,000 / 120 | scroll p95 | 26.80 → 28.30 | +1.50 |
| vue, 5,000 / 120 | mount p95 | 33.90 → 39.80 | +5.90 |
| angular, 5,000 / 120 | mount p95 | 36.60 → 49.90 | +13.30 |
| angular, 5,000 / 120 | update p95 | 6.60 → 8.20 | +1.60 |
| declarative, 5,000 / 120 | mount p50 | 16.80 → 19.00 | +2.20 |
| declarative, 5,000 / 120 | update p95 | 7.20 → 9.20 | +2.00 |
| vue, 30,000 / 3 | scroll p50 | 11.90 → 12.90 | +1.00 |
| angular, 30,000 / 3 | mount p50 | 7.60 → 8.80 | +1.20 |
| declarative, 30,000 / 3 | mount p95 | 16.20 → 17.20 | +1.00 |
| declarative, 30,000 / 3 | scroll p50 | 13.10 → 13.90 | +0.80 |
| inferred, 30,000 / 3 | mount p50 | 7.40 → 9.00 | +1.60 |
| web, 30,000 / 120 | mount p50 | 15.00 → 17.20 | +2.20 |
| web, 30,000 / 120 | update p95 | 5.80 → 7.00 | +1.20 |
| react, 30,000 / 120 | mount p50 | 16.70 → 19.60 | +2.90 |
| react, 30,000 / 120 | update p95 | 6.20 → 7.00 | +0.80 |
| react, 30,000 / 120 | scroll p95 | 25.10 → 26.40 | +1.30 |
| vue, 30,000 / 120 | mount p95 | 34.70 → 37.50 | +2.80 |
| angular, 30,000 / 120 | scroll p95 | 27.80 → 33.40 | +5.60 |
| declarative, 30,000 / 120 | scroll p95 | 27.00 → 33.60 | +6.60 |

Initial investigation retained all results: the initial conditional-cell implementation flagged 15 workloads; avoiding unnecessary default schema work still flagged 15; fresh default-only pages flagged 15. This motivated compiling formatting into the existing renderer path and caching alignment classes. The final results above follow that change. Machine load/frame scheduling, small mount sample counts and JIT/GC variation affect tails; controls, repeated paired rounds and default-only isolation reduce but do not eliminate these effects. Remaining flags require architect disposition or a more controlled follow-up; no favorable-run selection or zero-regression guarantee is made.

### Heap / allocation / GC evidence

| Variant | Allocation samples | Sampled live bytes | Matching GC trace events |
| --- | --- | --- | --- |
| baseline | 235 | 4281672 | 29 |
| candidate | 203 | 3749996 | 29 |

CDP samples three widest unconfigured workloads per variant at a 16KiB sampling interval. Sampled bytes describe live sampled allocations, not total allocated bytes. GC entries are matching trace events and can include nested phases; they are not distinct collection counts or additive pause time. Per-sample V8 heap used-size distributions are in the summary JSON; DOM/native browser memory is not fully represented. These observations and bounded-cache tests do not constitute a production leak qualification.

## Evidence and reproduction

[Manifest and SHA-256 checksums](performance/evidence/column-formatting-34/manifest.json) pin changed runtime sources and final production bundle bytes. Each readable summary includes every scenario/phase, sample count, counters, DOM and heap distribution. Gzip archives retain individual timings and allocation/GC profiles.

| Run | Samples | Evidence |
| --- | --- | --- |
| pilot (nonqualifying, interrupted pilot) | 92 | [summary](performance/evidence/column-formatting-34/pilot.json) · [raw gzip](performance/evidence/column-formatting-34/pilot.raw.json.gz) |
| initial | 1380 | [summary](performance/evidence/column-formatting-34/initial.json) · [raw gzip](performance/evidence/column-formatting-34/initial.raw.json.gz) |
| snapshot-tuned | 1380 | [summary](performance/evidence/column-formatting-34/snapshot-tuned.json) · [raw gzip](performance/evidence/column-formatting-34/snapshot-tuned.raw.json.gz) |
| default-only | 660 | [summary](performance/evidence/column-formatting-34/default-only.json) · [raw gzip](performance/evidence/column-formatting-34/default-only.raw.json.gz) |
| compiled | 1380 | [summary](performance/evidence/column-formatting-34/compiled.json) · [raw gzip](performance/evidence/column-formatting-34/compiled.raw.json.gz) |

Also retained: [all setters / observed DOM](performance/evidence/column-formatting-34/all-setters.json), [actual Blazor formatting](performance/evidence/column-formatting-34/blazor-browser.json), [existing adapter events](performance/evidence/column-formatting-34/adapter-events.json), [Vue compiled template/workloads](performance/evidence/column-formatting-34/vue-browser.json).

Reproduction after locked install and package builds:

```sh
node scripts/check-column-formatting.mjs --baseline=../exact-main-worktree --rounds=15 --output=.private/formatting.json
node scripts/summarize-column-formatting.mjs .private/formatting.json .private/summary.json
node scripts/check-column-setters.mjs
# Optional default-only investigation in fresh pages:
node scripts/check-column-formatting.mjs --baseline=../exact-main-worktree --defaults-only --rounds=15 --output=.private/defaults.json
```

The interrupted one-round pilot lacked consistent foreground-page handling and is excluded from qualification; its raw data remains available. No demo deployment or A3 modification is required.

## Remaining risks / decision

**GO for independent architecture review; NO-GO for merge/performance acceptance pending explicit disposition of the remaining threshold flags below.** Correctness and structural qualification pass; this is not a claim of zero default-path regression.

- Chromium/Windows evidence does not qualify Firefox/Safari, real screen-reader combinations or full RTL scroll/reorder/navigation layout. A live Blazor Server browser host was not exercised; shared lifecycle tests verify that presentation failures do not escape rendering.
- Intl/ICU locale negotiation/spacing and date display vary by browser. Exact-decimal arithmetic remains outside the existing JS number model.
- C# validates structural JSON; browser Intl is authoritative for native locale/zone/currency/range support. Offset-free .NET DateTime values intentionally require normalization before using dateTime formatting.
- React's presentation-error console reporting, shared source-field query semantics versus accessors, and raw clipboard behavior are deliberate compatibility decisions documented for consumers.
- The performance threshold remains provisional. Runtime correctness and bounded work do not establish a zero-cost rendering guarantee.

No merge, version bump, tag, package publication, deployment or issue closure is part of this implementation PR.
