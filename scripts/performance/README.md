# Keyed-selection benchmarks

These scripts use fictional data, local source snapshots and separately installed Playwright. They do not publish packages, change versions or create tags.

Start from the main revision documented in [the report](../../docs/performance/keyed-selection.md), install frozen dependencies, and keep an unchanged main snapshot with its dependencies plus an optional v1.1.0 snapshot. Preserve existing worktrees and evidence. Stop tests/builds and other benchmarks before timing.

Arguments: `<optimized-root> <baseline-root> <playwright-directory> <output.json>`. Pass absolute paths. `qualification.mjs` and `react.mjs` retain #41's original workload and historical variant labels: `candidate` is the first root; `v110` is the second root, even when that second root is keyed main.

```text
node scripts/performance/qualification.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/paired-1.json
node scripts/performance/qualification.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/paired-2.json
node scripts/performance/qualification.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/paired-3.json
node scripts/performance/react.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/react-paired.json
node scripts/performance/core.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/core-paired.json
node scripts/performance/allocations.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/allocations.json
node scripts/performance/interaction.mjs <optimized> <main> <playwright> docs/performance/evidence/keyed-selection/first-interaction.json
node scripts/performance/summarize.mjs
```

Run one script at a time. Ports 5203, 5208–5211 must be free. The React harness writes two fixture files in the first root (`react-performance-fixture.js`, `react-performance.html`); remove those generated files after sampling. Run the original qualification and React harnesses against unmodified main and v1.1.0 before changing source if reproducing the initial comparison. Keep that output separate from paired main/optimized samples.

Qualification: 20 samples/version/workload/run; 30k/100k × 120/200 columns; alternating versions; forced GC before the first ten samples of each case and natural GC for the rest; fixture construction and imports outside adoption timing; two-frame, scroll, selection and heap observations recorded separately. Three runs give n=60/version/workload. Its core controls profile only the first root.

React: 50 updates/version/case; 30k/100k, stable/fresh config, stable rows/columns, changed ariaLabel. Includes two-frame waits and effects; React Profiler render time is a separate metric.

Core: n=30 per row count/version/operation/GC protocol, with immediate first selection; CPU profiles include fixture and selection work. Forced collections occur before operation batches, not before each individual synchronization. Allocation sampling is a separate run and must not be mixed into timing data. Heap values are whole-page observations and do not establish retained leaks. First-click timings measure DOM click dispatch, Lit update and two-frame wait separately, excluding physical input hardware.

Nearest-rank p50/p95, full ranges and sample counts are retained. The summarizer never asserts parity or a performance-budget PASS.
