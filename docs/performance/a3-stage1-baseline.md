# A3 — Keyed-selection performance investigation, stage 1

Issue: [#43](https://github.com/tipolox/litgrid/issues/43). Work branch: `perf/a3-keyed-baseline-43`. Starting `main`: `428ea85fbb7cfa90955b21422598df2d29c1b8af`.

## Status and product context

This is an **investigation stage**, not an optimization, a release decision or a request to alter public contracts. Current user demand for 30k–100k **locally loaded keyed rows** has not been demonstrated; a typical external query page is much smaller. Do not conflate a keyed 100k local workload with an externally paged 20-row workload.

The historical #42 and #41 studies report additional cold-key validation cost as the price of secure row identity, but older index-only behavior was not equivalent functionality. Samples came from a separate Windows/Chromium hardware environment. They are not a current Linux runner baseline or proof of a product SLA.

## Test-only baseline introduced here

`node --expose-gc scripts/performance/a3-core-baseline.mjs .private/a3/core-baseline.json`

Prerequisites: frozen `pnpm install`, then `pnpm --dir packages/grid-core build`. This imports the actual built Core distribution, not a mock. The single bounded GitHub Actions job saves raw samples as `litgrid-a3-core-baseline`.

- 30,000 and 100,000 object rows, realistic unique numeric keys; data construction outside the timer.
- Five conditions: cold keyed construction + `setData`; cold unkeyed control; repeated same-array keyed `setData`; same-reference tail-key mutation; unchanged-config `setConfig`.
- 5 warmups and 40 samples per condition; nearest-rank p50/p95/min/max plus raw values and machine metadata. GC is forced once **outside** each batch; it is not suppressed between samples.
- Correctness probes reject duplicate and third-duplicate keys, off-page duplicate keys, and retain selectability after duplicates are removed. They verify the latest same-reference key mutation and basic selectable row identity.
- Results are **descriptive** and inherently noisy on shared GitHub-hosted hardware. A single run has neither a comparable competitor baseline nor a production paint measurement. No automatic timing threshold or release gate is introduced.

## Root-cause map (observed in current source, not yet quantified)

- `packages/grid-core/src/features/selection/selectionCoordination.ts`: `rebuildKeys()` intentionally scans every row to detect in-place key mutations, then constructs key/index structures when source identities change. `reconcile()` creates a displayed index when the original-order validated source map cannot be reused.
- `packages/grid-core/src/core/createGridEngine.ts`: `setData()` validates keys and runs transforms; `setConfig()` already reuses cached transforms in compatible local modes, but may still rebuild displayed selection state. API mutation support means same-array identity is not a safe skip condition.
- The actual browser/DOM/Lit/adapters/scrolling and first-interaction timeline is **not covered** by this Node-only baseline. Existing `scripts/performance/qualification.mjs`, `core.mjs` and `interaction.mjs` provide relevant earlier browser harnesses, but must be freshly qualified before making head-to-head claims.

## Three distinct hypotheses to evaluate *after* baseline

1. **Fused validation and index construction**: assess Map/array allocations and whether the cold-path can combine key discovery and duplicate accounting without changing finite/string key validation, third-duplicate rejection, off-page identity or first-click correctness.
2. **Configuration/presentation reconciliation**: investigate whether config-only changes can reuse a safe displayed index and avoid unnecessary presentation work without omitting key checks when new data is synchronized. Must preserve mutable-array synchronization and scope/isolation.
3. **User-visible scheduling/presentation**: measure separately engine CPU, Lit update completion, browser frame/paint readiness and first interaction; test a staged viewport hypothesis only if no invalid identity or deferred O(n) work is hidden before the first click.

These are **research hypotheses, not approved fixes**. Do not add `dataRevision`, an immutable mode, or new refresh APIs without a separate design decision. Do not weaken accessibility or virtualized row/column bounds.

## First measured Core-only baseline (2026-11-03)

**Run:** https://github.com/tipolox/litgrid/actions/runs/41565136901 (successful; PR head `eea719153ae95bf279a316519debd42f687b32f1`). GitHub Actions uploaded the **raw 400 timing samples** and host metadata as the `litgrid-a3-core-baseline` artifact (14-day retention). All identity correctness probes passed.

| Built-Core operation | 30k p50 / p95 (ms) | 100k p50 / p95 (ms) |
|---|---:|---:|
| Cold keyed `setData` | 2.62 / 3.56 | 11.18 / 11.68 |
| Cold unkeyed `setData` | 0.107 / 0.122 | 0.321 / 0.345 |
| Repeat unchanged same-array keyed | 0.397 / 1.20 | 1.27 / 1.31 |
| Same-reference tail-key mutation | 2.57 / 3.98 | 10.62 / 11.16 |
| Unchanged-config `setConfig` | 2.84 / 4.40 | 12.02 / 13.14 |

**Interpretation:** The config-only path was not cheap in this Core-only fixture (100k p95 ~13.14ms), despite unchanged data and unchanged configuration. `setConfig` calls `reconcile()`, which in the current unpaginated path can reconstruct a displayed key lookup. This is a **source-supported hypothesis**, not yet a CPU-profiled root cause or a product-speed regression. Cold keyed ingestion's higher cost versus unkeyed reflects extra identity validation guarantees; it is not an equivalent-feature competitor comparison. Numbers are one shared Linux CI run and **must not** be compared directly to historical Windows Chromium p95 values, nor treated as user-visible startup/paint latency or a production SLA.

## Next A3 investigation gate

Only after gathering baseline evidence: run production/browser measurements for 30k/100k × 120/200 columns and external 20-row controls, ideally paired on two environments and with comparable user-visible readiness and first click. Prototype the three options in disposable branches and benchmark each against the **same current main** under equivalent correctness conditions. Stop optimizing if <15–20% user-visible p95 improvement is not reproducible or maintenance/contract risk exceeds the gain.

**Current disposition:** `INVESTIGATE`. Do not merge this PR automatically, close #43, accept a post-hoc performance budget, change any shipped API, tag, version or publish.
