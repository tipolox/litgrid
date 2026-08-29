# API Reference

This reference describes LitGrid's current public packages and APIs. For installation and task-oriented setup, see the [Installation guide](installation.md), [Web Component guide](vanilla-js-guide.md), [React guide](react-guide.md), [Angular guide](angular-guide.md), and [Vue guide](vue-guide.md).

## Packages

| Package | Public entry point | Use it when |
| --- | --- | --- |
| `@tipolox/litgrid-web` | Registers `<yc-grid>` and exports Web Component types. | Building with Web Components or plain JavaScript. |
| `@tipolox/litgrid-react` | Exports the React `DataGrid` component. | Building with React. |
| `@tipolox/litgrid-angular` | Exports the standalone Angular `DataGridComponent`. | Building with Angular 17 or later. |
| `@tipolox/litgrid-vue` | Exports the Vue 3 `DataGrid` component. | Building with Vue 3.5 or later. |
| `@tipolox/litgrid-core` | Exports the framework-agnostic grid engine and its types. | Integrating the data engine outside the supplied UI layers. |
| `@tipolox/litgrid-renderer` | Exports pure row/column virtualization and scroll-mapping helpers. | Building a custom renderer. |

Most applications should use the Web Component or a framework wrapper. Core does not access the DOM, and renderer utilities do not own grid business state.

## Shared configuration and types

### `GridColumn`

```ts
type GridColumn = {
  key: string
  header?: string
  width?: number | string
  hidden?: boolean
  accessor?: (row: unknown, rowIndex: number) => unknown
  render?: (value: unknown, row: unknown, rowIndex: number) => unknown
}
```

`key` identifies a column for state, filtering, selection, and ordering. `accessor` derives the underlying value; without one, object-row values are read using `key`. `render` controls visual output but does not change filtering or clipboard values. It may return a string, number, or Lit `TemplateResult`. React JSX is not a supported renderer result because rendering occurs in the Web Component.

`width` accepts a number of pixels or a CSS width string. Explicit numeric widths set through the sizing API are normalized to at least `64px`.

### `GridConfig`

```ts
type SelectionMode = 'none' | 'row' | 'multi-row' | 'cell' | 'multi-cell'

type GridConfig = {
  selection?: { mode?: SelectionMode; checkboxes?: boolean }
  rowHeader?: { enabled?: boolean; width?: number }
  pagination?: { enabled?: boolean; pageSize?: number; pageIndex?: number }
}
```

Defaults are selection disabled, row header disabled, and pagination disabled. When pagination is enabled, the default page size is `50` and the default page index is `0`. `checkboxes` displays row-header selection checkboxes when used with `multi-row` selection.

### Filters, selection, and pagination

```ts
type FilterOperator =
  | 'contains' | 'equals' | 'startsWith' | 'endsWith'
  | 'isEmpty' | 'isNotEmpty'
  | 'greaterThan' | 'greaterThanOrEqual'
  | 'lessThan' | 'lessThanOrEqual'

type GridFilter = { columnKey: string; operator: FilterOperator; value?: unknown }
type SelectionIntent = 'replace' | 'toggle' | 'range'
type GridTheme = 'light' | 'dark'

type GridPaginationState = {
  enabled: boolean
  pageIndex: number
  pageSize: number
  totalRows: number
  pageCount: number
}
```

Filters combine with AND semantics. Empty-value operators do not require a `value`. Quick search runs before column filters, sorting, and pagination.

### Column state

```ts
type GridColumnState = {
  version: 1
  columns: Array<{ key: string; width?: number; visible: boolean }>
}
```

Column state contains display order, explicit width overrides, and visibility. Applying saved state ignores removed keys, retains new declared columns, and ignores invalid widths.

## Web Component: `<yc-grid>`

Import the package once to register the element.

```ts
import '@tipolox/litgrid-web'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'

const grid = document.querySelector('yc-grid') as DataGridElement
```

Assign arrays and configuration as JavaScript properties rather than HTML attributes.

### Properties

| Property | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `unknown[]` | `[]` | Rows to display. |
| `columns` | `GridColumn[]` | inferred | Inferred from the first object row when omitted. |
| `config` | `GridConfig` | `{}` | Selection, row header, and pagination behavior. |
| `theme` | `GridTheme` | `'light'` | Reflected as `theme`. |
| `ariaLabel` | `string` | `'Data grid'` | Reflected as `aria-label`. |
| `ariaDescription` | `string` | `''` | Reflected as `aria-description`; replaces default keyboard instructions. |
| `screenReaderAnnouncements` | `boolean` | `true` | Reflected as `screen-reader-announcements`. |
| `viewportHeight` | `number` | `320` | Virtual viewport height in pixels. |
| `virtualRowHeight` | `number` | `36` | Default row height in pixels. |
| `overscanCount` | `number` | `4` | Extra rows rendered outside the viewport. |
| `columnOverscanCount` | `number` | `2` | Extra columns rendered outside the viewport. |
| `bestFitSampleSize` | `number` | `10` | Values sampled by best-fit sizing. |
| `quickSearchDebounceThreshold` | `number` | `10000` | Row-count threshold for input debouncing. |
| `quickSearchDebounceMs` | `number` | `150` | Debounce delay for quick search at or above the threshold. |
| `columnStateStorageKey` | `string \| null` | `null` | `localStorage` key for column state. |

### Imperative methods

| Area | Methods | Result |
| --- | --- | --- |
| Column sizing | `getColumnWidth(column)`, `setColumnWidth(key, width)`, `resetColumnWidth(key)`, `resetAllColumnWidths()` | Read or update width overrides. |
| Row sizing | `getRowHeight(rowIndex)`, `setRowHeight(rowIndex, height)`, `resetRowHeight(rowIndex)`, `resetAllRowHeights()` | Read or update per-row height overrides. |
| Best fit | `bestFitColumn(key)`, `bestFitAllColumns()` | Returns a width or per-column `{ key, width }` results. |
| Column order | `moveColumn(key, targetIndex)`, `getColumnOrder()`, `setColumnOrder(keys)`, `resetColumnOrder()` | Manage data-column display order. |
| Visibility | `setColumnVisible(key, visible)`, `isColumnVisible(key)`, `getVisibleColumnKeys()`, `resetColumnVisibility()` | Manage visible data columns. |
| Column state | `getColumnState()`, `setColumnState(state)`, `resetColumnState()` | Manage versioned column state. |
| Search and filters | `setQuickSearch(query)`, `clearQuickSearch()`, `getQuickSearch()`, `setFilter(filter)`, `clearFilter(columnKey?)`, `getFilters()` | Query displayed client-side rows. |
| Pagination | `setPage(pageIndex)`, `setPageSize(pageSize)`, `getPagination()`, `getTotalRowCount()` | Manage and inspect client-side pages. |
| Selection | `selectRow(rowIndex, intent?)`, `selectAllRows()`, `clearSelection()`, `getSelection()`, `isRowSelected(rowIndex)`, `isCellSelected(rowIndex, columnKey)` | Manage displayed-row/cell selection. |
| Clipboard | `copySelectedCells()`, `copySelectedRows()` | Returns `Promise<boolean>` indicating whether writing TSV to the browser clipboard succeeded. |

Rows and indexes supplied to selection, sizing, pagination, and clipboard APIs refer to the current displayed client-side data: after quick search, filtering, sorting, and pagination.

### Events

These custom events bubble and are composed, so listeners may be placed on the element or an ancestor.

| Event | `detail` |
| --- | --- |
| `column-reorder` | `{ columnKey, previousIndex, currentIndex, columnOrder }` |
| `column-visibility-change` | `{ columnKey, visible, visibleColumnKeys }` |
| `column-state-change` | `{ reason, state }`, where `reason` is `resize`, `reorder`, `visibility`, `restore`, `reset`, or `set`. |

## React: `DataGrid`

```tsx
import { DataGrid } from '@tipolox/litgrid-react'
```

`DataGrid` is a declarative wrapper around `<yc-grid>`. It accepts the same data, columns, `config`, theme, accessibility, sizing, quick-search, and column-state values under React-friendly prop names.

| Prop | Default | Corresponding Web Component property |
| --- | --- | --- |
| `data` | required | `data` |
| `columns` | `[]` | `columns` |
| `config` | `{}` | `config` |
| `theme` | `'light'` | `theme` |
| `ariaLabel` | `'Data grid'` | `ariaLabel` |
| `ariaDescription` | omitted | `ariaDescription` |
| `screenReaderAnnouncements` | `true` | `screenReaderAnnouncements` |
| `height` | `320` | `viewportHeight` |
| `rowHeight` | `36` | `virtualRowHeight` |
| `overscan` | `4` | `overscanCount` |
| `columnOverscan` | `2` | `columnOverscanCount` |
| `bestFitSampleSize` | `10` | `bestFitSampleSize` |
| `quickSearchDebounceThreshold` | `10000` | `quickSearchDebounceThreshold` |
| `quickSearchDebounceMs` | `150` | `quickSearchDebounceMs` |
| `columnStateStorageKey` | omitted | `columnStateStorageKey` |

React callbacks receive the same event detail described above: `onColumnReorder`, `onColumnVisibilityChange`, and `onColumnStateChange`.

Attach a React `ref` with `useRef<DataGridRef>` for the imperative API. It delegates all Web Component methods: sizing, best fit, column order/visibility/state, search and filters, pagination, selection, and clipboard copying. Calls before the component is mounted throw an error. See the [React Guide](react-guide.md) and [React Examples](examples.md) for setup and usage examples.

## Angular: `DataGridComponent`

```ts
import { DataGridComponent } from '@tipolox/litgrid-angular'
```

`DataGridComponent` is a standalone component with selector
`litgrid-data-grid`. Import it into a standalone Angular component and bind its
inputs in the template. It accepts the same input names and defaults as the
React wrapper: `data`, `columns`, `config`, `theme`, `ariaLabel`,
`ariaDescription`, `screenReaderAnnouncements`, `height`, `rowHeight`,
`overscan`, `columnOverscan`, `bestFitSampleSize`,
`quickSearchDebounceThreshold`, `quickSearchDebounceMs`, and
`columnStateStorageKey`.

It exposes typed Angular outputs with the same detail contracts as the Web
Component events:

| Output | Detail |
| --- | --- |
| `columnReorder` | `{ columnKey, previousIndex, currentIndex, columnOrder }` |
| `columnVisibilityChange` | `{ columnKey, visible, visibleColumnKeys }` |
| `columnStateChange` | `{ reason, state }` |

Access the component through `ViewChild` after view initialization for the
imperative API. It delegates all Web Component methods: sizing, best fit,
column order/visibility/state, search and filters, pagination, selection, and
clipboard copying. Calls before the Angular view initializes throw an error.
See the [Angular Guide](angular-guide.md) for setup and usage examples.

## Vue: `DataGrid`

```vue
<script setup lang="ts">
import { DataGrid } from '@tipolox/litgrid-vue'
</script>
```

`DataGrid` is a Vue 3 declarative wrapper around `<yc-grid>`. It accepts the
same values and defaults as the React wrapper: `data`, `columns`, `config`,
`theme`, `ariaLabel`, `ariaDescription`, `screenReaderAnnouncements`, `height`,
`rowHeight`, `overscan`, `columnOverscan`, `bestFitSampleSize`,
`quickSearchDebounceThreshold`, `quickSearchDebounceMs`, and
`columnStateStorageKey`. `height` maps to `viewportHeight`, `rowHeight` maps
to `virtualRowHeight`, and the remaining values map directly to their Web
Component properties.

The component emits the shared typed event details with Vue kebab-case event
names:

| Vue event | Detail |
| --- | --- |
| `@column-reorder` | `{ columnKey, previousIndex, currentIndex, columnOrder }` |
| `@column-visibility-change` | `{ columnKey, visible, visibleColumnKeys }` |
| `@column-state-change` | `{ reason, state }` |

Use a template ref after mount for the `DataGridInstance` imperative API. It
delegates all Web Component methods: sizing, best fit, column
order/visibility/state, search and filters, pagination, selection, and
clipboard copying. Calls before mount throw an error. The wrapper observes
data, columns, and configuration by reference; replace those values rather
than relying on deep mutation. See the [Vue Guide](vue-guide.md) and [Vue
Examples](vue-examples.md) for setup and copyable patterns.

## Core engine

`@tipolox/litgrid-core` exports `createGridEngine()` and the `GridEngine` contract. The engine owns data transforms and selection without browser or UI dependencies.

Its methods cover `setConfig`/`getConfig`, `setData`/`getRows`, quick search, filters, pagination, `sortBy`/`clearSort`/`getSort`, row access, and row/cell selection. It returns transformed rows through `getRows()` and visible slices through `getVisibleRows(startIndex, endIndex)`.

## Renderer utilities

`@tipolox/litgrid-renderer` exports:

- `createVirtualizer(options)` for fixed-height rows.
- `createVariableVirtualizer(options)` for variable-size rows or columns.
- `mapDisplayScrollOffset(options)` and `calculateDisplayLayout(options)` for capped-spacer display-to-virtual scroll mapping.

Both virtualizer types expose `setOptions`, `setScrollOffset` (fixed virtualizers also provide `setScrollTop`), and `getState`. Their range results provide start/end indexes, offsets/padding, total size, and visible size; variable ranges additionally include left and right padding.
