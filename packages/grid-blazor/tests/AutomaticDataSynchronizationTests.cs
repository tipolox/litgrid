using System.Collections;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.JSInterop;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class AutomaticDataSynchronizationTests
{
    public sealed class Row : INotifyPropertyChanged
    {
        private PropertyChangedEventHandler? handlers;
        public int Id { get; set; }
        public string Name { get; set; } = "Ada";
        [System.Text.Json.Serialization.JsonIgnore] public int Subscriptions => handlers?.GetInvocationList().Length ?? 0;
        public event PropertyChangedEventHandler? PropertyChanged { add => handlers += value; remove => handlers -= value; }
        public void Change(string name = "edited") { Name = name; handlers?.Invoke(this, new(nameof(Name))); }
        public override bool Equals(object? obj) => obj is Row other && Id == other.Id;
        public override int GetHashCode() => Id;
    }
    private sealed class TrackedCollection<T> : ObservableCollection<T>, INotifyCollectionChanged
    {
        internal int Subscriptions;
        event NotifyCollectionChangedEventHandler? INotifyCollectionChanged.CollectionChanged
        {
            add { CollectionChanged += value; Subscriptions++; }
            remove { CollectionChanged -= value; Subscriptions--; }
        }
    }
    private sealed class Rows<T>(IEnumerable<T> items) : IEnumerable<T>
    {
        public int Enumerations;
        public IEnumerator<T> GetEnumerator() { Enumerations++; return items.GetEnumerator(); }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
    private sealed class CountedCollection : ObservableCollection<Row>, IEnumerable<Row>
    {
        internal int Enumerations;
        IEnumerator<Row> IEnumerable<Row>.GetEnumerator() { Enumerations++; return Items.GetEnumerator(); }
        IEnumerator IEnumerable.GetEnumerator() => ((IEnumerable<Row>)this).GetEnumerator();
    }
    private sealed class ThrowingRows(List<Row> rows) : IEnumerable<Row>
    {
        public bool Fail;
        public IEnumerator<Row> GetEnumerator()
        {
            foreach (var row in rows) { if (Fail) throw new InvalidOperationException("enumeration failed"); yield return row; }
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    private static async Task<(TestRenderer Renderer, RecordingInterop Interop, DataGrid<T> Grid, int Root)> Setup<T>(IEnumerable<T> data, long? revision = null)
    {
        var interop = new RecordingInterop();
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(interop).BuildServiceProvider();
        var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<T>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        await renderer.Render(root, ("Data", data), ("DataRevision", revision));
        Assert.Empty(renderer.Errors);
        return (renderer, interop, grid, root);
    }
    private static async Task Settle(TestRenderer renderer)
    {
        await Task.Delay(100);
        await renderer.Drain();
    }

    private static async Task WaitForSync(RecordingInterop interop, int count)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        while (interop.Syncs.Length < count) await Task.Delay(5, timeout.Token);
        Assert.Equal(count, interop.Syncs.Length);
    }

    [Fact]
    public async Task DefaultListContractHasZeroEnumerationAndTransferOnUnchangedUpdates()
    {
        var list = new List<Employee> { new() { Name = "Ada" } };
        var rows = new Rows<Employee>(list);
        var (renderer, interop, grid, root) = await Setup(rows);
        await using (renderer)
        {
            for (var i = 0; i < 10; i++) await renderer.Render(root);
            list[0].Name = "Changed"; list.Add(new());
            await renderer.Render(root);
            Assert.Equal(1, rows.Enumerations); Assert.Single(interop.Syncs);
            await grid.RefreshDataAsync();
            Assert.Equal(2, rows.Enumerations);
            Assert.Equal(2, interop.Syncs.Last().GetProperty("data").GetArrayLength());
            var replacement = new Rows<Employee>(list);
            await renderer.Render(root, ("Data", replacement));
            Assert.Equal(1, replacement.Enumerations);
            await renderer.Render(root, ("DataRevision", 1L));
            await renderer.Render(root, ("DataRevision", null));
            await renderer.Render(root);
            Assert.Equal(3, replacement.Enumerations);
        }
    }

    [Theory]
    [InlineData("add")]
    [InlineData("remove")]
    [InlineData("replace")]
    [InlineData("move")]
    [InlineData("reset")]
    public async Task AllCollectionActionsSynchronizeWithoutAParentRender(string action)
    {
        var first = new Row(); var second = new Row { Id = 2 };
        var rows = new ObservableCollection<Row> { first, second };
        var (renderer, interop, _, _) = await Setup(rows, 7);
        await using (renderer)
        {
            await renderer.Dispatcher.InvokeAsync(() =>
            {
                switch (action)
                {
                    case "add": rows.Add(new()); break;
                    case "remove": rows.Remove(first); break;
                    case "replace": rows[0] = new(); break;
                    case "move": rows.Move(0, 1); break;
                    case "reset": rows.Clear(); break;
                }
            });
            await Settle(renderer);
            Assert.Equal(2, interop.Syncs.Length);
            Assert.Equal(rows.Count, interop.Syncs.Last().GetProperty("data").GetArrayLength());
            Assert.Equal(rows.Any(row => ReferenceEquals(row, first)) ? 1 : 0, first.Subscriptions);
            Assert.Empty(renderer.Errors);
        }
        Assert.Equal(0, first.Subscriptions); Assert.Equal(0, second.Subscriptions);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(5L)]
    public async Task ItemNotificationsAreAdditiveToRevisionsAndBatchWithoutPerRowInterop(long? revision)
    {
        var row = new Row(); var rows = new Rows<Row>(new[] { row });
        var (renderer, interop, _, root) = await Setup(rows, revision);
        await using (renderer)
        {
            var initialEnumerations = rows.Enumerations;
            await renderer.Render(root);
            Assert.Equal(initialEnumerations, rows.Enumerations);
            await renderer.Dispatcher.InvokeAsync(() => { for (var i = 0; i < 100; i++) row.Change(i.ToString()); });
            await Settle(renderer);
            Assert.Equal(2, interop.Syncs.Length);
            Assert.Equal("99", interop.Syncs.Last().GetProperty("data")[0].GetProperty("name").GetString());
            Assert.Equal(1, row.Subscriptions);
        }
        Assert.Equal(0, row.Subscriptions);
    }

    [Fact]
    public async Task DuplicateReferencesHaveOneSubscriptionUntilTheirLastOccurrenceIsRemoved()
    {
        var row = new Row(); var rows = new ObservableCollection<Row> { row, row };
        var (renderer, interop, _, _) = await Setup(rows);
        await using (renderer)
        {
            Assert.Equal(1, row.Subscriptions);
            rows.RemoveAt(0); await Settle(renderer);
            Assert.Equal(1, row.Subscriptions);
            row.Change(); await Settle(renderer);
            Assert.Equal(3, interop.Syncs.Length);
            rows.RemoveAt(0); Assert.Equal(0, row.Subscriptions);
            await Settle(renderer); var count = interop.Syncs.Length;
            row.Change(); await Settle(renderer); Assert.Equal(count, interop.Syncs.Length);
        }
    }

    [Fact]
    public async Task DynamicSourceAndModeReplacementDetachSubscriptionsImmediately()
    {
        var old = new Row(); var next = new Row();
        var source = new ObservableCollection<Row> { old };
        var replacement = new ObservableCollection<Row> { next };
        var (renderer, interop, _, root) = await Setup(source);
        await using (renderer)
        {
            await renderer.Render(root, ("Data", replacement));
            Assert.Equal(0, old.Subscriptions); Assert.Equal(1, next.Subscriptions);
            var count = interop.Syncs.Length; source.Add(new()); old.Change(); await Settle(renderer);
            Assert.Equal(count, interop.Syncs.Length);
            await renderer.Render(root, ("DataSyncMode", DataSyncMode.Legacy));
            Assert.Equal(0, next.Subscriptions);
            next.Change(); replacement.Add(new()); await Settle(renderer);
            Assert.Equal(count + 1, interop.Syncs.Length);
            await renderer.Render(root); Assert.Equal(count + 2, interop.Syncs.Length);
            await renderer.Render(root, ("DataSyncMode", DataSyncMode.Automatic));
            Assert.Equal(1, next.Subscriptions);
        }
    }

    [Fact]
    public async Task CollectionPublishersReleaseSubscriptionsOnReplacementAndDisposal()
    {
        var old = new TrackedCollection<Row> { new() }; var next = new TrackedCollection<Row> { new() };
        var (renderer, _, grid, root) = await Setup(old);
        await using (renderer)
        {
            Assert.Equal(1, old.Subscriptions);
            await renderer.Render(root, ("Data", next));
            Assert.Equal(0, old.Subscriptions); Assert.Equal(1, next.Subscriptions);
            await grid.DisposeAsync(); Assert.Equal(0, next.Subscriptions);
        }
    }

    [Fact]
    public async Task EqualButDistinctRowsKeepIndependentSubscriptionsAcrossResetAndRepopulation()
    {
        var a = new Row(); var b = new Row(); var c = new Row();
        Assert.Equal(a, b);
        var rows = new ObservableCollection<Row> { a, b };
        var (renderer, interop, _, _) = await Setup(rows);
        await using (renderer)
        {
            Assert.Equal(1, a.Subscriptions); Assert.Equal(1, b.Subscriptions);
            await renderer.Dispatcher.InvokeAsync(() => { rows.Clear(); rows.Add(c); c.Change(); });
            await WaitForSync(interop, 2);
            Assert.Equal(0, a.Subscriptions); Assert.Equal(0, b.Subscriptions); Assert.Equal(1, c.Subscriptions);
            Assert.Single(interop.Syncs.Last().GetProperty("data").EnumerateArray());
        }
        Assert.Equal(0, c.Subscriptions);
    }

    [Fact]
    public async Task ObservableNonNotifyingRowsDoNotRequireAnItemSubscriptionScan()
    {
        var source = new ObservableCollection<Employee> { new() };
        var (renderer, interop, _, root) = await Setup(source);
        await using (renderer)
        {
            await renderer.Render(root); Assert.Single(interop.Syncs);
            source.Add(new()); await WaitForSync(interop, 2);
            Assert.Equal(2, interop.Syncs.Last().GetProperty("data").GetArrayLength());
        }
    }

    [Fact]
    public async Task ObservableDeltasAvoidSubscriptionRescansButRefreshAndResetReconcile()
    {
        var row = new Row(); var rows = new CountedCollection { row };
        var (renderer, interop, grid, root) = await Setup(rows);
        await using (renderer)
        {
            Assert.Equal(2, rows.Enumerations); // initial subscription scan + serialization
            rows.Add(row); await WaitForSync(interop, 2); Assert.Equal(3, rows.Enumerations);
            row.Change(); await WaitForSync(interop, 3); Assert.Equal(4, rows.Enumerations);
            rows.Move(0, 1); await WaitForSync(interop, 4); Assert.Equal(5, rows.Enumerations);
            await grid.RefreshDataAsync(); Assert.Equal(7, rows.Enumerations);
            await renderer.Render(root, ("DataRevision", 1L)); Assert.Equal(9, rows.Enumerations);
            rows.Clear(); await WaitForSync(interop, 7); Assert.Equal(11, rows.Enumerations);
            Assert.Equal(0, row.Subscriptions);
            await renderer.Render(root); Assert.Equal(11, rows.Enumerations);
        }
    }

    [Fact]
    public async Task RefreshRepairsSubscriptionsAfterUnobservableListChanges()
    {
        var old = new Row(); var next = new Row(); var list = new List<Row> { old };
        var (renderer, _, grid, _) = await Setup(list);
        await using (renderer)
        {
            list[0] = next; await grid.RefreshDataAsync();
            Assert.Equal(0, old.Subscriptions); Assert.Equal(1, next.Subscriptions);
        }
        Assert.Equal(0, next.Subscriptions);
    }

    [Fact]
    public async Task BackgroundNotificationsAndDisposalReleaseAllSubscriptions()
    {
        var row = new Row(); var rows = new ObservableCollection<Row> { row };
        var (renderer, interop, grid, _) = await Setup(rows);
        await using (renderer)
        {
            await Task.Run(() => { row.Change(); rows.Add(new()); });
            await Settle(renderer); Assert.Equal(2, interop.Syncs.Length);
            await Task.Run(() => row.Change());
            await grid.DisposeAsync();
            var count = interop.Syncs.Length;
            await Task.Run(() => { row.Change(); rows.Add(new()); });
            await Settle(renderer);
            Assert.Equal(count, interop.Syncs.Length); Assert.Equal(0, row.Subscriptions);
            Assert.All(rows, item => Assert.Equal(0, item.Subscriptions)); Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task NotificationsDuringInteropAreNotLostAndUpdatesRemainSerialized()
    {
        var row = new Row(); var (renderer, interop, _, _) = await Setup(new[] { row });
        await using (renderer)
        {
            interop.UpdateGate = new(TaskCreationOptions.RunContinuationsAsynchronously);
            interop.UpdateStarted = new(TaskCreationOptions.RunContinuationsAsynchronously);
            row.Change("first"); await interop.UpdateStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));
            row.Change("last"); await Settle(renderer);
            Assert.Equal(2, interop.Syncs.Length);
            interop.UpdateGate.SetResult(); await Settle(renderer);
            Assert.Equal(3, interop.Syncs.Length);
            Assert.Equal("last", interop.Syncs.Last().GetProperty("data")[0].GetProperty("name").GetString());
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task FailedNotificationRetriesOnNextRenderEvenWithoutAnotherChange()
    {
        var row = new Row(); var (renderer, interop, _, root) = await Setup(new[] { row });
        await using (renderer)
        {
            interop.Failures["updateInputs"] = new JSException("injected");
            row.Change(); await Settle(renderer); Assert.NotEmpty(renderer.Errors);
            interop.Failures.Clear(); await renderer.Render(root);
            Assert.Equal(3, interop.Syncs.Length);
            await renderer.Render(root); Assert.Equal(3, interop.Syncs.Length);
        }
    }

    [Fact]
    public async Task FailedSubscriptionEnumerationRetainsHandlersAndRetriesEvenAfterRevisionReversion()
    {
        var row = new Row(); var source = new ThrowingRows([row, row]);
        var (renderer, interop, _, root) = await Setup(source);
        await using (renderer)
        {
            source.Fail = true; await renderer.Render(root, ("DataRevision", 1L));
            Assert.NotEmpty(renderer.Errors); Assert.Equal(1, row.Subscriptions); Assert.Single(interop.Syncs);
            source.Fail = false; await renderer.Render(root, ("DataRevision", null));
            Assert.Equal(2, interop.Syncs.Length); Assert.Equal(1, row.Subscriptions);
            row.Change(); await WaitForSync(interop, 3);
            Assert.Equal(2, interop.Syncs.Last().GetProperty("data").GetArrayLength());
        }
        Assert.Equal(0, row.Subscriptions);
    }

    [Fact]
    public void RepeatedPlainListReconciliationDoesNotAllocateAnEntireMembershipTable()
    {
        var rows = Enumerable.Range(0, 1000).Select(id => new Row { Id = id }).ToList();
        using var tracker = new DataChangeTracker<Row>(() => { });
        tracker.SetSource(rows); tracker.Reconcile(); tracker.Reconcile();
        var before = GC.GetAllocatedBytesForCurrentThread();
        for (var i = 0; i < 10; i++) tracker.Reconcile();
        Assert.True(GC.GetAllocatedBytesForCurrentThread() - before < 10_000);
        Assert.All(rows, row => Assert.Equal(1, row.Subscriptions));
    }

    [Fact]
    public async Task MultipleGridsOwnIndependentSubscriptions()
    {
        var row = new Row(); var rows = new ObservableCollection<Row> { row };
        var a = await Setup(rows); var b = await Setup(rows);
        await using (a.Renderer) await using (b.Renderer)
        {
            Assert.Equal(2, row.Subscriptions); row.Change();
            await WaitForSync(a.Interop, 2); await WaitForSync(b.Interop, 2);
            Assert.Equal(2, a.Interop.Syncs.Length); Assert.Equal(2, b.Interop.Syncs.Length);
            await a.Grid.DisposeAsync(); Assert.Equal(1, row.Subscriptions);
            row.Change(); await WaitForSync(b.Interop, 3);
        }
        Assert.Equal(0, row.Subscriptions);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static WeakReference ReleasedTracker(Row row)
    {
        var tracker = new DataChangeTracker<Row>(() => { });
        tracker.SetSource(new ObservableCollection<Row> { row }); tracker.Reconcile();
        var weak = new WeakReference(tracker); tracker.Dispose(); return weak;
    }
    [Fact]
    public void DisposedTrackerIsCollectibleWhilePublisherRemainsAlive()
    {
        var row = new Row(); var weak = ReleasedTracker(row);
        GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
        Assert.False(weak.IsAlive); Assert.Equal(0, row.Subscriptions); GC.KeepAlive(row);
    }
}
