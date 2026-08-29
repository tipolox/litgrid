# Performance Benchmarks

LitGrid provides opt-in benchmarks for the framework-independent Core and renderer hot paths. They are not part of the normal test suite and do not apply timing thresholds in CI, because benchmark timings vary by hardware, operating system, and Node.js version.

Run the suite from the repository root:

```bash
pnpm benchmark
```

Compare results only when using the same machine, Node.js version, and a similar system load. Use the suite to evaluate intentional before-and-after changes rather than as a cross-machine performance score.

## Covered workloads

- Grid Core ingestion of 100,000 deterministic object rows.
- Grid Core quick search, filtering, sorting, and pagination over 100,000 rows.
- Fixed-height virtual range calculation for 1,000,000 rows.
- Variable-height virtual range calculation for 100,000 rows.
- Capped display-to-virtual scroll mapping and display layout calculations near browser scroll-size limits.

The benchmarks intentionally exclude Web Component DOM layout and paint work. Those measurements require a real browser and representative application environment; jsdom timings would not be meaningful for rendering performance.
