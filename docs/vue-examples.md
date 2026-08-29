# Vue Examples

These examples use only the public `@tipolox/litgrid-vue` API with Vue 3
single-file components. For setup and the complete integration surface, see
the [Vue Guide](vue-guide.md) and [API Reference](api-reference.md).

## Production order grid

Use a row-selection grid for operational data. Users can sort and filter from
column header menus and enable Quick Search from those menus.

```vue
<script setup lang="ts">
import { DataGrid } from '@tipolox/litgrid-vue'
import type { GridColumn } from '@tipolox/litgrid-vue'

const orders = [
  { id: 'SO-1042', customer: 'Northwind', status: 'Processing', total: 1280 },
  { id: 'SO-1043', customer: 'Contoso', status: 'Shipped', total: 740 }
]

const columns: GridColumn[] = [
  { key: 'id', header: 'Order', width: 96 },
  { key: 'customer', header: 'Customer', width: 220 },
  { key: 'status', header: 'Status', width: 150 },
  { key: 'total', header: 'Total', width: 130, render: (value) => `$${Number(value).toLocaleString()}` }
]

const gridConfig = {
  selection: { mode: 'row' as const },
  rowHeader: { enabled: true, width: 56 }
}
</script>

<template>
  <DataGrid :data="orders" :columns="columns" :config="gridConfig" :height="440" aria-label="Orders" />
</template>
```

## Persisted column preferences

Set a stable key to preserve user-controlled widths, visibility, and ordering.
The event detail is typed and can update application state.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DataGrid } from '@tipolox/litgrid-vue'
import type { ColumnStateChangeDetail, GridColumn } from '@tipolox/litgrid-vue'

const message = ref('No preference changes yet.')
const users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }]
const columns: GridColumn[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 220 }
]

function onColumnStateChange(detail: ColumnStateChangeDetail) {
  message.value = `Saved ${detail.state.columns.length} column preferences.`
}
</script>

<template>
  <p role="status">{{ message }}</p>
  <DataGrid
    :data="users"
    :columns="columns"
    column-state-storage-key="account-users-grid"
    :height="480"
    @column-state-change="onColumnStateChange"
  />
</template>
```

Keep column definitions in application code. LitGrid persists compatible column
state only, ignoring removed keys while retaining defaults for new columns.

## Paginated checkbox selection

The header checkbox affects the current displayed page after filtering,
sorting, and Quick Search.

```vue
<script setup lang="ts">
import { DataGrid } from '@tipolox/litgrid-vue'

const tasks = [
  { id: 1, task: 'Review invoice', owner: 'Ada' },
  { id: 2, task: 'Confirm shipment', owner: 'Grace' }
]
const columns = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'task', header: 'Task', width: 240 },
  { key: 'owner', header: 'Owner', width: 160 }
]
const gridConfig = {
  selection: { mode: 'multi-row' as const, checkboxes: true },
  pagination: { enabled: true, pageSize: 25 }
}
</script>

<template>
  <DataGrid :data="tasks" :columns="columns" :config="gridConfig" :height="440" aria-label="Review tasks" />
</template>
```

## Custom cell renderers

Renderers run inside LitGrid's Lit Web Component. Return strings, numbers, or
Lit templates—not Vue templates, VNodes, or Vue components.

```vue
<script setup lang="ts">
import { html } from 'lit'
import { DataGrid } from '@tipolox/litgrid-vue'
import type { GridColumn } from '@tipolox/litgrid-vue'

const projects = [
  { name: 'Atlas', status: 'Active', progress: 72 },
  { name: 'Beacon', status: 'At risk', progress: 38 }
]
const columns: GridColumn[] = [
  { key: 'name', header: 'Project', width: 220 },
  {
    key: 'status',
    header: 'Status',
    width: 150,
    render: (value) => html`<strong class="status-${String(value).toLowerCase()}">${String(value)}</strong>`
  },
  { key: 'progress', header: 'Progress', width: 130, render: (value) => `${Number(value)}%` }
]
</script>

<template>
  <DataGrid :data="projects" :columns="columns" :height="400" />
</template>
```

Renderers change presentation only. Transform and clipboard behavior use the
underlying accessor or key value.

## Imperative grid actions

Use a typed template ref for filters, best fit, clipboard, selection, and
other imperative grid APIs after the component mounts.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DataGrid } from '@tipolox/litgrid-vue'
import type { DataGridInstance } from '@tipolox/litgrid-vue'

const grid = ref<DataGridInstance | null>(null)
const users = [
  { id: 1, name: 'Ada', status: 'Active' },
  { id: 2, name: 'Grace', status: 'Inactive' }
]
const columns = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' }
]

onMounted(() => grid.value?.bestFitAllColumns())

function showActiveUsers() {
  grid.value?.setFilter({ columnKey: 'status', operator: 'equals', value: 'Active' })
}

async function copyRows() {
  const copied = await grid.value?.copySelectedRows()
  if (!copied) console.warn('No selected rows were copied.')
}
</script>

<template>
  <button type="button" @click="showActiveUsers">Active users</button>
  <button type="button" @click="copyRows">Copy selected rows</button>
  <DataGrid ref="grid" :data="users" :columns="columns" :height="400" />
</template>
```

Indexes supplied to sizing, selection, pagination, and clipboard calls refer
to the current displayed client-side rows after transforms and pagination.
