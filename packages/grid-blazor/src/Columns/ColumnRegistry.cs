namespace Tipolox.LitGrid.Blazor;

internal sealed record DeclaredColumn(string Key, string? Title, object? Width, bool? Hidden, int? Order, bool? Sortable = null, bool? Filterable = null, string? Align = null, GridFormatSnapshot? Format = null)
{
    internal GridColumn ToGridColumn() => new() { Key = Key, Header = Title, Width = Width, Hidden = Hidden, Sortable = Sortable, Filterable = Filterable, Align = Align, Format = Format?.ToFormat() };
}

// A nongeneric cascading boundary prevents a mismatched column inside a nested
// grid from accidentally finding an outer registry with a matching TItem.
internal interface IColumnRegistry
{
    Type ItemType { get; }
    void Update(object identity, DeclaredColumn column);
    void ReportPresentationError(object identity, ColumnPresentationException error);
    void Remove(object identity);
}

internal sealed class ColumnRegistry<TItem>(Action changed) : IColumnRegistry
{
    private readonly Dictionary<object, (long Sequence, DeclaredColumn Column)> entries = new();
    private readonly Dictionary<object, ColumnPresentationException> presentationErrors = new();
    private long nextSequence;
    private bool disposed;
    private DeclaredColumn[]? snapshot;
    public Type ItemType => typeof(TItem);

    public void Update(object identity, DeclaredColumn column)
    {
        if (disposed) return;
        var recovered = presentationErrors.Remove(identity);
        if (entries.TryGetValue(identity, out var previous))
        {
            if (previous.Column == column) { if (recovered) changed(); return; }
            entries[identity] = (previous.Sequence, column);
        }
        else entries.Add(identity, (nextSequence++, column));
        snapshot = null;
        changed();
    }

    public void Remove(object identity)
    {
        var recovered = presentationErrors.Remove(identity);
        if (!disposed && (entries.Remove(identity) || recovered))
        {
            snapshot = null;
            changed();
        }
    }

    internal DeclaredColumn[] Snapshot()
    {
        if (presentationErrors.Count > 0) throw presentationErrors.Values.First();
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
        presentationErrors.Clear();
        snapshot = [];
    }

    public void ReportPresentationError(object identity, ColumnPresentationException error)
    {
        if (disposed || presentationErrors.TryGetValue(identity, out var previous) && previous.Message == error.Message) return;
        presentationErrors[identity] = error;
        // Keep the last valid entries, block synchronization, and coalesce repeated
        // identical invalid renders rather than scheduling an error render loop.
        changed();
    }
}
