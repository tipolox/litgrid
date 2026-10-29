# Default adapter synchronization measurements

Runtime: 156.0.8078.4; v22.14.0. Baseline: 6a0df7b01fd3de0b7e7f5dc386de469f3531d210.

Only released public inputs are used. No revision counter, refresh flag, or new optimization API is supplied. Same machine, browser, fixture, instrumentation, and dependency installation; 120 columns use accessors over compact keyed rows. Fresh pages isolate framework/version; GC precedes workloads, with natural GC during sampling. Tests/builds are stopped while timing.

Update latency includes framework flush and Lit updateComplete. Event-loop yields occur outside each update timer, separating updates for long-task observation. Each unchanged/unrelated case has 30 samples; each genuine configuration, replacement, mutation and schema case has 10. p50/p95 use nearest rank. Supported same-reference edits trigger the existing synchronization path through an ARIA input change.

Unchanged stable inputs do not run structural or row setters. Existing mutable-data synchronization opportunities still validate keys and rerun active transforms. Baseline loses state, so timing does not establish equivalent-correctness performance. No memory savings or universal speedup is claimed.

## unchanged

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 30 | 1.40 / 2.10 | 1.20 / 2.60 | 0 → 0 | 0 → 0 | 0 → 0 |
| react | 30000 | 30 | 1.10 / 2.20 | 1.30 / 2.00 | 0 → 0 | 0 → 0 | 0 → 0 |
| react | 100000 | 30 | 1.10 / 1.70 | 1.10 / 2.30 | 0 → 0 | 0 → 0 | 0 → 0 |
| vue | 10000 | 30 | 0.10 / 0.30 | 0.10 / 0.20 | 0 → 0 | 0 → 0 | 0 → 0 |
| vue | 30000 | 30 | 0.10 / 0.20 | 0.10 / 0.20 | 0 → 0 | 0 → 0 | 0 → 0 |
| vue | 100000 | 30 | 0.10 / 0.20 | 0.10 / 0.20 | 0 → 0 | 0 → 0 | 0 → 0 |
| angular | 10000 | 30 | 0.10 / 0.20 | 0.10 / 0.20 | 0 → 0 | 0 → 0 | 0 → 0 |
| angular | 30000 | 30 | 0.00 / 0.10 | 0.00 / 0.10 | 0 → 0 | 0 → 0 | 0 → 0 |
| angular | 100000 | 30 | 0.10 / 0.20 | 0.10 / 0.20 | 0 → 0 | 0 → 0 | 0 → 0 |

## unrelatedStable

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 30 | 14.80 / 28.20 | 15.70 / 27.80 | 30 → 30 | 30 → 30 | 30 → 0 |
| react | 30000 | 30 | 21.20 / 35.30 | 20.40 / 30.00 | 30 → 30 | 30 → 30 | 30 → 0 |
| react | 100000 | 30 | 38.00 / 81.70 | 32.80 / 40.30 | 30 → 30 | 30 → 30 | 30 → 0 |
| vue | 10000 | 30 | 23.10 / 44.60 | 11.20 / 15.90 | 147 → 30 | 294 → 30 | 294 → 0 |
| vue | 30000 | 30 | 53.40 / 78.10 | 13.90 / 19.70 | 147 → 30 | 294 → 30 | 294 → 0 |
| vue | 100000 | 30 | 153.70 / 266.00 | 26.70 / 38.00 | 147 → 30 | 294 → 30 | 294 → 0 |
| angular | 10000 | 30 | 13.40 / 26.00 | 14.20 / 17.40 | 30 → 30 | 60 → 30 | 60 → 0 |
| angular | 30000 | 30 | 19.10 / 33.80 | 15.00 / 28.60 | 30 → 30 | 60 → 30 | 60 → 0 |
| angular | 100000 | 30 | 36.50 / 61.80 | 39.30 / 55.40 | 30 → 30 | 60 → 30 | 60 → 0 |

## unrelatedFresh

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 30 | 14.80 / 24.40 | 13.40 / 16.80 | 30 → 30 | 30 → 30 | 30 → 0 |
| react | 30000 | 30 | 19.70 / 41.60 | 19.60 / 28.20 | 30 → 30 | 30 → 30 | 30 → 0 |
| react | 100000 | 30 | 35.60 / 45.90 | 33.30 / 55.30 | 30 → 30 | 30 → 30 | 30 → 0 |
| vue | 10000 | 30 | 30.40 / 46.10 | 11.30 / 22.30 | 210 → 30 | 420 → 30 | 420 → 0 |
| vue | 30000 | 30 | 73.60 / 97.90 | 12.30 / 19.70 | 210 → 30 | 420 → 30 | 420 → 0 |
| vue | 100000 | 30 | 228.00 / 316.90 | 27.40 / 44.10 | 210 → 30 | 420 → 30 | 420 → 0 |
| angular | 10000 | 30 | 14.40 / 27.90 | 18.00 / 22.00 | 30 → 30 | 60 → 30 | 60 → 0 |
| angular | 30000 | 30 | 18.80 / 31.90 | 13.40 / 25.90 | 30 → 30 | 60 → 30 | 60 → 0 |
| angular | 100000 | 30 | 44.70 / 53.60 | 39.20 / 54.10 | 30 → 30 | 60 → 30 | 60 → 0 |

## configuration

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 10 | 11.10 / 15.50 | 7.20 / 10.90 | 10 → 10 | 20 → 10 | 20 → 10 |
| react | 30000 | 10 | 26.00 / 300.60 | 15.40 / 25.60 | 10 → 10 | 20 → 10 | 20 → 10 |
| react | 100000 | 10 | 52.90 / 67.70 | 19.60 / 25.70 | 10 → 10 | 20 → 10 | 20 → 10 |
| vue | 10000 | 10 | 5.60 / 8.50 | 7.80 / 9.00 | 10 → 10 | 20 → 10 | 20 → 10 |
| vue | 30000 | 10 | 11.90 / 27.30 | 9.60 / 15.20 | 10 → 10 | 20 → 10 | 20 → 10 |
| vue | 100000 | 10 | 31.90 / 44.20 | 17.90 / 25.90 | 10 → 10 | 20 → 10 | 20 → 10 |
| angular | 10000 | 10 | 9.70 / 11.60 | 7.30 / 7.80 | 10 → 10 | 20 → 10 | 20 → 10 |
| angular | 30000 | 10 | 19.40 / 22.40 | 8.60 / 15.80 | 10 → 10 | 20 → 10 | 20 → 10 |
| angular | 100000 | 10 | 34.30 / 94.00 | 27.90 / 31.00 | 10 → 10 | 20 → 10 | 20 → 10 |

## replacement

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 10 | 12.10 / 24.10 | 9.40 / 25.00 | 10 → 10 | 10 → 10 | 10 → 0 |
| react | 30000 | 10 | 26.00 / 64.40 | 20.30 / 39.00 | 10 → 10 | 10 → 10 | 10 → 0 |
| react | 100000 | 10 | 53.00 / 75.70 | 32.60 / 72.40 | 10 → 10 | 10 → 10 | 10 → 0 |
| vue | 10000 | 10 | 6.50 / 8.30 | 5.70 / 10.30 | 10 → 10 | 20 → 10 | 20 → 0 |
| vue | 30000 | 10 | 11.30 / 20.00 | 8.30 / 12.70 | 10 → 10 | 20 → 10 | 20 → 0 |
| vue | 100000 | 10 | 30.80 / 49.50 | 17.80 / 34.30 | 10 → 10 | 20 → 10 | 20 → 0 |
| angular | 10000 | 10 | 9.30 / 11.00 | 6.60 / 13.50 | 10 → 10 | 20 → 10 | 20 → 0 |
| angular | 30000 | 10 | 18.50 / 20.90 | 9.50 / 14.10 | 10 → 10 | 20 → 10 | 20 → 0 |
| angular | 100000 | 10 | 47.50 / 62.30 | 28.50 / 36.00 | 10 → 10 | 20 → 10 | 20 → 0 |

## mutation

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 10 | 9.40 / 11.70 | 7.10 / 10.40 | 10 → 10 | 10 → 10 | 10 → 0 |
| react | 30000 | 10 | 17.00 / 34.40 | 13.30 / 20.20 | 10 → 10 | 10 → 10 | 10 → 0 |
| react | 100000 | 10 | 29.90 / 34.80 | 20.30 / 32.10 | 10 → 10 | 10 → 10 | 10 → 0 |
| vue | 10000 | 10 | 5.80 / 11.10 | 4.50 / 6.20 | 10 → 10 | 20 → 10 | 20 → 0 |
| vue | 30000 | 10 | 11.20 / 13.60 | 10.50 / 12.00 | 10 → 10 | 20 → 10 | 20 → 0 |
| vue | 100000 | 10 | 32.30 / 42.90 | 17.40 / 24.00 | 10 → 10 | 20 → 10 | 20 → 0 |
| angular | 10000 | 10 | 8.40 / 11.80 | 7.80 / 12.90 | 10 → 10 | 20 → 10 | 20 → 0 |
| angular | 30000 | 10 | 15.00 / 21.20 | 13.10 / 14.80 | 10 → 10 | 20 → 10 | 20 → 0 |
| angular | 100000 | 10 | 37.10 / 51.70 | 28.60 / 30.90 | 10 → 10 | 20 → 10 | 20 → 0 |

## schema

| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react | 10000 | 10 | 9.70 / 12.10 | 8.40 / 11.70 | 10 → 10 | 10 → 10 | 10 → 10 |
| react | 30000 | 10 | 15.00 / 25.40 | 16.80 / 21.20 | 10 → 10 | 10 → 10 | 10 → 10 |
| react | 100000 | 10 | 30.20 / 40.40 | 19.70 / 24.20 | 10 → 10 | 10 → 10 | 10 → 10 |
| vue | 10000 | 10 | 7.10 / 17.80 | 5.40 / 7.30 | 10 → 10 | 20 → 10 | 20 → 10 |
| vue | 30000 | 10 | 11.70 / 30.30 | 10.50 / 13.70 | 10 → 10 | 20 → 10 | 20 → 10 |
| vue | 100000 | 10 | 30.80 / 39.00 | 18.60 / 21.80 | 10 → 10 | 20 → 10 | 20 → 10 |
| angular | 10000 | 10 | 5.90 / 13.60 | 8.70 / 10.70 | 10 → 10 | 20 → 10 | 20 → 10 |
| angular | 30000 | 10 | 16.50 / 23.40 | 15.60 / 22.00 | 10 → 10 | 20 → 10 | 20 → 10 |
| angular | 100000 | 10 | 37.00 / 48.90 | 32.30 / 36.80 | 10 → 10 | 20 → 10 | 20 → 10 |

## Mount, selection, scrolling, long tasks and heap

Individual observations per whole workload, not distributions. Long tasks come from PerformanceObserver (duration >=50ms), including initial mount and fixture checks. CDP task duration includes surrounding fixture/framework work. Whole-page heap before/after without final forced GC does not establish retained allocation or leaks.

| Framework/version | Rows | Mount ms | First selection ms | Scroll + two frames ms | Task duration ms | Long tasks n / total ms | Heap before/after MB | Visible cells |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| react/baseline | 10000 | 147.40 | 11.20 | 38.10 | 2213.34 | 3 / 379.00 | 22.76 / 33.30 | 238 |
| react/baseline | 30000 | 192.50 | 10.40 | 33.20 | 3639.40 | 6 / 926.00 | 24.11 / 37.45 | 238 |
| react/baseline | 100000 | 204.50 | 16.20 | 41.50 | 4987.55 | 26 / 1803.00 | 24.17 / 73.71 | 238 |
| react/candidate | 10000 | 184.90 | 10.60 | 32.10 | 1965.68 | 2 / 262.00 | 22.76 / 32.02 | 252 |
| react/candidate | 30000 | 42.80 | 4.50 | 36.20 | 2573.90 | 0 / 0.00 | 24.14 / 30.50 | 252 |
| react/candidate | 100000 | 96.40 | 8.40 | 24.10 | 3599.59 | 7 / 492.00 | 24.20 / 34.34 | 252 |
| vue/candidate | 10000 | 140.30 | 9.10 | 20.90 | 1433.75 | 2 / 191.00 | 22.75 / 32.99 | 252 |
| vue/candidate | 30000 | 29.00 | 3.80 | 27.90 | 1661.40 | 0 / 0.00 | 25.38 / 38.21 | 252 |
| vue/candidate | 100000 | 49.20 | 9.60 | 21.10 | 2837.49 | 2 / 128.00 | 23.88 / 65.17 | 252 |
| vue/baseline | 10000 | 148.20 | 15.00 | 20.50 | 2525.84 | 3 / 288.00 | 22.75 / 28.55 | 238 |
| vue/baseline | 30000 | 34.50 | 3.90 | 16.30 | 4951.95 | 54 / 3767.00 | 25.34 / 35.32 | 238 |
| vue/baseline | 100000 | 57.90 | 5.60 | 32.10 | 14318.84 | 62 / 12618.00 | 23.85 / 57.10 | 238 |
| angular/baseline | 10000 | 133.80 | 8.30 | 43.20 | 1816.07 | 2 / 184.00 | 22.77 / 33.76 | 238 |
| angular/baseline | 30000 | 36.90 | 6.30 | 28.70 | 2432.85 | 0 / 0.00 | 24.31 / 42.97 | 238 |
| angular/baseline | 100000 | 124.20 | 13.80 | 38.70 | 4878.76 | 23 / 1445.00 | 24.42 / 83.90 | 238 |
| angular/candidate | 10000 | 229.50 | 9.30 | 38.00 | 2052.01 | 2 / 297.00 | 22.78 / 31.60 | 252 |
| angular/candidate | 30000 | 46.80 | 7.00 | 45.30 | 1892.06 | 1 / 56.00 | 24.36 / 30.16 | 252 |
| angular/candidate | 100000 | 100.50 | 14.60 | 47.70 | 4377.67 | 7 / 504.00 | 24.47 / 67.85 | 252 |

## Correctness

- react/baseline external: {"passed":false,"stable":true,"stableEvents":true,"skippedResultReplay":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"numericScope":false,"cleanup":true,"events":3}
- react/candidate external: {"passed":true,"stable":true,"stableEvents":true,"skippedResultReplay":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"numericScope":true,"cleanup":true,"events":3}
- vue/candidate external: {"passed":true,"stable":true,"stableEvents":true,"skippedResultReplay":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"numericScope":true,"cleanup":true,"events":3}
- vue/baseline external: {"passed":false,"stable":false,"stableEvents":true,"skippedResultReplay":false,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"numericScope":false,"cleanup":true,"events":3}
- angular/baseline external: {"passed":false,"stable":false,"stableEvents":true,"skippedResultReplay":false,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"numericScope":false,"cleanup":true,"events":3}
- angular/candidate external: {"passed":true,"stable":true,"stableEvents":true,"skippedResultReplay":true,"lateRejected":true,"norRejected":true,"nortAccepted":true,"wording":true,"numericScope":true,"cleanup":true,"events":3}

Candidate local workloads passing every check: 9/9.
Browser page errors: 0.

Raw per-update latencies, transform totals/counts, setter counts, long-task samples, state checks and runtime metadata are retained in [browser.json](browser.json).
