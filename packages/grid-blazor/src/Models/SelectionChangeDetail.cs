using System.Text.Json;
using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class SelectionChangeDetail
{
    [JsonPropertyName("scopeKey"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public JsonElement ScopeKey { get; set; }
    [JsonPropertyName("mode")] public SelectionMode Mode { get; set; }
    [JsonPropertyName("rowIndex")] public int? RowIndex { get; set; }
    [JsonPropertyName("columnKey")] public string? ColumnKey { get; set; }
    [JsonPropertyName("anchorRowIndex")] public int? AnchorRowIndex { get; set; }
    [JsonPropertyName("rowIndexes")] public int[] RowIndexes { get; set; } = [];
    [JsonPropertyName("cells")] public string[] Cells { get; set; } = [];
    [JsonPropertyName("rows")] public SelectedRowSnapshot[] Rows { get; set; } = [];
}

public class SelectedRowSnapshot
{
    [JsonPropertyName("rowIndex")] public int RowIndex { get; set; }
    [JsonPropertyName("row")] public JsonElement Row { get; set; }
    [JsonPropertyName("key")] public JsonElement Key { get; set; }
}
