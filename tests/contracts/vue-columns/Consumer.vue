<script setup lang="ts">
import { ref } from 'vue'
import { DataGrid, LitGridColumn, type GridColumn, type DataGridInstance } from '@tipolox/litgrid-vue'
interface Person { id: number; name: string }
const grid = ref<DataGridInstance | null>(null)
const users: Person[] = [{ id: 1, name: 'Ada' }]
const fields = ref(['id'])
const show = ref(true)
const computed = {
  key: 'label', accessor: (row, index) => `${index}: ${row.name}`,
  render: (_value, row) => row.name
} satisfies GridColumn<Person>
const columns = [{ key: 'name' }] satisfies GridColumn<Person>[]
</script>

<template>
  <DataGrid ref="grid" :data="users" :height="400">
    <LitGridColumn field="id" align="right" header="ID" :width="80" />
    <LitGridColumn v-if="show" field="name" header="Name" :width="220" :sortable="false" hidden />
    <LitGridColumn :column="computed" />
  </DataGrid>
  <DataGrid :data="users">
    <LitGridColumn v-for="field in fields" :key="field" :field="field" :filterable="false" />
  </DataGrid>
  <DataGrid :data="users" :columns="columns" />
  <DataGrid :data="users" :columns="[]" />
</template>
