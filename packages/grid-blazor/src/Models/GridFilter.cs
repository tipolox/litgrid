using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class GridFilter
{
    [JsonPropertyName("columnKey")]
    public string ColumnKey { get; set; } = string.Empty;

    [JsonPropertyName("operator")]
    public FilterOperator Operator { get; set; } = FilterOperator.Contains;

    [JsonPropertyName("value")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Value { get; set; }
}

public class GridPaginationState
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    [JsonPropertyName("pageIndex")]
    public int PageIndex { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }

    [JsonPropertyName("totalRows")]
    public int TotalRows { get; set; }
}

public class GridCellSelection
{
    [JsonPropertyName("rowIndex")]
    public int RowIndex { get; set; }

    [JsonPropertyName("columnKey")]
    public string ColumnKey { get; set; } = string.Empty;
}

public class GridSelection
{
    [JsonPropertyName("mode")]
    public SelectionMode Mode { get; set; }

    [JsonPropertyName("rowIndex")]
    public int? RowIndex { get; set; }

    [JsonPropertyName("selectedRowIndices")]
    public int[] SelectedRowIndices { get; set; } = [];

    [JsonPropertyName("cell")]
    public GridCellSelection? Cell { get; set; }

    [JsonPropertyName("selectedCells")]
    public GridCellSelection[] SelectedCells { get; set; } = [];
}
