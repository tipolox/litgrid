using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class GridQuery
{
    [JsonPropertyName("search")] public string Search { get; set; } = "";
    [JsonPropertyName("filters")] public GridFilter[] Filters { get; set; } = [];
    [JsonPropertyName("sort")] public GridQuerySort Sort { get; set; } = new();
    [JsonPropertyName("pageIndex")] public int PageIndex { get; set; }
    [JsonPropertyName("pageSize")] public int PageSize { get; set; } = 50;
}

public class GridQuerySort
{
    [JsonPropertyName("columnKey")] public string? ColumnKey { get; set; }
    [JsonPropertyName("direction")] public string? Direction { get; set; }
}

public class GridQuerySnapshot
{
    [JsonPropertyName("requestId")] public long RequestId { get; set; }
    [JsonPropertyName("query")] public GridQuery Query { get; set; } = new();
}

public class GridQueryChangeDetail : GridQuerySnapshot
{
    [JsonPropertyName("reason")] public string Reason { get; set; } = "";
}

/// <summary>Kind is known with TotalRows, or unknown with HasMore. No inferred totals.</summary>
public class GridExternalTotal
{
    [JsonPropertyName("kind")] public string Kind { get; set; } = "unknown";
    [JsonPropertyName("totalRows"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public int? TotalRows { get; set; }
    [JsonPropertyName("hasMore"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public bool? HasMore { get; set; } = false;
}

/// <summary>Replace this object for each loading/result update. IDs must be safe JavaScript integers.</summary>
public class GridExternalState<TItem> : GridQuerySnapshot
{
    [JsonPropertyName("rows")] public IReadOnlyList<TItem> Rows { get; set; } = [];
    [JsonPropertyName("total")] public GridExternalTotal Total { get; set; } = new();
    [JsonPropertyName("loading")] public bool Loading { get; set; }
    [JsonPropertyName("error")] public string? Error { get; set; }
}
