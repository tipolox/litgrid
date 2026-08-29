# LitGrid Examples

These examples use only the public LitGrid package APIs. They are React
examples; the corresponding [Web Component Examples](web-component-examples.md)
and [Angular Examples](angular-examples.md) guides provide native integration
patterns. The interactive React versions are available in the repository
playground at `#examples`, including the saved-preferences scenario at
`#column-state`.

## Production order grid

Use a row-selection grid for everyday operational data. Sorting and column
filters are available from each column header menu; users can expose Quick
Search from the same menu.

```tsx
import { DataGrid } from '@tipolox/litgrid-react'

export function OrdersGrid({ orders }) {
  return (
    <DataGrid
      data={orders}
      columns={[
        { key: 'id', header: 'Order', width: 96 },
        { key: 'customer', header: 'Customer', width: 220 },
        { key: 'status', header: 'Status', width: 150 },
        { key: 'total', header: 'Total', width: 130, render: (value) => `$${Number(value).toLocaleString()}` }
      ]}
      config={{ selection: { mode: 'row' }, rowHeader: { enabled: true, width: 56 } }}
      height={440}
    />
  )
}
```

This is the right baseline for client-side tables whose users need to find,
sort, filter, select, resize, reorder, and hide columns.

## Persisted column preferences

Set a stable storage key when user-controlled widths, visibility, and ordering
should survive a browser refresh. LitGrid stores only column state and safely
reconciles it with the current column definitions.

```tsx
import { useCallback, useState } from 'react'
import { DataGrid } from '@tipolox/litgrid-react'
import type { ColumnStateChangeDetail } from '@tipolox/litgrid-web'

export function UsersGrid({ users, columns }) {
  const [message, setMessage] = useState('No preference changes yet.')
  const handleColumnStateChange = useCallback((detail: ColumnStateChangeDetail) => {
    setMessage(`Saved ${detail.state.columns.length} column preferences.`)
  }, [])

  return (
    <>
      <p role="status">{message}</p>
      <DataGrid
        data={users}
        columns={columns}
        columnStateStorageKey="account-users-grid"
        onColumnStateChange={handleColumnStateChange}
        height={480}
      />
    </>
  )
}
```

For application-managed state in a Web Component integration, use the typed
element API instead:

```ts
const state = grid.getColumnState()
grid.setColumnState(state)
grid.resetColumnState()
```

Do not persist definitions themselves: keep columns in application code and
let LitGrid restore only compatible order, visibility, and explicit widths.

## Paginated checkbox selection

Enable pagination and checkbox selection together for review queues. The
header checkbox affects the current displayed page after filtering, sorting,
and Quick Search.

```tsx
<DataGrid
  data={tasks}
  columns={columns}
  config={{
    selection: { mode: 'multi-row', checkboxes: true },
    pagination: { enabled: true, pageSize: 25 }
  }}
  height={440}
/>
```

Use row-copying from the grid UI or `copySelectedRows()` on a Web Component
when users need TSV data for the selected displayed rows.

## Custom cell renderers

Render presentation without changing the data value that drives sorting,
filtering, selection, and clipboard output. Renderers may return strings,
numbers, or Lit templates.

```ts
import { html } from 'lit'
import type { GridColumn } from '@tipolox/litgrid-web'

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
```

For a Lit-template renderer, best-fit sizing measures the rendered template.
Keep expensive renderer work out of frequent parent renders in React, and use
the underlying value—not renderer output—when exporting or transforming data.

## Large data sets

Give every grid a fixed viewport height so virtual scrolling can limit DOM
work. Start with the default row and column overscan; increase either only
after profiling the target workload.

```tsx
<DataGrid
  data={rows}
  columns={columns}
  height={600}
  rowHeight={36}
  overscan={4}
  columnOverscan={2}
  bestFitSampleSize={10}
/>
```

The playground's **Large dataset** example demonstrates these settings with
one million deterministic rows.

## Imperative grid actions

Use `useRef<DataGridRef>` when application controls need to operate on the
grid directly. The React component delegates to the underlying Web Component
API without duplicating grid state.

```tsx
import { useEffect, useRef } from 'react'
import { DataGrid, type DataGridRef } from '@tipolox/litgrid-react'
import type { GridColumn } from '@tipolox/litgrid-web'

export function UsersGridComponent({ users, columns }) {
  const gridRef = useRef<DataGridRef>(null)

  useEffect(() => {
    gridRef.current?.bestFitAllColumns()
  }, [])

  const showActiveUsers = () => {
    gridRef.current?.setFilter({
      columnKey: 'status',
      operator: 'equals',
      value: 'Active'
    })
  }

  const copyRows = async () => {
    const copied = await gridRef.current?.copySelectedRows()
    if (!copied) console.warn('No selected rows were copied.')
  }

  return (
    <>
      <button type="button" onClick={showActiveUsers}>Active users</button>
      <button type="button" onClick={copyRows}>Copy selected rows</button>
      <DataGrid ref={gridRef} data={users} columns={columns} height={400} />
    </>
  )
}
```

The delegated API provides column and row sizing, column order and
visibility, column state snapshots, Quick Search, filters, pagination,
selection, and clipboard copying. Indexes refer to current displayed
client-side data after transforms and pagination.
