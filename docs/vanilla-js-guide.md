# Web Component Guide

LitGrid can be used directly as the `yc-grid` custom element in any
standards-based application. Import the package once, assign complex values as
JavaScript properties, and use the typed element interface for imperative
operations. This guide applies to Vanilla JS, TypeScript, and applications
whose framework consumes Custom Elements directly.

For the complete public surface, event payloads, and Core/renderer exports,
see the [API Reference](api-reference.md).

## Install and register

```bash
pnpm add @tipolox/litgrid-web
```

```ts
import '@tipolox/litgrid-web'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'
```

The module import registers `<yc-grid>` when it has not already been defined.
When setup code may run before the element upgrades, wait for its definition
before querying or configuring it:

```ts
await customElements.whenDefined('yc-grid')

const grid = document.querySelector('#users-grid') as DataGridElement | null
if (!grid) throw new Error('Expected #users-grid to exist.')
```

## Create a grid

Put the element in the page, then assign data, columns, and configuration as
properties. Do not serialize arrays or objects into HTML attributes.

```html
<yc-grid id="users-grid"></yc-grid>
```

```ts
const grid = document.querySelector('#users-grid') as DataGridElement

const columns: GridColumn[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 220 },
  { key: 'status', header: 'Status' }
]

grid.data = [
  { id: 1, name: 'Ada Lovelace', status: 'Active' },
  { id: 2, name: 'Grace Hopper', status: 'Active' }
]
grid.columns = columns
grid.config = {
  selection: { mode: 'multi-row', checkboxes: true },
  pagination: { enabled: true, pageSize: 25 }
}
grid.viewportHeight = 400
```

Use a new array assignment when replacing data or definitions:

```ts
grid.data = [...nextRows]
grid.columns = [...nextColumns]
```

## Attributes and properties

Use HTML attributes only for the reflected primitive properties: `theme`,
`aria-label`, `aria-description`, and `screen-reader-announcements`. Assign
arrays, objects, and numeric configuration through JavaScript properties.

```html
<yc-grid
  id="users-grid"
  theme="dark"
  aria-label="Users"
  aria-description="Use arrow keys to navigate users."
></yc-grid>
```

```ts
grid.data = users
grid.columns = columns
grid.config = { selection: { mode: 'row' } }
grid.viewportHeight = 480
```

Do not serialize `data`, `columns`, or `config` into attributes. Those values
must retain their JavaScript arrays, functions, and object shapes.

## Properties

| Property | Default | Purpose |
| --- | --- | --- |
| `data` | `[]` | Rows to display. |
| `columns` | inferred | Column definitions. |
| `config` | `{}` | Selection, row-header, and pagination configuration. |
| `viewportHeight` | `320` | Virtualized viewport height in pixels. |
| `virtualRowHeight` | `36` | Default row height in pixels. |
| `overscanCount` | `4` | Extra rows rendered around the viewport. |
| `columnOverscanCount` | `2` | Extra columns rendered around the viewport. |
| `bestFitSampleSize` | `10` | Values sampled by best-fit sizing. |
| `quickSearchDebounceThreshold` | `10000` | Row-count threshold for debounced quick search. |
| `quickSearchDebounceMs` | `150` | Debounce delay for large quick-search result sets. |
| `theme` | `'light'` | `'light'` or `'dark'`; also reflected as an attribute. |
| `ariaLabel` | `'Data grid'` | Accessible grid name; reflected as `aria-label`. |
| `ariaDescription` | empty | Optional keyboard-instruction text; reflected as `aria-description`. |
| `screenReaderAnnouncements` | `true` | Enables generated live-region messages. |
| `columnStateStorageKey` | `null` | Browser-local key for column order, widths, and visibility. |

`config` accepts row headers, pagination, and selection modes: `'none'`,
`'row'`, `'multi-row'`, `'cell'`, and `'multi-cell'`.

## Columns and renderers

Use `accessor` for a computed cell value and `render` for its display value.

```ts
const columns: GridColumn[] = [
  { key: 'name', header: 'Name' },
  {
    key: 'amount',
    header: 'Amount',
    accessor: (row) => (row as { amount: number }).amount,
    render: (value) => `$${Number(value).toLocaleString()}`
  }
]
```

Renderers may return strings, numbers, or Lit templates. Use Lit's `html`
tag for markup:

```ts
import { html } from 'lit'

const statusColumn: GridColumn = {
  key: 'status',
  header: 'Status',
  render: (value) => html`<strong>${String(value)}</strong>`
}
```

## Imperative API

The element exposes its public methods directly. These methods preserve the
grid's internal Core/renderer boundary; do not access implementation fields.

```ts
grid.setQuickSearch('ada')
grid.setFilter({ columnKey: 'status', operator: 'equals', value: 'Active' })
grid.setPageSize(50)
grid.setPage(0)
grid.selectRow(0, 'replace')
```

| Area | Methods |
| --- | --- |
| Column widths | `getColumnWidth`, `setColumnWidth`, `resetColumnWidth`, `resetAllColumnWidths`, `bestFitColumn`, `bestFitAllColumns` |
| Row heights | `getRowHeight`, `setRowHeight`, `resetRowHeight`, `resetAllRowHeights` |
| Column order | `moveColumn`, `getColumnOrder`, `setColumnOrder`, `resetColumnOrder` |
| Visibility | `setColumnVisible`, `isColumnVisible`, `getVisibleColumnKeys`, `resetColumnVisibility` |
| Column state | `getColumnState`, `setColumnState`, `resetColumnState` |
| Search and filters | `setQuickSearch`, `clearQuickSearch`, `getQuickSearch`, `setFilter`, `clearFilter`, `getFilters` |
| Pagination | `setPage`, `setPageSize`, `getPagination`, `getTotalRowCount` |
| Selection | `selectRow`, `selectAllRows`, `clearSelection`, `getSelection`, `isRowSelected`, `isCellSelected` |
| Clipboard | `copySelectedCells`, `copySelectedRows` |

Clipboard methods are asynchronous because they write through the browser
clipboard API:

```ts
const copied = await grid.copySelectedRows()
```

Rows and indexes passed to selection, sizing, pagination, and clipboard calls
refer to the current displayed client-side data, after Quick Search, filters,
sorting, and pagination. For example, `selectRow(0)` selects the first
displayed row, not necessarily the first source row.

## Events and persisted column state

Column changes dispatch bubbling, composed custom events, so they can be
listened for on the grid or an ancestor.

```ts
import type {
  ColumnReorderDetail,
  ColumnStateChangeDetail,
  ColumnVisibilityChangeDetail
} from '@tipolox/litgrid-web'

const handleColumnStateChange = (event: Event) => {
  const { detail } = event as CustomEvent<ColumnStateChangeDetail>
  console.log(detail.state)
}

grid.addEventListener('column-reorder', (event: Event) => {
  const detail = (event as CustomEvent<ColumnReorderDetail>).detail
  console.log(detail.columnOrder)
})
grid.addEventListener('column-visibility-change', (event: Event) => {
  const detail = (event as CustomEvent<ColumnVisibilityChangeDetail>).detail
  console.log(detail.visibleColumnKeys)
})
grid.addEventListener('column-state-change', handleColumnStateChange)

// When the grid is removed or the feature is no longer needed:
grid.removeEventListener('column-state-change', handleColumnStateChange)
```

Set `columnStateStorageKey` to persist column order, explicit widths, and
visibility in `localStorage`:

```ts
grid.columnStateStorageKey = 'users-grid'
```

For application-managed persistence, call `getColumnState()` and later pass a
saved compatible snapshot to `setColumnState()`.

## Accessibility and keyboard interaction

```ts
grid.theme = 'dark'
grid.ariaLabel = 'Users'
grid.ariaDescription = 'Use arrow keys to navigate users.'
grid.screenReaderAnnouncements = true
```

The viewport follows the ARIA grid model. Focus it to establish an active cell;
use arrow keys, Home/End, Page Up/Down, and Tab/Shift+Tab to navigate. Enter
and Space activate the existing selection behavior. Header menus and the
column chooser support keyboard focus and Escape restores focus to the invoking
header action.

Keep generated announcements enabled unless the application provides an
equivalent live region. `ariaDescription` replaces the default keyboard
instructions when an application needs context-specific guidance.

## Themes and styling

Use the built-in themes with the `theme` property or reflected attribute.
Override semantic `--litgrid-*` custom properties on the element or an
ancestor to brand either theme without reaching into Shadow DOM internals.

```css
.admin-grid {
  --litgrid-color-accent: #7c3aed;
  --litgrid-color-accent-soft: #ede9fe;
  --litgrid-color-accent-selected: #ddd6fe;
  --litgrid-shadow-shell: 0 8px 24px rgb(76 29 149 / 18%);
}
```

```html
<yc-grid class="admin-grid" theme="dark"></yc-grid>
```

Key token groups are `--litgrid-color-text-*`,
`--litgrid-color-surface-*`, `--litgrid-color-border-*`,
`--litgrid-color-accent-*`, and `--litgrid-shadow-*`.

## Performance and lifecycle

For smooth large-data rendering, give the grid a fixed viewport height, keep
the default row height representative of normal rows, and begin with the
default overscan values. Increase overscan or best-fit sample size only after
measuring the result in the target application.

Keep renderers lightweight, replace `data` and `columns` arrays when their
contents change, and avoid running best-fit on a large sample until profiling
shows it is needed. The component virtualizes rows and columns; application
code should provide data and configuration rather than manipulate its internal
DOM.

Remove any listeners your application attached when the owning view is
destroyed. The component itself is a standard Custom Element and needs no
special disposal API:

```ts
grid.removeEventListener('column-state-change', handleColumnStateChange)
grid.remove()
```

For complete, focused Web Component integration patterns, see the
[Web Component Examples](web-component-examples.md).
