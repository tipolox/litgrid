using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

internal sealed class ColumnPresentationException(string message, Exception? inner = null) : ArgumentException(message, inner);

/// <summary>Serializable browser Intl display metadata. Locale is explicit; dateTime requires options.timeZone.</summary>
public sealed class GridValueFormat
{
    [JsonPropertyName("kind")] public string Kind { get; set; } = string.Empty;
    [JsonPropertyName("locale")] public string Locale { get; set; } = string.Empty;
    [JsonPropertyName("options")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public JsonObject? Options { get; set; }
}

/// <summary>Detached primitive values give registry/lifecycle snapshots structural equality.</summary>
internal sealed class GridFormatSnapshot : IEquatable<GridFormatSnapshot>
{
    private readonly string kind;
    private readonly string locale;
    private readonly KeyValuePair<string, object>[] options;
    private GridFormatSnapshot(string kind, string locale, KeyValuePair<string, object>[] options)
        => (this.kind, this.locale, this.options) = (kind, locale, options);

    internal static string? ValidateAlign(string? value, string? key = null) => value is null or "start" or "center" or "end" or "left" or "right"
        ? value : throw (key == null ? new ArgumentException("Invalid alignment.") : new ColumnPresentationException($"Column {key}: invalid alignment."));

    internal static GridFormatSnapshot? Capture(GridValueFormat? format, string? key = null)
    {
        try { return CaptureCore(format); }
        catch (Exception error) when (key != null && error is ArgumentException or InvalidOperationException or JsonException)
        { throw new ColumnPresentationException($"Column {key}: {error.Message}", error); }
    }

    private static GridFormatSnapshot? CaptureCore(GridValueFormat? format)
    {
        if (format == null) return null;
        if (format.Kind is not ("number" or "dateTime")) throw new ArgumentException("Invalid column format kind.");
        if (string.IsNullOrWhiteSpace(format.Locale)) throw new ArgumentException("An explicit format locale is required.");
        string[] allowed = format.Kind == "number"
            ? ["style", "currency", "currencyDisplay", "currencySign", "useGrouping", "minimumFractionDigits", "maximumFractionDigits"]
            : ["dateStyle", "timeStyle", "timeZone"];
        var values = new List<KeyValuePair<string, object>>();
        foreach (var entry in format.Options ?? [])
        {
            if (!allowed.Contains(entry.Key) || entry.Value == null) throw new ArgumentException("Unsupported or null format option: " + entry.Key);
            object value;
            if (entry.Key is "minimumFractionDigits" or "maximumFractionDigits")
            {
                if (entry.Value.GetValueKind() != JsonValueKind.Number) throw new ArgumentException("Expected a number: " + entry.Key);
                var number = entry.Value.Deserialize<double>();
                if (!double.IsFinite(number)) throw new ArgumentException("Expected a finite number: " + entry.Key);
                value = number;
            }
            else if (entry.Key == "useGrouping")
            {
                if (entry.Value.GetValueKind() is JsonValueKind.True or JsonValueKind.False) value = entry.Value.GetValue<bool>();
                else if (entry.Value.GetValueKind() == JsonValueKind.String && entry.Value.GetValue<string>() is "auto" or "always" or "min2") value = entry.Value.GetValue<string>();
                else throw new ArgumentException("Invalid grouping option.");
            }
            else
            {
                if (entry.Value.GetValueKind() != JsonValueKind.String) throw new ArgumentException("Expected a string: " + entry.Key);
                value = entry.Value.GetValue<string>();
            }
            values.Add(new(entry.Key, value));
        }
        if (format.Kind == "dateTime" && !values.Any(pair => pair.Key == "timeZone" && pair.Value is string zone && !string.IsNullOrWhiteSpace(zone)))
            throw new ArgumentException("An explicit timezone is required.");
        // Native locale syntax, currency, enum/range combinations and timezone support
        // are validated by browser Intl before schema adoption. Do not substitute .NET
        // CultureInfo/TimeZoneInfo support for the browser's different negotiation rules.
        return new(format.Kind, format.Locale, values.OrderBy(pair => pair.Key, StringComparer.Ordinal).ToArray());
    }

    internal GridValueFormat ToFormat()
    {
        var result = new JsonObject();
        foreach (var pair in options)
            result[pair.Key] = pair.Value switch { string text => JsonValue.Create(text), bool flag => JsonValue.Create(flag), double number => JsonValue.Create(number), _ => throw new InvalidOperationException() };
        return new() { Kind = kind, Locale = locale, Options = result };
    }
    public bool Equals(GridFormatSnapshot? other) => other != null && kind == other.kind && locale == other.locale && options.SequenceEqual(other.options);
    public override bool Equals(object? other) => other is GridFormatSnapshot snapshot && Equals(snapshot);
    public override int GetHashCode()
    {
        var hash = new HashCode(); hash.Add(kind); hash.Add(locale);
        foreach (var option in options) hash.Add(option);
        return hash.ToHashCode();
    }
}
