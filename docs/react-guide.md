# React Guide

LitGrid's React integration is a thin wrapper around the `yc-grid` Web
Component. It uses the same grid features and configuration while presenting a
React component API.

For the complete public surface and exact event payloads, see the
[API Reference](api-reference.md).

## Install

Install the React package. It includes the Web Component dependency.

```bash
pnpm add @tipolox/litgrid-react
```

```tsx
import { DataGrid } from '@tipolox/litgrid-react'
```

## Create a grid

`height` is required in practice: it defines the viewport within which rows
are virtualized. Use `useMemo` for column definitions and configuration when
they are not meant to change on each render.

```tsx
import { useMemo } from 'react'
import { DataGrid } from '@tipolox/litgrid-react'
import type { GridColumn } from '@tipolox/litgrid-web'

const data = [
  { id: 1, name: 'Ada Lovelace', status: 'Active' },
  { id: 2, name: 'Grace Hopper', status: 'Active' }
]

export function UsersGrid() {
  const columns = useMemo<GridColumn[]>(() => [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name', width: 220 },
    { key: 'status', header: 'Status' }
  ], [])

  const config = useMemo(() => ({
    selection: { mode: 'multi-row' as const, checkboxes: true },
    pagination: { enabled: true, pageSize: 25 }
  }), [])

  return <DataGrid data={data} columns={columns} config={config} height={400} />
}
```

The wrapper updates the underlying grid when a supplied prop changes. Treat
`data` and `columns` as immutable values: provide a new array when their
contents change.

## Props

| Prop | Default | Purpose |
| --- | --- | --- |
| `data` | required | Rows to display. |
| `columns` | `[]` | Column definitions. If omitted, columns are inferred from the first object row. |
| `config` | `{}` | Selection, row-header, and pagination configuration. |
| `height` | `320` | Virtualized viewport height in pixels. |
| `rowHeight` | `36` | Default row height in pixels. |
| `overscan` | `4` | Extra rows rendered outside the viewport. |
| `columnOverscan` | `2` | Extra columns rendered outside the viewport. |
| `bestFitSampleSize` | `10` | Number of values sampled when best-fit sizing runs. |
| `quickSearchDebounceThreshold` | `10000` | Row-count threshold at which quick-search input is debounced. |
| `quickSearchDebounceMs` | `150` | Debounce delay for large quick-search result sets. |
| `theme` | `'light'` | Built-in theme: `'light'` or `'dark'`. |
| `ariaLabel` | `'Data grid'` | Accessible grid name. |
| `ariaDescription` | empty | Optional replacement for the default keyboard instructions. |
| `screenReaderAnnouncements` | `true` | Enables the grid's live-region updates. |
| `columnStateStorageKey` | none | Enables browser-local persistence of column order, widths, and visibility. |

`config` supports selection, row headers, and client-side pagination:

```tsx
<DataGrid
  data={data}
  columns={columns}
  config={{
    selection: { mode: 'row' },
    rowHeader: { enabled: true, width: 56 },
    pagination: { enabled: true, pageSize: 50 }
  }}
  height={480}
/>
```

Supported selection modes are `'none'`, `'row'`, `'multi-row'`, `'cell'`, and
`'multi-cell'`. Set `checkboxes: true` with `multi-row` selection to display
row-header selection checkboxes.

## Column definitions and renderers

Columns use the shared `GridColumn` type. A column may supply an `accessor`
for a computed value or `render` for a display value.

```tsx
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

The renderer runs in the Lit Web Component, not in React's renderer. Return a
string or number for simple formatting. Do not return React JSX. For DOM-rich
content, use a Lit `TemplateResult` with `html` from `lit`.

```tsx
import { html } from 'lit'

const statusColumn: GridColumn = {
  key: 'status',
  header: 'Status',
  render: (value) => html`<strong>${String(value)}</strong>`
}
```

## Column-state events

The React wrapper exposes callbacks for state controlled inside the Web
Component. Persist state automatically with `columnStateStorageKey`, or react
to changes in application code.

```tsx
<DataGrid
  data={data}
  columns={columns}
  columnStateStorageKey="users-grid"
  onColumnReorder={(detail) => console.log(detail.columnOrder)}
  onColumnVisibilityChange={(detail) => console.log(detail.columnKey, detail.visible)}
  onColumnStateChange={(detail) => console.log(detail.state)}
/>
```

`onColumnReorder` receives the moved key, old and new indexes, and complete
column order. `onColumnVisibilityChange` receives the changed key, visibility,
and visible keys. `onColumnStateChange` receives the current versioned column
state snapshot.

## Accessibility and theming

Give each grid an application-specific label. Keep built-in announcements
enabled unless your application provides an equivalent live region.

```tsx
<DataGrid
  data={data}
  columns={columns}
  height={400}
  theme="dark"
  ariaLabel="Users"
  ariaDescription="Use arrow keys to navigate users."
/>
```

The underlying custom element supports semantic `--litgrid-*` CSS custom
properties. Set them on a containing element or on `yc-grid` through global
CSS when branding either built-in theme.

## Imperative methods

Attach a React `ref` with `useRef<DataGridRef>` to access the grid's imperative methods. The component forwards all methods directly to the underlying `DataGridElement`.

```tsx
import { useRef } from 'react'
import { DataGrid, type DataGridRef } from '@tipolox/litgrid-react'

export function ActionableGrid({ data, columns }) {
  const gridRef = useRef<DataGridRef>(null)

  const handleBestFit = () => {
    gridRef.current?.bestFitAllColumns()
  }

  const handleCopy = async () => {
    await gridRef.current?.copySelectedRows()
  }

  const handleSearch = (query: string) => {
    gridRef.current?.setQuickSearch(query)
  }

  return (
    <>
      <button onClick={handleBestFit}>Auto-fit Columns</button>
      <button onClick={handleCopy}>Copy Selected Rows</button>
      <input
        type="search"
        placeholder="Quick search..."
        onChange={(e) => handleSearch(e.target.value)}
      />
      <DataGrid
        ref={gridRef}
        data={data}
        columns={columns}
        config={{ selection: { mode: 'multi-row', checkboxes: true } }}
        height={400}
      />
    </>
  )
}
```

The ref exposes:
- **Column & row sizing**: `getColumnWidth`, `setColumnWidth`, `resetColumnWidth`, `resetAllColumnWidths`, `getRowHeight`, `setRowHeight`, `resetRowHeight`, `resetAllRowHeights`
- **Best fit**: `bestFitColumn`, `bestFitAllColumns`
- **Ordering & visibility**: `moveColumn`, `getColumnOrder`, `setColumnOrder`, `resetColumnOrder`, `setColumnVisible`, `isColumnVisible`, `getVisibleColumnKeys`, `resetColumnVisibility`
- **Column state snapshots**: `getColumnState`, `setColumnState`, `resetColumnState`
- **Search & filtering**: `setQuickSearch`, `clearQuickSearch`, `getQuickSearch`, `setFilter`, `clearFilter`, `getFilters`
- **Pagination**: `setPage`, `setPageSize`, `getPagination`, `getTotalRowCount`
- **Selection**: `selectRow`, `selectAllRows`, `clearSelection`, `getSelection`, `isRowSelected`, `isCellSelected`
- **Clipboard**: `copySelectedCells`, `copySelectedRows`

Calling imperative methods before the component is mounted throws a descriptive error.

## Performance guidance

- Give the grid a fixed, realistic `height`; virtual scrolling depends on it.
- Keep `rowHeight` consistent with ordinary rendered rows.
- Start with the default overscan values and increase them only after measuring
  scrolling behavior in your application.
- Use `useMemo` for static column and configuration objects, and avoid creating
  expensive renderer functions during frequent parent renders.
- For large data sets, keep `bestFitSampleSize` small and tune quick-search
  debounce settings only when profiling indicates a need.

For React-specific input stability, large-data, renderer, profiling, and
benchmarking guidance, see the [React Performance Guide](react-performance-guide.md).

## React wrapper boundary

`DataGrid` is a thin, reference-driven wrapper around `<yc-grid>`. It synchronizes inputs and forwards custom events and imperative calls directly to the custom element without duplicating grid state or data transformations in React.

For complete, focused integration patterns, see the [Examples guide](examples.md).
