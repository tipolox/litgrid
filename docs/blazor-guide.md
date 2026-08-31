# Blazor Guide

LitGrid's Blazor integration provides a strongly-typed, high-performance Razor component (`DataGrid<TItem>`) wrapping the LitGrid engine and Web Component. It delivers virtualization, sorting, filtering, selection, keyboard navigation, column sizing, ordering, and state persistence for .NET 8+ Blazor WebAssembly and Blazor Server applications.

For the full reference of public models and methods, see the [API Reference](api-reference.md#blazor-datagridtitem). For copyable code snippets, see [Blazor Examples](blazor-examples.md).

## Requirements

- **.NET 8.0 SDK** or later
- Blazor WebAssembly, Blazor Server, or Blazor United (Interactive Server / Interactive WebAssembly render modes)
- Modern browser with Web Component support

## Installation

Install the self-contained NuGet package:

```bash
dotnet add package Tipolox.LitGrid.Blazor
```

The package bundles all necessary client-side assets as Razor Class Library static web assets (`_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js`). You do **not** need Node.js, npm, or pnpm in your Blazor application.

Add the namespace to `_Imports.razor`:

```razor
@using Tipolox.LitGrid.Blazor
```

## Basic Component Usage

Define a model class, create column definitions, and pass your dataset to `DataGrid<TItem>`:

```razor
@page "/users"
@using Tipolox.LitGrid.Blazor

<DataGrid TItem="User"
          Data="@users"
          Columns="@columns"
          Config="@gridConfig"
          Height="400" />

@code {
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    private List<User> users = new()
    {
        new User { Id = 1, Name = "Ada Lovelace", Role = "Pioneer" },
        new User { Id = 2, Name = "Grace Hopper", Role = "Scientist" }
    };

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new GridColumn { Key = "Id", Header = "ID", Width = 80 },
        new GridColumn { Key = "Name", Header = "Full Name", Width = 220 },
        new GridColumn { Key = "Role", Header = "Role" }
    };

    private GridConfig gridConfig = new GridConfig
    {
        Selection = new GridSelectionConfig { Mode = SelectionMode.Row },
        Pagination = new GridPaginationConfig { Enabled = true, PageSize = 25 }
    };
}
```

A fixed `Height` (in pixels) is required in practice because row virtualization calculates visible rows based on the viewport container height.

## Parameters

| Parameter | Type | Default | Purpose |
| --- | --- | --- | --- |
| `Data` | `IEnumerable<TItem>` | `[]` | Collection of row data items. |
| `Columns` | `IReadOnlyList<GridColumn>` | `[]` | Column definitions. If empty, columns are inferred from the first item. |
| `Config` | `GridConfig` | `new()` | Selection, row-header, and pagination configuration. |
| `Theme` | `GridTheme` | `GridTheme.Light` | Built-in theme (`GridTheme.Light` or `GridTheme.Dark`). |
| `AriaLabel` | `string` | `"Data grid"` | Accessible label for screen readers. |
| `AriaDescription` | `string` | `""` | Accessible description replacing default keyboard instructions. |
| `ScreenReaderAnnouncements` | `bool` | `true` | Enables live-region announcements. |
| `Height` | `double` | `320` | Virtualized viewport height in pixels. |
| `RowHeight` | `double` | `36` | Default row height in pixels. |
| `Overscan` | `int` | `4` | Number of buffer rows rendered outside visible viewport. |
| `ColumnOverscan` | `int` | `2` | Number of buffer columns rendered outside visible viewport. |
| `BestFitSampleSize` | `int` | `10` | Number of values sampled for best-fit column calculations. |
| `QuickSearchDebounceThreshold` | `int` | `10000` | Dataset size threshold to enable debouncing for quick search. |
| `QuickSearchDebounceMs` | `int` | `150` | Debounce delay in milliseconds for quick search. |
| `ColumnStateStorageKey` | `string?` | `null` | Key for browser `localStorage` persistence of column order/widths/visibility. |

## Columns

Columns are defined using `GridColumn` instances:

```csharp
public class GridColumn
{
    public string Key { get; set; } = string.Empty;
    public string? Header { get; set; }
    public object? Width { get; set; }     // number (px) or CSS string (e.g. "120px")
    public bool? Hidden { get; set; }
}
```

Column widths are normalized to at least `64px`. Default row height is normalized to at least `28px`.

## Configuration: Selection, Pagination, Row Headers

`GridConfig` controls grid features:

```csharp
var config = new GridConfig
{
    Selection = new GridSelectionConfig
    {
        Mode = SelectionMode.MultiRow, // None, Row, MultiRow, Cell, MultiCell
        Checkboxes = true              // Show selection checkboxes in row header
    },
    RowHeader = new GridRowHeaderConfig
    {
        Enabled = true,
        Width = 56
    },
    Pagination = new GridPaginationConfig
    {
        Enabled = true,
        PageSize = 50,
        PageIndex = 0
    }
};
```

## Events & Callbacks

The component provides `EventCallback` parameters for column interactions:

- `OnColumnStateChange`: Fires on column resize, reorder, visibility toggle, restore, reset, or programmatic set. Payload: `ColumnStateChangeDetail` (`Reason`, `State`).
- `OnColumnReorder`: Fires when columns are moved. Payload: `ColumnReorderDetail` (`ColumnKey`, `PreviousIndex`, `CurrentIndex`, `ColumnOrder`).
- `OnColumnVisibilityChange`: Fires when column visibility toggles. Payload: `ColumnVisibilityChangeDetail` (`ColumnKey`, `Visible`, `VisibleColumnKeys`).

```razor
<DataGrid TItem="User"
          Data="@users"
          Columns="@columns"
          OnColumnStateChange="@HandleColumnStateChange"
          OnColumnReorder="@HandleColumnReorder"
          OnColumnVisibilityChange="@HandleColumnVisibilityChange" />

@code {
    private void HandleColumnStateChange(ColumnStateChangeDetail detail)
    {
        Console.WriteLine($"State changed ({detail.Reason}). Columns: {detail.State.Columns.Length}");
    }

    private void HandleColumnReorder(ColumnReorderDetail detail)
    {
        Console.WriteLine($"Column {detail.ColumnKey} moved from {detail.PreviousIndex} to {detail.CurrentIndex}");
    }

    private void HandleColumnVisibilityChange(ColumnVisibilityChangeDetail detail)
    {
        Console.WriteLine($"Column {detail.ColumnKey} visibility: {detail.Visible}");
    }
}
```

## Imperative API

Capture a reference to `DataGrid<TItem>` using `@ref` to call asynchronous imperative methods:

```razor
<button @onclick="AutoFit">Auto-fit All</button>
<button @onclick="CopyRows">Copy Selected</button>
<input @oninput="OnSearchInput" placeholder="Quick search..." />

<DataGrid @ref="gridRef"
          TItem="User"
          Data="@users"
          Columns="@columns"
          Config="@gridConfig"
          Height="400" />

@code {
    private DataGrid<User>? gridRef;

    private async Task AutoFit()
    {
        if (gridRef != null)
        {
            await gridRef.BestFitAllColumnsAsync();
        }
    }

    private async Task CopyRows()
    {
        if (gridRef != null)
        {
            bool copied = await gridRef.CopySelectedRowsAsync();
        }
    }

    private async Task OnSearchInput(ChangeEventArgs e)
    {
        if (gridRef != null)
        {
            await gridRef.SetQuickSearchAsync(e.Value?.ToString() ?? string.Empty);
        }
    }
}
```

### Available Imperative Methods

- **Row & Column Sizing**:
  - `GetRowHeightAsync(int rowIndex)`
  - `SetRowHeightAsync(int rowIndex, double height)`
  - `ResetRowHeightAsync(int rowIndex)`
  - `ResetAllRowHeightsAsync()`
  - `GetColumnWidthAsync(GridColumn column)`
  - `SetColumnWidthAsync(string columnKey, double width)`
  - `ResetColumnWidthAsync(string columnKey)`
  - `ResetAllColumnWidthsAsync()`
- **Auto-sizing**:
  - `BestFitColumnAsync(string columnKey)`
  - `BestFitAllColumnsAsync()`
- **Column Ordering & Visibility**:
  - `MoveColumnAsync(string columnKey, int targetIndex)`
  - `GetColumnOrderAsync()`
  - `SetColumnOrderAsync(IEnumerable<string> columnKeys)`
  - `ResetColumnOrderAsync()`
  - `SetColumnVisibleAsync(string columnKey, bool visible)`
  - `IsColumnVisibleAsync(string columnKey)`
  - `GetVisibleColumnKeysAsync()`
  - `ResetColumnVisibilityAsync()`
- **Column State Persistence**:
  - `GetColumnStateAsync()`
  - `SetColumnStateAsync(GridColumnState state)`
  - `ResetColumnStateAsync()`
- **Search & Filtering**:
  - `SetQuickSearchAsync(string query)`
  - `ClearQuickSearchAsync()`
  - `GetQuickSearchAsync()`
  - `SetFilterAsync(GridFilter filter)`
  - `ClearFilterAsync(string? columnKey = null)`
  - `GetFiltersAsync()`
- **Pagination**:
  - `SetPageAsync(int pageIndex)`
  - `SetPageSizeAsync(int pageSize)`
  - `GetPaginationAsync()`
  - `GetTotalRowCountAsync()`
- **Selection**:
  - `SelectRowAsync(int rowIndex, SelectionIntent? intent = null)`
  - `SelectAllRowsAsync()`
  - `ClearSelectionAsync()`
  - `GetSelectionAsync()`
  - `IsRowSelectedAsync(int rowIndex)`
  - `IsCellSelectedAsync(int rowIndex, string columnKey)`
- **Clipboard**:
  - `CopySelectedCellsAsync()`
  - `CopySelectedRowsAsync()`

Calling imperative methods before the component is rendered throws an `InvalidOperationException`.

## Server vs WebAssembly Considerations

- **Static Web Assets**: In both Blazor Server and Blazor WebAssembly, static assets are resolved automatically from `./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js`.
- **Async JSInterop**: All DOM interactions, measurements, and clipboard commands happen asynchronously via JS interop (`ValueTask` / `Task`).
- **Disconnection Handling**: On component disposal, `JSDisconnectedException` is handled gracefully during circuit terminations or page navigations.
