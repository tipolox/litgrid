# Angular Guide

LitGrid's Angular integration is a thin standalone component around the
`yc-grid` Web Component. It uses the same data, configuration, and grid
features while providing Angular inputs, typed outputs, and an imperative
component API.

For the complete public surface and exact event payloads, see the
[API Reference](api-reference.md).

## Install

LitGrid Angular supports Angular 17 and later. Install the Angular package;
it includes the Web Component dependency.

```bash
pnpm add @tipolox/litgrid-angular
```

```ts
import { DataGridComponent } from '@tipolox/litgrid-angular'
```

## Create a grid

Import `DataGridComponent` into a standalone component, then bind data,
columns, configuration, and a fixed viewport height. A fixed `height` is
required in practice because the grid virtualizes its rows within that space.

```ts
import { Component } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type { GridColumn } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <litgrid-data-grid
      [data]="users"
      [columns]="columns"
      [config]="gridConfig"
      [height]="400"
    />
  `
})
export class UsersGridComponent {
  readonly users = [
    { id: 1, name: 'Ada Lovelace', status: 'Active' },
    { id: 2, name: 'Grace Hopper', status: 'Active' }
  ]

  readonly columns: GridColumn[] = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name', width: 220 },
    { key: 'status', header: 'Status' }
  ]

  readonly gridConfig = {
    selection: { mode: 'multi-row' as const, checkboxes: true },
    pagination: { enabled: true, pageSize: 25 }
  }
}
```

Treat `data` and `columns` as immutable inputs: assign a new array when their
contents change. `config` supports selection, row headers, and client-side
pagination. Selection modes are `'none'`, `'row'`, `'multi-row'`, `'cell'`,
and `'multi-cell'`.

## Inputs

`litgrid-data-grid` accepts the same grid configuration as the Web Component,
using Angular-friendly viewport names.

| Input | Default | Purpose |
| --- | --- | --- |
| `data` | `[]` | Rows to display. |
| `columns` | `[]` | Column definitions; omitted columns are inferred from the first object row. |
| `config` | `{}` | Selection, row-header, and pagination configuration. |
| `height` | `320` | Virtualized viewport height in pixels. |
| `rowHeight` | `36` | Default row height in pixels. |
| `overscan` | `4` | Extra rows rendered outside the viewport. |
| `columnOverscan` | `2` | Extra columns rendered outside the viewport. |
| `bestFitSampleSize` | `10` | Number of values sampled for best-fit sizing. |
| `quickSearchDebounceThreshold` | `10000` | Row-count threshold at which Quick Search input is debounced. |
| `quickSearchDebounceMs` | `150` | Debounce delay for large Quick Search result sets. |
| `theme` | `'light'` | Built-in theme: `'light'` or `'dark'`. |
| `ariaLabel` | `'Data grid'` | Accessible grid name. |
| `ariaDescription` | `''` | Optional replacement for the default keyboard instructions. |
| `screenReaderAnnouncements` | `true` | Enables the grid's live-region updates. |
| `columnStateStorageKey` | none | Browser-local key for column order, widths, and visibility. |

## Column definitions and renderers

Use the shared `GridColumn` type. An `accessor` provides a computed underlying
value; `render` controls only presentation. Sorting, filtering, and clipboard
operations continue to use the underlying value.

```ts
import { html } from 'lit'
import type { GridColumn } from '@tipolox/litgrid-angular'

const columns: GridColumn[] = [
  { key: 'name', header: 'Name' },
  {
    key: 'amount',
    header: 'Amount',
    accessor: (row) => (row as { amount: number }).amount,
    render: (value) => `$${Number(value).toLocaleString()}`
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => html`<strong>${String(value)}</strong>`
  }
]
```

Renderers run in the Lit Web Component, not Angular's template renderer. They
may return a string, number, or Lit `TemplateResult`; Angular templates and
Angular components are not supported renderer results.

## Column-state outputs

The component forwards the Web Component's column-state events as typed Angular
outputs. Use `columnStateStorageKey` for browser-local persistence, or handle
events to synchronize application state.

```ts
import { Component } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type { ColumnStateChangeDetail } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <litgrid-data-grid
      [data]="users"
      [columns]="columns"
      columnStateStorageKey="account-users-grid"
      (columnStateChange)="saveColumnState($event)"
      (columnReorder)="recordOrder($event.columnOrder)"
      (columnVisibilityChange)="recordVisibility($event.columnKey, $event.visible)"
    />
  `
})
export class UsersGridComponent {
  // data and columns omitted

  saveColumnState(detail: ColumnStateChangeDetail): void {
    console.log(detail.state)
  }

  recordOrder(columnOrder: string[]): void {}
  recordVisibility(columnKey: string, visible: boolean): void {}
}
```

`columnReorder` emits the moved key, previous and current indexes, and the
resulting order. `columnVisibilityChange` emits the changed key, its visibility,
and the visible keys. `columnStateChange` emits the versioned state snapshot
and change reason.

## Imperative API

Use Angular's `ViewChild` to access the `DataGridComponent` after the view has
initialized. Its methods delegate directly to the Web Component.

```ts
import { AfterViewInit, Component, ViewChild } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `<litgrid-data-grid #grid [data]="users" [columns]="columns" />`
})
export class UsersGridComponent implements AfterViewInit {
  @ViewChild('grid') private grid?: DataGridComponent

  readonly users = [{ id: 1, name: 'Ada' }]
  readonly columns = [{ key: 'id', header: 'ID' }, { key: 'name', header: 'Name' }]

  ngAfterViewInit(): void {
    this.grid?.setQuickSearch('Ada')
    this.grid?.setPageSize(50)
    this.grid?.bestFitAllColumns()
  }

  clearFilters(): void {
    this.grid?.clearFilter()
  }
}
```

The API includes row and column sizing, best fit, column ordering and
visibility, column state, Quick Search, filters, pagination, selection, and
`copySelectedCells()` / `copySelectedRows()`. See the Angular section of the
[API Reference](api-reference.md#angular-datagridcomponent) for the complete
method list. Calls before Angular initializes the view throw an error.

Rows and indexes passed to selection, sizing, pagination, and clipboard APIs
refer to current displayed client-side data after Quick Search, filtering,
sorting, and pagination.

## Accessibility, theming, and performance

Give each grid an application-specific `ariaLabel`. Keep
`screenReaderAnnouncements` enabled unless the application provides an
equivalent live region. Use `theme="dark"` or `[theme]="'dark'"` for the dark
built-in theme. Consumers can override the Web Component's semantic
`--litgrid-*` CSS custom properties from application styles.

For large datasets, keep a fixed realistic `height`, start with the default row
and column overscan, and increase either only after profiling. Keep
`bestFitSampleSize` small for large data. The grid virtualizes both rows and
columns; no Angular-side data or rendering logic is required.

## Wrapper boundary

`DataGridComponent` intentionally contains no grid business logic. It maps
Angular inputs and typed outputs to `yc-grid`; Grid Core owns client-side data
transforms and selection, while the Web Component owns interaction and
rendering. For shared configuration and behavior, see the
[Angular Examples](angular-examples.md), [Web Component Guide](vanilla-js-guide.md),
and [API Reference](api-reference.md).
