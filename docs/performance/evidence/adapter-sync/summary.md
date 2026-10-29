# Adapter synchronization measurements

Runtime: 156.0.8078.4; v22.14.0. Baseline: 6a0df7b01fd3de0b7e7f5dc386de469f3531d210.

Same machine, browser, fixture, instrumentation, and source dependency installation. Every grid has 120 columns; wide values use accessors over compact keyed rows. Each version/framework has a fresh page; garbage collection precedes each workload. Tests and builds are not run during sampling. Natural GC remains part of update timings.

Update latency includes framework flushing and Lit updateComplete, excluding frame waits. p50/p95 use nearest rank. Stable and fresh refer to configuration/column references. Each unrelated case has 30 samples; each replacement, mutation, and schema case has 10. Mutation increments dataRevision in revision mode; legacy mode changes an unrelated ARIA input to trigger supported synchronization.

**Revision mode is opt-in.** The baseline ignores the new input. Legacy mode intentionally keeps scanning identities and rerunning transforms; its results must not be presented as zero-work row synchronization. The baseline loses page, selection and unsaved order/visibility, so its timings do not establish state-equivalent performance.

## unrelatedStable

| Framework | Rows | Mode | Baseline p50/p95 ms | Patched p50/p95 ms | Baseline → patched transforms | Baseline → patched structural setters |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| react | 10000 | legacy | 8.70 / 14.00 | 9.70 / 14.60 | 30 → 30 | 30 → 0 |
| react | 10000 | revision | 8.50 / 14.00 | 7.10 / 8.90 | 30 → 0 | 30 → 0 |
| react | 30000 | legacy | 12.00 / 16.30 | 12.40 / 14.90 | 30 → 30 | 30 → 0 |
| react | 30000 | revision | 13.90 / 18.00 | 6.90 / 8.90 | 30 → 0 | 30 → 0 |
| react | 100000 | legacy | 21.80 / 24.60 | 24.40 / 26.20 | 30 → 30 | 30 → 0 |
| react | 100000 | revision | 21.80 / 29.80 | 7.40 / 10.30 | 30 → 0 | 30 → 0 |
| vue | 10000 | legacy | 23.60 / 37.90 | 8.20 / 9.80 | 294 → 30 | 294 → 0 |
| vue | 10000 | revision | 36.50 / 42.70 | 6.80 / 8.90 | 294 → 0 | 294 → 0 |
| vue | 30000 | legacy | 50.80 / 60.10 | 11.00 / 12.40 | 294 → 30 | 294 → 0 |
| vue | 30000 | revision | 61.00 / 76.60 | 7.90 / 12.00 | 294 → 0 | 294 → 0 |
| vue | 100000 | legacy | 150.80 / 225.70 | 22.70 / 28.40 | 294 → 30 | 294 → 0 |
| vue | 100000 | revision | 149.50 / 176.50 | 6.30 / 9.90 | 294 → 0 | 294 → 0 |
| angular | 10000 | legacy | 8.70 / 10.90 | 9.10 / 13.30 | 60 → 30 | 60 → 0 |
| angular | 10000 | revision | 8.20 / 10.40 | 6.50 / 8.50 | 60 → 0 | 60 → 0 |
| angular | 30000 | legacy | 14.80 / 20.80 | 16.10 / 21.70 | 60 → 30 | 60 → 0 |
| angular | 30000 | revision | 15.10 / 18.60 | 10.00 / 13.40 | 60 → 0 | 60 → 0 |
| angular | 100000 | legacy | 35.50 / 49.70 | 26.60 / 36.40 | 60 → 30 | 60 → 0 |
| angular | 100000 | revision | 35.50 / 45.10 | 6.50 / 8.40 | 60 → 0 | 60 → 0 |

## unrelatedFresh

| Framework | Rows | Mode | Baseline p50/p95 ms | Patched p50/p95 ms | Baseline → patched transforms | Baseline → patched structural setters |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| react | 10000 | legacy | 11.60 / 17.00 | 8.70 / 14.30 | 30 → 30 | 30 → 0 |
| react | 10000 | revision | 9.00 / 10.40 | 6.70 / 10.30 | 30 → 0 | 30 → 0 |
| react | 30000 | legacy | 11.20 / 13.00 | 12.30 / 17.00 | 30 → 30 | 30 → 0 |
| react | 30000 | revision | 12.20 / 14.00 | 7.00 / 8.10 | 30 → 0 | 30 → 0 |
| react | 100000 | legacy | 22.10 / 25.70 | 22.90 / 28.20 | 30 → 30 | 30 → 0 |
| react | 100000 | revision | 25.90 / 33.40 | 10.10 / 12.40 | 30 → 0 | 30 → 0 |
| vue | 10000 | legacy | 29.00 / 48.00 | 6.80 / 9.10 | 420 → 30 | 420 → 0 |
| vue | 10000 | revision | 27.90 / 50.40 | 5.90 / 9.20 | 420 → 0 | 420 → 0 |
| vue | 30000 | legacy | 75.20 / 93.40 | 10.90 / 13.20 | 420 → 30 | 420 → 0 |
| vue | 30000 | revision | 72.20 / 134.70 | 6.00 / 9.20 | 420 → 0 | 420 → 0 |
| vue | 100000 | legacy | 208.60 / 232.80 | 28.90 / 36.80 | 420 → 30 | 420 → 0 |
| vue | 100000 | revision | 203.30 / 223.80 | 5.90 / 8.40 | 420 → 0 | 420 → 0 |
| angular | 10000 | legacy | 8.80 / 11.00 | 7.30 / 9.80 | 60 → 30 | 60 → 0 |
| angular | 10000 | revision | 8.30 / 11.10 | 7.10 / 8.20 | 60 → 0 | 60 → 0 |
| angular | 30000 | legacy | 15.00 / 26.80 | 15.50 / 19.10 | 60 → 30 | 60 → 0 |
| angular | 30000 | revision | 15.30 / 18.60 | 7.50 / 10.40 | 60 → 0 | 60 → 0 |
| angular | 100000 | legacy | 35.30 / 43.00 | 20.50 / 22.90 | 60 → 30 | 60 → 0 |
| angular | 100000 | revision | 34.20 / 53.10 | 4.80 / 7.60 | 60 → 0 | 60 → 0 |

## replacement

| Framework | Rows | Mode | Baseline p50/p95 ms | Patched p50/p95 ms | Baseline → patched transforms | Baseline → patched structural setters |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| react | 10000 | legacy | 8.90 / 9.40 | 8.90 / 13.30 | 10 → 10 | 10 → 0 |
| react | 10000 | revision | 7.50 / 9.30 | 9.00 / 12.90 | 10 → 10 | 10 → 0 |
| react | 30000 | legacy | 15.00 / 18.50 | 19.40 / 23.10 | 10 → 10 | 10 → 0 |
| react | 30000 | revision | 16.10 / 18.00 | 14.60 / 22.80 | 10 → 10 | 10 → 0 |
| react | 100000 | legacy | 34.10 / 37.30 | 34.80 / 43.70 | 10 → 10 | 10 → 0 |
| react | 100000 | revision | 37.10 / 66.70 | 40.10 / 63.80 | 10 → 10 | 10 → 0 |
| vue | 10000 | legacy | 9.40 / 13.20 | 4.00 / 10.10 | 20 → 10 | 20 → 0 |
| vue | 10000 | revision | 6.20 / 9.90 | 4.50 / 6.70 | 20 → 10 | 20 → 0 |
| vue | 30000 | legacy | 12.00 / 12.90 | 7.40 / 13.20 | 20 → 10 | 20 → 0 |
| vue | 30000 | revision | 11.40 / 14.40 | 9.00 / 12.80 | 20 → 10 | 20 → 0 |
| vue | 100000 | legacy | 31.90 / 36.00 | 20.70 / 50.30 | 20 → 10 | 20 → 0 |
| vue | 100000 | revision | 31.00 / 33.60 | 18.60 / 26.60 | 20 → 10 | 20 → 0 |
| angular | 10000 | legacy | 5.20 / 7.80 | 4.30 / 8.00 | 20 → 10 | 20 → 0 |
| angular | 10000 | revision | 5.40 / 8.50 | 5.00 / 12.90 | 20 → 10 | 20 → 0 |
| angular | 30000 | legacy | 19.10 / 24.70 | 7.10 / 11.50 | 20 → 10 | 20 → 0 |
| angular | 30000 | revision | 11.30 / 13.20 | 12.00 / 19.50 | 20 → 10 | 20 → 0 |
| angular | 100000 | legacy | 31.90 / 35.20 | 17.70 / 19.90 | 20 → 10 | 20 → 0 |
| angular | 100000 | revision | 31.90 / 41.20 | 22.70 / 27.00 | 20 → 10 | 20 → 0 |

## mutation

| Framework | Rows | Mode | Baseline p50/p95 ms | Patched p50/p95 ms | Baseline → patched transforms | Baseline → patched structural setters |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| react | 10000 | legacy | 8.80 / 15.30 | 7.40 / 9.40 | 10 → 10 | 10 → 0 |
| react | 10000 | revision | 5.10 / 8.30 | 6.60 / 9.00 | 10 → 10 | 10 → 0 |
| react | 30000 | legacy | 13.30 / 14.30 | 10.10 / 13.40 | 10 → 10 | 10 → 0 |
| react | 30000 | revision | 10.00 / 13.90 | 8.30 / 12.10 | 10 → 10 | 10 → 0 |
| react | 100000 | legacy | 20.50 / 24.00 | 19.30 / 21.10 | 10 → 10 | 10 → 0 |
| react | 100000 | revision | 30.60 / 34.60 | 18.80 / 23.50 | 10 → 10 | 10 → 0 |
| vue | 10000 | legacy | 9.10 / 11.30 | 4.50 / 6.30 | 20 → 10 | 20 → 0 |
| vue | 10000 | revision | 6.90 / 9.10 | 5.70 / 8.10 | 20 → 10 | 20 → 0 |
| vue | 30000 | legacy | 12.50 / 17.10 | 8.20 / 9.40 | 20 → 10 | 20 → 0 |
| vue | 30000 | revision | 12.80 / 22.60 | 7.50 / 10.70 | 20 → 10 | 20 → 0 |
| vue | 100000 | legacy | 33.00 / 36.80 | 22.80 / 28.00 | 20 → 10 | 20 → 0 |
| vue | 100000 | revision | 31.20 / 33.90 | 18.20 / 21.30 | 20 → 10 | 20 → 0 |
| angular | 10000 | legacy | 5.90 / 8.70 | 5.00 / 7.50 | 20 → 10 | 20 → 0 |
| angular | 10000 | revision | 7.70 / 10.00 | 5.00 / 6.20 | 20 → 10 | 20 → 0 |
| angular | 30000 | legacy | 13.80 / 24.50 | 8.70 / 12.00 | 20 → 10 | 20 → 0 |
| angular | 30000 | revision | 11.70 / 13.20 | 12.20 / 13.50 | 20 → 10 | 20 → 0 |
| angular | 100000 | legacy | 32.00 / 34.10 | 17.50 / 19.80 | 20 → 10 | 20 → 0 |
| angular | 100000 | revision | 32.30 / 42.70 | 19.20 / 24.10 | 20 → 10 | 20 → 0 |

## schema

| Framework | Rows | Mode | Baseline p50/p95 ms | Patched p50/p95 ms | Baseline → patched transforms | Baseline → patched structural setters |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| react | 10000 | legacy | 6.30 / 9.70 | 7.30 / 8.70 | 10 → 10 | 10 → 0 |
| react | 10000 | revision | 5.20 / 8.50 | 6.30 / 7.30 | 10 → 0 | 10 → 0 |
| react | 30000 | legacy | 10.40 / 14.70 | 16.40 / 24.00 | 10 → 10 | 10 → 0 |
| react | 30000 | revision | 12.60 / 15.80 | 4.30 / 7.30 | 10 → 0 | 10 → 0 |
| react | 100000 | legacy | 19.90 / 22.80 | 19.40 / 21.10 | 10 → 10 | 10 → 0 |
| react | 100000 | revision | 19.10 / 21.00 | 4.10 / 5.80 | 10 → 0 | 10 → 0 |
| vue | 10000 | legacy | 9.30 / 10.90 | 5.50 / 7.90 | 20 → 10 | 20 → 0 |
| vue | 10000 | revision | 7.00 / 10.40 | 3.20 / 4.70 | 20 → 0 | 20 → 0 |
| vue | 30000 | legacy | 12.90 / 16.10 | 8.60 / 11.50 | 20 → 10 | 20 → 0 |
| vue | 30000 | revision | 11.60 / 17.10 | 2.70 / 5.60 | 20 → 0 | 20 → 0 |
| vue | 100000 | legacy | 32.30 / 36.30 | 37.90 / 55.70 | 20 → 10 | 20 → 0 |
| vue | 100000 | revision | 30.30 / 33.00 | 3.50 / 6.40 | 20 → 0 | 20 → 0 |
| angular | 10000 | legacy | 6.00 / 8.70 | 6.30 / 7.90 | 20 → 10 | 20 → 0 |
| angular | 10000 | revision | 6.50 / 7.70 | 5.10 / 7.40 | 20 → 0 | 20 → 0 |
| angular | 30000 | legacy | 12.10 / 13.20 | 14.00 / 15.10 | 20 → 10 | 20 → 0 |
| angular | 30000 | revision | 12.40 / 13.40 | 6.60 / 8.60 | 20 → 0 | 20 → 0 |
| angular | 100000 | legacy | 33.00 / 35.50 | 18.20 / 19.10 | 20 → 10 | 20 → 0 |
| angular | 100000 | revision | 31.50 / 39.30 | 3.50 / 6.20 | 20 → 0 | 20 → 0 |

## Mount, first selection, scroll and whole-workload observations

These are individual observations per workload, not distributions or standalone speedup claims. Task duration includes fixture correctness checks and framework work; heap includes the whole page and has no forced final GC. Heap differences do not establish retained allocation, leaks, or grid-only memory.

| Framework/version | Rows | Mode | Mount ms | First selection ms | Scroll + two frames ms | Task duration ms | Heap before/after MB | Visible cells |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| react/baseline | 10000 | legacy | 108.60 | 7.70 | 59.10 | 1103.21 | 22.75 / 28.16 | 238 |
| react/baseline | 10000 | revision | 41.10 | 5.30 | 57.10 | 852.72 | 24.04 / 33.21 | 238 |
| react/baseline | 30000 | legacy | 46.70 | 5.40 | 55.20 | 1241.59 | 24.11 / 24.48 | 238 |
| react/baseline | 30000 | revision | 41.10 | 5.50 | 61.50 | 1319.69 | 24.21 / 50.63 | 238 |
| react/baseline | 100000 | legacy | 61.40 | 12.20 | 52.00 | 2268.45 | 24.25 / 109.74 | 238 |
| react/baseline | 100000 | revision | 59.70 | 4.70 | 63.80 | 2585.30 | 24.33 / 105.89 | 238 |
| react/candidate | 10000 | legacy | 88.50 | 8.00 | 67.10 | 1048.20 | 22.81 / 30.06 | 252 |
| react/candidate | 10000 | revision | 37.30 | 4.70 | 56.30 | 763.53 | 24.15 / 29.13 | 252 |
| react/candidate | 30000 | legacy | 38.40 | 6.00 | 62.90 | 1367.12 | 24.22 / 51.21 | 252 |
| react/candidate | 30000 | revision | 32.40 | 5.40 | 59.90 | 834.24 | 24.31 / 41.57 | 252 |
| react/candidate | 100000 | legacy | 43.50 | 4.60 | 54.40 | 2351.95 | 24.35 / 103.41 | 252 |
| react/candidate | 100000 | revision | 47.70 | 10.50 | 52.40 | 1350.53 | 24.43 / 95.01 | 252 |
| vue/candidate | 10000 | legacy | 78.90 | 7.90 | 23.40 | 788.51 | 22.80 / 26.87 | 252 |
| vue/candidate | 10000 | revision | 27.80 | 5.20 | 23.60 | 631.95 | 25.38 / 30.92 | 252 |
| vue/candidate | 30000 | legacy | 31.50 | 3.50 | 23.10 | 1005.33 | 26.75 / 46.25 | 252 |
| vue/candidate | 30000 | revision | 28.20 | 3.90 | 31.90 | 747.98 | 29.67 / 37.68 | 252 |
| vue/candidate | 100000 | legacy | 47.20 | 6.60 | 45.30 | 2654.75 | 23.99 / 61.06 | 252 |
| vue/candidate | 100000 | revision | 67.80 | 7.90 | 22.40 | 1001.57 | 24.06 / 48.03 | 252 |
| vue/baseline | 10000 | legacy | 126.50 | 13.30 | 49.40 | 2241.44 | 22.74 / 33.93 | 238 |
| vue/baseline | 10000 | revision | 56.30 | 5.80 | 30.50 | 2378.69 | 25.29 / 39.51 | 238 |
| vue/baseline | 30000 | legacy | 41.10 | 5.80 | 26.00 | 4384.55 | 23.84 / 54.60 | 238 |
| vue/baseline | 30000 | revision | 43.10 | 9.00 | 30.10 | 4829.93 | 23.90 / 24.15 | 238 |
| vue/baseline | 100000 | legacy | 53.20 | 10.40 | 23.40 | 12217.60 | 23.93 / 24.25 | 238 |
| vue/baseline | 100000 | revision | 47.40 | 8.10 | 22.70 | 11799.90 | 24.02 / 73.17 | 238 |
| angular/baseline | 10000 | legacy | 116.00 | 7.10 | 21.60 | 912.25 | 22.75 / 32.96 | 238 |
| angular/baseline | 10000 | revision | 28.40 | 4.70 | 25.60 | 793.52 | 24.25 / 27.43 | 238 |
| angular/baseline | 30000 | legacy | 44.60 | 6.70 | 25.50 | 1538.32 | 24.34 / 32.62 | 238 |
| angular/baseline | 30000 | revision | 30.50 | 5.20 | 22.50 | 1380.61 | 24.45 / 40.68 | 238 |
| angular/baseline | 100000 | legacy | 43.60 | 6.90 | 26.30 | 3312.81 | 24.50 / 89.60 | 238 |
| angular/baseline | 100000 | revision | 49.20 | 5.60 | 24.40 | 3363.01 | 24.62 / 110.99 | 238 |
| angular/candidate | 10000 | legacy | 205.50 | 10.50 | 32.80 | 992.19 | 22.82 / 30.74 | 252 |
| angular/candidate | 10000 | revision | 32.80 | 6.00 | 33.20 | 668.30 | 24.35 / 29.30 | 252 |
| angular/candidate | 30000 | legacy | 60.00 | 7.70 | 33.60 | 1430.48 | 24.45 / 41.67 | 252 |
| angular/candidate | 30000 | revision | 46.20 | 6.20 | 43.60 | 1042.35 | 24.55 / 30.49 | 252 |
| angular/candidate | 100000 | legacy | 48.40 | 6.90 | 28.70 | 2149.20 | 24.59 / 73.54 | 252 |
| angular/candidate | 100000 | revision | 50.90 | 6.30 | 24.30 | 978.98 | 24.72 / 48.72 | 252 |

## Correctness

- react/baseline external: {"passed":true,"stable":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"cleanup":true,"events":3}
- react/candidate external: {"passed":true,"stable":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"cleanup":true,"events":3}
- vue/candidate external: {"passed":true,"stable":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"cleanup":true,"events":3}
- vue/baseline external: {"passed":false,"stable":false,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"cleanup":true,"events":3}
- angular/baseline external: {"passed":false,"stable":false,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"cleanup":true,"events":3}
- angular/candidate external: {"passed":true,"stable":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"cleanup":true,"events":3}

Candidate local workloads passing every check: 18/18.
Browser page errors: 0.

Raw per-update latencies, transform times/counts, setter counts, state checks and runtime metadata are retained in [browser.json](browser.json).
