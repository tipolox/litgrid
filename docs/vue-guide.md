# Vue Guide

LitGrid's Vue integration is a thin Vue 3 wrapper around the `yc-grid` Web
Component. It provides declarative props, typed emits, and a typed component
ref while leaving grid state, interaction, and rendering in LitGrid.

For the complete public surface and exact event payloads, see the
[API Reference](api-reference.md).

## Install

LitGrid Vue requires Vue 3.5 or later. Install the wrapper; it includes the
Web Component dependency.

```bash
pnpm add @tipolox/litgrid-vue
```

```vue
<script setup lang="ts">
import { DataGrid } from '@tipolox/litgrid-vue'
</script>
```

## Create a grid

Give each grid a fixed `height`; it defines the viewport within which rows are
virtualized. Keep data, column definitions, and configuration as stable values
when they have not changed.

```vue
<script setup lang="ts">
import { DataGrid } from '@tipolox/litgrid-vue'
import type { GridColumn } from '@tipolox/litgrid-vue'

const data = [
  { id: 1, name: 'Ada Lovelace', status: 'Active' },
  { id: 2, name: 'Grace Hopper', status: 'Active' }
]

const columns: GridColumn[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 220 },
  { key: 'status', header: 'Status' }
]

const config = {
  selection: { mode: 'multi-row' as const, checkboxes: true },
  pagination: { enabled: true, pageSize: 25 }
}
</script>

<template>
  <DataGrid :data="data" :columns="columns" :config="config" :height="400" />
</template>
```

The wrapper observes data, columns, and configuration by reference. Replace an
array or object when changing it rather than relying on deep mutation. This
keeps updates predictable and avoids expensive deep watchers for large grids.

## Props

| Prop | Default | Purpose |
| --- | --- | --- |
| `data` | required | Rows to display. |
| `columns` | `[]` | Column definitions; omitted columns are inferred from the first object row. |
| `config` | `{}` | Selection, row-header, and pagination configuration. |
| `height` | `320` | Virtualized viewport height in pixels. |
| `rowHeight` | `36` | Default row height in pixels. |
| `overscan` | `4` | Extra rows rendered outside the viewport. |
| `columnOverscan` | `2` | Extra columns rendered outside the viewport. |
| `bestFitSampleSize` | `10` | Values sampled for best-fit sizing. |
| `quickSearchDebounceThreshold` | `10000` | Row-count threshold for Quick Search debouncing. |
| `quickSearchDebounceMs` | `150` | Debounce delay for large Quick Search result sets. |
| `theme` | `'light'` | Built-in theme: `'light'` or `'dark'`. |
| `ariaLabel` | `'Data grid'` | Accessible grid name. |
| `ariaDescription` | `''` | Optional replacement for default keyboard instructions. |
| `screenReaderAnnouncements` | `true` | Enables grid live-region updates. |
| `columnStateStorageKey` | none | Browser-local key for persisted column state. |

`config` supports selection, row headers, and client-side pagination. Selection
modes are `'none'`, `'row'`, `'multi-row'`, `'cell'`, and `'multi-cell'`.
Set `checkboxes: true` with `multi-row` selection to show row-header checkboxes.

## Column definitions and renderers

`GridColumn` is shared with the Web Component. An `accessor` derives the
underlying value; `render` controls presentation only.

```ts
import { html } from 'lit'
import type { GridColumn } from '@tipolox/litgrid-vue'

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

Renderers execute in the Lit Web Component, not Vue. They may return strings,
numbers, or Lit `TemplateResult` values; Vue templates, VNodes, and Vue
components are not supported renderer results. Sorting, filtering, and
clipboard output use the underlying value rather than rendered content.

## Column-state events

The wrapper forwards the Web Component's typed custom-event details as Vue
emits. Use a stable storage key for automatic browser-local persistence, or
handle events to synchronize application state.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DataGrid } from '@tipolox/litgrid-vue'
import type { ColumnStateChangeDetail } from '@tipolox/litgrid-vue'

const message = ref('No preference changes yet.')

function saveColumnState(detail: ColumnStateChangeDetail) {
  message.value = `Saved ${detail.state.columns.length} column preferences.`
}
</script>

<template>
  <p role="status">{{ message }}</p>
  <DataGrid
    :data="data"
    :columns="columns"
    column-state-storage-key="account-users-grid"
    :height="480"
    @column-state-change="saveColumnState"
    @column-reorder="(detail) => console.log(detail.columnOrder)"
    @column-visibility-change="(detail) => console.log(detail.visibleColumnKeys)"
  />
</template>
```

`column-reorder` provides `columnKey`, `previousIndex`, `currentIndex`, and
`columnOrder`. `column-visibility-change` provides `columnKey`, `visible`, and
`visibleColumnKeys`. `column-state-change` provides the versioned state and
its change source.

## Imperative API

Bind a Vue template ref when application controls need direct grid actions.
The ref is available after mount and exposes the typed `DataGridInstance` API.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DataGrid } from '@tipolox/litgrid-vue'
import type { DataGridInstance } from '@tipolox/litgrid-vue'

const grid = ref<DataGridInstance | null>(null)

onMounted(() => {
  grid.value?.bestFitAllColumns()
})

function showActiveUsers() {
  grid.value?.setFilter({
    columnKey: 'status',
    operator: 'equals',
    value: 'Active'
  })
}

async function copyRows() {
  const copied = await grid.value?.copySelectedRows()
  if (!copied) console.warn('No selected rows were copied.')
}
</script>

<template>
  <button type="button" @click="showActiveUsers">Active users</button>
  <button type="button" @click="copyRows">Copy selected rows</button>
  <DataGrid ref="grid" :data="data" :columns="columns" :height="400" />
</template>
```

The ref delegates sizing, best fit, column order/visibility/state, Quick
Search, filters, pagination, selection, and clipboard APIs to `yc-grid`.
Calls before mount throw an error. Indexes refer to current displayed
client-side data after searching, filtering, sorting, and pagination.

## Accessibility, theming, and performance

Give every grid an application-specific `aria-label` and keep screen-reader
announcements enabled unless the application provides an equivalent live
region. Use `theme="dark"` for the dark built-in theme. Override semantic
`--litgrid-*` custom properties from application CSS to brand either theme.

For large datasets, use a fixed realistic height, keep default overscan values
until profiling suggests otherwise, and keep `bestFitSampleSize` small. The
grid virtualizes rows and columns; the Vue wrapper adds no data transformation
or rendering layer.

## Wrapper boundary

`DataGrid` intentionally maps Vue props, emits, and refs to `yc-grid`. Grid
Core owns client-side data transforms and selection, and the Web Component owns
interaction and rendering. See the [Vue Examples](vue-examples.md), [Web
Component Guide](vanilla-js-guide.md), and [API Reference](api-reference.md)
for focused usage patterns and the complete shared API.
