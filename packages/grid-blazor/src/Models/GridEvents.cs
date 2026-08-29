using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class ColumnReorderDetail
{
    [JsonPropertyName("columnKey")]
    public string ColumnKey { get; set; } = string.Empty;

    [JsonPropertyName("previousIndex")]
    public int PreviousIndex { get; set; }

    [JsonPropertyName("currentIndex")]
    public int CurrentIndex { get; set; }

    [JsonPropertyName("columnOrder")]
    public string[] ColumnOrder { get; set; } = [];
}

public class ColumnVisibilityChangeDetail
{
    [JsonPropertyName("columnKey")]
    public string ColumnKey { get; set; } = string.Empty;

    [JsonPropertyName("visible")]
    public bool Visible { get; set; }

    [JsonPropertyName("visibleColumnKeys")]
    public string[] VisibleColumnKeys { get; set; } = [];
}

public class ColumnStateChangeDetail
{
    [JsonPropertyName("reason")]
    public ColumnStateChangeReason Reason { get; set; }

    [JsonPropertyName("state")]
    public GridColumnState State { get; set; } = new();
}
