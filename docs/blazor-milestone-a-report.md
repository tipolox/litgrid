# Milestone A implementation report

Review date: 13 October 2026. Branch: `feat/blazor-declarative-columns`.
Base: `cbd40df`, verified against freshly fetched `origin/main`.
Package versions remain **1.0.3**. All changes are local and uncommitted.
The authorized existing `.serena/` directory was left untouched.

The subsequent independent review fixes are documented in
[the review correction report](blazor-milestone-a-review-fixes.md). Current
validation totals are 195 JavaScript tests, 68 .NET tests, and 13 standard
browser scenarios. The combined serialization stress run below describes the
original milestone validation; it was not repeated for the review fixes.

## 1. Overall status

Milestone A is implemented and **ready for manual review**. Automated validation,
including the final combined browser stress run, passes. Manual Server-mode,
cross-browser/device, and screen-reader checks remain listed below.

## 2. Architecture

Metadata-only `LitGridColumn<TItem>` components register immutable normalized
metadata with a grid-scoped registry. Stable component identity controls lifetime;
explicit `Order` controls dynamic ordering. The registry caches complete snapshots
and validates duplicate keys at the snapshot boundary, allowing atomic key swaps.
A nongeneric cascading boundary prevents incorrectly typed nested columns from
finding an outer grid's registry.

Field mapping uses expression inspection and weakly cached property metadata.
Grid synchronization happens after rendering and is serialized with a semaphore.
Unchanged declarative schemas are omitted from interop. Child-only changes omit
row data; parent rerenders retain legacy mutation synchronization.

The Web Component exposes additive `inferColumns` and `updateColumnSchema`
controls. Only the declarative Blazor path uses reconciliation. Other framework
wrappers retain their existing defaults and column assignment behavior.

## 3. Public API

`DataGrid<TItem>` adds `ChildContent: RenderFragment?` and cascades `TItem`.
Its existing `Columns: IReadOnlyList<GridColumn>` parameter remains unchanged.
`LitGridColumn<TItem>` exposes only `Field`, `Key`, `Title`, `Width`, `Hidden`,
and `Order`. See [the complete API and examples](blazor-declarative-columns.md).

## 4. Razor usage

```razor
<DataGrid TItem="Employee" Data="@employees" Height="400">
    <LitGridColumn Field="@(e => e.Id)" Title="ID" Width="80" />
    <LitGridColumn Field="@(e => e.Name)" Title="Employee" Width="220" />
    <LitGridColumn Field="@(e => e.Department)" Title="Department" Width="180" />
</DataGrid>
```

Normal child declarations inherit the generic type. Separate fragments can
specify `TItem="Employee"` explicitly. Components render no visible DOM.

## 5. Backward compatibility

Programmatic keys remain literal strings. Nonempty `Columns` and declarative
content are exclusive, with a clear validation error for mixed sources.
When neither source is supplied, legacy inference remains available; explicit
empty declarative content stays empty. Equivalent programmatic/declarative schemas are tested.
Same-reference list additions, removals, and item edits still synchronize on
parent rerenders. No `DataVersion` API or native cell components were introduced.
React, Angular, and Vue tests and builds pass.

## 6. Serialization findings

Actual Release Blazor WebAssembly interop confirmed `Id`/`Name`/`Department`
serialize as `id`/`name`/`department`. `[JsonPropertyName("employee_name")]`
is honored. Display, numbers, nulls, dates, sorting, and filtering were verified.
Programmatic documentation examples were corrected to use serialized keys.

The browser tests also exposed a pre-existing Release trimming issue:
`EnumMemberJsonConverter` lost enum field metadata and emitted `Equals` instead
of `equals`. The converter now preserves public enum fields with
`DynamicallyAccessedMembers` and looks up fields directly. Real filtering and
`multi-cell` configuration now pass in the trimmed application.

## 7. Lifecycle

Registration, updates, and removals coalesce into render-complete snapshots.
Import, initialization, and updates cannot overlap. Disposal prevents queued
renders and interop updates, clears registrations, releases module/object
references, and tolerates disconnection/cancellation during navigation.
Tests cover child-only updates, overlapping asynchronous updates, failure retry,
and disposal while import is pending.

## 8. Dynamic schemas

Adding, removing, replacing, and changing columns are supported. Explicit order
values sort ascending; unspecified values follow them. Equal values retain first
registration order. `@key` supplies identity, not display order. Duplicate keys
are rejected. A 120-column fixture verifies one schema interop per render batch,
including removal of all columns.

## 9. State precedence

Unchanged declarations preserve user customization. Changed widths clear only
their resize overrides; changed visibility affects only that setting. Title
changes preserve all customization. Changed order, or a newly added explicit
order, applies the complete declaration order. Otherwise surviving columns keep
user order and new columns append with defaults. Removed columns lose active
state. Persistence restores on mount/storage-key changes and reconciled state
is saved silently. Active navigation follows surviving visible keys. In-flight
column gestures are canceled silently during schema updates.

## 10. Performance observations

No registration/expression work runs during scrolling, no per-cell Blazor
components are mounted, and synchronization does not issue per-column JS calls.
Measured browser scrolling and unchanged parent rerenders issue zero schema
updates. Row and column DOM counts stay bounded by virtualization.

On this machine, the representative 30,000-row/six-column fixture loaded in
roughly 6.5–8 seconds and rerendered in roughly 5.3–7.3 seconds. The combined
30,000-row/120-column fixture sends 3.6 million values and is substantially more
expensive: an observed declarative load took 109.4 seconds. An isolated unchanged
`main` wrapper with the same numeric fixture took 106.4 seconds to load and 108.7
seconds to rerender. Combined declarative load-plus-rerender checks passed in
195.7 and 201.9 seconds. These are individual machine observations, not statistical
benchmarks or evidence of a performance improvement.

This existing data-transfer cost can block the WebAssembly main thread. The
milestone preserves legacy mutation semantics rather than adding an unrelated
data-update API. Optimizing this path needs separate design and measurement.

## 11. Files

Created:

- `packages/grid-blazor/src/Columns/ColumnRegistry.cs`
- `packages/grid-blazor/src/Columns/FieldResolver.cs`
- `packages/grid-blazor/src/Components/LitGridColumn.cs`
- `packages/grid-blazor/src/Properties/AssemblyInfo.cs`
- `packages/grid-blazor/src/declarativeColumns.test.ts`
- `packages/grid-blazor/tests/ColumnRegistryTests.cs`
- `packages/grid-blazor/tests/DeclarativeComponentTests.cs`
- `packages/grid-blazor/tests/DeclarativeHost.razor`
- `packages/grid-blazor/tests/FieldResolverTests.cs`
- `packages/grid-blazor/tests/SelfUpdatingColumn.razor`
- `packages/grid-blazor/tests/browser/{App.razor,BrowserHost.csproj,Program.cs,README.md,run.mjs,wwwroot/index.html}`
- `docs/blazor-declarative-columns.md`
- `docs/blazor-milestone-a-report.md`

Modified:

- `packages/grid-blazor/src/Components/{DataGrid.razor,DataGrid.razor.cs}`
- `packages/grid-blazor/src/Models/EnumConverters.cs`
- `packages/grid-blazor/src/gridBindings.ts`
- `packages/grid-blazor/src/wwwroot/{litgrid-blazor.js,litgrid-blazor.js.map}`
- `packages/grid-blazor/tests/{NavigationSynchronizationTests.cs,Tipolox.LitGrid.Blazor.Tests.csproj}`
- `packages/grid-web/src/{components/DataGrid.ts,types.ts}`
- `packages/grid-blazor/README.md`
- `docs/{api-reference.md,blazor-examples.md,blazor-guide.md}`

Temporary baseline/tools/package artifacts are in ignored `.private/` or normal
ignored build directories. Demo and website repositories were not modified.

## 12. Automated tests

| Check | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile` | Pass; lockfile unchanged |
| `pnpm.cmd test` | 195 tests, 27 files, all pass |
| Release .NET tests | 68 tests, all pass |
| Blazor TypeScript check | Pass, with `--rootDir .` for existing monorepo source aliases |
| Version validation | All versions match 1.0.3 |
| Git whitespace validation | Pass |

## 13. Browser tests

All **12 Release WebAssembly/Chromium scenarios** pass, with no unexpected
console errors. They cover real serialization/display, sorting/filtering,
pointer resize/reorder, visibility, state precedence, dynamic schemas, legacy
inference, mutations, disposal/remount persistence, keyboard behavior, large
rows, wide columns, frequent rerenders, rapid changes, and mobile page overflow.

The combined 30,000-row/120-column stress case passed through loading and a
complete parent rerender while retaining column state. The runner executes this
optional expensive transfer last, avoiding another full transfer when later
clearing just the schema. Instructions are in the
[browser test README](../packages/grid-blazor/tests/browser/README.md).

## 14. Builds and packaging

Workspace build passes for all packages and playground. Release Blazor library
and browser host builds pass with zero compiler warnings/errors. The shipping
bundle and source map were regenerated. Test compilation also has no warnings
after fixing two test-only analyzer notices. Local NuGet packing succeeds, and the
packaged JavaScript asset was verified byte-for-byte against the rebuilt bundle.
Nothing was published. Git reports only normal LF/CRLF conversion notices.

## 15. Limitations

Fields require direct readable public scalar properties on rows serialized as
property objects. Computed/nested expressions, methods, indexers, fields,
ignored members, scalar/collection row properties, and custom converter mappings
are rejected; use explicit `Key` for supported custom serialized keys.
Global/polymorphic name customizations cannot be inferred. Date behavior is the
existing grid's JSON-string behavior. Ordering without `Order` is registration
order. Large row serialization retains the performance limitation above.

## 16. Deferred architecture

Native `CellTemplate`/`RowTemplate`, component projection, light-DOM slots,
viewport template synchronization, per-cell Blazor mounting, and editing remain
future work. No speculative template infrastructure was added.

## 17. Manual QA

- Review public API naming, validation messages, and documented precedence.
- Exercise a real application in Interactive Server and WebAssembly modes.
- Navigate rapidly while mounting/loading/disposal; test a disconnected Server circuit.
- Resize, reorder, hide, and persist columns; rerender the parent; change defaults.
- Add/remove/reorder keyed dynamic columns and empty the schema.
- Check selection, keyboard focus recovery, and virtualization on actual devices.
- Check Firefox/Safari and real mobile browsers; Chromium is the automated browser.
- Perform screen-reader verification separately; no WCAG claim is made.

## 18. Recommended next steps

Review the local feature diff and manual QA findings. Treat large-row transfer
optimization as a separate compatibility-focused milestone. Plan native templates
through a separate architecture review. Prepare versions and publish only through
the normal release process after approval.
