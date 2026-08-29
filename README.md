# LitGrid

LitGrid is a virtualized DataGrid for Web Components, React, Angular, and Vue. It provides
client-side sorting, filtering, pagination, selection, keyboard navigation,
column sizing, ordering, visibility, and state persistence for production web
applications.

## Getting Started

### Prerequisites

- A modern browser with Web Component support.
- Node.js and pnpm when installing LitGrid from npm.

### Install

Install the package for the integration you use:

For npm, Yarn, local-workspace instructions, and integration requirements, see
the [Installation guide](docs/installation.md).

```bash
pnpm add @tipolox/litgrid-web
```

```bash
pnpm add @tipolox/litgrid-react
```

```bash
pnpm add @tipolox/litgrid-angular
```

```bash
pnpm add @tipolox/litgrid-vue
```

The React package includes the Web Component dependency. Install only
`@tipolox/litgrid-react` for a React application.

The Angular and Vue wrappers include the Web Component dependency. Install
only the wrapper package for those applications.

### Use the Web Component

Import the package once to register the `yc-grid` custom element, then assign
data and column definitions through its public properties. Give the grid a
viewport height so it can virtualize its rows.

```ts
import '@tipolox/litgrid-web'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'

const grid = document.querySelector('yc-grid') as DataGridElement

const columns: GridColumn[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 180 }
]

grid.data = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' }
]
grid.columns = columns
grid.config = {
  selection: { mode: 'row' }
}
grid.viewportHeight = 400
```

```html
<yc-grid></yc-grid>
```

### Use React

Render the `DataGrid` component and provide the same data, columns, and grid
configuration as props. `height` maps to the Web Component viewport height.

```tsx
import { DataGrid } from '@tipolox/litgrid-react'

const data = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' }
]

export function UsersGrid() {
  return (
    <DataGrid
      data={data}
      columns={[
        { key: 'id', header: 'ID', width: 80 },
        { key: 'name', header: 'Name', width: 180 }
      ]}
      config={{ selection: { mode: 'row' } }}
      height={400}
    />
  )
}
```

### Next Steps

This guide covers the first working grid. Continue with the dedicated
[React Guide](docs/react-guide.md), [React Performance Guide](docs/react-performance-guide.md),
[Angular Guide](docs/angular-guide.md), [Angular Examples](docs/angular-examples.md),
[Vue Guide](docs/vue-guide.md), [Vue Examples](docs/vue-examples.md),
[Web Component Guide](docs/vanilla-js-guide.md),
[Web Component Examples](docs/web-component-examples.md), the copyable
[Examples guide](docs/examples.md), the [Performance Benchmarks guide](docs/performance-benchmarks.md),
or the complete [API Reference](docs/api-reference.md).

## Web Component

```ts
import '@tipolox/litgrid-web'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'

const grid = document.querySelector('yc-grid') as DataGridElement

grid.data = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' }
]

grid.columns = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 180 }
]
grid.config = {
  selection: { mode: 'multi-row' },
  rowHeader: { enabled: true, width: 56 }
}
grid.viewportHeight = 400
```

`yc-grid` supports these properties:

| Property | Type | Default |
| --- | --- | --- |
| `data` | `unknown[]` | `[]` |
| `columns` | `GridColumn[]` | inferred from the first object row |
| `config` | `GridConfig` | selection disabled, row header disabled |
| `viewportHeight` | `number` | `320` |
| `virtualRowHeight` | `number` | `36` |
| `overscanCount` | `number` | `4` |
| `columnOverscanCount` | `number` | `2` |
| `bestFitSampleSize` | `number` | `10` |

The typed imperative API is:

```ts
grid.getColumnWidth(column)
grid.setColumnWidth(columnKey, width)
grid.resetColumnWidth(columnKey)
grid.resetAllColumnWidths()

grid.getRowHeight(rowIndex)
grid.setRowHeight(rowIndex, height)
grid.resetRowHeight(rowIndex)
grid.resetAllRowHeights()

grid.bestFitColumn(columnKey)
grid.bestFitAllColumns()
```

Column widths are normalized to at least `64px`; row heights are normalized to at least `28px`.

## React

```tsx
import { DataGrid } from '@tipolox/litgrid-react'

export function UsersGrid() {
  return (
    <DataGrid
      data={[{ id: 1, name: 'Ada' }]}
      columns={[
        { key: 'id', header: 'ID', width: 80 },
        { key: 'name', header: 'Name' }
      ]}
      config={{ selection: { mode: 'row' } }}
      height={400}
      rowHeight={36}
      overscan={4}
      columnOverscan={2}
      bestFitSampleSize={10}
    />
  )
}
```

`DataGrid` accepts `data`, `columns`, `config`, `height`, `rowHeight`, `overscan`, `columnOverscan`, and `bestFitSampleSize`. It does not currently expose an imperative React ref API.

## Custom Cell Renderers

`GridColumn.render` receives `(value, row, rowIndex)` and can return a string, number, or Lit `TemplateResult`.

```ts
import { html } from 'lit'
import type { GridColumn } from '@tipolox/litgrid-web'

const columns: GridColumn[] = [
  {
    key: 'amount',
    header: 'Amount',
    render: (value) => `$${Number(value).toLocaleString()}`
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => html`<strong>${String(value)}</strong>`
  }
]
```

Best-fit sizing measures string and number renderers with canvas text metrics. For Lit templates it renders into a hidden measurement container and reads the rendered width. Computed widths are cached per column and sample size, then invalidated when data, columns, or `bestFitSampleSize` change.
