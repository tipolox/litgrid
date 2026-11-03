# LitGrid A3 — Stage 3 semantic safety and browser configuration qualification

**Issue:** #43. **Unchanged repository baseline:** `428ea85fbb7cfa90955b21422598df2d29c1b8af`. **Experimental head:** `f700e719b5375e723a24f43a4c6275693e3548e9` (test-only draft PR #60). **Date:** 2026-11-03.

## Decision

**REJECT the naive H2/H3 early-return fast paths**: they are observably non-equivalent to the existing Core contract. **ADVANCE the new H4 verified displayed-index reuse to a separate, focused production-design review**, but do not merge the experimental source alteration or this research PR without explicit owner authorization.

All variants are built from disposable source copies. The A3 workflow restores original `packages/grid-core/src` contents and enforces `git diff --exit-code` before producing timing evidence. No production algorithm or exported API has changed in this research PR.

## A. The apparently fastest approaches are unsafe

The isolated H2 (identical config) and H3 (presentation-only config) variants bypass `reconcile()` and, in relevant cases, the existing repagination operation. A deterministic comparison against unchanged `main` found:

| Observable case | Baseline behavior | Unsafe shortcut behavior |
|---|---|---|
| Paginated `getRows()` slice edited directly, then identical `setConfig` | Recreates page slice, discarding the caller's accidental page-array edit | H2/H3 retain the stale edited page |
| Selected row key mutated in place without `setData`, then identical `setConfig` | Reconciles the stale identity and updates selection state/events | H2/H3 keep stale selection state/events |
| Page view followed by a presentation-only config change | Repaginates and creates a new page-array reference | H3 retains the old page-array reference |
| Scope or pagination changes | Existing safeguards preserve scope/page semantics | Shortcuts correctly fall through, but this does not fix other divergences |

The dramatic H2/H3 `setConfig` microsecond results from Stage 2 are therefore **NOT candidate release performance**. Their speed comes partly from omitted behavior, not a safe optimization.

## B. H4 — verified displayed-index reuse

The H4 experiment remains O(n) on configuration reconciliation. It scans each displayed identity synchronously and checks that each valid key resolves to the same displayed index in the existing map, with a matching valid-key count. **Only when the entire displayed mapping is unchanged** does it reuse the existing `Map`; otherwise it rebuilds the displayed index. It still repaginates, remaps selection and commits notification snapshots exactly as the baseline call site does.

This is a narrower algorithmic optimization than skipping reconciliation. It does not introduce immutable-row assumptions, revision APIs, new selection semantics or a deferred first-click scan. The disposable prototype handles ordinary changed identities by falling back to the baseline rebuild logic.

### Semantic comparison evidence

On both Ubuntu and Windows GitHub-hosted runners:

- Ten targeted baseline-vs-H4 scenarios produced **identical serialized public state and selection events**: identical/config presentation changes, paginated-array reference and edits, in-place key mutation, scope switch, page switch.
- **750 deterministic state transitions** were compared after every step, including same-array `setData`, direct in-place identity/name changes, row insert/removal/reorder, alternate row-key scope and pagination, sort/filter/search, selection, and paginated-array edits.
- **50 external state commits with stale-result attempts** were also compared against the unchanged engine, including loaded-only 20-row identity and known one-billion-row totals.
- All H4 comparisons passed on **both** runners. The automated tests deliberately *expect* H2/H3 safety divergences, so failures cannot be masked by treating them as acceptable behavioral differences.

These probes are strong initial evidence, **not a formal proof of equivalence for every possible consumer**, especially unusual getters/proxies, custom row objects, cross-framework lifecycle and concurrent UI behaviors.

## C. Core p95 configuration timings, 100,000 rows

| Environment and operation | Baseline | H4 verified index reuse | Relative p95 reduction |
|---|---:|---:|---:|
| Linux / identical configuration | 12.87 ms | 4.47 ms | ~65% |
| Linux / presentation-only change | 13.31 ms | 4.61 ms | ~65% |
| Windows / identical configuration | 21.22 ms | 10.78 ms | ~49% |
| Windows / presentation-only change | 22.17 ms | 8.15 ms | ~63% |

These are paired within-environment, compiled Core, two-round comparisons; the Windows and Linux absolute numbers **must not be compared as equivalent hardware**. Benchmark outliers and the distribution of actual user configuration changes still require attention.

## D. Browser: real Web Component with disposable Core injected for testing

A Chromium/Vite harness instantiates the real LitGrid Web Component, swaps in an already-built candidate Core engine **before assigning input data**, reattaches notification subscriptions, and times the Web Component's actual `config` setter and Lit `updateComplete`. The injection is test-only: it is **not** how LitGrid is integrated in production.

| Browser p95 on Linux | Baseline Lit update | H4 Lit update | Approx. reduction |
|---|---:|---:|---:|
| 30k / 120, identical config | 7.1 ms | 5.8 ms | ~18% |
| 30k / 120, presentation config | 11.6 ms | 5.3 ms | ~54% |
| 100k / 120, identical config | 15.5 ms | 8.5 ms | ~45% |
| 100k / 120, presentation config | 17.6 ms | 10.2 ms | ~42% |
| 100k / 200, identical config | 16.3 ms | 10.6 ms | ~35% |
| 100k / 200, presentation config | 20.9 ms | 12.8 ms | ~39% |

Each group contains 30 samples on one hosted browser runner, alternating variant order across two rounds. These are real Lit update completion intervals, **not compositor paint, screen first-contentful paint, a production-distribution A/B test, or customer-perceived latency**. The harness checks retained keyed selection and bounded virtualization after each config update. Ordinary 20-row external pages should still be independently prioritized by real consumer demand.

## E. Reproduction and reproducibility

- [Successful four-job A3 CI run](https://github.com/tipolox/litgrid/actions/runs/41569261892) — Core baseline, experimental variants and semantic differential, Windows independent comparison, Chromium comparison. Artifacts hold per-sample distributions and environment metadata.
- [Successful Verify on the same head](https://github.com/tipolox/litgrid/actions/runs/41569261886) — existing source contracts, JS/Blazor tests, package builds and applicable adapter checks.
- `scripts/performance/a3-build-variants.mjs` — creates disposable baseline/H1/H2/H3/H4 built packages and restores source bytes.
- `scripts/performance/a3-differential.mjs` and `a3-contract-fuzz.mjs` — intentional safety divergences and baseline-equal H4 checks.
- `scripts/performance/a3-compare-variants.mjs` — raw compiled-Core head-to-head timings.
- `scripts/performance/a3-browser-config.mjs` — paired browser config setter and Lit update measurements.

## F. Residual design risks before allowing production code

1. **Key getters with observable side effects:** on a failed reuse check, H4 may read identities a second time during fallback, unlike the baseline's normal full-rebuild pass. Test accessors, inherited getters, proxies and deliberate mid-read mutation. A production design should ideally read every key once per reconciliation or explicitly justify exceptions without weakening correctness.
2. **Display transformations and selection:** extend safety tests with sorted/filtered rows, pagination boundaries, mixed duplicate/null/string/numeric keys, rapid scope changes, selection events, and in-place mutation patterns.
3. **Cross-adapter integration:** run React, Vue, Angular and Blazor consumer lifecycle tests against an actual production implementation. The current browser experiment replaces a Core field on the Web Component and does not prove integrated package releases.
4. **Deployment profile:** the benchmark's main gain is specifically on repeated local keyed configurations with tens of thousands of loaded rows. Typical small server-side pages may gain little, so do not make this a release priority solely because of a microbenchmark.
5. **Release acceptance:** no owner-approved performance budget, no version bump and no publication. Do not compare the displayed p95s to historical Windows measurements from a different host as if they formed one A/B run.

## Architectural next step

**Prepare a separate draft production PR**, based directly on current `main`, implementing the smallest *verified displayed-index reuse* correction inside Core with targeted unit tests, a strict getter/mutation side-effect audit and full existing regression checks. Keep A3's reproducible benchmark tooling and reports in the current **draft research PR #60** until its own merge is authorized. Do not merge production work until the safety audit passes and the owner explicitly approves it. Leave Issue #43 open.

**Stage 3 decision:** H2/H3 **NO-GO**. H4 **PROMISING / NOT YET APPROVED FOR MERGE**.