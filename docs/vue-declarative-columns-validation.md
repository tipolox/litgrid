# #33 implementation and validation

Base: `603437fcb13e931db576656f0f832a88d180acaa`, fetched from `origin/main`
and independently checked against GitHub's main branch. #65 is merged at that
SHA. Its post-merge push-triggered [Verify run 42639870043](https://github.com/tipolox/litgrid/actions/runs/42639870043)
and [verify job 129237798361](https://github.com/tipolox/litgrid/actions/runs/42639870043/job/129237798361)
both succeeded; all 21 job steps succeeded. Issues #27, #32, #33, #65's final
contract, the Vue adapter, and the shared column-schema reconciler were reviewed.

Work is isolated on `codex/33-vue-declarative-columns`, in
`.worktrees/vue-columns-33`. Existing workspace changes and other investigations
were not incorporated. See [the architecture decision and consumer examples](vue-declarative-columns.md).

## Exact changes

| Files | Change |
| --- | --- |
| `packages/grid-vue/src/LitGridColumn.ts` | New metadata marker and `LitGridColumnProps`; inline `field`/metadata or a typed `column` object. |
| `packages/grid-vue/src/declarativeColumns.ts` | Public VNode traversal, fragment order, key validation, Boolean normalization, explicit diagnostics for unsupported child content. |
| `packages/grid-vue/src/DataGrid.ts` | Optional slot snapshots, post-render synchronization, inference ownership, order-change detection, lifecycle-safe error recovery. Distinguish omitted columns from explicit arrays. |
| `packages/grid-vue/src/gridBindings.ts` | Optional internal `applyColumnOrder` argument, default false; normalize omitted columns to one empty schema without copying props. Existing snapshot/field comparisons unchanged. |
| `packages/grid-vue/src/index.ts` | Export the marker and props type. Existing exports unchanged. |
| `packages/grid-vue/src/declarativeColumns.test.ts` | Twelve cases covering parsing, dynamics, precedence, ignored-slot setter suppression, user state, error recovery and slot removal. |
| `tests/contracts/vue-columns.typecheck.ts`, `tests/contracts/vue-columns/Consumer.vue`, `tsconfig.vue-columns.json` | Positive/negative public TypeScript contracts and strict Vue SFC/template consumer compilation against fresh package declarations. |
| `tests/contracts/vue-columns.browser.ts`, `scripts/check-vue-columns.mjs` | Compiled-template lifecycle, persistence/remount, external query and large-workload checks; optional repeated comparison with an exact base. |
| `.github/workflows/verify.yml`, `package.json`, `pnpm-lock.yaml` | Add strict Vue template and Chromium gates; pin development-only `vue-tsc` to 3.3.14. |
| `packages/grid-vue/README.md`, `docs/vue-guide.md`, these two reports | API discovery, architecture, examples, performance and validation evidence. |

No shared Web Component implementation/public API, core, renderer, React,
Angular or Blazor source changes. No package version, release, deployment or
publication changes. The public API additions are `LitGridColumn` and
`LitGridColumnProps` at the Vue package root.

## Verification

Environment: Windows, Node 22.14.0, pnpm 10.33.0, TypeScript 6.0.3,
Vue 3.5.41, vue-tsc 3.3.14, .NET SDK 10.0.403 targeting net8.0. The browser
version and timings are recorded below. CI retains Node 22.22.3 and .NET 8.

| Command | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile` | PASS for the base; adding the exact-pinned Vue checker updates the lockfile intentionally. CI verifies the final lockfile. |
| `pnpm.cmd typecheck:all` | PASS: 123 authored files, both strict projects. |
| `node scripts/typecheck-contracts.mjs` | PASS. |
| `pnpm.cmd test --maxWorkers=2 --pool=threads` | PASS: 426 tests / 53 files before the final ignored-slot refinement; exact final-head full-suite CI is linked in the PR. |
| `pnpm.cmd test --maxWorkers=2 --pool=threads packages/grid-vue/src` | PASS: final Vue regressions, 23 tests / 5 files, including all 12 declarative-column cases. |
| `pnpm.cmd run build` | PASS: all workspace packages and playground. |
| `pnpm.cmd --filter @tipolox/litgrid-vue build` | PASS: final Vue declarations and JavaScript refreshed after lifecycle/parser fixes. |
| `pnpm.cmd --filter @tipolox/litgrid-vue exec tsc -p tsconfig.json` | PASS: refresh final lifecycle and default-path refinements without repeating Windows directory deletion. |
| `pnpm.cmd exec tsc -p tsconfig.published-contracts.json --pretty false` | PASS against freshly built declarations. |
| `pnpm.cmd exec vue-tsc -p tsconfig.vue-columns.json --noEmit --pretty false` | PASS: actual strict SFC template consumer. |
| `pnpm.cmd --filter @tipolox/litgrid-angular exec ngc -p ../../tsconfig.typed-columns-angular.json` | PASS: existing strict Angular consumer. |
| `node scripts/check-adapter-events.mjs` | PASS: all 12 real React, Vue and Angular lifecycle cases. |
| `node scripts/check-vue-columns.mjs --compare-base=603437fcb13e931db576656f0f832a88d180acaa --output=.private/vue-columns-browser-isolated-final.json` | PASS: compiled template, dynamic keys/order/conditions, selection/navigation, B1 refresh, resize/visibility, persisted remount, detached-listener cleanup and external-query revision/selection preservation. |
| `dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj -c Release` | PASS: 129 tests, zero failed/skipped. |
| `dotnet build packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj -c Release` | PASS: zero warnings/errors. |

Local execution required normal Git/cache/NuGet/Chromium access outside the
filesystem sandbox. Sandboxed NuGet signature access failed before restoring
successfully. Repeated Windows build cleanup intermittently returned EPERM;
rerunning the Vue build outside the sandbox succeeded. No repository workaround
was added for either environmental limitation.

## Performance method and interpretation

The comparison extracts only the exact base's Vue `DataGrid.ts` and
`gridBindings.ts` into an ignored local directory. Both adapters use the same
Vue runtime, current built Web Component/core (unchanged by this PR), data,
columns, Chromium page and instrumentation. This is an adapter/source-level
comparison, not a production-bundle or memory qualification.

Warm both adapters, alternate pair order over fifteen rounds, and measure mount
through Lit's completed update plus 24 presentation updates per workload. Discard
the first four update timings; report the median of fifteen per-round medians and
p95s. Workloads: 5,000/30,000 rows, 3/120 columns, legacy arrays, omitted-column
inference and declarative columns. Each workload asserts schema size and row
virtualization. Timing includes the existing local data setter and Web Component
render; there is no per-row Vue work. Raw local JSON retains all 240 measurements.

Every paired legacy workload has **identical mount and update setter counts**.
For 24 presentation replacements, both versions perform 23 data assignments,
zero schema updates, zero config updates and zero inference assignments. Initial
counts also match exactly. Declarative mode alone assigns inference false once
on entry. Unchanged declaration metadata makes zero schema updates; render
function slot refreshes can still perform the established local data sync.

Chromium **156.0.8078.4**. All values below are milliseconds; each cell is
baseline → candidate. These are the final isolated fifteen-round results.

| Rows / columns / legacy source | Mount median | Update median | Update p95 |
| --- | --- | --- | --- |
| 5k / 3 / array | 6.8 → 8.1 | 1.1 → 1.2 | 2.7 → 2.8 |
| 5k / inferred / omitted | 7.7 → 7.6 | 1.2 → 1.1 | 2.6 → 2.5 |
| 5k / 120 / array | 18.2 → 20.8 | 5.3 → 5.5 | 8.3 → 8.8 |
| 30k / 3 / array | 7.5 → 7.3 | 1.1 → 1.1 | 2.7 → 2.6 |
| 30k / inferred / omitted | 7.0 → 6.6 | 1.2 → 1.2 | 2.5 → 3.1 |
| 30k / 120 / array | 18.9 → 18.8 | 5.6 → 5.5 | 9.7 → 9.8 |

| Rows / declarative columns | Mount median | Update median | Update p95 |
| --- | --- | --- | --- |
| 5k / 3 | 8.3 | 1.1 | 2.6 |
| 5k / 120 | 19.6 | 6.0 | 10.7 |
| 30k / 3 | 7.4 | 1.2 | 2.6 |
| 30k / 120 | 20.4 | 5.9 | 9.9 |

No material default-path update regression was observed in this smoke comparison:
identical setter counts, array update medians within −0.1 to +0.2 ms, and
omitted-column update medians unchanged or slightly lower. Final 5k array mount
medians increased by 1.3/2.6 ms; 30k array mounts were slightly lower, as were
omitted-column mounts. Earlier isolated fifteen-round measurements had flat or
lower array mounts and omitted-column increases of 0.8–1.3 ms. These varying
mount results do not establish a consistent regression or prove zero overhead;
independent production qualification remains a review limitation.

Timings are local smoke evidence with scheduler/GC noise, not a universal latency
guarantee or a production/memory qualification. Setter parity, unchanged core
code, fixed-size adapter work and repeated browser measurements are the
regression evidence. The opt-in 120-column declarative path adds metadata VNode
work, with final update medians 0.4–0.5 ms above equivalent candidate arrays.

## Remaining review decisions

- The default slot is a bounded metadata DSL: direct markers, fragments,
  comments and whitespace. Custom/HTML wrappers, Teleport, Suspense and cell
  slots are rejected explicitly. A future composition API would need its own
  supported ordering/lifecycle contract.
- Editing the declaration key sequence reapplies declaration order. Metadata
  changes preserve user order. This policy is intentional and documented.
- Removed keys lose their width/visibility customization under the existing
  shared reconciliation contract. Use visibility controls for temporary hiding.
- The typed object form preserves `GridColumn<TRow>` authoring checks; inline
  fields do not infer a model from the parent. Data/column model correlation and
  per-cell Vue rendering remain separate work.
- Runtime validation errors surface through Vue's synchronization hooks, while
  the mounted grid and last valid schema remain intact for recovery. Applications
  should use Vue's normal error handler for diagnostics.

Draft PR CI links and the exact review head are recorded in the PR description.
This work does not authorize merge, issue closure, package publication or demo
deployment.
