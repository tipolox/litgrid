# API Reference

This reference describes LitGrid's current public packages and APIs. For installation and task-oriented setup, see the [Installation guide](installation.md), [Web Component guide](vanilla-js-guide.md), [React guide](react-guide.md), [Angular guide](angular-guide.md), and [Vue guide](vue-guide.md).

## Packages

| Package | Public entry point | Use it when |
| --- | --- | --- |
| `@tipolox/litgrid-web` | Registers `<yc-grid>` and exports Web Component types. | Building with Web Components or plain JavaScript. |
| `@tipolox/litgrid-react` | Exports the React `DataGrid` component. | Building with React. |
| `@tipolox/litgrid-angular` | Exports the standalone Angular `DataGridComponent`. | Building with Angular 17 or later. |
| `@tipolox/litgrid-vue` | Exports the Vue 3 `DataGrid` component. | Building with Vue 3.5 or later. |
| `Tipolox.LitGrid.Blazor` (NuGet) | Exports the Razor `DataGrid<TItem>` component. | Building with Blazor (.NET 8+). |
| `@tipolox/litgrid-core` | Exports the framework-agnostic grid engine and its types. | Integrating the data engine outside the supplied UI layers. |
| `@tipolox/litgrid-renderer` | Exports pure row/column virtualization and scroll-mapping helpers. | Building a custom renderer. |

Most applications should use the Web Component or a framework wrapper. Core does not access the DOM, and renderer utilities do not own grid business state.

## Shared configuration and types

`DataGridElement` keeps `inferColumns` and `updateColumnSchema` optional so
v1.0.3 structural implementations and mocks remain assignable. The concrete
production `DataGrid` class implements both with required types. Code using an
abstract `DataGridElement` must check these capabilities before requesting
declarative schema behavior; the Blazor adapter checks them at runtime.

### `GridColumn`

```ts
type GridColumn = {
  key: string
  header?: string
  width?: number | string
  hidden?: boolean
  sortable?: boolean
  filterable?: boolean
  accessor?: (row: unknown, rowIndex: number) => unknown
  render?: (value: unknown, row: unknown, rowIndex: number) => unknown
}
```

`key` identifies a column for state, filtering, selection, and ordering. `accessor` derives the underlying value; without one, object-row values are read using `key`. `render` controls visual output but does not change filtering or clipboard values. It may return a string, number, or Lit `TemplateResult`. React JSX is not a supported renderer result because rendering occurs in the Web Component.

`width` accepts a number of pixels or a CSS width string. Explicit numeric widths set through the sizing API are normalized to at least `64px`.

`sortable` and `filterable` default to enabled (`true` or omitted). Explicit `false` removes the corresponding local header-menu controls, including Clear Sort or Clear Filter. Other actions (Columns, Best Fit, quick-search toggle), keyboard activation and Escape focus restoration remain available. These are UI capabilities, not query authorization or engine policies: `setFilter`/`clearFilter`, core `sortBy`/`clearSort`, and quick search keep their existing behavior. Quick search is text matching across supplied data, not an exact monetary numeric comparison.

Changing either flag through `columns` (including reassignment of a mutated array) or `updateColumnSchema` retains active sort/filter state, row order and active indicators. An open menu closes and restores focus when its capabilities change or its column is removed, renamed or hidden. If its trigger disappears, focus moves to an existing column action button or the Columns button. **Clear existing queries before disabling monetary controls**: use Clear Sort before changing `sortable`, and `clearFilter(key)` before changing `filterable`. The core engine can also clear sorting directly. Re-enabling restores controls and their current filter values. Persisted column state contains only order, width and visibility; it never overrides these schema flags.

For monetary decimal strings, configure both flags before interaction. Source strings, display renderers, clipboard precision and engine comparison behavior are unchanged. Generic string ordering is lexical (`"10.00"` precedes `"2.00"`); disabling controls supplies no decimal comparator, rounding, arithmetic or server query delegation. Use authoritative server queries for money; external/manual querying and server pagination are tracked in [#35](https://github.com/tipolox/litgrid/issues/35).

```ts
// Billing: preserve exact amount strings and suppress both local controls.
const billingColumns: GridColumn[] = [
  { key: 'description' },
  { key: 'amount', sortable: false, filterable: false }
]
// Server-ordered report: keep text filtering, suppress local ordering.
const reportColumns: GridColumn[] = [{ key: 'reference', sortable: false }]
// Ordinary text: keep sorting, suppress the column filter UI.
const nameColumns: GridColumn[] = [{ key: 'name', filterable: false }]
```

React, Vue and Angular accept these same `GridColumn` objects without wrapper-specific options. Blazor object columns expose nullable `Sortable`/`Filterable`; declarative columns accept `Sortable="false" Filterable="false"` on `LitGridColumn<TItem>`. Null/omitted values preserve existing defaults. These flags require no locale or value validation: only explicit `false` opts out, and neither flag changes invariant values or locale display.

### `GridConfig`

```ts
type SelectionMode = 'none' | 'row' | 'multi-row' | 'cell' | 'multi-cell'

type GridConfig = {
  selection?: { mode?: SelectionMode; checkboxes?: boolean; rowKey?: string; scopeKey?: string | number }
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

### Keyboard interaction in custom cells

Arrow keys and Tab navigate grid cells. Enter and Space keep their selection
behavior, including in cells containing custom controls. Press F2 on a cell to
focus its first usable link, button, input, or other focusable descendant.
Native control keys then apply. Press Escape to return to the owning cell.
Tab moves through controls within that cell, then resumes forward cell navigation;
Shift+Tab from the first control returns to the cell. Controls that consume a key
with `preventDefault()` retain that key. This does not add page-level tab stops.
Custom widgets with shadow DOM should expose a focusable host and manage their
internal focus and Tab order.

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
| `selection-change` | Frozen `SelectionChangeDetail`: mode/scope, displayed indexes, cells, and selected row/key mappings. See [selection coordination](selection-coordination.md) for transition and no-op rules. |
| `column-reorder` | `{ columnKey, previousIndex, currentIndex, columnOrder }` |
| `column-visibility-change` | `{ columnKey, visible, visibleColumnKeys }` |
| `column-state-change` | `{ reason, state }`, where `reason` is `resize`, `reorder`, `visibility`, `restore`, `reset`, or `set`. |

## React: `DataGrid`

Selection coordination is available through `onSelectionChange(detail)`, `getSelectionSnapshot()`, and `selectRowByKey(key, intent?)`. See [selection coordination](selection-coordination.md) for stable keys, scope resets, and other framework equivalents.

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

## Blazor: `DataGrid<TItem>`

```razor
@using Tipolox.LitGrid.Blazor

<DataGrid TItem="User" Data="@users" Columns="@columns" Height="400" />
```

`DataGrid<TItem>` is a strongly-typed Blazor wrapper component. It is distributed via the NuGet package `Tipolox.LitGrid.Blazor` and embeds static assets requiring no Node.js setup on the client.

**Migration warning for the planned coordinated v1.1.0 release:** the new `Automatic` data
default is a breaking Blazor behavior change accepted by the product owner as
a deliberate semantic-versioning exception. Existing mutation-on-parent-update
apps can select `DataSyncMode.Legacy`; see the [migration contract](blazor-data-synchronization.md).
The version strategy is approved; public publication is not authorized.

### Parameters

| Parameter | Type | Default | Corresponding Web Component property |
| --- | --- | --- | --- |
| `Data` | `IEnumerable<TItem>` | `[]` | `data` |
| `DataRevision` | `long?` | `null` | Optional additive data change signal; not forwarded to JavaScript. |
| `DataSyncMode` | `DataSyncMode` | `Automatic` | Replacements/notifications/revisions/refresh; `Legacy` retains v1.0.3 parent-update semantics. |
| `Columns` | `IReadOnlyList<GridColumn>` | `[]` | `columns` |
| `ChildContent` | `RenderFragment?` | `null` | Declarative columns; exclusive with nonempty `Columns`. |
| `Config` | `GridConfig` | `new()` | `config` |
| `Theme` | `GridTheme` | `GridTheme.Light` | `theme` |
| `AriaLabel` | `string` | `"Data grid"` | `ariaLabel` |
| `AriaDescription` | `string` | `""` | `ariaDescription` |
| `ScreenReaderAnnouncements` | `bool` | `true` | `screenReaderAnnouncements` |
| `Height` | `double` | `320` | `viewportHeight` |
| `RowHeight` | `double` | `36` | `virtualRowHeight` |
| `Overscan` | `int` | `4` | `overscanCount` |
| `ColumnOverscan` | `int` | `2` | `columnOverscanCount` |
| `BestFitSampleSize` | `int` | `10` | `bestFitSampleSize` |
| `QuickSearchDebounceThreshold` | `int` | `10000` | `quickSearchDebounceThreshold` |
| `QuickSearchDebounceMs` | `int` | `150` | `quickSearchDebounceMs` |
| `ColumnStateStorageKey` | `string?` | `null` | `columnStateStorageKey` |

### Declarative `LitGridColumn<TItem>`

`DataGrid` cascades `TItem` to metadata-only child columns. The parameters are
`Field` (`Expression<Func<TItem, object?>>?`), `Key` (`string?`), `Title`
(`string?`), `Width` (`object?`), `Hidden` (`bool?`), and `Order` (`int?`).
`Field` resolves camelCase or `JsonPropertyName` serialized keys. Both `Field`
and `Key`, when supplied, must agree. Empty declarative schemas disable inference.
Unchanged declarations preserve user state; explicit changes reconcile only
the affected defaults. See [Declarative Blazor columns](blazor-declarative-columns.md)
for validation, dynamic ordering, precedence, and unsupported mappings.

### Callbacks & Events

- `OnColumnStateChange`: `EventCallback<ColumnStateChangeDetail>` (`Reason`, `State`)
- `OnColumnReorder`: `EventCallback<ColumnReorderDetail>` (`ColumnKey`, `PreviousIndex`, `CurrentIndex`, `ColumnOrder`)
- `OnColumnVisibilityChange`: `EventCallback<ColumnVisibilityChangeDetail>` (`ColumnKey`, `Visible`, `VisibleColumnKeys`)

### Imperative API

Capture `@ref="gridRef"` on `DataGrid<TItem>` to invoke asynchronous methods (`ValueTask` / `Task`):

- **Data**: `RefreshDataAsync()` (`ValueTask`), forces synchronization through the lifecycle gate. See [revision/default behavior](blazor-data-synchronization.md).
- **Sizing**: `GetRowHeightAsync`, `SetRowHeightAsync`, `ResetRowHeightAsync`, `ResetAllRowHeightsAsync`, `GetColumnWidthAsync`, `SetColumnWidthAsync`, `ResetColumnWidthAsync`, `ResetAllColumnWidthsAsync`
- **Auto-sizing**: `BestFitColumnAsync`, `BestFitAllColumnsAsync`
- **Column Order & Visibility**: `MoveColumnAsync`, `GetColumnOrderAsync`, `SetColumnOrderAsync`, `ResetColumnOrderAsync`, `SetColumnVisibleAsync`, `IsColumnVisibleAsync`, `GetVisibleColumnKeysAsync`, `ResetColumnVisibilityAsync`
- **Column State**: `GetColumnStateAsync`, `SetColumnStateAsync`, `ResetColumnStateAsync`
- **Search & Filters**: `SetQuickSearchAsync`, `ClearQuickSearchAsync`, `GetQuickSearchAsync`, `SetFilterAsync`, `ClearFilterAsync`, `GetFiltersAsync`
- **Pagination**: `SetPageAsync`, `SetPageSizeAsync`, `GetPaginationAsync`, `GetTotalRowCountAsync`
- **Selection**: `SelectRowAsync`, `SelectAllRowsAsync`, `ClearSelectionAsync`, `GetSelectionAsync`, `IsRowSelectedAsync`, `IsCellSelectedAsync`
- **Clipboard**: `CopySelectedCellsAsync`, `CopySelectedRowsAsync`

Calls before initial render throw an `InvalidOperationException`. See [Blazor Guide](blazor-guide.md) and [Blazor Examples](blazor-examples.md) for patterns.

## Core engine

`@tipolox/litgrid-core` exports `createGridEngine()` and the `GridEngine` contract. The engine owns data transforms and selection without browser or UI dependencies.

Its methods cover `setConfig`/`getConfig`, `setData`/`getRows`, quick search, filters, pagination, `sortBy`/`clearSort`/`getSort`, row access, and row/cell selection. It returns transformed rows through `getRows()` and visible slices through `getVisibleRows(startIndex, endIndex)`.

## Renderer utilities

`@tipolox/litgrid-renderer` exports:

- `createVirtualizer(options)` for fixed-height rows.
- `createVariableVirtualizer(options)` for variable-size rows or columns.
- `mapDisplayScrollOffset(options)` and `calculateDisplayLayout(options)` for capped-spacer display-to-virtual scroll mapping.

Both virtualizer types expose `setOptions`, `setScrollOffset` (fixed virtualizers also provide `setScrollTop`), and `getState`. Their range results provide start/end indexes, offsets/padding, total size, and visible size; variable ranges additionally include left and right padding.
