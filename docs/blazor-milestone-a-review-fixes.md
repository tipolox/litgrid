# Milestone A review corrections

Branch: `feat/blazor-declarative-columns`. Versions remain 1.0.3.
All changes are local/uncommitted; `.serena/` and other repositories are untouched.

## Persistence root cause and correction

The adapter reconciled declarative columns before applying
`ColumnStateStorageKey` through the scalar setters. Reconciliation persisted
the new active schema into the old namespace. Applying the new key afterwards
could not recover the overwritten old preferences. Applying the key first
would instead restore target preferences against the old schema.

The existing `updateColumnSchema` operation now accepts an optional target
storage key. It validates the schema before mutating state, switches schema
and namespace together, initializes declaration defaults, and silently restores
target preferences against that schema. Invalid saved keys are excluded and
new columns receive defaults. No transition writes are performed, so both saved
namespaces remain intact. Missing/null destinations start from defaults.
Ordinary user interactions and same-key schema changes retain persistence.
The adapter caches the last declaration schema for key-only updates that omit
column metadata. Legacy setters/programmatic bindings retain their behavior.
No public Blazor parameters were added; the optional argument extends the
existing Web Component schema synchronization method.

## Before/after evidence

Seven regression tests import the actual self-contained shipping bundle and
instantiate its `yc-grid`. Before the fix, six failed and one passed. The
A -> B -> A case directly observed A being replaced with B's reconciled schema.
After rebuilding the shipping asset, all seven pass.

Coverage verifies both saved namespaces, an unsaved target, null transitions,
key-only updates with omitted metadata, same-key schema updates, empty schemas,
subsequent resize/reorder/visibility writes, and absence of transition callbacks
or unnecessary writes. Assertions inspect actual localStorage JSON and active
column state. A real Release WebAssembly browser scenario independently verifies
the switching sequence and resulting stored preferences.

## Lifecycle changes and evidence

An owned lifetime token cancels semaphore waiters and pending initialization/
updates on disposal. Imports use a cancelable .NET wait while preserving
ownership of the eventual JS reference: a late result is disposed without
initializing the removed grid. Unexpected deferred import/cleanup failures are
logged through normal application logging; cancellation/disconnection is handled.

Cleanup uses its own ten-second token for `disposeGrid`, not the already canceled
lifetime token. Module-reference disposal is still awaited because
`IJSObjectReference.DisposeAsync` has no cancellation overload. Expected cleanup
cancellation/disconnection is tolerated; unexpected failures propagate. If both
cleanup stages fail unexpectedly, both exceptions are preserved. Finally blocks
release the .NET object reference, module field, synchronization gate, and lifetime
source. Queued synchronization returns without issuing new interop after disposal.

Fifteen added controlled asynchronous test cases cover pending initialization/
updates, queued operations, grid/module/both cleanup cancellation/disconnection,
unexpected cleanup failures, initialization retry, deferred import failures,
late disconnection, and preservation of simultaneous cleanup errors. The existing
pending-import test now confirms disposal completes without releasing the import
gate first, then verifies the late module is disposed. Tests explicitly check
disposed `DotNetObjectReference.Value` and the released semaphore.

The browser runner delays an actual module response, unmounts before it arrives,
releases the response, remounts, and repeats navigation. It passes without
unexpected console errors. This strengthens lifecycle behavior and coverage;
it is not evidence that a production memory leak existed before the review.

## Validation

| Executed check | Result |
| --- | --- |
| Frozen pnpm install | Pass; lockfile unchanged |
| JavaScript suite | 195 tests in 27 files, all pass |
| Release .NET suite | 68 tests, all pass; zero test compilation warnings |
| Workspace build | All packages/playground pass; shipping bundle/map regenerated |
| Release library and browser-host builds | Pass; zero warnings/errors |
| Blazor TypeScript check | Pass with existing monorepo `--rootDir .` override |
| Release WebAssembly Chromium browser suite | 13 standard scenarios pass; no console errors |
| Version validation | All versions remain 1.0.3 |
| Git whitespace check | Pass |

The copied temporary benchmark source from the earlier milestone was initially
being discovered by Vitest. Only that known generated `.private/blazor-baseline`
directory was removed, and the full suite was rerun successfully.
An existing overlap test assumed two dispatcher yields meant the next update
had started. It now waits for an explicit interop-start signal before inspecting
the latest snapshot, removing that scheduling-dependent assertion.
The optional combined 30,000-row/120-column serialization stress case was not
rerun for this review task. Representative row/column virtualization and mutation
scenarios were executed; large-data serialization was not changed or optimized.

## Files changed for this review

- `packages/grid-blazor/src/Components/DataGrid.razor.cs`
- `packages/grid-blazor/src/gridBindings.ts`
- `packages/grid-blazor/src/persistenceTransitions.test.ts` (new)
- `packages/grid-blazor/src/wwwroot/litgrid-blazor.js`
- `packages/grid-blazor/src/wwwroot/litgrid-blazor.js.map`
- `packages/grid-web/src/components/DataGrid.ts`
- `packages/grid-web/src/types.ts`
- `packages/grid-blazor/tests/DeclarativeComponentTests.cs`
- `packages/grid-blazor/tests/browser/App.razor`
- `packages/grid-blazor/tests/browser/run.mjs`
- `packages/grid-blazor/tests/browser/README.md`
- `docs/blazor-declarative-columns.md`
- `docs/blazor-milestone-a-report.md`
- `docs/blazor-milestone-a-review-fixes.md` (new)

## Remaining verification and readiness

**Ready for final manual QA.** P1 is reproduced and fixed against the actual
shipping bundle and real WebAssembly runtime. P2 is strengthened and tested;
no production heap/leak measurement is claimed.

Verify Interactive Server circuit disconnection and actual browser/device
navigation manually. Cancellation ends .NET waits; it does not interrupt JS code
already executing. A custom runtime with a never-completing, noncancelable
module-reference disposal remains outside the component's safe cancellation
surface. Delayed module-reference cleanup reports unexpected failures through
application logging. Existing cross-browser and screen-reader QA remains separate.
