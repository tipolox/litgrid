# @tipolox/litgrid-vue

Vue integration for LitGrid's `yc-grid` Web Component. The `DataGrid` component provides declarative props, typed emits, and a component ref API. The Web Component dependency is included.

## Install

```bash
npm install @tipolox/litgrid-vue
```

Requires Vue matching the package's peer dependency range: `^3.5.0`. Use a modern browser with native Web Component support and a bundler that supports ECMAScript modules.

## Quick start

Use this Vue single-file component in your application:

```vue
<script setup lang="ts">
import { DataGrid } from '@tipolox/litgrid-vue'
import type { GridColumn } from '@tipolox/litgrid-vue'

const data = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' }
]
const columns: GridColumn[] = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 180 }
]
</script>

<template>
  <DataGrid :data="data" :columns="columns" :height="400" />
</template>
```

`height` defines the viewport used for row virtualization. Replace data and column arrays when updating their contents.

## Resources

- [Live demo](https://tipolox.com/litgrid/demo)
- [Repository](https://github.com/tipolox/litgrid)
- [Vue guide](https://github.com/tipolox/litgrid/blob/main/docs/vue-guide.md)
- [API reference](https://github.com/tipolox/litgrid/blob/main/docs/api-reference.md)

Licensed under the [MIT License](https://github.com/tipolox/litgrid/blob/main/LICENSE).
