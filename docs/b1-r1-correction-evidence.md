# B1-R1 correction evidence (2026-11-08)

PR: <https://github.com/tipolox/litgrid/pull/64>. Keep draft; independent architectural review and founder merge authorization remain required.

## Verified starting point and reproduction

GitHub and a fresh remote fetch both confirmed PR #64 open/draft at `9ae04469d1744b2d155c2b3e6c9ac511df7fe588`, based on main `861c6a702e4ced1549e0f2fae8507af67e823e68`. Issue #62 and epic #27 are open. Design PR #63 is open/draft at `f626d4a0c838e3334a273b3c858b6bb93419d0bc`; it was not modified. Work used a clean detached worktree at the existing implementation head and preserved the other working trees and commits.

Before modifying implementation, new Web tests reproduced four failures on that head: same-key replacement through row, batch, and range refresh, plus same-length reorder. The seven original Web refresh tests passed. Each replacement call reported success while the old displayed object remained rendered. A separate original-head Chromium worktree running the new browser fixture also failed with `B1 regression: row replacement remained stale`.

```ts
const rows = [{id: 1, name: 'John'}, {id: 2, name: 'Mary'}]
grid.columns = [{key: 'name'}]
grid.config = {selection: {mode: 'row', rowKey: 'id'}}
grid.data = rows
rows[1] = {id: 2, name: 'Maria'}
grid.refreshRow(2) // original head: true, but Mary remains displayed
```

Core transforms intentionally detach the displayed array, even without active transforms. Targeted lookup checked the cached key/index and the cached object's key, but never compared that object with the current source slot. Both checks could agree on stale data. Pagination adds a second detached array; a displayed offset cannot be treated as a source offset. External mode intentionally snapshots accepted page arrays and has a different ownership contract.

## Correction and bounds

Core's existing `getDisplayedRowIndexForKey` now checks the existing source-key index, source length, source-slot object reference, and current key. A stale target returns undefined, activating Web's existing complete local reconciliation in default auto mode. No public API shape was added. Internal selection remapping still uses its original index so full reconciliation can preserve the selected key while updating its row object/index.

For index-only local ranges, the untransformed source position is the displayed offset plus the page offset. A mismatch also takes full auto reconciliation. Without keys, active local transforms have no bounded source mapping: auto already reconciles them, and render-only declines them.

Safe same-object presentation changes retain selective guarded rendering. A 100k-row Core regression asserts exactly one identity getter read, at the requested row, for a successful lookup. No new global scan, source copy, or per-row provenance map is added to the fast path. Full fallback remains O(n), plus any active transform cost.

Render-only requires unchanged source slots, row objects, keys, derived membership/order/schema, and geometry. A detected mismatch rejects the whole batch/range. It remains a caller guarantee: targeted refresh cannot discover unreported collisions, reorders, or other structural changes elsewhere. Prefer full refresh for structure; a reported key-change batch must include old and new keys. External refresh repaints accepted snapshot objects only; replacement pages use the existing external-state lifecycle. It never fetches or generates query intent.

## Changed files

| File | Purpose |
| --- | --- |
| `packages/grid-core/src/features/selection/selectionCoordination.ts` | Bounded current-source-slot validation |
| `packages/grid-core/src/core/createGridEngine.ts` | Route targeted lookup through validation |
| `packages/grid-core/src/core/GridEngine.ts` | Clarify existing lookup contract |
| `packages/grid-core/src/core/rowRefresh.test.ts` | Source replacement/reorder/key, sorted/page mapping, 100k bounded-check regressions |
| `packages/grid-web/src/components/DataGrid.ts` | Index-only range source validation and render-only clarification |
| `packages/grid-web/src/components/DataGrid.rowRefresh.test.ts` | Row/batch/range replacement, identities, transforms, pages, virtualization, scope and trust-boundary regressions |
| `scripts/performance/b1-targeted-browser.mjs` | Real Chromium regressions and replacement-fallback measurements; optional performance-only comparison |
| `packages/grid-blazor/src/wwwroot/litgrid-blazor.js` | Actual workspace build of corrected Core/Web code |
| `packages/grid-blazor/src/wwwroot/litgrid-blazor.js.map` | Matching generated source map |
| `docs/api-reference.md` | Caller guarantees, structural refresh and external snapshot ownership |
| `docs/blazor-data-synchronization.md` | Corresponding Blazor contract clarification |
| `docs/b1-r1-correction-evidence.md` | This report |

## Executed validation

Commands below ran in the isolated correction worktree unless marked baseline. Windows invoked pnpm as `pnpm.cmd`. Environment: Windows, Node v22.14.0, pnpm 10.33.0, Chromium 156.0.8078.4, AMD Ryzen 5 3550H, .NET SDK 10.0.403 targeting net8.0. CI uses the repository's locked Node 22.22.3 configuration where specified.

| Command | Actual outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS after allowing dependency-store access; initial sandbox attempt hit EPERM |
| `pnpm exec vitest run packages/grid-web/src/components/DataGrid.rowRefresh.test.ts --maxWorkers=2 --reporter=json --outputFile=.private/b1/baseline-regression.json` (original implementation, new tests) | Expected RED: 4 failures, 7 passes |
| `pnpm exec vitest run packages/grid-core/src/core/rowRefresh.test.ts --maxWorkers=2 --reporter=json --outputFile=.private/b1/baseline-core.json` (original implementation, new tests) | Expected RED: 3 stale-target failures plus the new freshness-read assertion; 2 original tests pass |
| `pnpm exec vitest run packages/grid-core/src/core/rowRefresh.test.ts packages/grid-web/src/components/DataGrid.rowRefresh.test.ts --maxWorkers=2 --reporter=json --outputFile=.private/b1/corrected-targeted.json` | PASS: 32/32 |
| `pnpm test --maxWorkers=2 --reporter=json --outputFile=.private/b1/all-tests.json` | PASS: 415/415 (original head had 392) |
| `pnpm typecheck:all` | PASS: browser/tools strict projects and tracked-file ownership audit; 116 authored TypeScript files before this Markdown report |
| `node scripts/typecheck-contracts.mjs` | PASS |
| `pnpm run build` | PASS: all workspace packages, Angular packaging, Blazor bundle/map and playground build; no deployment |
| `pnpm exec tsc -p tsconfig.published-contracts.json --pretty false` | PASS |
| `node scripts/check-adapter-events.mjs .private/b1/adapter-events.json` | PASS: React/Vue/Angular, local/external, mount/remount cleanup; zero browser errors |
| `dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj -c Release` | PASS: 129/129; initial sandbox restore was blocked by NuGet socket access, then restore/test succeeded with network access |
| `dotnet build packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj -c Release --no-restore` | PASS: zero warnings/errors |
| `node scripts/external-query-browser-check.mjs` | PASS on serial execution (exit 0): correctness/debounce/focus/loading-layout and large totals; a concurrent Vite-cache run timed out at page readiness |
| `node scripts/performance/b1-targeted-browser.mjs .private/b1/baseline-new-regressions.json` (original-head worktree with new fixture) | Expected RED: same-key replacement remained stale; an initial baseline setup attempt needed package dependency junctions before reaching the fixture |
| `node scripts/performance/b1-targeted-browser.mjs .private/b1/final-browser.json` | PASS: all new browser regressions, safe callback isolation, unchanged row DOM, focus/keyboard/ARIA/layout, offscreen replacement/virtualization, transforms/pages, identities, render-only, zero query intents and cross-scope isolation |
| `node scripts/performance/b1-targeted-browser.mjs .private/b1/baseline-serial.json --performance-only` (original-head worktree) | PASS: equivalent safe fixtures |
| `node scripts/performance/b1-targeted-browser.mjs .private/b1/corrected-serial.json --performance-only` | PASS: equivalent safe fixtures plus corrected replacement fallback |
| `git diff --check` | PASS |

The baseline and correction worktrees retain ignored local JSON/log evidence under `.private/b1`; original-head browser reproduction also retains `baseline-regressions.log`. GitHub Actions status/links are recorded in the updated PR after pushing; historical runs are not substituted for correction-head checks.

## Performance comparison and limits

These final baseline/corrected runs were serialized after unit tests finished, using equivalent 30k/100k rows by 120/200 columns. All cases mounted 16 rows and had zero unrelated cell accessor/renderer callbacks on safe targeted calls. Values below are observed p95 milliseconds through Lit update completion: 18 one-row samples, 12 two-row batch samples, 6 full refresh samples, and 6 corrected replacement samples per fixture.

| Rows x columns | Safe row: baseline / corrected | Safe batch: baseline / corrected | Full refresh: baseline / corrected | Corrected replacement fallback |
| --- | --- | --- | --- | --- |
| 30k x 120 | 2.3 / 2.8 | 5.6 / 7.1 | 4.5 / 8.7 | 8.5 |
| 30k x 200 | 1.6 / 2.1 | 2.8 / 2.9 | 5.2 / 8.8 | 12.0 |
| 100k x 120 | 1.1 / 1.5 | 5.0 / 2.5 | 11.3 / 10.3 | 8.1 |
| 100k x 200 | 1.2 / 1.5 | 1.3 / 2.4 | 6.9 / 9.8 | 8.9 |

This is a small workstation sample, not a production p95, compositor paint metric, statistically controlled speed comparison, or performance guarantee. Earlier local runs varied materially; some final corrected timings are higher. Do not claim an improvement or rule out a small timing regression from these data. The strong invariant is retained bounded target verification and zero unrelated rendering work, now with correctness fallback. Replacement latency on the original head is not a valid equivalent successful workload because it painted stale data. Complete local refresh and safe presentation repaint also have different semantics. Browser initial layout is settled before measurements; ordinary layout updates may legitimately coalesce a full render with an early targeted call.

## Residual risks and review recommendation

Unreported structural mutations cannot be globally detected by bounded refresh. Render-only still trusts caller guarantees about transforms, schema and geometry; it deliberately rejects known stale targets and unkeyed transformed ranges. External arrays are accepted snapshots, not live structural sources. Consumers need matching framework/Web/Blazor artifacts. Local timing samples do not establish an SLA or compositor/assistive-technology qualification.

Recommend independent architectural review of source-slot provenance, selected-key remapping on fallback, external snapshot/scope isolation, and the render-only trust boundary before founder merge authorization. No new API, version bump, tag, publication, merge, issue closure, or deployment is part of this correction.
