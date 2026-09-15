# Changelog

Notable changes to LitGrid are recorded here.

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
