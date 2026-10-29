# Milestone A2: TypeScript and event contract reliability

## Executive summary

Baseline: `main` at `21e59cfc9149cbb0b4d1c5137f08d698565d8478`.
This bounded follow-up addresses [#31](https://github.com/tipolox/litgrid/issues/31)
under [#27](https://github.com/tipolox/litgrid/issues/27). Published API names,
event payloads, framework peer ranges, and package versions remain unchanged.
No grid algorithms, consuming applications, or Blazor runtime code changed.

## Audit and confirmed gaps

A1 already corrected the Vue/Angular fixtures to use `reason`, versioned
`state.columns`, `previousIndex`, `currentIndex`, `columnOrder`, and
`visibleColumnKeys`. It also introduced `tsconfig.contracts.json` and the
`scripts/typecheck-contracts.mjs` CI gate. The existing four Web Component
compatibility/column/selection/external-query configurations already cover
their respective public capabilities. Those checks and fixtures are retained.

Existing React/Vue tests mount real components and cover selection/query
subscriptions; their column tests dispatch hand-authored native events.
Angular's unit tests instantiate the component and call its handlers directly.
The remaining gaps were:

- React fixtures were individually listed in the bounded configuration, so
  future test files could escape typechecking.
- No shared regression exercised all five event families from real Web
  Component operations through all three mounted frameworks and their refs.
- The bounded source aliases concealed an Angular declaration-generation
  defect. Inferred readonly selection/query emitter types expanded into a
  direct `@tipolox/litgrid-core` import in Angular's flattened declaration.
  Angular only declares a dependency on the Web Component package. The new
  built-declaration check reproduced TS2307 for this undeclared direct import.
- The obsolete root ambient React shim shadowed installed React declarations,
  including `act` and `useLayoutEffect`, as noted in issue #31's comment.
- The Angular column-output documentation omitted the data/column fields used
  by its example template.

All wrapper entry points re-export the Web Component's event types. The Web
Component obtains selection and external-query types from core. Column state
is `{ reason, state: { version: 1, columns } }`; reorder and visibility have
the fields above. Selection notifications use readonly snapshot arrays;
external queries use `{ requestId, reason, query }` with `query.search`.
Blazor's JSON model names match these contracts.

## Changes

- Extend the existing bounded source gate with recursive wrapper test globs
  and shared public export/browser fixtures. Export identity checks and
  negative legacy-shape fixtures run against source and built declarations.
- Add `tsconfig.published-contracts.json`. It resolves built package types;
  Angular resolves its actual `dist/grid-angular` shipping directory rather
  than the source wrapper. No `skipLibCheck` or compiler weakening is used.
- Explicitly annotate Angular's query/selection `EventEmitter` fields with
  their existing public detail types. This preserves the named Web Component
  aliases in the generated declaration and removes the accidental direct
  core import. Runtime behavior and structural public types are unchanged.
- Remove the obsolete repository-only React shim and use installed typings.
- Add a Chromium regression using built React/Vue package entry points and
  Angular's built FESM package. Frameworks and Playwright are development-only
  fixture dependencies; shipping manifests and dependency ranges are unchanged.
- Add the published gate to verification/release validation and Chromium to
  PR/main verification. Use supported Node 22.22.3 and two Vitest workers,
  retaining every test and the existing timeouts.
- Document the shared contract, cleanup, reproducible checks, and Blazor
  equivalents; link it from the API and framework guides. Complete the
  Angular example's missing fields.

## Real event integration

The browser suite has **12 cases**: React, Vue, and Angular, each in local and
external-query mode, with two fresh mount cycles. React runs under StrictMode;
Angular uses `bootstrapApplication` and its generated template listeners.
Tests call public wrapper methods rather than handlers, and observe the actual
Web Component `CustomEvent` instances and original detail identities.

Each case verifies mounted refs, reorder/state/visibility payloads, selection
snapshots and keys, pagination behavior, current callback propagation after
updates, no duplicate callback delivery, and cleanup/ref release on teardown.
External cases also verify accepted results, query intent payloads, search,
pagination intent, and query cleanup. Detached Web Component mutations must
still produce events while framework callbacks remain silent. The suite also
checks that local operations produce no external-query notification.

## TypeScript compatibility

Both strict source and built-declaration gates pass with TypeScript **6.0.3**.
The existing old-structural-shape and capability fixtures remain passing.
No new public members, required inputs, version bumps, or production dependency
changes were introduced. Exact event export identity is checked across Web,
React, Vue, and Angular; invalid historical payload shapes remain rejected.

Framework runtime validation uses React **19.2.5**, Vue **3.5.41**, Angular
**22.1.3**, Node **22.22.3**, and Chromium **156.0.8078.4**. This is not a claim
of an exhaustive older-TypeScript, Angular peer-version, or cross-browser matrix.

## Exact validation

| Check | Result |
| --- | --- |
| `pnpm test --maxWorkers=2` | **378/378 tests, 49 files**, zero failed |
| Blazor Release tests | **129/129**, zero failed/skipped |
| `pnpm build` | **8/8** package/application builds |
| Angular build after emitter annotation | Pass |
| Blazor Release build | Pass, **0 warnings / 0 errors** |
| `node scripts/typecheck-contracts.mjs` | Pass |
| `tsc -p tsconfig.published-contracts.json` | Pass |
| Web Component compatibility/columnControls/selection/externalQuery gates | **4/4 pass** |
| Built-package Chromium event/lifecycle cases | **12/12**, zero page errors |
| Broad root `tsc --noEmit --pretty false` | **Fails: 52 diagnostics** after builds |

Two initial default-worker JavaScript runs each passed 377/378 tests. The
unchanged 30,000-row/120-column virtualization test exceeded its existing
5-second timeout (6.18s and 13.82s). A targeted one-worker run also timed out
(6.72s; 5/6 tests passed). The complete two-worker run passed all 378 tests
outside sandbox instrumentation. No test, assertion, fixture workload, or
timeout was weakened. Two-worker CI concurrency matches the successful run;
the timing failures remain recorded rather than erased.

Raw diagnostic inventories, browser cases, and JavaScript run counts are in
[validation evidence](quality/evidence/a2-validation.json).

## Remaining technical debt and recommendation

The clean pre-build root snapshot had **142** diagnostics with the React shim.
The final post-build snapshot has **52**. These snapshots include different
generated-output states and are not a controlled diagnostic delta. The final
inventory contains:

- **14 module-resolution diagnostics:** TS2307 (12), TS2882 (2), spanning
  generated output (5 reports) and dependency declarations (9 reports), with
  the root's legacy Node resolver versus the bounded projects' Bundler resolver.
- **32 strict legacy test/benchmark diagnostics:** TS18048 (6), TS2683 (2), TS2345 (6),
  TS2339 (12), TS2790 (1), TS2341 (5), including partial mocks, optional-member
  assumptions, event typing, and tests accessing private Web Component helpers.
- **6 Node test/tooling type-discovery diagnostics:** TS2591 in the source-map
  script tests.

The final inventory has no React wrapper or shared integration-fixture
diagnostics. No root compiler option was relaxed and no legitimate error was
suppressed. Recommend a separate bounded root-TypeScript workstream: define
source/test/generated-output project boundaries, resolve the modern package
module-resolution and Node typing requirements, then repair the listed legacy
  test and benchmark fixtures. Keep its baseline and CI gate explicit.

Recommend review of this A2 change with the bounded gates and Chromium suite
required. Monitor the existing large-fixture timeout on CI before merging;
investigate deterministic fixture construction/timing in a separate test
reliability task if it recurs. This milestone does not claim a green root
typecheck or perform a release, package publication, or merge.
