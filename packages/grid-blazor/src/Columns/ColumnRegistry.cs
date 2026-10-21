namespace Tipolox.LitGrid.Blazor;

internal sealed record DeclaredColumn(string Key, string? Title, object? Width, bool? Hidden, int? Order, bool? Sortable = null, bool? Filterable = null)
{
    internal GridColumn ToGridColumn() => new() { Key = Key, Header = Title, Width = Width, Hidden = Hidden, Sortable = Sortable, Filterable = Filterable };
}

// A nongeneric cascading boundary prevents a mismatched column inside a nested
// grid from accidentally finding an outer registry with a matching TItem.
internal interface IColumnRegistry
{
    Type ItemType { get; }
    void Update(object identity, DeclaredColumn column);
    void Remove(object identity);
}

internal sealed class ColumnRegistry<TItem>(Action changed) : IColumnRegistry
{
    private readonly Dictionary<object, (long Sequence, DeclaredColumn Column)> entries = new();
    private long nextSequence;
    private bool disposed;
    private DeclaredColumn[]? snapshot;
    public Type ItemType => typeof(TItem);

    public void Update(object identity, DeclaredColumn column)
    {
        if (disposed) return;
        if (entries.TryGetValue(identity, out var previous))
        {
            if (previous.Column == column) return;
            entries[identity] = (previous.Sequence, column);
        }
        else entries.Add(identity, (nextSequence++, column));
        snapshot = null;
        changed();
    }

    public void Remove(object identity)
    {
        if (!disposed && entries.Remove(identity))
        {
            snapshot = null;
            changed();
        }
    }

    internal DeclaredColumn[] Snapshot()
    {
        if (snapshot != null) return snapshot;
        // Unspecified Order follows explicit orders; ties keep first registration order.
        var columns = entries.Values.OrderBy(entry => entry.Column.Order.HasValue ? 0 : 1)
            .ThenBy(entry => entry.Column.Order)
            .ThenBy(entry => entry.Sequence).Select(entry => entry.Column).ToArray();
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var column in columns)
            if (!keys.Add(column.Key))
                throw new InvalidOperationException($"Duplicate LitGridColumn key '{column.Key}'. Each column must have a unique serialized key.");
        return snapshot = columns;
    }

    internal void Dispose()
    {
        disposed = true;
        entries.Clear();
        snapshot = [];
    }
}
