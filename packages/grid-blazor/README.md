# LitGrid for Blazor

LitGrid is a Community Edition DataGrid for Blazor. This self-contained NuGet
package supports .NET 8+ and bundles its client-side assets, so Blazor
consumers do not need to install npm packages.

## Installation

```bash
dotnet add package Tipolox.LitGrid.Blazor
```

Add the namespace to `_Imports.razor` or to the component using the grid:

```razor
@using Tipolox.LitGrid.Blazor
```

## Basic usage

```razor
<DataGrid TItem="User"
          Data="@users"
          Columns="@columns"
          Config="@gridConfig"
          Height="400" />

@code {
    private List<User> users = new()
    {
        new() { Id = 1, Name = "Ada Lovelace" },
        new() { Id = 2, Name = "Grace Hopper" }
    };

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new() { Key = "Id", Header = "ID", Width = 80 },
        new() { Key = "Name", Header = "Name", Width = 220 }
    };

    private GridConfig gridConfig = new()
    {
        Selection = new GridSelectionConfig { Mode = SelectionMode.Row },
        Pagination = new GridPaginationConfig { Enabled = true, PageSize = 25 }
    };

    private sealed class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
```

LitGrid provides virtualized rows, sorting and filtering, pagination, row and
cell selection, column resizing and state persistence, and keyboard and
accessibility support.

See the [GitHub repository](https://github.com/tipolox/litgrid) and the
[Blazor guide](https://github.com/tipolox/litgrid/blob/main/docs/blazor-guide.md)
for documentation and examples.
