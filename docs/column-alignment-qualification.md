# #34A alignment-only qualification

**Decision: NO-GO for merge. PERF NOT QUALIFIED. Keep this PR DRAFT.**

The user confirmed that no independent physical host is available. No new
alignment A/B or identical-build A/A timing study was run on the original host.
The provisional trigger remains `max(0.05 × baseline, 0.5 ms)`. Prior #68
ablations supply no acceptance evidence for this binary. Before any merge
recommendation, run controlled paired A/B and byte-identical A/A qualification
on another physical host, preserving exact builds, all observations and the
unchanged trigger. Structural parity and passing correctness gates cannot waive
that requirement.

## Isolation and scope

- Fetched current main before extraction and rechecked before submission:
  `0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8`.
- New branch `codex/34a-alignment-only`, isolated worktree
  `.worktrees/alignment-only-34a`; independent pinned main comparison worktree
  `.worktrees/alignment-only-34a-baseline`.
- Selectively adapted alignment from reviewed #68 head
  `3ed387992a54e2fd0f9105acf1963946d9c48705`, following its
  [final architectural disposition](https://github.com/tipolox/litgrid/pull/68#issuecomment-6764669135).
  No combined cherry-pick. #67 and #68 remain unchanged drafts.
- No value-format API, Intl machinery, generated display factories, formatter
  caches, formatting models, retention tests or formatting documentation added.
- No dependency/version change, merge, issue closure, release or deployment.

The exact submitted commit and its CI links are recorded in the draft PR
description. The [evidence manifest](column-alignment/evidence/manifest.json)
pins the baseline, reviewed source, local environment and SHA-256 of the actual
runtime/test sources, generated Blazor bundle/map, logs and artifacts. CI tests
the submitted head independently.

## Public contract and framework changes

```ts
export type GridColumnAlign = 'start' | 'center' | 'end' | 'left' | 'right'
// Added to existing GridColumn<TRow>:
align?: GridColumnAlign
```

| Surface | Alignment-only change |
| --- | --- |
| Web | Export type; stage metadata validation/snapshots before schema adoption; additive alignment classes using actual flex placement and text alignment; expand only configured header labels while controls remain fixed. No extra render node or default setter. |
| React | Re-export type, compare scalar alignment in existing synchronization snapshots, report lifecycle validation failures while preserving the mounted grid and retryability. |
| Vue | Re-export type, synchronize alignment, accept inline `LitGridColumn align` and typed `column` metadata; adopt a valid schema before switching inference ownership. |
| Angular | Re-export type and compare scalar alignment at existing synchronization points. Existing lifecycle error handling remains in place. |
| Blazor | Nullable `Align` on programmatic and declared columns; omit null JSON metadata; compare immutable declaration snapshots; retain last valid transfer on validation failure and retry after correction; reconcile aligned programmatic edits by key. Regenerate bundle/map. |

Omitted alignment retains historical positioning. Logical start/end follow text
direction; physical left/right remain physical. Typed keys, existing callbacks,
query/copy semantics, persistence and refresh APIs remain unchanged. The Web
replacement setter retains its historical replacement behavior; schema updates
and adapters retain keyed user state. The entirely unconfigured Blazor
programmatic path retains its existing replacement setter.

## Correctness and structural evidence

Local environment: Windows, Node 22.14.0, locked pnpm 10.33.0 dependencies,
production-minified framework bundles, Chromium 156.0.8078.4, .NET 8 targets.
These are local correctness results, not cross-host timing replication.

| Gate | Result |
| --- | --- |
| All-package production build | PASS |
| All authored TypeScript ownership/source, bounded contracts, published declarations | PASS |
| Real strict Angular template (`ngc`) and Vue SFC (`vue-tsc`) consumers | PASS |
| Full JavaScript regression | 449 tests / 54 files PASS |
| Full Blazor regression and library build | 137 tests PASS; build PASS |
| Existing mounted adapter events and Vue declarations/workloads | PASS |
| Alignment browser geometry | 10 combinations: all five values × LTR/text-level RTL; DOM Range text bounds and custom-renderer rectangles, fixed header-control position, real menu, resize and keyboard checks PASS |
| Dynamic metadata and invalid recovery | Web, mounted React/Vue/Angular, compiled Vue inline markers and both Blazor JSON modes PASS; unit gates additionally retain width/order/visibility, selection/focus, schema changes and reconnect |
| Baseline structural comparisons | 64 workloads; 5k/30k rows × 3/120 columns; Web/React/Vue/Angular/Vue declarations, plus 3-column inference. All unconfigured schema/data/config/inference setter counts and observed DOM maxima equal pinned main; aligned workloads add no nodes. Max observed 19 rows / 247 cells / 382 elements. |
| Real .NET browser | Existing Blazor browser regressions plus declarations/programmatic alignment serialization, invalid rejection, correction/removal, retained width/order and active cell PASS |
| B1 and external-query visual regressions | PASS; desktop/light loaded/loading and mobile/dark loading screenshots inspected |

Reproduction commands and exit statuses are in
[gates.json](column-alignment/evidence/gates.json); full logs, structural JSON,
real Blazor JSON and screenshots are in the same evidence directory.
`check-column-alignment.mjs --baseline=<built-main-worktree>` is correctness-only:
it has no measurement rounds or timing acceptance logic. The standard B1 and
external-query regression scripts retain their existing diagnostic timers;
those durations are not alignment A/B evidence and do not qualify performance.

Local full JS qualification used two fork workers and a 15s command-line test
timeout, as previously documented for this Windows host. Repository timeouts
and thresholds are unchanged; Verify retains the normal CI test command.

## Corrections and limitations retained in evidence

An initial new unit test assumed empty schemas disable inference; the fixture
was corrected to opt out of inference explicitly. The full final suite passes.
The initial Blazor browser alignment selector assumed the salary column remained
first after a user reorder; the selector now locates aligned content regardless
of retained order. Its failed attempt is retained. A subsequent local rerun hit
the still-running test server because sandboxed process cleanup was restricted;
the identified test host was stopped and the final browser gate rerun with
working cleanup. Initial sandbox-blocked NuGet restores were retried with
permission and succeeded. These are disclosed local setup/fixture failures,
not waived production failures.

**GO for independent review of this bounded draft. NO-GO for merge until the
independent physical host performance gate is qualified.**
