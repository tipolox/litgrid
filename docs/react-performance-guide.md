# React Performance Guide

LitGrid's React integration is a thin wrapper around the `yc-grid` Web
Component. The grid owns its rendering, virtualization, keyboard interaction,
and client-side query behavior; React supplies its inputs. Good React
performance therefore starts with stable, intentional inputs and with avoiding
application work that virtualization cannot remove.

This guide supplements the [React Guide](react-guide.md). For deterministic
Core and renderer benchmarks, see [Performance Benchmarks](performance-benchmarks.md).

## Understand the performance boundary

Rows and columns are virtualized inside LitGrid, so the grid limits the DOM to
the visible viewport plus overscan. Virtualization does not make application
code that creates, clones, sorts, or derives a large array on every React
render free.

Keep these responsibilities separate:

- React owns application state and supplies `data`, `columns`, and `config`.
- LitGrid owns display virtualization and its built-in client-side sorting,
  filtering, quick search, and pagination.
- The React wrapper forwards changed props to the Web Component. It does not
  add a second grid state model.

Give the grid a fixed, realistic `height`; it defines the viewport that makes
row virtualization effective.

## Keep grid inputs stable

Define static column definitions and configuration outside a frequently
rendering path, or memoize them. This avoids recreating values that have not
semantically changed.

```tsx
import { useMemo } from 'react'
import { DataGrid } from '@tipolox/litgrid-react'
import type { GridColumn } from '@tipolox/litgrid-web'

type Order = {
  id: number
  accountId: string
  customer: string
  total: number
}

export function OrdersGrid({ orders }: { orders: Order[] }) {
  const columns = useMemo<GridColumn[]>(() => [
    { key: 'id', header: 'Order', width: 96 },
    { key: 'customer', header: 'Customer', width: 220 },
    { key: 'total', header: 'Total' }
  ], [])

  const config = useMemo(() => ({
    selection: { mode: 'row' as const },
    pagination: { enabled: true, pageSize: 50 }
  }), [])

  return <DataGrid data={orders} columns={columns} config={config} height={520} />
}
```

Treat `data` and `columns` as immutable inputs. Supply a new array when their
contents genuinely change, but do not clone or map a large unchanged dataset
just because a parent component rendered. Likewise, memoization is useful when
it prevents real repeated work; it should not be applied indiscriminately to
trivial values.

## Prepare large datasets outside the render path

Create deterministic demo data, static lookup data, and expensive derived rows
outside the component render path, or memoize them from their actual
dependencies. For data fetched from a server, retain the received row objects
when no transformation is needed.

```tsx
import { useMemo } from 'react'

function useVisibleOrders(orders: Order[], accountId: string) {
  return useMemo(
    () => orders.filter((order) => order.accountId === accountId),
    [orders, accountId]
  )
}
```

For very large client-side datasets, remember that LitGrid virtualizes display
work, while built-in quick search, filtering, sorting, and pagination still
operate on the supplied client-side data. Profile the query behavior with your
actual row shape and data volume. If an application must avoid client-side
processing over the full dataset, prepare the appropriate server result before
passing it to the grid rather than duplicating the grid's state in React.

## Keep cell renderers lightweight

Column renderers execute in the Lit Web Component, not in React. They return a
string, number, or Lit `TemplateResult`; do not return React JSX. Since
renderers can run for visible cells while scrolling, avoid expensive work in
the renderer itself.

Create reusable formatters once, and keep renderer identity stable when column
definitions are memoized.

```tsx
import { useMemo } from 'react'
import type { GridColumn } from '@tipolox/litgrid-web'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

function useOrderColumns() {
  return useMemo<GridColumn[]>(() => [
    { key: 'customer', header: 'Customer' },
    {
      key: 'total',
      header: 'Total',
      render: (value) => currency.format(Number(value))
    }
  ], [])
}
```

Avoid creating formatters, performing network requests, or doing expensive
per-cell aggregation in a renderer. Transforms and clipboard output use the
underlying accessor or key values, not custom renderer output.

## Tune virtualization only after measuring

Start with the defaults:

- `rowHeight`: `36`
- `overscan`: `4`
- `columnOverscan`: `2`

Use a row height that reflects ordinary rendered rows. Increase overscan only
when measurement shows that it improves perceived scroll smoothness enough to
justify rendering more rows or columns. Lower overscan reduces rendered work
but can expose blank space during very fast scrolling.

Keep `bestFitSampleSize` small for large datasets. Best-fit measurement is
cached, but increasing the sample size intentionally increases measurement
work. Use larger samples only when width accuracy for varied data matters more
than that extra work.

Quick-search input is debounced automatically at or above
`quickSearchDebounceThreshold` (default `10,000` rows), with a default delay of
`150ms`. Adjust those props only after profiling representative search input
and data.

## Measure the right layer

Use a production React build for browser profiling. Development-only checks can
make component rendering appear slower than the deployed application.

When investigating a slowdown:

1. Use React DevTools Profiler to identify unnecessary application component
   renders and expensive data derivation.
2. Use browser performance tools with realistic row counts, viewport size,
   renderers, and interaction patterns to inspect scrolling, layout, and paint.
3. Run `pnpm benchmark` to compare framework-independent Core and renderer
   changes. Compare benchmark results only on the same machine, Node.js
   version, and similar system load.

The benchmark suite deliberately excludes browser layout and paint. A result
from it should not be treated as a React rendering measurement.

## Checklist

Before optimizing further, verify that the application:

- Gives every grid a realistic fixed `height`.
- Memoizes static columns, non-changing configuration, and expensive derived
  datasets where that avoids real work.
- Does not recreate or clone a large unchanged `data` array during parent
  renders.
- Keeps custom renderers and formatters lightweight.
- Starts with default overscan and tunes it from measurements.
- Keeps best-fit samples modest for large datasets.
- Profiles React application work separately from LitGrid Core and renderer
  benchmarks.

The current React wrapper intentionally does not expose an imperative React ref
API. Use the built-in grid UI for available interactions, and keep
application-level coordination in typed props and callbacks documented in the
[React Guide](react-guide.md).
