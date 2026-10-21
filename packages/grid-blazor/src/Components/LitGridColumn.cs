using System.Globalization;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Components;

namespace Tipolox.LitGrid.Blazor;

/// <summary>Declares column metadata inside a DataGrid. This component renders no DOM.</summary>
public sealed class LitGridColumn<TItem> : ComponentBase, IDisposable
{
    private IColumnRegistry? owner;

    [CascadingParameter] internal IColumnRegistry? Registry { get; set; }
    [Parameter] public Expression<Func<TItem, object?>>? Field { get; set; }
    [Parameter] public string? Key { get; set; }
    [Parameter] public string? Title { get; set; }
    [Parameter] public object? Width { get; set; }
    [Parameter] public bool? Hidden { get; set; }
    [Parameter] public bool? Sortable { get; set; }
    [Parameter] public bool? Filterable { get; set; }
    [Parameter] public int? Order { get; set; }

    protected override void OnParametersSet()
    {
        if (Registry == null || Registry.ItemType != typeof(TItem))
            throw new InvalidOperationException("LitGridColumn must be a child of DataGrid with the same TItem. Specify TItem explicitly when generic cascading cannot infer it.");
        var resolved = Field == null ? null : FieldResolver.Resolve(Field);
        if (Key != null && string.IsNullOrWhiteSpace(Key))
            throw new ArgumentException("LitGridColumn Key cannot be empty or whitespace.");
        if (resolved != null && Key != null && !StringComparer.Ordinal.Equals(resolved, Key))
            throw new ArgumentException($"LitGridColumn Key '{Key}' does not match the serialized Field name '{resolved}'.");
        var key = resolved ?? Key ?? throw new ArgumentException("LitGridColumn requires Field or Key.");
        var column = new DeclaredColumn(key, Title, NormalizeWidth(Width), Hidden, Order, Sortable, Filterable);
        if (owner != Registry)
        {
            owner?.Remove(this);
            owner = Registry;
        }
        owner.Update(this, column);
    }

    internal static object? NormalizeWidth(object? width)
    {
        if (width == null) return null;
        double number;
        if (width is string text)
        {
            text = text.Trim();
            if (text.EndsWith("px", StringComparison.Ordinal)) text = text[..^2];
            if (!double.TryParse(text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out number))
                throw new ArgumentException("LitGridColumn Width must be a positive pixel number or a pixel string (for example 120 or 120px).");
        }
        else if (width is byte or sbyte or short or ushort or int or uint or long or ulong or float or double or decimal)
            number = Convert.ToDouble(width, CultureInfo.InvariantCulture);
        else throw new ArgumentException("LitGridColumn Width must be a number or pixel string.");
        if (!double.IsFinite(number) || number <= 0)
            throw new ArgumentException("LitGridColumn Width must be positive and finite.");
        return number;
    }

    public void Dispose()
    {
        owner?.Remove(this);
        owner = null;
    }
}
