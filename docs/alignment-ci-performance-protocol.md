# #34A hosted-CI feasibility protocol

This is a non-release investigation, separate from PR #69. Candidate
`180ac15b933361b405efe39b09d4284eace0c423` and baseline
`0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8` are immutable. PR #69 remains
DRAFT / PERF NOT QUALIFIED. The
[architect review](https://github.com/tipolox/litgrid/pull/69#issuecomment-6766459412)
requires assessing whether a virtualized host is an acceptable interpretation
of the independent-host gate before treating measurements as merge authority.
This workflow never authorizes a merge or changes PR metadata.

## Suitability assessment and limits

GitHub documents standard public-repository Ubuntu runners as fresh VMs with
four vCPUs and 16 GB RAM. Each job gets a new VM; that proves separation from
the laptop, not dedicated physical cores, identical hardware, freedom from
contention, or separate physical hosts between jobs. The existing #69 correctness
run used `ubuntu-latest`, resolved to Ubuntu 26.04 image 20261101.186.1; its green
status includes no A/A stability evidence. This investigation selects
`ubuntu-24.04`, records the actual image version and CPU, and explicitly rejects
unmatched cohorts. The label pins an OS family, not an immutable VM image.

Sources: [runner specifications](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[hosted runner overview](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners),
[image update policy](https://github.com/actions/runner-images#image-releases).
No dedicated/larger runner is provisioned or purchased. Repository ownership
is a personal account; no organization larger-runner entitlement or dedicated
physical host has been established. Larger VMs alone would not establish a
stable benchmark environment.

## Launch, isolation and pinned artifacts

`.github/workflows/alignment-ci-performance.yml` is confined to investigation
branch `codex/34a-ci-perf-feasibility`, with read-only repository permissions,
no release/publish/deploy operations and no production changes. An intentional
push changing that workflow on this branch launches it. `workflow_dispatch`
is also declared for future use if independently reviewed onto the default
branch; GitHub requires that definition on the default branch for normal
manual dispatch. This investigation does not modify main to enable it.

Actions are pinned by commit. Node 22.22.3, pnpm 10.33.0 and the existing lockfile
are pinned. Build validates exact source commits and identical root/package
dependency manifests and lockfile bytes. Both sources build in production mode.
Vite then builds the same unconfigured workload fixture against each set of
published package outputs. Source and bundle SHA-256 manifests are preserved.
The A/A control URL serves the **baseline directory itself**, so HTML and JS
are byte-identical rather than nominally equivalent rebuilds. One build artifact
is reused by every measurement job and verified before running.

Three fresh VM jobs run sequentially (`max-parallel: 1`). Each installs the
locked browser, records Chromium and executable SHA-256, then settles for 30s
after all installs/downloads. No build, other test, trace recording or artifact
upload runs concurrently with timing inside a measurement VM. The physical
hypervisor, neighbors, CPU scheduling and power state remain outside our control.
Separate VM boot IDs are required; they are not physical-machine IDs.

## Predeclared schedule and stop rule

1. **Pilot:** Vue 30k rows × 3 columns, three independent VM jobs. Each job
   runs three equal workload warmups per page, then 30 alternating A/B pairs
   and 30 alternating byte-identical A/A pairs. Comparison order alternates;
   left/right page order reverses every round. All pairs are retained.
2. **Environment gate:** all three runs must complete the schedule, have the
   same CPU model/count, runner image, Node, browser/version/executable, lockfile
   and production bundles, with distinct boot IDs and complete CPU telemetry.
   Maximum per-pair CPU steal must be <=1% (a predeclared environment screen,
   not a performance-threshold change). Every A/A mount/update/scroll p50 and
   p95 point estimate **and its 95% interval** must lie inside the unchanged
   +/-`max(5% baseline, 0.5 ms)` budget, both per run and pooled. Baseline A/A
   distributions between each pair of independent runs must meet the same
   stability screen using independent cluster resampling. Missing telemetry,
   heterogeneous cohorts or broad/inconclusive intervals do not pass.
3. **Stop** if that environment gate fails. Preserve all pilot artifacts;
   skip the broader matrix. This is insufficient environment qualification,
   not automatic proof of an alignment regression. Do not subtract A/A drift,
   drop unfavorable runs, increase tolerances, or rerun until green.
4. **Conditional full matrix:** only after a suitable pilot, repeat the same
   three-job schedule for Web/React/Vue/Angular × 5k/30k rows × 3/120 columns.
   Case order rotates/reverses. The same environment gate applies to every
   case. A/B flags are reported separately; upper intervals as well as point
   estimates must stay below the unchanged trigger in every independent run
   and pooled summary. No automatic merge recommendation results, even if
   these statistical screens pass: virtual-host acceptance remains an explicit
   architectural decision.

## Measurement and evidence

Only **default/unconfigured columns** are timed. Data and column fixtures are
allocated outside mount timing. Browser module loading is complete first.
Mount includes framework initialization, grid update completion and a forced
cell layout read. Each workload then executes 12 scalar height updates (all raw
values retained; first two excluded only from update summaries as predeclared)
and six fixed vertical/horizontal scrolls through a requestAnimationFrame and
grid update. Update summaries use the ten retained sub-observations; scroll
summaries use all six. Raw requestAnimationFrame timestamps are retained.

All pages use the same viewport/scale and production mode. Each sample brings
its page to foreground and verifies visibility; explicit CDP GC and two settling
frames occur **outside** timers. Heap and CDP Script/Layout/RecalcStyle/Task
metrics, CPU stat/pressure/load snapshots, setter counts and mutation-observed
virtual DOM bounds are retained. A/B/A/A structural mismatches fail the run.

Every phase records raw distributions, sorted-floor p50/p95, per-pair deltas and
positive/tied pairs. Confidence intervals use 4,000 seeded percentile resamples
of paired workload clusters; pooled intervals resample VM-run clusters, then
pairs, retaining correlated update/scroll observations. Cross-run baseline
comparisons resample independent workload clusters. Intervals are pointwise
95%, not a guarantee of causation or universal equivalence. There is no trimming,
favorable-run selection, A/A correction subtraction or imported laptop evidence.

After all timed samples, three diagnostic pairs per comparison/case record
raw compressed CDP traces with timeline, V8/GC and user timing phase marks.
They are excluded from timing summaries. Artifacts include exact manifests,
raw samples, telemetry, traces/checksums and assessment JSON/Markdown, retained
for 30 days. Repository-held reports must preserve conclusions beyond artifact
expiry; archive downloads before independent review if longer retention is needed.

If hosted CI cannot demonstrate stable controls, stop the #34A performance
investigation, keep #69 DRAFT / PERF NOT QUALIFIED, and recommend continuing
release readiness for previously merged work. No prior local-host ablation is
used as acceptance evidence.
