# Changelog

Notable changes to LitGrid are recorded here.

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
