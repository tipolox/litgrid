# Declarative Blazor columns

`LitGridColumn<TItem>` declares column metadata directly in Razor. It uses the
existing Web Component rendering, virtualization, filtering, and keyboard paths.
It creates no visible DOM and no per-cell Blazor components.

```razor
@using Tipolox.LitGrid.Blazor

<DataGrid TItem="Employee" Data="@employees" Height="400">
    <LitGridColumn Field="@(e => e.Id)" Title="ID" Width="80" />
    <LitGridColumn Field="@(e => e.Name)" Title="Employee" Width="220" />
    <LitGridColumn Field="@(e => e.Department)" Title="Department" Width="180" />
</DataGrid>

@code {
    public class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Department { get; set; }
    }
    private List<Employee> employees = [
        new() { Id = 1, Name = "Ada", Department = "Computing" },
        new() { Id = 2, Name = "Grace", Department = null }
    ];
}
```

The grid cascades `TItem` to columns declared in its Razor content. Where Razor
cannot infer the type across a separate component/render fragment, specify
`<LitGridColumn TItem="Employee" Field="@(e => e.Name)" />`. It must still render
within a grid of the same type. Nested grids have isolated registries.

## Public parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `Field` | `Expression<Func<TItem, object?>>?` | Direct readable scalar property, resolved during metadata preparation. |
| `Key` | `string?` | Explicit serialized key; required when `Field` is omitted. |
| `Title` | `string?` | Header text; the grid uses the serialized key when omitted. |
| `Width` | `object?` | Positive finite pixel number or numeric/pixel string: `80`, `"80"`, or `"80px"`. |
| `Hidden` | `bool?` | Initial visibility (`true` hides the column). |
| `Order` | `int?` | Explicit declaration order for dynamic columns. |

Use either nonempty programmatic `Columns` or declarative `ChildContent`.
Supplying both throws a clear validation error; the sources are never merged.
`Columns` retains its existing name, type, and literal key semantics:

```razor
<DataGrid TItem="Employee" Data="@employees" Columns="@columns" />
```

For the model above, equivalent programmatic columns are:

```csharp
private IReadOnlyList<GridColumn> columns = [
    new() { Key = "id", Header = "ID", Width = 80 },
    new() { Key = "name", Header = "Employee", Width = 220 },
    new() { Key = "department", Header = "Department", Width = 180 }
];
```

Omitting `ChildContent` and leaving `Columns` empty retains legacy inference.
An empty declarative fragment remains an explicit empty schema, including when
every registered column has been removed. To request inference again, remove
`ChildContent`. React, Angular, Vue, and legacy Blazor inference defaults are unchanged.

## Serialization and expressions

Real Blazor WebAssembly JS interop sends public C# properties with camelCase
names: `Id` becomes `id`, `Name` becomes `name`, and `Department` becomes
`department`. Declarative `Field` resolves these names automatically.
Programmatic `GridColumn.Key`, filters, and imperative method keys remain
literal strings: use the actual serialized name. Existing custom JSON names
and already matching keys retain their behavior.

`JsonPropertyName` takes precedence over camelCase:

```razor
@using System.Text.Json.Serialization
@using Tipolox.LitGrid.Blazor

<DataGrid TItem="NamedEmployee" Data="@namedEmployees">
    <LitGridColumn Field="@(e => e.Name)" Title="Employee" />
</DataGrid>

@code {
    public class NamedEmployee
    {
        [JsonPropertyName("employee_name")]
        public string? Name { get; set; }
    }
    private List<NamedEmployee> namedEmployees = [new() { Name = "Ada" }];
}
```

The resolved key is `employee_name`. If both `Field` and `Key` are supplied they
must match exactly. Supported expressions select a direct readable public
property, including inherited properties and boxing/built-in conversions.
Supported values include nullable scalars, numbers, strings, booleans, enums,
GUIDs, and standard JSON date/time scalar types. Values retain the grid's current
formatting and sorting/filtering behavior. Dates arrive as JSON strings; this
API adds no new date parsing or formatting. A conversion in an expression does
not convert serialized row values.

These expressions/mappings are rejected:

- Computed expressions (`e => e.Id + 1`) and method calls.
- Indexers and nested properties (`e => e.Manager.Name`).
- Fields, static properties, nonpublic getters, and object-valued properties.
- Ignored and extension-data properties. Conditional `JsonIgnore` is rejected
  unless `Condition = JsonIgnoreCondition.Never`.
- Custom JSON converters declared on a row/property.
- Properties of rows that serialize as scalars or collections (for example
  `string.Length`, `DateTime.Year`, or a dictionary's `Count`). Use `Key` instead.

For custom converters, dictionaries, extension data, or custom serializer
mapping, omit `Field` and supply the actual `Key`. Global serializer
customizations cannot be inferred. Resolution uses cached property metadata
and never compiles or executes expressions per row or while scrolling.
The serialized row contract must match `TItem`; polymorphic rows that override
property serialization names require explicit keys for those mappings.

## Dynamic columns and ordering

Use stable `@key` values for component identity and `Order` for display order:

```razor
@using System.Linq.Expressions
@using Tipolox.LitGrid.Blazor

<button @onclick="ToggleDepartment">Toggle department</button>
<button @onclick="ReverseOrder">Reverse declarations</button>
<DataGrid TItem="Employee" Data="@employees">
    @foreach (var column in columnSpecs)
    {
        <LitGridColumn @key="column.Id" Field="@column.Field"
                       Title="@column.Title" Order="@column.Order" />
    }
</DataGrid>

@code {
    public class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Department { get; set; }
    }
    private record ColumnSpec(string Id, Expression<Func<Employee, object?>> Field,
        string Title, int Order);
    private List<Employee> employees = [new() { Id = 1, Name = "Ada" }];
    private List<ColumnSpec> columnSpecs = [
        new("id", e => e.Id, "ID", 0),
        new("name", e => e.Name, "Name", 1)
    ];
    private void ToggleDepartment()
    {
        if (columnSpecs.Any(c => c.Id == "department"))
            columnSpecs.RemoveAll(c => c.Id == "department");
        else columnSpecs.Add(new("department", e => e.Department, "Department", 2));
    }
    private void ReverseOrder()
        => columnSpecs = columnSpecs.Select(c => c with { Order = -c.Order }).ToList();
}
```

Explicit orders sort ascending, including negative values. Unspecified orders
follow all explicit values. Equal orders retain initial registration order.
Without `Order`, registration order stays stable for the component lifetime;
rearranging keyed markup alone does not update it. Duplicate serialized keys
are invalid. Adding/removing/replacing the collection, changing metadata, and
conditional columns are supported without private render-tree APIs.

Registrations and removals are batched after rendering into a schema update.
Child-only schema changes do not resend rows. Unchanged schemas are not
serialized again. Parent rerenders still synchronize same-reference list
additions and row edits, preserving the existing data behavior and cost.

## Customization and schema precedence

The grid stays mounted during synchronization:

- Unchanged declarations preserve user width, visibility, order, and persistence.
- A changed title updates the header while preserving user settings.
- A changed `Width` clears only that column's resized width and applies its new
  default. Changing to `null` restores default sizing.
- A changed `Hidden` applies only that column's visibility. Changing to `null`
  restores the default (visible).
- Changing an existing column's `Order`, or adding a column with explicit
  `Order`, applies the entire declaration order while preserving width/visibility.
- Otherwise surviving columns retain user order; new columns append in
  declaration order with their declared defaults.
- Removed columns lose their active state. Re-adding one starts from defaults.
  A changed key is a removal plus an addition.
- Persistence restores on mount or storage-key changes. Later reconciliation
  writes updated state silently, without interaction callbacks or replaying
  old persisted defaults. Remounting restores that updated state.
- A simultaneous schema/storage-key change is atomic: install the new schema's
  defaults, then restore valid preferences from the new namespace. Saved target
  preferences take precedence over those defaults, as on an initial mount.
  Switching namespaces performs no writes and never rewrites the outgoing view.
  An unsaved namespace or a `null` key starts from the current declaration defaults.
  Subsequent user operations and same-key schema changes persist only to the
  selected namespace. Key-only changes use the last declared schema even when
  unchanged metadata is omitted from interop.
- Active-cell navigation follows a surviving visible column key. Removing or
  hiding the active column clears that active cell.
- A schema change cancels unfinished column resize/reorder gestures silently,
  preventing stale interaction events against removed columns.

Reapplying an unchanged declaration does not override a user's preferences.
To reset preferences explicitly, use the existing sizing, visibility, order,
and column-state reset methods described in the [Blazor guide](blazor-guide.md).
Schema updates emit no user-interaction events, preventing callback feedback loops.
The legacy programmatic synchronization path retains its existing semantics.

## Current limitations and future work

This API declares metadata only. `CellTemplate`, `RowTemplate`, Razor cell
components, editing, light-DOM projection, and template viewport synchronization
are future architectural work. They are not supported by this milestone.

The browser fixture covers real JS interop, display, sorting/filtering, dynamic
schemas, customization/persistence, virtualization, and keyboard behavior; see
[browser test instructions](../packages/grid-blazor/tests/browser/README.md).
Screen-reader verification remains separate; this feature makes no WCAG claim.
