# Changelog

Notable changes to LitGrid are recorded here.

## 1.2.1

### External-query loading and result states

- Fixed remote-query status messages ("Loading results", empty results, errors, and out-of-range pages) occupying normal layout space above the search bar and column headers. Messages now appear centered over the **grid body**, without pushing the search, header, viewport or pagination vertically during a request.
- Added a subtle loading spinner with a reduced-motion fallback, theme-aware colors, and non-interactive overlay pointer behavior. Existing `role="status"` / `role="alert"`, `aria-atomic`, and `aria-busy` semantics are preserved.
- Added external-state DOM regression coverage for loading, empty, error, out-of-range and recovery; a focused Chromium regression verifies header/footer positions and overlay geometry in desktop/mobile viewports and dark/light themes.

### Compatibility and coordinated upgrade

- No new APIs, configuration options, query behavior, selection semantics, or changes to the local-mode rendering path. The correction is in the shared LitGrid Web Component and benefits direct Web Component, React, Angular, Vue, and Blazor consumers after upgrading.
- Upgrade all six public `@tipolox/litgrid-*` npm packages and the `Tipolox.LitGrid.Blazor` NuGet package to **1.2.1** together where used. In apps using multiple wrappers on one page, ensure the Web Component bundle/registration is 1.2.1; the first `yc-grid` registration wins and cannot be replaced in-place. Rebuild consumers and invalidate stale browser/service-worker caches as appropriate.
- This patch does not address deferred keyed-local performance research [#43](https://github.com/tipolox/litgrid/issues/43), broad root TypeScript backlog [#31](https://github.com/tipolox/litgrid/issues/31), or spoken assistive-technology testing [#14](https://github.com/tipolox/litgrid/issues/14). No WCAG certification or new cross-device performance claim is made.

## 1.2.0

### DataGrid and framework adapters

- Added optional `sortable` and `filterable` column flags to suppress monetary or other unsuitable header-menu sort/filter actions without removing the imperative or server-query APIs. Exact decimal-string values remain strings; applications are responsible for exact comparison where required.
- Added supported selection-change notifications, typed frozen selection snapshots, `selectRowByKey`, and optional `selection.rowKey` / `scopeKey` coordination across Web Components, React, Vue, Angular, and Blazor. Stable record keys survive permitted row replacement/reordering while duplicate, missing, and invalid identities are unselectable; changing scope clears selection.
- Added opt-in `queryMode: 'external'` with atomic external-state updates and query intents for search, sort, filter, pagination, page size, and refresh. Known and unknown totals, loading, empty, error, and out-of-range states are supported. Work is bounded by supplied page rows rather than the server's declared total.
- Optimized keyed selection by reusing validated indexes when the full displayed view matches original order, rechecking identities on every data synchronization to preserve same-reference mutation behavior, and avoiding redundant copies for inactive data transforms.
- Strengthened adapter event-contract tests, a bounded public API/adapter typecheck in CI, packaged-consumer checks, and checksum verification of downloaded release candidates.

### Upgrade and integration guidance

- Upgrade all six `@tipolox/litgrid-*` npm packages as a coordinated **1.2.0** set, and upgrade Blazor NuGet/bundled JavaScript together when applicable. Rebuild consumers and validate lockfiles, browser caches, and service-worker assets. The first `yc-grid` custom-element registration wins, so an earlier loaded bundle cannot be replaced in the same page.
- Existing local/index-based selection and pagination remain the default. Opt into stable keyed selection only when record identities are unique, stable finite numbers or strings; `scopeKey` clears UI selection but **does not enforce authorization**.
- External mode requires immutable external-state replacements; the application owns fetching, cancellation, authorization, response/request identity and account/site-epoch guards. React's `data` prop remains required (use an empty array with external state). In Next.js, register the grid client-side and avoid server-side custom-element registration.
- Keep decimal values as exact strings through server-query payloads. Do not assume client-side numeric conversions preserve monetary precision. Consult the [proposed release guide](docs/release/v1.2.0-release-notes-draft.md) for detailed integration and scope-switch guidance.

### Verified scope and known limitations

- The integrated pre-version-bump qualification passed **322 JavaScript tests, 129 Blazor tests, scoped API/adapter typechecks, builds**, and packaged Next.js 16/React 19, Vue 3, Angular 22 on supported Node 22.22.3, and .NET 8 Blazor Server scenarios. Exact **1.2.0** packages still require release-candidate validation prior to publication.
- Stable keyed identity adds cold local-dataset cost relative to historical v1.1.0, which did not implement the same guarantees. In a fixed reference-machine fixture, 100k-row keyed startup p95 was **57.9 ms (120 columns)** and **66.2 ms (200 columns)**; two-frame presentation waits reached **102.0/120.7 ms p95**. These are not cross-device service-level guarantees or direct paint measurements. Explicit unkeyed p95 differences ranged **−1.9 to +2.5 ms** in that fixture. A scoped performance tradeoff was accepted for release preparation; deeper investigation is tracked in [#43](https://github.com/tipolox/litgrid/issues/43).
- The broad root TypeScript check remains failing under [#31](https://github.com/tipolox/litgrid/issues/31) despite passing package builds and scoped public contract tests. It reported **140 source diagnostics before builds, 150 afterward** in the integrated qualification. No claim that the root check is green is made.
- Automated Chromium keyboard, focus, DOM and ARIA checks passed in the tested configurations, but **real screen-reader speech is unverified**; no WCAG conformance certification is claimed. Actual Safari, physical touch, Blazor WebAssembly and the full Angular-major support matrix remain outside this qualification.

## 1.1.0

### Blazor

- Added declarative `LitGridColumn<TItem>` definitions, expression-based fields, dynamic schema updates, and preservation of user column sizing, visibility, order, and persistence preferences.
- Synchronize rows independently from columns and configuration, avoiding dataset enumeration, serialization, transfer, and adoption on unchanged Automatic parent updates.
- Added automatic `INotifyCollectionChanged` collection tracking and reference-counted `INotifyPropertyChanged` row tracking. Notifications are batched through the component lifecycle, including background notifications; replacement and disposal release subscriptions.
- Added optional `DataRevision` and `RefreshDataAsync()` change signals, with failed-operation retry and serialized synchronization.
- Fixed partial JavaScript setter failures and value-reversion retries, failed item-subscription reconciliation, and obsolete source retention during overlapping updates.
- Restored the framework-configured Interactive Server interop timeout for synchronization, allowing a failed transport operation to release the gate and subsequent refreshes to proceed after retained-circuit reconnection.
- Preserved TypeScript source compatibility for existing structural grid implementations and strengthened keyboard/focus regression coverage.

### Breaking Blazor default and migration

**`DataSyncMode.Automatic` is the new default and changes v1.0.3 behavior.** Ordinary in-place `List<T>` mutations and non-notifying row edits no longer synchronize merely because a parent rerenders. Automatic relies on source replacement, supported collection/item notifications, an optional revision change, or explicit refresh; reference equality does not prove arbitrary mutable data is unchanged.

Existing applications relying on parent-update synchronization can retain that behavior with:

```razor
<DataGrid TItem="Employee" Data="@employees" DataSyncMode="DataSyncMode.Legacy" />
```

With the default null revision, Legacy preserves v1.0.3 parent-update semantics. Alternatively, replace the collection, use supported notifications, change `DataRevision`, or await `RefreshDataAsync()` after in-place edits. See [the synchronization and migration guide](docs/blazor-data-synchronization.md).

The product owner deliberately approved this **breaking minor release** as a semantic-versioning exception for coordinated LitGrid v1.1.0 across the six public npm packages and Blazor NuGet. It is not fully backward compatible.

### Package debugging and coordinated upgrades

- npm packages provide the original sources needed by JavaScript and declaration
  maps for debugging and type navigation without requiring the repository source tree.
- Upgrade all LitGrid wrappers/bundles on a shared page to the coordinated 1.1.0
  set, including the Blazor NuGet package where used. Packed Web requires core and
  renderer at `^1.1.0`; React, Angular, and Vue require Web at `^1.1.0`. Update and
  review consumer lockfiles, check resolved dependencies, and rebuild affected apps.
- The first `yc-grid` registration wins. The duplicate-registration guard avoids
  an exception but cannot replace an older constructor: Web 1.0.3 loaded first
  leaves `updateColumnSchema` unavailable even after 1.1.0 loads. Deliver matching
  assets and reload open pages; do not attempt to register the name twice.
- Deploy matching application and Blazor JavaScript assets together. Use asset
  fingerprints or cache revalidation/purges, update service-worker precaches where
  used, and test an upgrade from a cached client. Publication does not automatically
  update installed packages, lockfiles, deployed consumers, or browser caches.
  See [the upgrade guide](docs/installation.md#upgrading-to-v110).

### Known limitations and verification scope

- Actual Safari was not manually verified; Playwright WebKit testing is not
  equivalent to testing actual Safari.
- Physical touch devices were not manually verified; touch emulation does not
  establish physical-device behavior.
- Actual screen-reader announcements were not manually verified.
- Automated accessibility and keyboard checks passed in the tested configurations;
  no blanket WCAG conformance certification is claimed.
- Browser, cache, and service-worker testing covers specific configurations only.
  Native Firefox 145.0.1 cache-first upgrade checks passed. Other untested browser
  versions, service-worker combinations, and deployment environments remain
  unverified.
- Blazor Interactive Server recovery after a lost JavaScript interop
  acknowledgment may wait until the configured interop timeout expires (normally
  approximately 60 seconds). Reconnection does not immediately acknowledge a lost
  operation or guarantee a retry. Expired or terminated circuits require the
  application's normal reload/new-circuit recovery. See the
  [synchronization and migration guide](docs/blazor-data-synchronization.md).
- Upgrading from v1.0.3 requires coordinated package versions, deployed JavaScript
  assets, service-worker caches where used, and page reloads. See the
  [installation and upgrade guide](docs/installation.md#upgrading-to-v110).

## 1.0.3

### Fixes

- Fixed pagination controls overlapping or clipping on narrow/mobile layouts.
- Kept horizontally scrolled column headers behind the fixed row-header column.
- Synchronized the Blazor shipping bundle with the shared grid fixes.

### Accessibility and keyboard

- Preserved native keyboard interaction with controls in custom-rendered cells; F2 enters cell controls and Escape returns to cell navigation.
- Added keyboard multi-row toggle selection with Control/Command and range selection with Shift, using Enter or Space.
- Restored focus after column menu and chooser actions, including when the original trigger is no longer available.
- Exposed correct ARIA multi-selection metadata for multi-row and multi-cell modes.
- Kept active-cell references valid through filtering, pagination, and row/column virtualization.
- Preserved active grid navigation during unrelated React and Blazor input updates.
- Matched selection guidance and announcements to the configured selection mode and actual selection changes.

## 1.0.2

### Packaging

- Added package-specific READMEs for all published LitGrid npm packages so package pages include installation and getting-started guidance.
- Ensured the Angular package includes its README in the built npm artifact.
- Extended release artifact validation to require a root README in every published npm package.

## 1.0.1

### Fixed

- Fixed Blazor pagination interop so `GetPaginationAsync()` correctly reports the total page count.
- Fixed Blazor selection interop for row, multi-row, cell, and multi-cell selection by normalizing JavaScript selection state into JSON-safe payloads.
- Corrected public Blazor documentation to reference the `Tipolox.LitGrid.Blazor` NuGet package.
- Removed unintended grid rendering and virtualization debug logging.

### Packaging

- Added an embedded README and improved NuGet metadata for `Tipolox.LitGrid.Blazor`.
- Extended release artifact validation to require the NuGet package README.
- Removed stale generated JavaScript mirrors from `grid-web/src` so the TypeScript sources remain the single source of truth.

## 1.0.0

### Highlights

First Community Edition release of LitGrid: a virtualized, client-side DataGrid with Web Component, React, Angular, Vue, and Blazor integrations.

### DataGrid

- Virtualizes rows and columns, with configurable viewport, row height, and overscan settings.
- Provides client-side sorting, column filters, Quick Search, and optional pagination.
- Supports row, multi-row, cell, and multi-cell selection, including optional row-selection checkboxes.
- Lets users resize columns and rows, use best-fit column sizing, reorder columns, and show or hide columns.
- Supports versioned column state for order, explicit widths, and visibility, with optional browser-local persistence.
- Includes light and dark themes, plus semantic CSS custom properties for theme customization.
- Supports column accessors and custom cell renderers returning strings, numbers, or Lit templates.
- Copies selected cells or rows as TSV through the browser clipboard API.
- Implements ARIA grid semantics, keyboard navigation, accessible labels and descriptions, and optional screen-reader announcements.

### Framework Support

- Web Component / Lit: `@tipolox/litgrid-web` registers the `<yc-grid>` custom element.
- React: `@tipolox/litgrid-react` provides the `DataGrid` component and ref-based grid API.
- Angular: `@tipolox/litgrid-angular` provides the standalone `DataGridComponent` for Angular 17 and later.
- Vue: `@tipolox/litgrid-vue` provides the `DataGrid` component for Vue 3.5 and later.
- Blazor: `Tipolox.LitGrid.Blazor` provides the strongly typed Razor `DataGrid<TItem>` component for .NET 8 and later.

### Packaging

- The npm packages use the `@tipolox` scope, including the Web Component and framework integrations; `@tipolox/litgrid-core` and `@tipolox/litgrid-renderer` support lower-level integrations.
- The `Tipolox.LitGrid.Blazor` NuGet package includes its JavaScript as self-contained Blazor static web assets, so Blazor consumers do not need a separate Node.js package setup.

### Documentation

- Public installation, API, integration, examples, performance, and framework-specific guides are included in the repository documentation.
