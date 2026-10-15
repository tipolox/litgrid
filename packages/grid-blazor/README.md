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

In v1.1.0, `DataSyncMode.Automatic` is the default. Rows synchronize on source
replacement, `ObservableCollection<T>` / `INotifyCollectionChanged` collection
notifications, and `INotifyPropertyChanged` notifications from supported reference-type
rows. Unchanged parent updates do zero dataset work. Plain list mutations
require replacement, optional `DataRevision="@revision"`, or `grid.RefreshDataAsync()`.
`DataSyncMode="DataSyncMode.Legacy"` retains v1.0.3 parent-update behavior.
**Migration warning:** the new default is a breaking change approved for coordinated
LitGrid v1.1.0 as a deliberate semantic-versioning exception. Existing mutation-on-
parent-update apps must use Legacy or explicit signals. Columns/configuration are
independent. Changed data
still uses full-dataset JSON interop; AOT is optional.
See [the synchronization contract](https://github.com/tipolox/litgrid/blob/main/docs/blazor-data-synchronization.md).

### Upgrading and shared pages

Upgrade to the coordinated v1.1.0 package set when sharing a page with npm LitGrid
wrappers. The first `yc-grid` registration wins; loading a newer bundle cannot
replace an older constructor. Deliver matching application and static assets,
invalidate stale browser/CDN/service-worker caches as appropriate, and reload the
page. Package publication does not update deployed consumers automatically.
See [the upgrade guide](https://github.com/tipolox/litgrid/blob/main/docs/installation.md#upgrading-to-v110).

### Declarative columns

```razor
<DataGrid TItem="Employee" Data="@employees" Height="400">
    <LitGridColumn Field="@(e => e.Id)" Title="ID" Width="80" />
    <LitGridColumn Field="@(e => e.Name)" Title="Employee" Width="220" />
</DataGrid>

@code {
    public class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
    }
    private List<Employee> employees = [new() { Id = 1, Name = "Ada" }];
}
```

The grid cascades `TItem` to child columns. Specify it explicitly when Razor
cannot infer it across a separate render fragment. `Field` resolves the
camelCase name used by Blazor JS interop and honors `[JsonPropertyName]`.
Only direct readable scalar properties are supported; use `Key` without `Field`
for custom serialization. Native Razor cell templates are not supported yet.

Use either declarative content or nonempty `Columns`; mixing them is an error.
An empty declarative schema stays empty. Unchanged declarations preserve user
sizing, visibility, order, and persistence. Explicit changes apply the affected
defaults; changed `Order` values apply declaration order. Use stable `@key`
identities and explicit `Order` values for dynamic columns.

See [Declarative Blazor columns](https://github.com/tipolox/litgrid/blob/main/docs/blazor-declarative-columns.md)
for complete ordering, state precedence, and serialization rules.

### Programmatic columns

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
        new() { Key = "id", Header = "ID", Width = 80 },
        new() { Key = "name", Header = "Name", Width = 220 }
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
