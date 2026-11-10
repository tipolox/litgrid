# #34A hosted CI performance feasibility result

**STOP. Standard hosted CI did not demonstrate a suitable qualification environment. PR #69 remains DRAFT / PERF NOT QUALIFIED; NO-GO for merge.** Continue release readiness for previously merged features. No further timing sweep or expanded matrix was run after the predeclared environment gate failed.

[Workflow run 42813023705](https://github.com/tipolox/litgrid/actions/runs/42813023705) completed the bounded pilot and assessment successfully; its **full matrix and full assessment jobs were SKIPPED**, not performance passes. The implementation PR head remains `180ac15b933361b405efe39b09d4284eace0c423`; baseline `0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8`. Measured harness/workflow revision: `1a7b70e169e9872647758beb075a56a85fae0f7c`. [Predeclared protocol](alignment-ci-performance-protocol.md) and [workflow](../.github/workflows/alignment-ci-performance.yml) live on the separate investigation branch; no production or PR #69 source change was made.

## What ran

Three fresh, sequential GitHub-hosted Ubuntu 24.04 VM jobs executed Vue 30k rows / 3 unconfigured columns: **180 alternating pairs / 360 timed workload samples**, comprising 90 A/B pairs and 90 byte-identical A/A pairs. All raw mount observations, 12 update observations per sample (first two excluded only from summaries), six scroll observations, paired deltas, setter/DOM counters, heap/GC/frame/CDP and host telemetry are preserved. Three separate diagnostic pairs per comparison/run yielded **36 compressed traces**, excluded from timing distributions.

Both exact-commit production builds used identical dependency manifests and lockfile, Node 22.22.3 and pnpm 10.33.0. One build artifact was reused across measurement VMs and every bundle hash verified. The control URL serves the baseline directory itself. Chromium 156.0.8078.4 / Playwright 1.64.1 and the actual browser executable hash matched across all three runs: `377a9fc07b495c3b8d0ab8ec1fdfd153641759f9756fea34d8dfce4de82f5025`. Foreground checks, explicit GC and two settling frames outside timers, equal warmup, alternating order and fixed viewport were enforced.

## Environment finding

| Run | Job | Allocated vCPUs | Reported CPU model | Image |
| --- | --- | --- | --- | --- |
| 1 | [129819420599](https://github.com/tipolox/litgrid/actions/runs/42813023705/job/129819420599) | 4 | AMD EPYC 9V45 96-Core Processor | 20261101.360.1 |
| 2 | [129819420511](https://github.com/tipolox/litgrid/actions/runs/42813023705/job/129819420511) | 4 | AMD EPYC 9V74 80-Core Processor | 20261101.360.1 |
| 3 | [129819420415](https://github.com/tipolox/litgrid/actions/runs/42813023705/job/129819420415) | 4 | AMD EPYC 7763 64-Core Processor | 20261101.360.1 |

The CPU model's marketed core count is not the VM allocation. Distinct boot IDs establish three distinct VMs; physical-host identities/independence are not verified. Image/browser consistency held, but the requested label did not provide a uniform hardware cohort. Measured maximum CPU steal was 0.000%; that does not rule out other contention, frequency, process, JIT, GC or frame-scheduling effects. The cause of A/A variability is not attributed to one host mechanism. This specific setup is unqualified; these data do not prove every hosted runner configuration unsuitable.

GitHub documents [fresh hosted VMs and weekly image updates](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners) and [runner resource classes](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). An OS label is not a dedicated CPU or immutable image guarantee. No dedicated/larger runner entitlement or separately controlled host was established. The architect has not approved an arbitrary virtualized host as a substitute for the physical-host gate.

## A/A stability and A/B observations

The unchanged trigger is **max(5% of baseline, 0.5 ms)**. Environment suitability required a matched cohort and all A/A point estimates and 95% intervals inside +/-that budget, per run and pooled, plus cross-run baseline stability. The result failed 3/6 A/A endpoints and 10/18 cross-run screens. The A/A failures are mount p50, mount p95 and scroll p50 (some failures are interval-width failures).

| Run | A/A mount p50 (baseline -> identical), ms | A/A mount p95, ms | p95 delta [95% interval], ms | Budget, ms |
| --- | --- | --- | --- | --- |
| 1 | 4.470 -> 4.535 | 4.865 -> 4.900 | 0.035 [-0.380, 0.270] | 0.500 |
| 2 | 5.275 -> 5.260 | 5.600 -> 5.745 | 0.145 [-0.110, 2.105] | 0.500 |
| 3 | 6.950 -> 6.830 | 7.655 -> 8.595 | 0.940 [0.195, 5.075] | 0.500 |

Pooled summaries below are descriptive across heterogeneous VMs; they cannot establish parity or a feature-specific regression. No A/A subtraction was used.

| Comparison | Phase / quantile | Baseline -> right, ms | Delta [95% interval], ms | Trigger, ms |
| --- | --- | --- | --- | --- |
| AA | mount p50 | 5.265 -> 5.260 | -0.005 [-0.225, 0.325] | 0.500 |
| AA | mount p95 | 7.400 -> 7.985 | 0.585 [-0.130, 2.105] | 0.500 |
| AA | update p50 | 0.670 -> 0.665 | -0.005 [-0.020, 0.015] | 0.500 |
| AA | update p95 | 1.960 -> 1.985 | 0.025 [-0.170, 0.165] | 0.500 |
| AA | scroll p50 | 16.495 -> 16.450 | -0.045 [-0.715, 0.570] | 0.825 |
| AA | scroll p95 | 17.885 -> 17.870 | -0.015 [-0.115, 0.040] | 0.894 |
| AB | mount p50 | 5.235 -> 5.195 | -0.040 [-0.545, 0.205] | 0.500 |
| AB | mount p95 | 7.755 -> 7.520 | -0.235 [-0.730, 0.295] | 0.500 |
| AB | update p50 | 0.670 -> 0.660 | -0.010 [-0.035, 0.005] | 0.500 |
| AB | update p95 | 1.970 -> 1.950 | -0.020 [-0.105, 0.170] | 0.500 |
| AB | scroll p50 | 16.455 -> 16.510 | 0.055 [-0.030, 0.555] | 0.823 |
| AB | scroll p95 | 17.875 -> 17.825 | -0.050 [-0.120, 0.060] | 0.894 |

A/B has 3 endpoint flags from run-3 upper confidence bounds (mount p50, mount p95, scroll p50). These are unresolved bounds, not three demonstrated regressions. Favorable pooled A/B deltas are retained above and do not override failed controls. Intervals use 4,000 seeded paired workload-cluster bootstrap resamples, with run-cluster resampling for pooled estimates and independent cluster resampling for cross-run baselines. They are pointwise 95% intervals, not causal proof or universal equivalence. Raw sub-observations and full-precision values remain in the assessment/archive.

## Stop decision and review evidence

The conditional Web/React/Vue/Angular x 5k/30k rows x 3/120 columns mount/update/scroll matrix is implemented but **was not executed**. The pilot failed its environment screen; expanding or retrying until green would not discharge that finding. No previous laptop ablation, old timing aggregate or correctness CI pass was used as acceptance evidence. No performance threshold changed.

The initial setup-only [run 42812429175](https://github.com/tipolox/litgrid/actions/runs/42812429175), harness `bff6ed8fb388d2ef38f23f58710dfad9d6862e43`, was canceled after Chromium rejected command-line introspection without an explicit automation flag. It produced no timed rounds. The correction explicitly adds that launch flag, retaining the same workload, pairing, analysis and threshold. Its failure log is preserved. This is separate from the complete measured pilot above.

[Complete assessment JSON](performance/evidence/alignment-ci-69/assessment.json), [artifact/job metadata](performance/evidence/alignment-ci-69/ci-artifacts.json) and [checksums](performance/evidence/alignment-ci-69/manifest.json) are archived in the repository. All original GitHub ZIP bytes (including production bundles, all raw distributions/telemetry and all 36 traces) are retained beside them and verified against GitHub's SHA-256 artifact digests. This repository archive survives the workflow's 30-day artifact retention. Reanalysis of all three remote raw files with the pinned analyzer reproduced the CI assessment byte-for-byte; no laptop timing replay was performed. Synthetic stable/noisy controls and strict TypeScript/YAML/syntax checks passed during harness validation.

**NO-GO for #34A merge/performance acceptance. Keep PR #69 DRAFT and PERF NOT QUALIFIED. Recommend continuing release-readiness work for previously merged features.** #67/#68 remain unchanged drafts. No merge, tag, version bump, publication, deployment, issue closure or threshold change.
