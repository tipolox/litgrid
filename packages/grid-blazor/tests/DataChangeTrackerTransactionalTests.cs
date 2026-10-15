using System.Collections;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class DataChangeTrackerTransactionalTests
{
    public sealed class Row : INotifyPropertyChanged
    {
        private PropertyChangedEventHandler? handlers;
        public int Subscribers => handlers?.GetInvocationList().Length ?? 0;
        public event PropertyChangedEventHandler? PropertyChanged { add => handlers += value; remove => handlers -= value; }
        public void Change() => handlers?.Invoke(this, new(null));
    }
    private sealed class Source : IEnumerable<Row>
    {
        public Func<IEnumerable<Row>> Factory = () => [];
        public IEnumerator<Row> GetEnumerator() => Factory().GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
    private static IEnumerable<Row> ThrowAfter(params Row[] prefix)
    {
        foreach (var row in prefix) yield return row;
        throw new InvalidOperationException("prefix failure");
    }

    [Fact]
    public void FailedPrefixesRollBackNewHandlersAndPreserveActiveDuplicateCounts()
    {
        var active = new Row(); var one = new Row(); var two = new Row(); var notifications = 0;
        var source = new Source { Factory = () => [active, active] };
        using var tracker = new DataChangeTracker<Row>(() => notifications++);
        tracker.SetSource(source); tracker.Reconcile();
        source.Factory = () => ThrowAfter(active, one, one);
        Assert.Throws<InvalidOperationException>(() => tracker.Reconcile());
        Assert.Equal(1, active.Subscribers); Assert.Equal(0, one.Subscribers);
        source.Factory = () => ThrowAfter(two, two);
        Assert.Throws<InvalidOperationException>(() => tracker.Reconcile());
        Assert.Equal(1, active.Subscribers); Assert.Equal(0, one.Subscribers); Assert.Equal(0, two.Subscribers);
        active.Change(); one.Change(); two.Change(); Assert.Equal(1, notifications);
        source.Factory = () => [one, one, two]; tracker.Reconcile();
        Assert.Equal(0, active.Subscribers); Assert.Equal(1, one.Subscribers); Assert.Equal(1, two.Subscribers);
        tracker.Dispose(); Assert.Equal(0, one.Subscribers); Assert.Equal(0, two.Subscribers);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static WeakReference FailWithNewPrefix(Source source, DataChangeTracker<Row> tracker)
    {
        var row = new Row(); var weak = new WeakReference(row);
        source.Factory = () => ThrowAfter(row, row);
        Assert.Throws<InvalidOperationException>(() => tracker.Reconcile());
        source.Factory = () => [];
        return weak;
    }
    [Fact]
    public void RepeatedFailedPrefixRowsAreCollectibleWhileTrackerAndSourceStayAlive()
    {
        var source = new Source(); using var tracker = new DataChangeTracker<Row>(() => { });
        tracker.SetSource(source);
        var weak = Enumerable.Range(0, 5).Select(_ => FailWithNewPrefix(source, tracker)).ToArray();
        GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
        Assert.All(weak, row => Assert.False(row.IsAlive));
        tracker.Reconcile(); GC.KeepAlive(tracker); GC.KeepAlive(source);
    }
}
