# Blazor Examples

Practical, copyable examples for `@tipolox/litgrid-blazor` / `Tipolox.LitGrid.Blazor`.

## 1. Basic Read-Only Grid

```razor
@page "/basic"
@using Tipolox.LitGrid.Blazor

<h3>Basic Data Grid</h3>

<DataGrid TItem="Employee"
          Data="@employees"
          Columns="@columns"
          Height="350" />

@code {
    public class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public decimal Salary { get; set; }
    }

    private List<Employee> employees = new()
    {
        new Employee { Id = 101, Name = "Alice Johnson", Department = "Engineering", Salary = 95000 },
        new Employee { Id = 102, Name = "Bob Smith", Department = "Marketing", Salary = 72000 },
        new Employee { Id = 103, Name = "Charlie Lee", Department = "Finance", Salary = 88000 }
    };

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new GridColumn { Key = "Id", Header = "ID", Width = 80 },
        new GridColumn { Key = "Name", Header = "Employee Name", Width = 200 },
        new GridColumn { Key = "Department", Header = "Department", Width = 150 },
        new GridColumn { Key = "Salary", Header = "Salary" }
    };
}
```

---

## 2. Selection, Pagination, and Dark Theme

```razor
@page "/advanced-config"
@using Tipolox.LitGrid.Blazor

<div class="mb-3">
    <button class="btn btn-secondary" @onclick="ToggleTheme">
        Toggle Theme (Current: @theme)
    </button>
</div>

<DataGrid TItem="Product"
          Data="@products"
          Columns="@columns"
          Config="@config"
          Theme="@theme"
          Height="450" />

@code {
    public class Product
    {
        public int Sku { get; set; }
        public string Title { get; set; } = string.Empty;
        public int Stock { get; set; }
        public double Price { get; set; }
    }

    private GridTheme theme = GridTheme.Light;

    private List<Product> products = Enumerable.Range(1, 200).Select(i => new Product
    {
        Sku = 1000 + i,
        Title = $"Product Item {i}",
        Stock = i * 3,
        Price = 19.99 + i
    }).ToList();

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new GridColumn { Key = "Sku", Header = "SKU", Width = 100 },
        new GridColumn { Key = "Title", Header = "Product Name", Width = 250 },
        new GridColumn { Key = "Stock", Header = "Units in Stock", Width = 140 },
        new GridColumn { Key = "Price", Header = "Price" }
    };

    private GridConfig config = new GridConfig
    {
        Selection = new GridSelectionConfig
        {
            Mode = SelectionMode.MultiRow,
            Checkboxes = true
        },
        RowHeader = new GridRowHeaderConfig
        {
            Enabled = true,
            Width = 56
        },
        Pagination = new GridPaginationConfig
        {
            Enabled = true,
            PageSize = 25,
            PageIndex = 0
        }
    };

    private void ToggleTheme()
    {
        theme = theme == GridTheme.Light ? GridTheme.Dark : GridTheme.Light;
    }
}
```

---

## 3. Quick Search and Filtering via Imperative API

```razor
@page "/search-filter"
@using Tipolox.LitGrid.Blazor

<div class="d-flex gap-2 mb-3">
    <input type="text"
           class="form-control"
           placeholder="Quick search..."
           @oninput="OnQuickSearchChanged" />

    <button class="btn btn-outline-primary" @onclick="FilterEngineers">
        Show Engineers Only
    </button>
    <button class="btn btn-outline-secondary" @onclick="ClearFilters">
        Clear Filters
    </button>
</div>

<DataGrid @ref="grid"
          TItem="Staff"
          Data="@staffList"
          Columns="@columns"
          Height="400" />

@code {
    public class Staff
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
    }

    private DataGrid<Staff>? grid;

    private List<Staff> staffList = new()
    {
        new Staff { Id = 1, Name = "Alice", Title = "Senior Engineer" },
        new Staff { Id = 2, Name = "Bob", Title = "Staff Engineer" },
        new Staff { Id = 3, Name = "Carol", Title = "Product Manager" },
        new Staff { Id = 4, Name = "Dave", Title = "QA Engineer" }
    };

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new GridColumn { Key = "Id", Header = "ID", Width = 80 },
        new GridColumn { Key = "Name", Header = "Name", Width = 180 },
        new GridColumn { Key = "Title", Header = "Job Title" }
    };

    private async Task OnQuickSearchChanged(ChangeEventArgs e)
    {
        if (grid != null)
        {
            await grid.SetQuickSearchAsync(e.Value?.ToString() ?? string.Empty);
        }
    }

    private async Task FilterEngineers()
    {
        if (grid != null)
        {
            await grid.SetFilterAsync(new GridFilter
            {
                ColumnKey = "Title",
                Operator = FilterOperator.Contains,
                Value = "Engineer"
            });
        }
    }

    private async Task ClearFilters()
    {
        if (grid != null)
        {
            await grid.ClearFilterAsync();
            await grid.ClearQuickSearchAsync();
        }
    }
}
```

---

## 4. Column Persistence and Column Events

```razor
@page "/column-state"
@using Tipolox.LitGrid.Blazor

<div class="mb-2">
    <strong>Last Action:</strong> @lastActionMessage
</div>

<div class="mb-3 d-flex gap-2">
    <button class="btn btn-sm btn-primary" @onclick="BestFitAll">Auto-fit Columns</button>
    <button class="btn btn-sm btn-warning" @onclick="ResetColumnLayout">Reset Layout</button>
</div>

<DataGrid @ref="grid"
          TItem="Record"
          Data="@records"
          Columns="@columns"
          ColumnStateStorageKey="user-records-grid-v1"
          OnColumnStateChange="@HandleStateChange"
          OnColumnReorder="@HandleReorder"
          OnColumnVisibilityChange="@HandleVisibilityChange"
          Height="400" />

@code {
    public class Record
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    private DataGrid<Record>? grid;
    private string lastActionMessage = "None";

    private List<Record> records = new()
    {
        new Record { Id = 1, Code = "REC-001", Category = "Alpha", Status = "Pending" },
        new Record { Id = 2, Code = "REC-002", Category = "Beta", Status = "Completed" },
        new Record { Id = 3, Code = "REC-003", Category = "Gamma", Status = "Archived" }
    };

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new GridColumn { Key = "Id", Header = "ID", Width = 80 },
        new GridColumn { Key = "Code", Header = "Code", Width = 140 },
        new GridColumn { Key = "Category", Header = "Category", Width = 160 },
        new GridColumn { Key = "Status", Header = "Status" }
    };

    private async Task BestFitAll()
    {
        if (grid != null)
        {
            await grid.BestFitAllColumnsAsync();
            lastActionMessage = "Auto-fit applied to all columns.";
        }
    }

    private async Task ResetColumnLayout()
    {
        if (grid != null)
        {
            await grid.ResetColumnStateAsync();
            lastActionMessage = "Column state was reset to default.";
        }
    }

    private void HandleStateChange(ColumnStateChangeDetail detail)
    {
        lastActionMessage = $"Column state changed: Reason = {detail.Reason}";
    }

    private void HandleReorder(ColumnReorderDetail detail)
    {
        lastActionMessage = $"Column '{detail.ColumnKey}' moved to index {detail.CurrentIndex}";
    }

    private void HandleVisibilityChange(ColumnVisibilityChangeDetail detail)
    {
        lastActionMessage = $"Column '{detail.ColumnKey}' visibility changed to {detail.Visible}";
    }
}
```

---

## 5. Clipboard Integration

```razor
@page "/clipboard"
@using Tipolox.LitGrid.Blazor

<div class="mb-3 d-flex gap-2">
    <button class="btn btn-outline-primary" @onclick="CopyCells">Copy Selected Cells</button>
    <button class="btn btn-outline-success" @onclick="CopyRows">Copy Selected Rows</button>
    <span>@statusText</span>
</div>

<DataGrid @ref="grid"
          TItem="Record"
          Data="@items"
          Columns="@columns"
          Config="@config"
          Height="350" />

@code {
    public class Record
    {
        public int Id { get; set; }
        public string Item { get; set; } = string.Empty;
        public int Qty { get; set; }
    }

    private DataGrid<Record>? grid;
    private string statusText = string.Empty;

    private List<Record> items = new()
    {
        new Record { Id = 1, Item = "Widget A", Qty = 50 },
        new Record { Id = 2, Item = "Gadget B", Qty = 25 },
        new Record { Id = 3, Item = "Tool C", Qty = 100 }
    };

    private IReadOnlyList<GridColumn> columns = new List<GridColumn>
    {
        new GridColumn { Key = "Id", Header = "ID", Width = 80 },
        new GridColumn { Key = "Item", Header = "Item Name", Width = 200 },
        new GridColumn { Key = "Qty", Header = "Quantity" }
    };

    private GridConfig config = new GridConfig
    {
        Selection = new GridSelectionConfig { Mode = SelectionMode.MultiCell }
    };

    private async Task CopyCells()
    {
        if (grid != null)
        {
            bool success = await grid.CopySelectedCellsAsync();
            statusText = success ? "Copied cells to clipboard!" : "Copy failed.";
        }
    }

    private async Task CopyRows()
    {
        if (grid != null)
        {
            bool success = await grid.CopySelectedRowsAsync();
            statusText = success ? "Copied rows to clipboard!" : "Copy failed.";
        }
    }
}
```
