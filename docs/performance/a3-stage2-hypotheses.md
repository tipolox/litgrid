# LitGrid A3 — Stage 2 disposable performance hypotheses

**Issue:** #43. **Base `main`:** `428ea85fbb7cfa90955b21422598df2d29c1b8af`. **PR:** #60, test-only, unmerged.

## Boundaries

This investigation compiles three **ephemeral** alterations of the actual TypeScript Grid Core source and one unchanged baseline. `scripts/performance/a3-build-variants.mjs` restores all authored source bytes in a `finally` block; CI enforces `git diff --exit-code -- packages/grid-core/src`. No candidate's algorithm is included in the Git diff or published to consumers.

- **H1 fused key/index allocation:** construct the candidate key array by indexed allocation rather than `slice` plus `push`. Identity scan remains synchronous. Evaluates allocation/constant factors, not semantics.
- **H2 identical resolved config fast path:** bypass repagination/selection reconciliation when all operational and presentation resolved fields compare equal. Deliberately leaves data validation on `setData` unchanged.
- **H3 presentation-only config fast path:** bypass Core repagination/reconciliation when operational fields, selection identity/scope and pagination remain unchanged, while updating resolved presentation configuration.

These are competing **prototypes**. H3 is not a superset of all safe behavior without additional proof; see risks below.

## Evidence and measurements

Successful [A3 CI run](https://github.com/tipolox/litgrid/actions/runs/41566910891), test head `f98e427f79ca18936bf59a6e6f38377347364d97`:

- Four builds, Core identity probes and 2 rounds × 30 measurements per candidate/operation/row count passed. The `litgrid-a3-variant-comparison` artifact contains each raw timer, p50/p95/range and runtime metadata.
- A separate browser job loads the real Web Component from unchanged source in Chromium, with fictional 30k/100k × 120/200-row/column combinations, 12 samples per case, bounded virtualization, first-click identity checks, scroll updates, and 20-row external pages. Artifact: `litgrid-a3-browser-baseline`.
- Tests do not weaken identity validation or time budgets, and no change to `main` was made.

### Built Core p95 on the same GitHub-hosted Linux runner

| 100k-row operation | Unmodified baseline | H1 fused index | H2 identical-config fast path | H3 presentation fast path |
|---|---:|---:|---:|---:|
| Cold keyed `setData` | 14.01 ms | 13.11 ms | 14.15 ms | 14.11 ms |
| Same-reference `setData` | 1.62 ms | 2.87 ms | 2.80 ms | 2.84 ms |
| In-place tail-key mutation + `setData` | 13.15 ms | 12.77 ms | 13.78 ms | 13.20 ms |
| Identical `setConfig` | 15.67 ms | 14.43 ms | 0.0022 ms | 0.0024 ms |
| Presentation-only `setConfig` | 15.38 ms | 14.49 ms | 17.30 ms | 0.0034 ms |

At 30k rows, identical-config p95 was 4.84 ms baseline versus 0.0075 ms H2 and 0.0070 ms H3; presentation-only was 5.07 ms baseline versus 0.0026 ms H3.

**Interpretation:** H1 offers only about 6% 100k cold p95 improvement and its same-reference 100k p95 is worse in this run. **Do not ship H1** on this evidence. H2/H3 show major *isolated Core-call* savings in their narrow qualifying workloads, but their effect on end-user updates is **not measured**. Candidate 100k same-reference p95 samples also show conspicuous noise; this single shared runner is not a reliable regression threshold.

### Actual unmodified Web Component browser workload

| Workload | Initial Lit update p95 | Two animation-frame wait p95 | First DOM click → Lit update p95 | Mounted rows (max) |
|---|---:|---:|---:|---:|
| 30k rows / 120 columns | 18.3 ms | 40.7 ms | 4.1 ms | 16 |
| 30k rows / 200 columns | 8.0 ms | 30.5 ms | 4.4 ms | 16 |
| 100k rows / 120 columns | 14.3 ms | 37.7 ms | 4.4 ms | 16 |
| 100k rows / 200 columns | 14.1 ms | 30.8 ms | 7.5 ms | 16 |

The 30k/120 case taking longer than 100k/120 in some samples demonstrates **measurement noise** on shared hardware. Two frame waits do **not** measure compositor paint, first contentful paint, a user's physical input latency or a production SLA. This run includes external pages with only 20 loaded rows even when the declared total is very large, and does not benchmark production adapter rendering.

## Correctness and compatibility guardrails

The experimental probes passed on each variant for duplicate and third-duplicate identity rejection, removal and recovery, invalid NaN/infinite keys, off-page duplicates, account/site scope reset, selection continuity across presentation changes, and loaded-only external 20-row validation.

**These probes are not sufficient for a production optimization approval.** In particular:

1. `setConfig` currently repaginates displayed rows and reconciles selection; skipping it changes the observable lifecycle even if normalized inputs appear unchanged. Confirm the behavior when callers mutate a returned `getRows()` array, mutate rows without signaling `setData`, change selection listeners, or rely on a fresh row-array object.
2. H2/H3 do not reduce 100k keyed cold ingestion materially and would not necessarily improve the Web Component's DOM/Lit rendering or framework adapter performance. The Web Component still calls `requestUpdate()` after `setConfig`.
3. The A1/A2 adapters already suppress some semantically unchanged setter calls; the frequency of these Core-level cases in real consumers is unknown.
4. No current customer requirement for 100k locally loaded keyed rows was demonstrated, and stable row identity protections cannot be weakened to improve benchmark scores.
5. A future accepted patch requires behavior-level differential tests, real browser/Core paired runs under the same fixture, and ideally a second representative host. Preserve external-query stale guards, virtualization, selection events, public declarations, and same-reference `setData` semantics.

## Architectural disposition

**Stage 2 research completed. Production optimization: NOT APPROVED YET.**

The first strong hypothesis is a narrowly guarded configuration reconciliation fast path (H2 and possibly H3), but its **end-to-end user benefit and complete semantic safety remain unverified**. The fused allocation candidate is below the suggested ~15–20% user-visible improvement hurdle; stop pursuing it unless profiling shows a different benefit. Stage 3 should be a small behavior-differential and browser-config-update experiment, not a speculative rewrite.

The user/founder must approve any production PR and subsequent merge/release separately. Leave #43 open; leave PR #60 draft until architectural review. No performance budget or release SLA is accepted by these results.
