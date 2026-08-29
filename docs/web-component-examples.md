# Web Component Examples

These examples use the public `@tipolox/litgrid-web` API directly with the
`yc-grid` Custom Element. For setup, lifecycle, properties, and the full API,
see the [Web Component Guide](vanilla-js-guide.md) and
[API Reference](api-reference.md).

## Production order grid

Use a row-selection grid for everyday operational data. Users can sort and
filter from header menus, then enable Quick Search from those same menus.

```html
<yc-grid id="orders-grid" aria-label="Orders"></yc-grid>
```

```ts
import '@tipolox/litgrid-web'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'

const grid = document.querySelector('#orders-grid') as DataGridElement

const columns: GridColumn[] = [
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

grid.data = [
  { id: 'SO-1042', customer: 'Northwind', status: 'Processing', total: 1280 },
  { id: 'SO-1043', customer: 'Contoso', status: 'Shipped', total: 740 }
]
grid.columns = columns
grid.config = {
  selection: { mode: 'row' },
  rowHeader: { enabled: true, width: 56 }
}
grid.viewportHeight = 440
```

This is a practical baseline for client-side tables that need finding,
sorting, filtering, selection, resizing, reordering, and column visibility.

## Persisted column preferences

Set a stable key to retain user-controlled widths, visibility, and column order
in browser storage. Column state events bubble and are composed, so listen on
the element or an ancestor.

```ts
import type {
  ColumnStateChangeDetail,
  DataGridElement
} from '@tipolox/litgrid-web'

const grid = document.querySelector('#users-grid') as DataGridElement
const status = document.querySelector('#preference-status') as HTMLElement

grid.columnStateStorageKey = 'account-users-grid'

grid.addEventListener('column-state-change', (event: Event) => {
  const detail = (event as CustomEvent<ColumnStateChangeDetail>).detail
  status.textContent = `Saved ${detail.state.columns.length} column preferences.`
})
```

For application-managed persistence, save the typed snapshot and restore it
when compatible definitions are available:

```ts
const state = grid.getColumnState()
localStorage.setItem('account-users-grid-state', JSON.stringify(state))

const savedState = JSON.parse(localStorage.getItem('account-users-grid-state') ?? 'null')
if (savedState) grid.setColumnState(savedState)
```

Keep column definitions in application code. LitGrid persists only compatible
state and safely reconciles removed or newly declared columns.

## Paginated checkbox selection

Combine pagination and multi-row checkbox selection for review queues. The
header checkbox applies to the current displayed page after Quick Search,
filtering, and sorting.

```ts
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'

const grid = document.querySelector('#tasks-grid') as DataGridElement

const columns: GridColumn[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'task', header: 'Task', width: 240 },
  { key: 'owner', header: 'Owner', width: 160 }
]

grid.data = [
  { id: 1, task: 'Review invoice', owner: 'Ada' },
  { id: 2, task: 'Confirm shipment', owner: 'Grace' }
]
grid.columns = columns
grid.config = {
  selection: { mode: 'multi-row', checkboxes: true },
  pagination: { enabled: true, pageSize: 25 }
}
grid.viewportHeight = 440
```

## Custom renderers and styling

Render presentation without altering the underlying values used for sorting,
filtering, selection, and clipboard output. Renderers may return strings,
numbers, or Lit templates.

```ts
import { html } from 'lit'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'

const grid = document.querySelector('#projects-grid') as DataGridElement

const columns: GridColumn[] = [
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

grid.data = [
  { name: 'Atlas', status: 'Active', progress: 72 },
  { name: 'Beacon', status: 'At risk', progress: 38 }
]
grid.columns = columns
grid.theme = 'dark'
grid.viewportHeight = 400
```

```css
#projects-grid {
  --litgrid-color-accent: #7c3aed;
  --litgrid-color-accent-soft: #ede9fe;
  --litgrid-color-accent-selected: #ddd6fe;
}
```

Best-fit sizing measures Lit template renderers from their rendered output,
while clipboard output continues to use underlying accessor/key values.

## Imperative grid actions

Use the element's typed public methods for application controls. They operate
on current displayed client-side data, after Quick Search, filters, sorting,
and pagination.

```ts
import type { DataGridElement } from '@tipolox/litgrid-web'

const grid = document.querySelector('#users-grid') as DataGridElement
const activeButton = document.querySelector('#show-active') as HTMLButtonElement
const copyButton = document.querySelector('#copy-rows') as HTMLButtonElement

grid.bestFitAllColumns()

activeButton.addEventListener('click', () => {
  grid.setFilter({
    columnKey: 'status',
    operator: 'equals',
    value: 'Active'
  })
})

copyButton.addEventListener('click', async () => {
  const copied = await grid.copySelectedRows()
  if (!copied) console.warn('No selected rows were copied.')
})
```

The same interface provides `setQuickSearch`, `clearFilter`, pagination,
selection, column sizing, column order/visibility, and versioned column-state
methods. See the [Web Component Guide](vanilla-js-guide.md#imperative-api) for
the complete method list.
