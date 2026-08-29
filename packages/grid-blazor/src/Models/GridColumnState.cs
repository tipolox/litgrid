using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class GridColumnStateColumn
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("width")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Width { get; set; }

    [JsonPropertyName("visible")]
    public bool Visible { get; set; } = true;
}

public class GridColumnState
{
    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("columns")]
    public GridColumnStateColumn[] Columns { get; set; } = [];
}
