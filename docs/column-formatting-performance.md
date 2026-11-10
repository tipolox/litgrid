# #34 performance gate follow-up

**Recommendation: NO-GO for merge/performance acceptance; keep #68 and #67 draft.** Environmental variance is demonstrated, but the remaining Vue signal and wide intervals do not establish equivalence at the unchanged provisional threshold. No runtime optimization was made. This report is a completed investigation of the available host, not a claim that every original flag was harmless.

## Exact versions and retained history

Runtime candidate: `9fdf58e8d00962ee585dd70e1b9fc786823cbdb3`. Baseline/latest fetched main: `0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8`. Design remains separate at `4a8591bfe98fa285ad9f64f32345aa82af239959`. The follow-up changes only measurement tools, browser test instrumentation and reports/evidence; the candidate runtime and public API remain byte-for-byte unchanged at source.

Read the [architect review](https://github.com/tipolox/litgrid/pull/68#issuecomment-6756537341) before reproduction. [Historical audit](performance/evidence/column-formatting-34/reproduction/historical-audit.json) verifies all five retained gzip/raw checksums, 22 final runtime source hashes and both original production bundle hashes against the original manifest. The interrupted pilot remains nonqualifying. Intermediate initial/snapshot-tuned/default-only implementations were not separately committed: their measurements prioritize cases but cannot establish repeated behavior of the final head. None of that evidence was replaced or discarded.

All new raw distributions, per-pair deltas, counters, intervals, diagnostic profiles and console logs are linked by the [follow-up manifest](performance/evidence/column-formatting-34/reproduction/manifest.json). Exact first-run harness/runner snapshots are retained because date instrumentation was extended afterward. Every study records its harness and minified production bundle hashes. The A/A bundles have identical SHA-256 values.

## Controlled method

Windows 10.0.26200, AMD Ryzen 5 3550H, 8 logical CPUs, 32 GB RAM; Node 22.14.0 and locked shared framework dependencies. Minified production package builds were used, with separate baseline/candidate application bundles. No development server rendering or runtime source edits.

- Three independent fresh Chromium browser runs, **30 alternating pairs per focused case per run**: 90 pairs/case, 1,260 workload samples. Each case/variant has 90 mount observations, 900 measured updates and 540 scroll observations. Seven cases cover the five prioritized metrics plus Web/React 30k/120 mount/update.
- An additional **30-pair/case byte-identical baseline A/A control**, 420 workload samples. The labels and ports remain baseline/candidate, but both contain baseline code.
- Firefox cross-engine check, **30 alternating pairs/case**, 420 samples. The first restricted-sandbox attempt crashed at page creation and produced no usable timings; its empty archive/log is retained. The permitted retry outside that process sandbox completed. No second physical host was available. Firefox timers in this setup are quantized to 1 ms, limiting sub-millisecond conclusions; it has no CDP forced-GC control.
- Each variant receives every focused workload three times before measurement. There is no candidate-only qualification warmup. Case order rotates/reverses, pair order alternates, and page creation order reverses between Chromium runs. Each measured page is foregrounded, Chromium GC runs outside the timer, then two rAFs settle the frame phase before the workload.
- Fixtures, viewport (1280×900), grid width (900), data/accessors and operations match the original benchmark. The 120-column schema accesses compact row objects. Mount includes adapter creation and Lit completion; fixture allocation precedes the timer. Ten updates follow two update warmups. Six scroll operations include rAF scheduling. Metadata/B1/best-fit work still executes after those phases.
- No performance tests run concurrently. The machine is not an isolated laboratory host; OS scheduling, thermal/frequency changes, background services, renderer processes and browser JIT/GC remain possible sources of variation. No claim of cross-host reproducibility is made.

Quantiles retain the original sorted `floor(n × p)` convention. The original 15-mount p95 was the **maximum**; 30-mount p95 is the second-largest, and 90-mount p95 the fifth-largest. This alone makes original tail flags sensitive to individual slow mounts.

Intervals are 4,000 seeded paired-cluster bootstrap resamples, stratified by fresh-browser run for pooled estimates. Updates/scrolls from one workload remain together. They are pointwise 95% percentile intervals, not family-wise guarantees across many metrics, formal equivalence tests or proof of causation. Positive pairs use candidate-minus-baseline > 1e-6 ms; ties are retained. A per-pair update/scroll quantile is over that workload's 10/6 observations; a pooled quantile is over all observations. Consequently the difference of pooled medians is not the median paired delta. Complete individual deltas and variability (SD, range, mean and mean interval) are in each summary JSON.

The provisional trigger remains **`max(5% of baseline, 0.5 ms)`** with only the existing 1e-6 ms floating-point equality tolerance. Flags remain flags even when an interval includes zero. No run, slow sample or adverse metric was excluded to obtain a pass.

## Focused measurements

All times below are milliseconds, baseline → candidate. Full variability, raw pairs and pointwise intervals: [Chromium](performance/evidence/column-formatting-34/reproduction/chromium/summary.json), [A/A](performance/evidence/column-formatting-34/reproduction/aa/summary.json), [Firefox](performance/evidence/column-formatting-34/reproduction/firefox-retry/summary.json).

### Chromium pooled (90 pairs/case)

Browser: 156.0.8078.4. Values are p50/p95.

| Case | Mount baseline → candidate | Update baseline → candidate | Scroll baseline → candidate |
| --- | --- | --- | --- |
| react 5k/120 | 21.90/37.70 → 21.70/38.30 | 5.40/10.30 → 5.40/10.30 | 17.30/31.30 → 17.70/32.00 |
| vue 30k/3 | 10.90/21.50 → 12.50/20.80 | 1.80/3.90 → 1.90/4.00 | 12.90/19.70 → 12.80/20.00 |
| inferred 30k/3 | 8.80/17.10 → 9.20/16.50 | 1.40/2.80 → 1.50/2.70 | 13.30/19.40 → 13.50/19.20 |
| vue 30k/120 | 25.60/39.40 → 27.60/40.10 | 6.20/10.50 → 5.90/9.80 | 19.90/38.40 → 19.00/36.90 |
| web 5k/120 | 22.60/40.10 → 21.20/41.00 | 5.40/9.10 → 5.50/9.80 | 18.00/33.00 → 18.40/32.90 |
| web 30k/120 | 24.00/42.50 → 23.10/37.00 | 5.40/10.00 → 5.40/9.50 | 19.10/36.90 → 18.90/37.10 |
| react 30k/120 | 24.00/39.40 → 23.20/39.80 | 5.70/9.70 → 5.60/9.90 | 18.20/37.90 → 18.70/35.40 |
### Identical-build A/A (30 pairs/case)

Browser: 156.0.8078.4. Values are p50/p95.

| Case | Mount baseline → candidate | Update baseline → candidate | Scroll baseline → candidate |
| --- | --- | --- | --- |
| react 5k/120 | 17.80/35.50 → 17.60/33.60 | 4.70/9.40 → 4.50/9.50 | 16.60/33.40 → 16.20/30.40 |
| vue 30k/3 | 9.80/15.90 → 10.60/18.10 | 1.50/3.10 → 1.50/3.50 | 13.80/19.10 → 13.70/19.60 |
| inferred 30k/3 | 7.70/17.70 → 7.10/13.90 | 1.20/2.30 → 1.20/2.10 | 13.80/18.90 → 14.20/18.70 |
| vue 30k/120 | 18.50/38.90 → 19.40/40.50 | 4.50/9.40 → 4.60/7.90 | 16.10/30.30 → 16.90/28.90 |
| web 5k/120 | 16.20/43.00 → 17.00/30.50 | 4.30/8.50 → 4.10/8.80 | 15.70/28.90 → 14.70/25.10 |
| web 30k/120 | 22.20/32.60 → 17.00/36.20 | 4.40/7.60 → 4.20/9.50 | 16.00/34.50 → 16.50/32.30 |
| react 30k/120 | 19.00/42.40 → 18.70/39.90 | 4.30/8.70 → 4.70/9.20 | 16.30/34.70 → 16.20/37.60 |
### Firefox (30 pairs/case)

Browser: 157.0. Values are p50/p95.

| Case | Mount baseline → candidate | Update baseline → candidate | Scroll baseline → candidate |
| --- | --- | --- | --- |
| react 5k/120 | 27.00/53.00 → 27.00/64.00 | 10.00/22.00 → 10.00/23.00 | 24.00/54.00 → 27.00/52.00 |
| vue 30k/3 | 14.00/27.00 → 13.00/38.00 | 4.00/8.00 → 4.00/10.00 | 24.00/38.00 → 22.00/38.00 |
| inferred 30k/3 | 14.00/27.00 → 11.00/26.00 | 3.00/9.00 → 3.00/6.00 | 22.00/38.00 → 24.00/40.00 |
| vue 30k/120 | 30.00/60.00 → 30.00/68.00 | 9.00/19.00 → 10.00/20.00 | 24.00/44.00 → 26.00/53.00 |
| web 5k/120 | 28.00/64.00 → 24.00/54.00 | 9.00/21.00 → 9.00/22.00 | 23.00/48.00 → 26.00/49.00 |
| web 30k/120 | 26.00/71.00 → 26.00/65.00 | 9.00/19.00 → 9.00/19.00 | 23.00/41.00 → 23.00/59.00 |
| react 30k/120 | 28.00/73.00 → 27.00/65.00 | 10.00/23.00 → 10.00/22.00 | 23.00/45.00 → 27.00/54.00 |

### Focused paired effects (Chromium pooled)

Δ is the difference of pooled quantiles. Paired median/SD and positive counts describe the individual within-round differences.

| Metric | Δ; 95% interval | Trigger / flag | Paired median / SD | Positive pairs | Paired mean; 95% interval |
| --- | --- | --- | --- | --- | --- |
| react 5k/120 scroll p95 | 0.70; [-2.60, 2.90] | 1.56 / below | -0.40 / 8.54 | 41/90 (2 ties) | 0.02; [-1.66, 1.84] |
| vue 30k/3 mount p50 | 1.60; [0.40, 2.70] | 0.55 / FLAG | 0.40 / 5.03 | 50/90 (2 ties) | 0.94; [-0.09, 1.98] |
| inferred 30k/3 mount p50 | 0.40; [-0.60, 1.40] | 0.50 / below | 0.30 / 3.91 | 50/90 (1 ties) | 0.29; [-0.53, 1.08] |
| vue 30k/120 mount p95 | 0.70; [-5.70, 7.00] | 1.97 / below | 0.70 / 8.80 | 52/90 (0 ties) | 0.74; [-1.08, 2.59] |
| web 5k/120 mount p95 | 0.90; [-7.70, 9.50] | 2.01 / below | -0.50 / 10.31 | 38/90 (1 ties) | -0.64; [-2.69, 1.43] |
| web 30k/120 mount p50 | -0.90; [-3.80, 3.70] | 1.20 / below | -0.40 / 10.03 | 43/90 (0 ties) | -0.76; [-2.86, 1.31] |
| web 30k/120 update p95 | -0.50; [-1.30, 0.60] | 0.50 / below | 0.10 / 2.97 | 45/90 (2 ties) | -0.23; [-0.85, 0.37] |
| react 30k/120 mount p50 | -0.80; [-3.80, 1.70] | 1.20 / below | -0.50 / 8.60 | 44/90 (0 ties) | -0.08; [-1.88, 1.80] |
| react 30k/120 update p95 | 0.20; [-0.70, 1.20] | 0.50 / below | -0.10 / 3.78 | 39/90 (5 ties) | 0.10; [-0.64, 0.92] |

### Reproducibility by fresh Chromium run

Each cell: baseline → candidate; positive pairs; FLAG if above trigger.

| Metric | Run 1 (30 pairs) | Run 2 (30 pairs) | Run 3 (30 pairs) |
| --- | --- | --- | --- |
| react 5k/120 scroll p95 | 36.20 → 34.50; 16/30 | 28.20 → 30.40; 10/30; FLAG | 29.40 → 28.90; 15/30 |
| vue 30k/3 mount p50 | 12.80 → 13.50; 16/30; FLAG | 10.40 → 12.20; 17/30; FLAG | 10.00 → 12.50; 17/30; FLAG |
| inferred 30k/3 mount p50 | 10.00 → 10.20; 19/30 | 7.50 → 9.10; 16/30; FLAG | 9.20 → 8.70; 15/30 |
| vue 30k/120 mount p95 | 39.60 → 46.00; 18/30; FLAG | 42.40 → 39.60; 14/30 | 37.40 → 40.00; 20/30; FLAG |
| web 5k/120 mount p95 | 34.60 → 35.60; 15/30 | 35.10 → 38.60; 13/30; FLAG | 41.70 → 44.30; 10/30; FLAG |
| web 30k/120 mount p50 | 27.50 → 28.30; 17/30 | 21.40 → 21.70; 12/30 | 21.00 → 19.60; 14/30 |
| web 30k/120 update p95 | 9.70 → 9.30; 17/30 | 10.60 → 9.70; 16/30 | 9.30 → 9.80; 12/30 |
| react 30k/120 mount p50 | 28.80 → 28.40; 14/30 | 21.30 → 21.80; 14/30 | 18.60 → 18.80; 16/30 |
| react 30k/120 update p95 | 9.60 → 10.70; 16/30; FLAG | 9.20 → 9.10; 10/30 | 10.10 → 9.80; 13/30 |


## Attribution and disposition

The large final Web/React 30k/120 mount p50 differences (15.0→17.2 ms and 16.7→19.6 ms) do not recur in these three controlled runs. Their individual-run mount p50 deltas stay below the unchanged trigger, and pooled updates also stay below it. This does not bound every possible deployment's overhead.

Vue 30k/3 mount p50 **does** flag in all three Chromium runs. The pooled 10.9→12.5 ms difference has a pointwise interval +0.4…+2.7 ms, while each separate run's interval includes zero and only 50/90 individual mounts are slower. The A/A control itself flags 9.8→10.6 ms (18/30 positive pairs). Firefox reverses this median (14→13 ms), but produces an unfavorable Vue mount p95 (27→38 ms, interval +1…+20 ms). These facts demonstrate environmental/process variance and leave a possible small candidate effect unresolved. The A/A result is a control, not a quantity subtracted from candidate measurements to manufacture a pass.

**70 separate traced workloads: five alternating diagnostic pairs/case**, outside the distributions above. Raw gzip files contain Chromium timeline events, user-timing phase marks and 250µs CPU profiles; [trace summary](performance/evidence/column-formatting-34/reproduction/traces/trace-summary.json). These samples have profiling overhead and are not substituted for the 90-pair timings. Timeline category intervals are unioned within a category; categories and sampled script stacks overlap and must not be added. CDP-evaluated async work is poorly represented by JS entry timeline events, so sampled script frames are reported separately. Samples can charge synchronous native/style/layout work to its JavaScript caller; they are not exclusive JS CPU costs.

Mean phase totals in ms, baseline → candidate. Update is the complete 12-update batch; scroll the complete six-scroll batch.

| Case / phase | Wall | Sampled script frames | Style | Layout | GC | Sampled idle |
| --- | --- | --- | --- | --- | --- | --- |
| react 5k/120 scroll | 117.96 → 93.12 | 77.88 → 62.78 | 13.61 → 11.16 | 29.17 → 26.12 | 7.62 → 3.50 | 0.47 → 1.47 |
| vue 30k/3 mount | 14.07 → 12.88 | 11.08 → 8.92 | 1.82 → 1.86 | 2.17 → 2.10 | 1.13 → 1.35 | 0.00 → 0.00 |
| inferred 30k/3 mount | 11.89 → 12.58 | 10.27 → 10.44 | 2.17 → 1.95 | 2.06 → 2.35 | 0.00 → 0.00 | 0.00 → 0.00 |
| vue 30k/120 mount | 30.65 → 22.44 | 20.86 → 16.07 | 2.75 → 2.82 | 6.01 → 3.31 | 3.53 → 2.32 | 0.00 → 0.00 |
| web 5k/120 mount | 20.96 → 23.89 | 16.50 → 16.63 | 2.68 → 3.00 | 3.84 → 4.30 | 1.33 → 1.32 | 0.00 → 0.00 |
| web 30k/120 mount | 27.67 → 23.63 | 18.57 → 16.61 | 2.94 → 2.49 | 5.47 → 3.66 | 2.28 → 2.34 | 0.00 → 0.00 |
| web 30k/120 update | 77.95 → 60.33 | 70.30 → 53.94 | 17.02 → 12.82 | 5.07 → 4.09 | 3.34 → 2.80 | 0.00 → 0.00 |
| react 30k/120 mount | 46.75 → 27.45 | 33.97 → 18.69 | 5.66 → 3.10 | 8.22 → 4.29 | 3.71 → 3.28 | 0.00 → 0.00 |
| react 30k/120 update | 106.49 → 82.40 | 89.29 → 67.54 | 21.89 → 17.05 | 6.66 → 5.13 | 5.25 → 3.52 | 0.00 → 0.00 |

CPU samples repeatedly charge existing `updateScrollbarWidth` (which reads layout), column visibility work and Lit DOM updates. Vue 30k/3 mount is 14.07 → 12.88 ms in diagnostics; style is 1.82 → 1.86 ms and layout 2.17 → 2.10 ms, so this trace set does not reproduce its timed median penalty. Web 5k/120 diagnostic mount is slower (20.96 → 23.89 ms), with style/layout 2.68/3.84 → 3.00/4.30 ms; the opposite signs on several other wide mounts and the timing/A/A distributions prevent attributing that sample set to new alignment CSS. Inferred diagnostics also contain unfavorable update/style/layout costs; all remain in the trace summary. Narrow-column scrolling includes substantial sampled idle/frame waiting; wide-column batches include layout and GC as well. Neither those measurements nor a five-pair diagnostic sample can rule out a small inlined branch/comparison cost. No dominant new formatter work appears on the unconfigured path.


Source inspection finds bounded additions on the default path: per-column metadata comparisons/scans, a boolean alignment branch during class generation, two small per-instance maps and additional CSS rules. `renderCell` still matches main. No Intl work or extra setter calls explain the timings. These additions are not literally free, but the present traces/distributions do not identify a reproducible above-trigger cost attributable to one of them. Removing branches/CSS or changing adapter synchronization without that attribution would be speculative optimization.

The original flags are therefore **a mixture of demonstrated environmental variance and unresolved signals**, not a proven uniform production regression and not a proven absence of regression. The exact historical cause of each slow original sample cannot be reconstructed from its aggregate/GC evidence. Original Web-only warmup, candidate-only qualification, mixed formatted/default cases, forced GC and foreground/frame scheduling are methodological contributors that were controlled more closely here; they are not asserted as the sole cause of every flag.

No safe runtime correction is justified by a confirmed causal default-path regression in this evidence. The smallest next discriminator is an independent controlled host replication of Vue 30k/3 mount and its tails (plus A/A), or a controlled ablation once a repeatable trace cost is identified. Preserve this head until that evidence supports a bounded correction or explicit architectural disposition. **NO-GO for performance acceptance/merge**, while correctness remains qualified by the existing CI. Do not treat this as authorization to mark either PR ready or merge it.

## Date startup: equivalent application initialization

Thirty alternating pairs each for **1 and 120 date columns**, epoch and offset ISO input, both warmed documents and fresh documents: 240 samples/study, 480 total. Rows=30k; same locale `en-GB`, explicit `Asia/Singapore`, medium date/short time. The baseline uses hoisted Intl renderers, including Date.parse for ISO. The candidate uses the approved descriptor and strict ISO grammar/calendar validation. They produce equivalent intended displays, but their ISO parsing work is deliberately not identical.

The warmed study uses the same equal warmup as above. Fresh-document samples create a new page/context for **every** measured application startup, with no workload warmup. Modules load before measurement; browser launch, downloads and fixture allocation are excluded equally. Thus this measures application/grid first use after module load, not total navigation or a machine-cold ICU/OS-cache startup.

Phases:

1. **Native Intl constructor time inside application initialization** is timed around Reflect.construct, before wrapper binding/counting. A separate native-only constructor probe follows the application sample, so that probe is already locale/ICU warmed and cannot describe the first constructor. Both are reported; neither is zero.
2. **Descriptor/renderer creation** includes the baseline's formerly excluded hoisted constructors. **Schema adoption** is the columns setter. Candidate constructors belong inside adoption. Inclusive phases and their per-sample non-native remainders are reported separately; subtracting quantiles would be incorrect. Remainders also contain instrumentation, binding, validation/cloning/maps and timer quantization, and are not a pure validation microbenchmark.
3. **Render** starts after adoption and includes data assignment, attachment and Lit completion. **Total render-ready initialization** starts before either side creates columns/formatters. **First usable frame** adds two rAFs and verifies a laid-out viewport and nonempty formatted cell. It is an application readiness proxy, not a browser paint/presentation timestamp or interaction-latency certification.
4. Ten warmed updates, six scrolls and an unchanged-schema re-adoption establish steady-state/reuse work. Counters retain constructor/invocation totals, and DOM remains bounded. Instrumentation is symmetric; performance.now calls around constructor timing and format counters have measurement overhead.

All date tables use baseline → candidate and p50/p95, in ms. [Warmed summary](performance/evidence/column-formatting-34/reproduction/date-warm/summary.json) and [fresh-document summary](performance/evidence/column-formatting-34/reproduction/date-cold/summary.json) include every phase, non-native remainder, paired delta, interval and unfavorable sample. The threshold is a default-path trigger; comparing the adoption phase alone is intentionally not an equivalent end-to-end date comparison.

### Warmed application (30 pairs/case)

| Columns / input | Native constructors inside startup | Later warm native-only probe | Descriptor/renderer creation (inclusive) | Adoption (inclusive) | Adoption excluding native constructors |
| --- | --- | --- | --- | --- | --- |
| 1 / epoch | 0.30/0.60 → 0.30/0.40 | 0.40/0.60 → 0.30/0.50 | 0.40/0.70 → 0.00/0.10 | 0.00/0.00 → 0.40/0.60 | 0.00/0.00 → 0.10/0.20 |
| 1 / iso | 0.30/0.50 → 0.30/0.50 | 0.40/0.50 → 0.30/0.60 | 0.40/0.60 → 0.00/0.10 | 0.00/0.10 → 0.40/0.60 | 0.00/0.10 → 0.10/0.20 |
| 120 / epoch | 13.00/37.70 → 10.30/27.50 | 17.10/42.30 → 14.80/35.20 | 13.70/42.40 → 0.10/0.10 | 0.00/0.10 → 13.30/34.70 | 0.00/0.10 → 3.10/7.20 |
| 120 / iso | 12.30/31.30 → 12.10/28.40 | 13.00/30.60 → 12.10/29.00 | 13.00/36.10 → 0.10/0.20 | 0.00/0.10 → 15.70/32.60 | 0.00/0.10 → 3.20/5.50 |

| Columns / input | Render after adoption | Total render-ready | Δ render-ready p50; interval | Δ render-ready p95; interval | First usable frame |
| --- | --- | --- | --- | --- | --- |
| 1 / epoch | 7.70/13.70 → 7.10/11.10 | 8.40/14.80 → 8.10/12.30 | -0.30; [-1.60, 1.40] | -2.50; [-6.80, 2.40] | 27.90/30.20 → 28.10/29.40 |
| 1 / iso | 6.30/12.40 → 6.80/12.10 | 7.10/13.70 → 7.30/13.20 | 0.20; [-1.40, 2.00] | -0.50; [-4.10, 2.70] | 28.10/29.60 → 27.80/29.50 |
| 120 / epoch | 8.80/15.80 → 6.00/12.90 | 24.00/57.20 → 19.30/43.60 | -4.70; [-12.70, 1.30] | -13.60; [-17.00, 10.30] | 41.80/88.90 → 35.80/75.20 |
| 120 / iso | 8.90/19.80 → 6.30/15.10 | 23.90/51.20 → 22.80/45.90 | -1.10; [-7.70, 5.00] | -5.30; [-17.10, 11.70] | 43.80/77.20 → 39.00/71.60 |

| Columns / input | Steady update | Scroll (includes frame waits) | Native constructors mount / updates / scroll / unchanged adoption (both) | Format invocations mount / 12 updates / 6 scrolls (both; p50/p95) | DOM rows/cells (max both) |
| --- | --- | --- | --- | --- | --- |
| 1 / epoch | 0.90/1.90 → 0.90/1.90 | 16.20/18.20 → 16.20/18.20 | 1.00/1.00 / 0 / 0 / 0 | 28.00/28.00 → 28.00/28.00 / 174.00/174.00 → 174.00/174.00 / 110.00/110.00 → 110.00/110.00 | 15/15 |
| 1 / iso | 0.90/2.10 → 0.90/1.90 | 16.20/18.50 → 16.20/18.30 | 1.00/1.00 / 0 / 0 / 0 | 28.00/28.00 → 28.00/28.00 / 174.00/174.00 → 174.00/174.00 / 110.00/110.00 → 110.00/110.00 | 15/15 |
| 120 / epoch | 4.80/10.30 → 4.60/8.50 | 15.60/25.70 → 16.00/25.30 | 120.00/120.00 / 0 / 0 / 0 | 182.00/182.00 → 182.00/182.00 / 1914.00/1914.00 → 1914.00/1914.00 / 1286.00/1286.00 → 1286.00/1286.00 | 15/165 |
| 120 / iso | 4.70/8.60 → 4.90/9.40 | 15.60/25.40 → 15.80/25.50 | 120.00/120.00 / 0 / 0 / 0 | 182.00/182.00 → 182.00/182.00 / 1914.00/1914.00 → 1914.00/1914.00 / 1286.00/1286.00 → 1286.00/1286.00 | 15/165 |
### Fresh-document application (30 pairs/case)

| Columns / input | Native constructors inside startup | Later warm native-only probe | Descriptor/renderer creation (inclusive) | Adoption (inclusive) | Adoption excluding native constructors |
| --- | --- | --- | --- | --- | --- |
| 1 / epoch | 16.60/37.40 → 18.50/30.40 | 0.30/0.60 → 0.30/0.60 | 16.80/37.60 → 0.10/0.10 | 0.10/0.20 → 19.20/31.70 | 0.10/0.20 → 0.70/1.30 |
| 1 / iso | 16.80/26.70 → 16.20/25.90 | 0.40/0.60 → 0.40/0.60 | 17.00/26.90 → 0.00/0.20 | 0.10/0.30 → 16.70/27.10 | 0.10/0.30 → 0.60/1.30 |
| 120 / epoch | 34.60/70.10 → 31.70/51.80 | 16.40/34.30 → 12.10/31.80 | 35.80/74.70 → 0.10/0.20 | 0.10/0.30 → 34.50/57.70 | 0.10/0.30 → 2.70/6.60 |
| 120 / iso | 26.70/42.60 → 29.00/65.00 | 10.90/30.00 → 13.30/30.20 | 27.80/45.40 → 0.10/0.20 | 0.10/0.30 → 31.60/74.20 | 0.10/0.30 → 2.70/9.20 |

| Columns / input | Render after adoption | Total render-ready | Δ render-ready p50; interval | Δ render-ready p95; interval | First usable frame |
| --- | --- | --- | --- | --- | --- |
| 1 / epoch | 39.70/79.90 → 41.40/73.70 | 58.20/111.60 → 65.30/111.30 | 7.10; [-11.30, 17.50] | -0.30; [-46.40, 31.70] | 59.90/113.40 → 67.20/114.20 |
| 1 / iso | 40.10/69.70 → 40.90/81.70 | 58.50/99.80 → 59.10/105.30 | 0.60; [-18.90, 7.60] | 5.50; [-14.00, 17.40] | 65.20/103.00 → 61.00/108.30 |
| 120 / epoch | 43.40/79.90 → 40.40/64.10 | 84.20/156.00 → 78.40/125.80 | -5.80; [-22.30, 13.40] | -30.20; [-47.50, 3.10] | 101.90/191.30 → 95.90/167.60 |
| 120 / iso | 41.30/58.20 → 43.10/79.30 | 70.90/105.30 → 76.00/158.80 | 5.10; [-0.40, 17.70] | 53.50; [3.50, 81.70] | 90.60/136.30 → 98.80/194.90 |

| Columns / input | Steady update | Scroll (includes frame waits) | Native constructors mount / updates / scroll / unchanged adoption (both) | Format invocations mount / 12 updates / 6 scrolls (both; p50/p95) | DOM rows/cells (max both) |
| --- | --- | --- | --- | --- | --- |
| 1 / epoch | 1.10/2.10 → 1.10/2.30 | 16.10/18.00 → 16.00/18.40 | 1.00/1.00 / 0 / 0 / 0 | 28.00/28.00 → 28.00/28.00 / 174.00/174.00 → 174.00/174.00 / 110.00/110.00 → 110.00/110.00 | 15/15 |
| 1 / iso | 1.10/2.20 → 1.10/2.30 | 16.00/18.40 → 15.90/18.00 | 1.00/1.00 / 0 / 0 / 0 | 28.00/28.00 → 28.00/28.00 / 174.00/174.00 → 174.00/174.00 / 110.00/110.00 → 110.00/110.00 | 15/15 |
| 120 / epoch | 4.50/8.60 → 4.30/7.70 | 15.10/26.50 → 15.00/23.80 | 120.00/120.00 / 0 / 0 / 0 | 182.00/182.00 → 182.00/182.00 / 1914.00/1914.00 → 1914.00/1914.00 / 1286.00/1286.00 → 1286.00/1286.00 | 15/165 |
| 120 / iso | 4.10/8.40 → 4.60/9.50 | 14.80/24.50 → 15.00/23.70 | 120.00/120.00 / 0 / 0 / 0 | 182.00/182.00 → 182.00/182.00 / 1914.00/1914.00 → 1914.00/1914.00 / 1286.00/1286.00 → 1286.00/1286.00 | 15/165 |

Fresh-document 120-column ISO initialization has an unfavorable render-ready p95: **105.30 → 158.80 ms**, Δ+53.50 ms, interval **[+3.50, +81.70]**. Native constructors in that case are 26.70/42.60 → 29.00/65.00 ms, with an unfavorable native p95 interval [+2.60, +41.20]. This cannot be concealed by the more favorable warmed or epoch results. The same native API/options are used on both sides; native wall time includes scheduling/GC effects. The evidence isolates substantial first-use/native work and extra validation/binding remainder but does not establish which environmental/native interaction caused that tail difference. It is a further reason to retain the hold, rather than promise startup parity.


The old mount-only date comparison excluded a real baseline cost. Candidate adoption of 120 date columns still incurs substantial constructor/validation work even though only a small viewport is rendered. Virtualization bounds rendering, not descriptor compilation. This study corrects the end-to-end comparison; it does not establish zero-cost formatting or remove the default-path hold. New descriptors/locale changes recompile affected columns; unchanged descriptors reuse their existing formatter. No new cache/sharing policy was introduced.

## Reproduction and validation

After locked dependencies and production package builds in exact-source worktrees:

```sh
node scripts/audit-formatting-evidence.mjs
node scripts/reproduce-column-formatting.mjs --baseline=../column-formatting-34-base --runs=3 --rounds=30 --output=.private/reproduction-chromium
node scripts/reproduce-column-formatting.mjs --aa --runs=1 --rounds=30 --output=.private/reproduction-aa
node scripts/reproduce-column-formatting.mjs --engine=firefox --runs=1 --rounds=30 --output=.private/reproduction-firefox-retry
node scripts/reproduce-column-formatting.mjs --kind=date --runs=1 --rounds=30 --output=.private/reproduction-date-warm
node scripts/reproduce-column-formatting.mjs --kind=date --cold --runs=1 --rounds=30 --output=.private/reproduction-date-cold
node scripts/reproduce-column-formatting.mjs --trace --runs=1 --rounds=0 --output=.private/reproduction-traces
node scripts/analyze-formatting-reproduction.mjs .private/reproduction-chromium
node scripts/analyze-formatting-traces.mjs .private/reproduction-traces
node scripts/verify-formatting-reproduction.mjs
```

Run the distribution analyzer on each timing study; trace sampling is separate from timed distributions. The first Chromium study's retained v1 snapshots reproduce its exact harness; current date instrumentation adds native-constructor timers that are inactive for default columns. This intentional harness revision does not change production runtime sources. Native Vite chunk-size warnings are retained in logs; PowerShell redirection returned a failure status for warning-bearing commands despite completed Node reports. Completion was checked using every expected pair, empty page-error lists and finished timestamps, not that shell status alone. The initial Firefox renderer crash is retained as a failed attempt.

The retained historical audit checked the original ignored browser builds on this host. On a clean checkout without those old bundles, the audit explicitly reports their local-byte check as skipped; archived distributions/source hashes and the recorded bundle hashes remain available. The follow-up verifier checks all retained new artifact hashes, both original harness snapshots, alternating pair completeness, counter parity, Intl counts, formatter reuse and DOM bounds.

- `pnpm.cmd typecheck:all` and `node scripts/typecheck-contracts.mjs`: passed on the final measurement harness. The latter checks the browser contract source too.
- Every default sample in all successful timing studies has matching schema/data/config/inference and Intl counters; zero Intl construction/invocations on unconfigured columns. The original separate every-public-setter control remains 46/46 pairs with parity. New terminal DOM snapshots peak at 15 rows / 165 cells; the retained mutation-observed peak through updates/scrolling is 19 rows / 247 cells. Terminal snapshots alone do not establish an intermediate peak.
- Both 30-pair date studies completed, including fresh-document mount, steady updates/scrolling and unchanged-schema reuse. No steady-state/reuse Intl construction. Runtime sources and approved semantics were not changed.
- Exact runtime-head CI remains green: [Verify (all 26 steps)](https://github.com/tipolox/litgrid/actions/runs/42675895888), [B1](https://github.com/tipolox/litgrid/actions/runs/42675895807), [External Query Visual](https://github.com/tipolox/litgrid/actions/runs/42675896155). Those runs include 468 JS tests, strict/public/published types, builds, real Vue/Angular consumers and framework/Blazor browser gates, plus 134 Blazor tests. Follow-up artifact-head CI and its exact SHA are linked in [PR #68](https://github.com/tipolox/litgrid/pull/68); neither old nor new functional CI disposes this performance hold.


No merge, release, version change, tag, package publication, deployment or issue closure. Original workspace and A3 experiments were not edited.
