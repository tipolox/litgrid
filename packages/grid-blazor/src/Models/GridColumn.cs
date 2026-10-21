using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class GridColumn
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("header")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Header { get; set; }

    [JsonPropertyName("width")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Width { get; set; }

    [JsonPropertyName("hidden")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Hidden { get; set; }

    [JsonPropertyName("sortable")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Sortable { get; set; }

    [JsonPropertyName("filterable")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Filterable { get; set; }
}

public class BestFitColumnWidth
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("width")]
    public double? Width { get; set; }
}
