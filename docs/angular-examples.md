# Angular Examples

These examples use only the public `@tipolox/litgrid-angular` API with Angular
standalone components. For setup and the complete integration surface, see the
[Angular Guide](angular-guide.md) and [API Reference](api-reference.md).

## Production order grid

Use a row-selection grid for operational data. Users can sort and filter from
column header menus, and enable Quick Search from those menus.

```ts
import { Component } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type { GridColumn } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <litgrid-data-grid
      [data]="orders"
      [columns]="columns"
      [config]="gridConfig"
      [height]="440"
      ariaLabel="Orders"
    />
  `
})
export class OrdersGridComponent {
  readonly orders = [
    { id: 'SO-1042', customer: 'Northwind', status: 'Processing', total: 1280 },
    { id: 'SO-1043', customer: 'Contoso', status: 'Shipped', total: 740 }
  ]

  readonly columns: GridColumn[] = [
    { key: 'id', header: 'Order', width: 96 },
    { key: 'customer', header: 'Customer', width: 220 },
    { key: 'status', header: 'Status', width: 150 },
    {
      key: 'total',
      header: 'Total',
      width: 130,
      render: (value) => `$${Number(value).toLocaleString()}`
    }
  ]

  readonly gridConfig = {
    selection: { mode: 'row' as const },
    rowHeader: { enabled: true, width: 56 }
  }
}
```

This is a useful baseline for client-side tables that need sorting, filtering,
selection, resizing, reordering, and column visibility.

## Persisted column preferences

Give the grid a stable storage key to preserve user-controlled column widths,
visibility, and ordering across browser refreshes. Angular outputs expose typed
details if the application also needs to react to changes.

```ts
import { Component } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type {
  ColumnStateChangeDetail,
  GridColumn
} from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <p role="status">{{ statusMessage }}</p>
    <litgrid-data-grid
      [data]="users"
      [columns]="columns"
      columnStateStorageKey="account-users-grid"
      (columnStateChange)="onColumnStateChange($event)"
      [height]="480"
    />
  `
})
export class UsersGridComponent {
  statusMessage = 'No preference changes yet.'
  readonly users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }]
  readonly columns: GridColumn[] = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name', width: 220 }
  ]

  onColumnStateChange(detail: ColumnStateChangeDetail): void {
    this.statusMessage = `Saved ${detail.state.columns.length} column preferences.`
  }
}
```

Keep column definitions in application code. LitGrid persists only compatible
column state, safely ignoring removed keys and retaining new column defaults.

## Paginated checkbox selection

Use pagination with multi-row checkbox selection for review queues. The header
checkbox affects the current displayed page after filtering, sorting, and Quick
Search.

```ts
import { Component } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <litgrid-data-grid
      [data]="tasks"
      [columns]="columns"
      [config]="gridConfig"
      [height]="440"
      ariaLabel="Review tasks"
    />
  `
})
export class TaskQueueComponent {
  readonly tasks = [
    { id: 1, task: 'Review invoice', owner: 'Ada' },
    { id: 2, task: 'Confirm shipment', owner: 'Grace' }
  ]
  readonly columns = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'task', header: 'Task', width: 240 },
    { key: 'owner', header: 'Owner', width: 160 }
  ]
  readonly gridConfig = {
    selection: { mode: 'multi-row' as const, checkboxes: true },
    pagination: { enabled: true, pageSize: 25 }
  }
}
```

## Custom cell renderers

Render presentation without changing the values used for sorting, filtering,
selection, or clipboard output. Renderers execute in Lit's Web Component layer;
they cannot return Angular templates or Angular components.

```ts
import { Component } from '@angular/core'
import { html } from 'lit'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type { GridColumn } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `<litgrid-data-grid [data]="projects" [columns]="columns" [height]="400" />`
})
export class ProjectsGridComponent {
  readonly projects = [
    { name: 'Atlas', status: 'Active', progress: 72 },
    { name: 'Beacon', status: 'At risk', progress: 38 }
  ]

  readonly columns: GridColumn[] = [
    { key: 'name', header: 'Project', width: 220 },
    {
      key: 'status',
      header: 'Status',
      width: 150,
      render: (value) => html`<strong class="status-${String(value).toLowerCase()}">${String(value)}</strong>`
    },
    {
      key: 'progress',
      header: 'Progress',
      width: 130,
      render: (value) => `${Number(value)}%`
    }
  ]
}
```

For a Lit-template renderer, best-fit sizing measures the rendered template.
The underlying values—not renderer output—are copied as TSV.

## Imperative grid actions

Use `ViewChild` after view initialization when application controls need to
operate on the grid directly. The Angular component delegates to the existing
Web Component API without duplicating grid state.

```ts
import { AfterViewInit, Component, ViewChild } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <button type="button" (click)="showActiveUsers()">Active users</button>
    <button type="button" (click)="copyRows()">Copy selected rows</button>
    <litgrid-data-grid #grid [data]="users" [columns]="columns" [height]="400" />
  `
})
export class UsersGridComponent implements AfterViewInit {
  @ViewChild('grid') private grid?: DataGridComponent

  readonly users = [
    { id: 1, name: 'Ada', status: 'Active' },
    { id: 2, name: 'Grace', status: 'Inactive' }
  ]
  readonly columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' }
  ]

  ngAfterViewInit(): void {
    this.grid?.bestFitAllColumns()
  }

  showActiveUsers(): void {
    this.grid?.setFilter({
      columnKey: 'status',
      operator: 'equals',
      value: 'Active'
    })
  }

  async copyRows(): Promise<void> {
    const copied = await this.grid?.copySelectedRows()
    if (!copied) console.warn('No selected rows were copied.')
  }
}
```

The delegated API also provides column and row sizing, column order and
visibility, column state, Quick Search, pagination, and selection. Indexes
refer to current displayed client-side data after transforms and pagination.
