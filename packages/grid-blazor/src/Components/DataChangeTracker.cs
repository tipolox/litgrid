using System.Collections.Specialized;
using System.ComponentModel;

namespace Tipolox.LitGrid.Blazor;

// Event publishers may use another thread. The lock protects subscription ownership,
// not the caller's collection: callers must not mutate a collection during enumeration.
internal sealed class DataChangeTracker<TItem> : IDisposable
{
    private readonly Action changed;
    private readonly PropertyChangedEventHandler propertyHandler;
    internal DataChangeTracker(Action changed)
    {
        this.changed = changed;
        propertyHandler = PropertyChanged;
    }
    private static readonly bool TracksItems = !typeof(TItem).IsValueType && typeof(INotifyPropertyChanged).IsAssignableFrom(typeof(TItem));
    private readonly object gate = new();
    private readonly record struct Subscription(int Count, int Scan, int ScanCount);
    private readonly Dictionary<object, Subscription> items = new(ReferenceEqualityComparer.Instance);
    private IEnumerable<TItem>? source;
    private INotifyCollectionChanged? collection;
    private bool disposed;
    private bool needsReconcile;
    private int scan;

    internal void SetSource(IEnumerable<TItem>? value)
    {
        lock (gate)
        {
            if (disposed || ReferenceEquals(value, source)) return;
            Detach();
            source = value;
            needsReconcile = true;
            collection = value as INotifyCollectionChanged;
            if (collection != null) collection.CollectionChanged += CollectionChanged;
        }
    }

    // Called only for actual dataset synchronization, never for an unchanged render.
    // Also repairs subscriptions after unobservable List mutations followed by refresh/revision.
    internal void Reconcile(bool force = false)
    {
        if (!TracksItems) return;
        lock (gate)
        {
            if (disposed || source == null) return;
            // Observable deltas already maintain exact membership. Only initial
            // binding/Reset or an explicit caller signal needs another item scan.
            if (collection != null && !needsReconcile && !force) return;
            // Stage counts in the existing table, preserving active duplicate counts
            // if enumeration throws. No O(rows) scratch dictionary per update.
            needsReconcile = true;
            if (scan == int.MaxValue)
            {
                foreach (var pair in items) items[pair.Key] = pair.Value with { Scan = 0 };
                scan = 0;
            }
            var currentScan = ++scan;
            List<object>? introduced = null;
            var subscribed = 0;
            try
            {
                foreach (var item in source)
                    if (item is INotifyPropertyChanged notifying)
                    {
                        if (!items.TryGetValue(notifying, out var old)) (introduced ??= []).Add(notifying);
                        items[notifying] = new(old.Count, currentScan, old.Scan == currentScan ? old.ScanCount + 1 : 1);
                    }
                // Only a complete scan may introduce handlers. Existing active counts
                // and subscriptions stay intact until all new handlers are installed.
                if (introduced != null)
                    foreach (var item in introduced)
                    {
                        ((INotifyPropertyChanged)item).PropertyChanged += propertyHandler;
                        subscribed++;
                    }
            }
            catch
            {
                if (introduced != null)
                {
                    for (var i = 0; i < subscribed; i++)
                        ((INotifyPropertyChanged)introduced[i]).PropertyChanged -= propertyHandler;
                    foreach (var item in introduced) items.Remove(item);
                }
                throw;
            }
            List<object>? removed = null;
            // Existing-value writes do not invalidate Dictionary enumeration in .NET 8.
            foreach (var pair in items)
                if (pair.Value.Scan != currentScan) (removed ??= []).Add(pair.Key);
                else items[pair.Key] = pair.Value with { Count = pair.Value.ScanCount };
            if (removed != null)
                foreach (var item in removed)
                {
                    ((INotifyPropertyChanged)item).PropertyChanged -= propertyHandler;
                    items.Remove(item);
                }
            needsReconcile = false;
        }
    }

    private void CollectionChanged(object? sender, NotifyCollectionChangedEventArgs args)
    {
        lock (gate)
        {
            if (disposed || !ReferenceEquals(sender, collection)) return;
            if (TracksItems)
            {
                if (args.Action == NotifyCollectionChangedAction.Reset) { ClearItems(); needsReconcile = true; }
                else if (args.Action != NotifyCollectionChangedAction.Move)
                {
                    if (args.OldItems != null)
                        foreach (var item in args.OldItems)
                            if (item is INotifyPropertyChanged notifying && items.TryGetValue(item, out var subscription))
                            {
                                if (subscription.Count > 1) items[item] = subscription with { Count = subscription.Count - 1 };
                                else { items.Remove(item); notifying.PropertyChanged -= propertyHandler; }
                            }
                    if (args.NewItems != null)
                        foreach (var item in args.NewItems)
                            if (item is INotifyPropertyChanged notifying)
                            {
                                if (!items.ContainsKey(item)) notifying.PropertyChanged += propertyHandler;
                                var previous = items.GetValueOrDefault(item);
                                items[item] = previous with { Count = previous.Count + 1 };
                            }
                }
            }
            changed();
        }
    }

    private void PropertyChanged(object? sender, PropertyChangedEventArgs args)
    {
        lock (gate)
        {
            if (!disposed && sender != null && items.ContainsKey(sender)) changed();
        }
    }

    private void ClearItems()
    {
        foreach (var item in items.Keys) ((INotifyPropertyChanged)item).PropertyChanged -= propertyHandler;
        items.Clear();
    }

    private void Detach()
    {
        if (collection != null) collection.CollectionChanged -= CollectionChanged;
        collection = null;
        source = null;
        ClearItems();
        items.TrimExcess();
    }

    public void Dispose()
    {
        lock (gate) { if (disposed) return; disposed = true; Detach(); }
    }
}
