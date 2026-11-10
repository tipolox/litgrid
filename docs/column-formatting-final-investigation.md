# #34 final targeted performance investigation

**NO-GO for merge/release of the combined align + format PR. Preferred path: a separate, independently qualified alignment-only draft PR; defer Intl formatting to independent-host qualification.** Performance benchmarking on this physical host has stopped after the predeclared A/B schedules. Thresholds have not changed.

One narrow correction **was applied**: generated display callbacks now come from a module-level factory, fixing a demonstrated formatter-retention regression. Intl sharing remains an experiment; it was not promoted into production. There is no public API change from this correction.

## Review, isolation and exact versions

Read the [architect checkpoint](https://github.com/tipolox/litgrid/pull/68#issuecomment-6760370496) before these experiments. Reviewed PR head: `3c1e651054cc3da2ce88451c7cc5c402c7fc4138`; measured production runtime: `9fdf58e8d00962ee585dd70e1b9fc786823cbdb3`; fetched main/exact baseline: `0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8`. Experimental worktree: `.worktrees/column-formatting-34-final-perf`, separate from implementation and A3. All source variants were temporary Vite transforms over exact built modules; production source/dist files were not patched for experiments. Before/after module bytes, hashes, complete entry source, exact runner revisions and every raw observation are retained in the [manifest](performance/evidence/column-formatting-34/final-targeted/manifest.json).

Original source revisions remain in Git; all earlier benchmark archives/manifests are unchanged. Earlier source hashes describe their pinned runtime, not the corrected working tree. The new manifest separately pins the corrected TypeScript and regenerated Blazor bundle/map. The final correction's commit/CI are recorded on [PR #68](https://github.com/tipolox/litgrid/pull/68).

| Build | Change | Use / disposition |
| --- | --- | --- |
| Current | reviewed production bytes | A/B reference; retains historical formatter instances under schema churn |
| Current-AA | byte-identical current bundle | A/A control; bundle SHA equality asserted |
| no-vue-metadata | exact main Vue gridBindings module | A only; intentionally strips configured presentation metadata behavior, never a production patch |
| no-web-guards | remove only two presentation scans and two alignment class guards | A only; unsafe for configured presentation, never a production patch |
| no-alignment-css | remove only seven additive alignment rules | A only; never a production patch |
| shared-date (V1) | staged per-grid/adoption pool for identical date descriptors | B timed; constructor benefit clear, ownership gate fails |
| detached-display | only move closure construction out of schema adoption | correctness-only C; minimal correction applied; no sharing |
| shared-date-detached (V2) | sharing plus detached display factory | correctness-only C; ownership passes, **untimed**, defer |
| Production correction | actual TypeScript factory extraction | correctness-only D and Date/Number GC gate; no post-stop timing claim |

## Method and stop rule

Same Windows/AMD Ryzen 5 3550H physical host, Node 22.14.0, locked dependencies, minified production bundles and Chromium 156.0.8078.4. No timing studies ran concurrently. The host is not a laboratory-isolated machine; OS/thermal/process/JIT/GC effects remain material. This is not independent-host performance acceptance.

- **A: three fresh-browser runs × 30 alternating pairs × four comparisons = 720 samples / 360 pairs.** Each comparison has its own reference/variant pages, equal three-workload warmup and alternating page order. Cases rotate/reverse. GC and two settling rAFs occur outside each timer. Existing Vue 30k/3 workload, including its subsequent updates/scroll/metadata/refresh/best-fit operations, is preserved. Mount is the primary hypothesis; all secondary observations remain in raw/summary JSON.
- **B: two fresh-browser runs × 30 alternating pairs × four comparisons = 480 samples / 240 pairs.** New page/context for every startup, no workload warmup. Current, shared V1 and exact baseline use equivalent 120-column ISO fixtures. Baseline hoisted Intl constructors are **inside initialization**. Pair order alternates; comparison order rotates/reverses. A/A remains byte-identical.
- **C/D and ownership checks are correctness-only, zero timing rounds.** No further benchmark or performance confirmation was run after A/B. Current runner refuses accidental timing replay without explicit independent-host intent and pinned source arguments. Correctness/GC checks continued to establish whether a proposed correction was safe.

Quantiles retain sorted floor(n×p), with 4,000 seeded paired-cluster bootstrap resamples stratified by run. Positive pairs mean right minus left >1e-6 ms; ties retained. Intervals are pointwise 95% percentile intervals, not multiple-test correction, causal proof or formal equivalence tests. Raw per-pair deltas, SD/ranges, means/intervals, update/scroll arrays and unfavorable observations are retained. No interval was used to silently waive the unchanged `max(5% of baseline, 0.5ms)` trigger. A/A is a control, not a subtraction used to manufacture a pass.

## A — Vue unconfigured startup

[Complete A distributions, paired deltas and variability](performance/evidence/column-formatting-34/final-targeted/A/summary.json). Times are ms. AA means current → identical current; the other right-hand sides are the individual ablations.

| Comparison (left → right) | Mount p50/p95 | Δ p50; 95% interval | Δ p95; 95% interval | Slower right mounts |
| --- | --- | --- | --- | --- |
| current → AA | 10.70/19.60 → 9.80/22.60 | -0.90; [-2.20, 0.40] | 3.00; [1.00, 5.60] | 38/90 |
| current → vue-metadata | 10.60/20.40 → 10.20/24.70 | -0.40; [-1.70, 0.60] | 4.30; [-8.50, 13.30] | 40/90 |
| current → web-guards | 10.40/21.70 → 11.00/22.00 | 0.60; [-0.80, 1.70] | 0.30; [-4.30, 7.10] | 40/90 |
| current → alignment-css | 11.00/20.30 → 10.40/21.90 | -0.60; [-2.00, 1.20] | 1.60; [-2.00, 8.10] | 39/90 |

| Comparison | Run 1 mount p50/p95 (Δ p50) | Run 2 | Run 3 |
| --- | --- | --- | --- |
| AA | 14.30/19.60 → 14.30/25.10 (0.00) | 9.00/19.80 → 8.80/18.40 (-0.20) | 9.70/19.30 → 8.50/16.30 (-1.20) |
| vue-metadata | 13.00/27.70 → 13.40/32.10 (0.40) | 10.00/17.20 → 9.70/17.10 (-0.30) | 10.10/17.50 → 9.20/17.20 (-0.90) |
| web-guards | 13.70/21.70 → 12.90/22.10 (-0.80) | 10.00/25.30 → 9.10/20.00 (-0.90) | 9.90/15.80 → 10.10/18.30 (0.20) |
| alignment-css | 14.40/22.00 → 13.50/28.40 (-0.90) | 10.00/18.20 → 8.90/21.90 (-1.10) | 8.60/21.30 → 9.10/15.30 (0.50) |


**No single ablation identifies a repeatable above-trigger improvement.** Pooled mount p50 changes are −0.40 ms (Vue metadata), +0.60 ms (Web scanning/class guards), and −0.60 ms (CSS), with all three intervals including zero. The identical-build control drifts −0.90 ms at p50 and +3.00 ms at p95; its p95 interval [+1.00,+5.60] excludes zero despite identical source. This demonstrates why a pointwise timing interval alone cannot attribute a code regression on this host. Default setter/Intl counter parity holds across all A pairs. The original Vue signal remains unattributed; these removals are not safe production corrections and were not applied.

## B — fresh 120-column ISO formatter initialization

[Complete B distributions, counts, phases and pairs](performance/evidence/column-formatting-34/final-targeted/B/summary.json). Values are baseline/left → candidate/right, in ms, p50/p95. Compare within each paired row; process/host drift makes absolute numbers across independently paired rows unsuitable for synthetic comparisons.

Render-ready initialization starts before columns and either side's constructors. Full render-ready additionally includes allocating the 30k fixture and descriptor data. First usable adds two rAFs and checks laid-out viewport/nonempty display; it is a readiness proxy, not a paint or input-latency timestamp. Module downloads/compilation and browser launch are outside all those app initialization clocks. Native constructor time and adoption are inclusive/overlapping phases; the JSON retains per-sample non-native remainders, not differences of aggregate quantiles. A separate constructor probe after the sample is locale-warmed and is labeled separately in JSON.

| Paired comparison | Constructors left/right | Render-ready p50/p95 | Δ render-ready p50; interval | Δ render-ready p95; interval | First usable p50/p95 |
| --- | --- | --- | --- | --- | --- |
| AA | 120.00/120.00 / 120.00/120.00 | 147.70/176.90 → 144.90/173.30 | -2.80; [-10.70, 2.10] | -3.60; [-25.00, 9.10] | 189.00/222.60 → 183.90/216.40 |
| current-vs-shared | 120.00/120.00 / 1.00/1.00 | 153.20/183.00 → 109.70/139.50 | -43.50; [-47.70, -36.40] | -43.50; [-62.70, -21.50] | 193.00/224.50 → 149.90/180.70 |
| baseline-vs-shared | 120.00/120.00 / 1.00/1.00 | 142.00/167.80 → 106.90/126.60 | -35.10; [-41.20, -30.90] | -41.20; [-48.10, -30.70] | 180.70/205.30 → 145.30/166.40 |
| baseline-vs-current | 120.00/120.00 / 120.00/120.00 | 141.00/172.00 → 146.50/169.80 | 5.50; [-0.90, 10.90] | -2.20; [-13.00, 90.70] | 179.00/215.00 → 186.20/215.40 |

| Paired comparison | Fixture-inclusive full render-ready p50/p95 | Full first usable p50/p95 | Native constructor time p50/p95 | Adoption inclusive p50/p95 | Render after adoption p50/p95 |
| --- | --- | --- | --- | --- | --- |
| AA | 152.90/182.60 → 149.20/178.70 | 192.70/228.20 → 188.70/220.80 | 59.90/73.50 → 58.50/76.50 | 67.10/86.70 → 65.50/86.50 | 75.80/96.80 → 73.80/88.10 |
| current-vs-shared | 157.90/186.20 → 115.00/144.80 | 196.80/233.70 → 154.30/184.70 | 62.10/81.20 → 27.10/32.40 | 70.60/92.40 → 30.30/37.00 | 77.20/89.30 → 76.00/99.10 |
| baseline-vs-shared | 147.10/172.50 → 112.00/131.50 | 185.10/209.40 → 149.90/171.20 | 57.70/75.00 → 26.60/32.50 | 0.20/0.30 → 29.50/36.30 | 76.20/88.10 → 73.40/90.90 |
| baseline-vs-current | 145.10/176.50 → 151.70/173.80 | 183.50/220.10 → 191.00/219.40 | 58.40/79.20 → 57.40/73.50 | 0.20/0.70 → 66.20/83.60 | 74.50/85.60 → 74.10/90.00 |

| Comparison / run | Render-ready p50/p95 | Δ p50; interval | Δ p95; interval | Slower right / 30 |
| --- | --- | --- | --- | --- |
| AA / 1 | 152.20/177.80 → 146.20/171.90 | -6.00; [-14.80, 0.40] | -5.90; [-34.50, 7.60] | 9/30 |
| current-vs-shared / 1 | 155.40/169.40 → 111.20/139.50 | -44.20; [-48.70, -34.90] | -29.90; [-62.30, -9.20] | 3/30 |
| baseline-vs-shared / 1 | 143.40/167.80 → 107.80/124.60 | -35.60; [-43.70, -29.00] | -43.20; [-48.10, -31.80] | 1/30 |
| baseline-vs-current / 1 | 144.40/173.30 → 153.20/175.20 | 8.80; [-1.00, 17.30] | 1.90; [-17.10, 99.60] | 17/30 |
| current-vs-shared / 2 | 150.70/183.00 → 109.20/132.40 | -41.50; [-56.00, -31.40] | -50.60; [-77.30, -33.50] | 1/30 |
| baseline-vs-shared / 2 | 140.50/164.70 → 104.30/126.60 | -36.20; [-43.50, -28.20] | -38.10; [-54.90, -23.40] | 0/30 |
| baseline-vs-current / 2 | 138.60/169.70 → 136.10/166.20 | -2.50; [-9.90, 13.00] | -3.50; [-20.00, 15.60] | 16/30 |
| AA / 2 | 144.50/163.10 → 141.00/174.80 | -3.50; [-13.20, 12.40] | 11.70; [1.50, 18.60] | 16/30 |


**Redundant date construction is an attributable optimization opportunity.** V1 reduces constructors **120 → 1**, keeps formatter invocation counts and render semantics, and reduces current-paired render-ready p50/p95 **153.20/183.00 → 109.70/139.50 ms**. The p50 interval is [−47.70,−36.40] ms and p95 [−62.70,−21.50] ms. Both fresh-browser runs improve substantially; the identical-build control is much smaller and spans zero. The baseline-paired prototype also improves. This does **not** prove the old candidate-specific startup penalty: baseline → current remains inconclusive (p50 +5.50 ms, interval [−0.90,+10.90]; p95 −2.20 ms, interval [−13.00,+90.70]). Unfavorable baseline/current tails remain in the data.

The pool uses validated raw locale/dateStyle/timeStyle/timeZone tuples in fixed order. It seeds only from the same grid's previous active entries; no global cache, cross-grid reuse or per-cell construction. New identical column keys can share; distinct descriptors construct independently; numbers remain separate. But structural map bounds alone were insufficient: V1 failed the ownership gate below. A lower construction count is not zero-cost formatting and is not sufficient for release.

## Ownership regression and the only production correction

After 64 date descriptor changes with stable number siblings, explicit full collections found **64 date instances still reachable while active**, and **one** still reachable after removing date columns. Disconnect released them. This occurred in both reviewed current code and shared V1. [Original and repeated ownership results](performance/evidence/column-formatting-34/final-targeted/C-ownership/memory.json) and [strong retainer paths](performance/evidence/column-formatting-34/final-targeted/C-ownership/retainers.json) retain the evidence, with compressed full heap snapshots.

The snapshots have 64 tagged DateTimeFormat objects with strong paths through generated display closures, lexical contexts and earlier schema/cache Maps (longest shortest paths 383/380 edges). Weak edges are excluded from the retainer analysis. The closures were created inside the schema map callback and retained its context chain. An independent factory-only ablation removes that chain without changing the callback bodies or schema/cache policies. This is a source-attributed lifetime regression, rather than another noisy timing flag.

| Correctness build | Constructed | Reachable while one date active | After dates removed | Disconnected |
| --- | --- | --- | --- | --- |
| Current | 64 | 64 | 1 | 0 |
| Shared V1 | 64 | 64 | 1 | 0 |
| Factory only | 64 | 1 | 0 | 0 |
| Shared + factory V2 | 64 | 1 | 0 | 0 |

Applied **only** the module-level display factory extraction in `columnFormatting.ts`, plus its regenerated Blazor bundle/map. No Intl sharing, new public field, descriptor grammar change, validation order change, query/copy change or adapter synchronization optimization. The formatter cache representation and construction count remain unchanged. TypeScript callback bodies preserve numeric missing/invalid handling, strict date conversion and renderer precedence exactly.

A new production [retention gate](../scripts/check-column-formatting-retention.mjs) proves the same failure before the fix and passes afterward for **both NumberFormat and DateTimeFormat**: 64 constructed → one active → zero on removal/disconnect. It is added to Verify CI. This checks JS reachability/ownership under forced renderer GC, not total native ICU memory, long-lived application leakage or every engine's GC policy.

**Do not combine V1's timings with V2's safety as if they describe one qualified binary.** V2 passed mixed-descriptor, atomicity, lifecycle and ownership checks but was deliberately not timed after the host stop. The production factory-only correction also has no new timing acceptance claim. The pool remains a separate prototype for independent-host qualification.

## Correctness and compatibility evidence

- Current/V1 in both B runs and all four C variants pass initial 120-column construction, reversed option order, unchanged descriptor reuse, changed locale/timezone/style, new identical keys, mixed number/date descriptors, custom render precedence, invalid/missing inputs, B1 refresh, removal and reconnect, and no cross-grid cache.
- Sixteen rejection cases per qualification include invalid locale, timezone, date option/value, unsupported fields, missing timezone, invalid currency, duplicate keys and alignment. Both columns setter and reconciliation retain cache identity, width/order/visibility, selection and focus; subsequent valid updates recover.
- Each B/C/D qualification also executes the existing ten LTR/text-level RTL geometry cases and real React/Vue/Angular, compiled Vue inline metadata and Blazor JSON recovery checks. There is no full RTL or screen-reader certification claim.
- Actual corrected production build D repeats these functional checks, retaining **120** initial constructors (sharing is not applied). The Date/Number GC test passes and its pre-fix run fails as expected. New terminal timing-study DOM snapshots remain within 15 rows / 165 cells; prior mutation-observed bounds remain 19/247. No virtualization contract changed.
- Local all-package build passed, strict source/public types passed, standalone strict qualification fixture passed, **468 JS tests / 55 files passed**, and **134 Blazor tests passed**. The first local .NET restore was blocked by the restricted sandbox; the permitted retry succeeded. No performance threshold or repository test timeout changed; the local fork-pool run used the previously documented 15s command-line test timeout. CI retains its existing test invocation. Final exact-head CI is linked from #68; functional success does not discharge the performance hold.

## Decision and preferred release path

**NO-GO for combined #68 merge/performance acceptance.** A has no attributed correction; B has a clear constructor reduction but its timed binary fails ownership, while its ownership-safe binary remains untimed. The isolated retention bug is corrected, and no other production optimization was made. **Stop further performance benchmarking on this host.** #67 and #68 remain draft; no merge, release, tag, publication, deployment or issue closure.

**Preferred proposal: a separate alignment-only draft against latest main**, with its own isolated worktree and independent qualification. Public scope: only `align?: 'start' | 'center' | 'end' | 'left' | 'right'` and the type export/metadata propagation through Web, React, Vue inline/declarative columns, Angular and Blazor. Exclude `format`, Intl descriptors/compilation, generated display callbacks and formatter cache. This is a proposal, not a created or performance-approved new PR.

That draft should independently verify flex placement for all five values in LTR/text-level RTL; stable header controls/resizing/keyboard/custom renderers; atomic rejection/recovery preserving focus/selection/user schema state; typed columns, strict Vue/Angular template consumers, actual Blazor JSON/lifecycle; B1/external-query regressions and virtualization. Qualify its default path on another controlled host with unchanged thresholds and paired/A/A evidence, focusing on Vue 30k/3 plus required 5k/30k × 3/120 bounds. Existing A CSS results do not waive that gate. GO only to prepare/review that independently qualified draft, **not GO to merge or release it now**.

Defer Intl formatting to a separate performance qualification using the corrected closure ownership and the bounded pool prototype. Require one exact ownership-safe binary to pass cold first-use and full initialization p50/p95, constructor/invocation/DOM bounds, schema churn/GC, atomic errors, adapter and Blazor tests on independent hardware; retain unfavourable observations. No benchmark extension on the original host is proposed.

## Replay and provenance

A/B schedules are complete. Current tools require explicit pinned source and independent-host intent for timing replay. Retained exact runner revisions and module snapshots reproduce the original versions; C/D are explicitly zero-round correctness runs. Production qualification and GC gates can run without benchmarking.

```sh
# On an independently qualified host, build a source worktree pinned to 3c1e651...
node scripts/final-formatting-experiments.mjs --current=../pinned-3c1e651 --runtime=9fdf58e8d00962ee585dd70e1b9fc786823cbdb3 --replay-on-independent-host --experiment=A --runs=3 --rounds=30 --output=.private/final-experiments/A
node scripts/final-formatting-experiments.mjs --current=../pinned-3c1e651 --runtime=9fdf58e8d00962ee585dd70e1b9fc786823cbdb3 --replay-on-independent-host --experiment=B --runs=2 --rounds=30 --output=.private/final-experiments/B
node scripts/analyze-final-formatting-experiments.mjs .private/final-experiments/A
node scripts/analyze-final-formatting-experiments.mjs .private/final-experiments/B
# Correctness-only ownership isolation against pinned original production:
node scripts/final-formatting-experiments.mjs --current=../pinned-3c1e651 --runtime=9fdf58e8d00962ee585dd70e1b9fc786823cbdb3 --experiment=B --ownership-only --runs=1 --rounds=0 --output=.private/final-experiments/C-ownership
node scripts/check-final-formatting-memory.mjs .private/final-experiments/C-ownership --all --snapshots
# CI: run after the existing production formatting browser build
node scripts/check-column-formatting-retention.mjs
```

Full fixture-inclusive and prior initialization metrics, constructor probes, invocation/setter counts, steady updates/scroll and per-pair observations are retained, including adverse results. Historical benchmark evidence has not been rewritten around this correction. Exact final implementation head and CI links on #68 are the independent review entry point.
