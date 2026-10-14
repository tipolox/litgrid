using System.Collections;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.JSInterop;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class DataSynchronizationTests
{
    private sealed class Rows : IEnumerable<Employee>
    {
        public List<Employee> Items { get; } = [new() { Id = 1, Name = "Ada" }];
        public int Enumerations;
        public IEnumerator<Employee> GetEnumerator() { Enumerations++; return Items.GetEnumerator(); }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
    private static async Task<(TestRenderer Renderer, RecordingInterop Interop, DataGrid<Employee> Grid, int Root, Rows Data)> Setup(long? revision = 1)
    {
        var interop = new RecordingInterop();
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(interop).BuildServiceProvider();
        var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<Employee>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        var data = new Rows();
        await renderer.Render(root, ("Data", data), ("DataRevision", revision), ("DataSyncMode", DataSyncMode.Legacy),
            ("Columns", new[] { new GridColumn { Key = "id", Header = "ID", Width = 80 } }));
        await renderer.Drain();
        Assert.Empty(renderer.Errors);
        return (renderer, interop, grid, root, data);
    }

    [Fact]
    public async Task InitialLoadAndUnchangedVersionedRendersDoNotEnumerateOrInteropAgain()
    {
        var (renderer, interop, _, root, data) = await Setup();
        await using (renderer)
        {
            Assert.Equal(1, data.Enumerations);
            var initial = Assert.Single(interop.Syncs);
            Assert.True(initial.TryGetProperty("data", out _));
            for (var i = 0; i < 5; i++) await renderer.Render(root);
            Assert.Equal(1, data.Enumerations);
            Assert.Single(interop.Syncs);
            Assert.Empty(renderer.Errors);
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData(1L)]
    public async Task SameReferenceItemAndCollectionMutationsRespectRevisionContract(long? revision)
    {
        var (renderer, interop, _, root, data) = await Setup(revision);
        await using (renderer)
        {
            data.Items[0].Name = "Changed";
            data.Items.Add(new() { Id = 2, Name = "Grace" });
            await renderer.Render(root);
            Assert.Equal(revision == null ? 2 : 1, data.Enumerations);
            if (revision != null) await renderer.Render(root, ("DataRevision", 2L));
            Assert.Equal(2, data.Enumerations);
            var last = interop.Syncs.Last();
            Assert.Equal(2, last.GetProperty("data").GetArrayLength());
            Assert.Equal("Changed", last.GetProperty("data")[0].GetProperty("employee_name").GetString());
            Assert.False(last.TryGetProperty("columns", out _));
            Assert.False(last.TryGetProperty("config", out _));
        }
    }

    [Fact]
    public async Task ReferenceReplacementSynchronizesWithUnchangedRevision()
    {
        var (renderer, interop, _, root, data) = await Setup();
        await using (renderer)
        {
            var replacement = new Rows();
            await renderer.Render(root, ("Data", replacement));
            Assert.Equal(1, replacement.Enumerations);
            Assert.Equal(1, data.Enumerations);
            Assert.Equal(2, interop.Syncs.Length);
        }
    }

    [Fact]
    public async Task NullTransitionsSynchronizeAndThenUseTheirOwnMode()
    {
        var (renderer, interop, _, root, data) = await Setup(null);
        await using (renderer)
        {
            await renderer.Render(root, ("DataRevision", 1L));
            Assert.Equal(2, data.Enumerations);
            await renderer.Render(root);
            Assert.Equal(2, data.Enumerations);
            await renderer.Render(root, ("DataRevision", null));
            Assert.Equal(3, data.Enumerations);
            await renderer.Render(root);
            Assert.Equal(4, data.Enumerations);
            Assert.Equal(4, interop.Syncs.Length);
        }
    }

    [Fact]
    public async Task RefreshForcesDataOnlyAndIsRejectedAfterDisposal()
    {
        var (renderer, interop, grid, root, data) = await Setup();
        await using (renderer)
        {
            data.Items[0].Name = "Forced";
            await grid.RefreshDataAsync();
            Assert.Equal(2, data.Enumerations);
            Assert.Equal(new[] { "data", "declarativeColumns" }, interop.Syncs.Last().EnumerateObject().Select(p => p.Name));
            await renderer.Render(root);
            Assert.Equal(2, data.Enumerations);
            await grid.DisposeAsync();
            await Assert.ThrowsAsync<InvalidOperationException>(() => grid.RefreshDataAsync().AsTask());
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailedDataOperationsRetryWithoutRecordingSuccess(bool refresh)
    {
        var (renderer, interop, grid, root, data) = await Setup();
        await using (renderer)
        {
            var failure = new JSException("data failed");
            interop.Failures["updateInputs"] = failure;
            if (refresh) Assert.Same(failure, await Assert.ThrowsAsync<JSException>(() => grid.RefreshDataAsync().AsTask()));
            else await renderer.Render(root, ("DataRevision", 2L));
            interop.Failures.Clear(); renderer.Errors.Clear();
            await renderer.Render(root);
            Assert.Equal(3, data.Enumerations);
            Assert.Equal(3, interop.Syncs.Length);
            await renderer.Render(root);
            Assert.Equal(3, data.Enumerations);
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task ScalarConfigurationAndProgrammaticMutationsAreIndependentOfRows()
    {
        var (renderer, interop, _, root, data) = await Setup();
        await using (renderer)
        {
            var config = new GridConfig { Selection = new() { Mode = SelectionMode.Cell } };
            var columns = new[] { new GridColumn { Key = "id", Header = "ID", Width = 80 } };
            await renderer.Render(root, ("Config", config), ("Columns", columns));
            Assert.False(interop.Syncs.Last().TryGetProperty("columns", out _));
            config.Selection.Mode = SelectionMode.MultiCell;
            await renderer.Render(root, ("Config", config));
            Assert.Equal("multi-cell", interop.Syncs.Last().GetProperty("config").GetProperty("selection").GetProperty("mode").GetString());
            Assert.False(interop.Syncs.Last().TryGetProperty("data", out _));
            columns[0].Header = "Identifier"; columns[0].Width = 100; columns[0].Hidden = true;
            await renderer.Render(root);
            Assert.True(interop.Syncs.Last().TryGetProperty("columns", out _));
            Assert.False(interop.Syncs.Last().TryGetProperty("config", out _));
            await renderer.Render(root, ("AriaLabel", "New label"), ("ColumnStateStorageKey", "new-namespace"));
            Assert.Equal("New label", interop.Syncs.Last().GetProperty("ariaLabel").GetString());
            Assert.False(interop.Syncs.Last().TryGetProperty("columns", out _));
            Assert.Equal(1, data.Enumerations);
        }
    }

    [Fact]
    public async Task RapidRevisionsAndRefreshShareGateAndLatestSnapshotWins()
    {
        var (renderer, interop, grid, root, data) = await Setup();
        await using (renderer)
        {
            interop.UpdateGate = new(); interop.UpdateStarted = new();
            await renderer.Render(root, ("DataRevision", 2L));
            await interop.UpdateStarted.Task;
            await renderer.Render(root, ("DataRevision", 3L), ("AriaLabel", "Latest"));
            var refresh = grid.RefreshDataAsync().AsTask();
            await renderer.Drain();
            Assert.Equal(2, interop.Syncs.Length);
            interop.UpdateGate.SetResult();
            await refresh.WaitAsync(TimeSpan.FromSeconds(2)); await renderer.Drain();
            Assert.Equal(4, interop.Syncs.Length); // initial, revision 2, latest, forced refresh
            Assert.Contains(interop.Syncs, sync => sync.TryGetProperty("ariaLabel", out var label) && label.GetString() == "Latest");
            var count = data.Enumerations;
            await renderer.Render(root);
            Assert.Equal(count, data.Enumerations);
            Assert.Empty(renderer.Errors);
        }
    }

    [Theory]
    [InlineData("AriaLabel")]
    [InlineData("Columns")]
    public async Task FailedIndependentInputsRetryWithoutTransferringData(string name)
    {
        var (renderer, interop, _, root, data) = await Setup();
        await using (renderer)
        {
            object value = name == "AriaLabel" ? "Retry label" : new[] { new GridColumn { Key = "id", Header = "Retry header" } };
            interop.Failures["updateInputs"] = new JSException("independent input failed");
            await renderer.Render(root, (name, value));
            Assert.NotEmpty(renderer.Errors);
            interop.Failures.Clear(); renderer.Errors.Clear();
            await renderer.Render(root);
            Assert.Equal(3, interop.Syncs.Length);
            Assert.True(interop.Syncs.Last().TryGetProperty(name == "AriaLabel" ? "ariaLabel" : "columns", out _));
            Assert.Equal(1, data.Enumerations);
            await renderer.Render(root);
            Assert.Equal(3, interop.Syncs.Length);
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task InFlightSnapshotsCannotRecordNewerMutableConfigurationOrColumns()
    {
        var (renderer, interop, _, root, data) = await Setup();
        await using (renderer)
        {
            var config = new GridConfig { Selection = new() { Mode = SelectionMode.Cell } };
            var columns = new[] { new GridColumn { Key = "id", Header = "ID", Width = 80 } };
            await renderer.Render(root, ("Config", config), ("Columns", columns));
            interop.UpdateGate = new(); interop.UpdateStarted = new();
            config.Selection.Mode = SelectionMode.MultiCell; columns[0].Header = "Pending";
            await renderer.Render(root);
            await interop.UpdateStarted.Task;
            config.Selection.Mode = SelectionMode.Cell; columns[0].Header = "ID";
            await renderer.Render(root);
            var latestStarted = new TaskCompletionSource(); interop.UpdateStarted = latestStarted;
            interop.UpdateGate.SetResult();
            await latestStarted.Task.WaitAsync(TimeSpan.FromSeconds(2)); await renderer.Drain();
            Assert.Equal("cell", interop.Syncs.Last().GetProperty("config").GetProperty("selection").GetProperty("mode").GetString());
            Assert.Equal("ID", interop.Syncs.Last().GetProperty("columns")[0].GetProperty("header").GetString());
            Assert.False(interop.Syncs.Last().TryGetProperty("data", out _));
            Assert.Equal(1, data.Enumerations);
            Assert.Empty(renderer.Errors);
        }
    }

    [Theory]
    [InlineData("Data")]
    [InlineData("Columns")]
    [InlineData("Config")]
    [InlineData("AriaLabel")]
    public async Task FailedPayloadFieldsRetryEvenWhenParametersRevertToSuccessfulValues(string name)
    {
        var (renderer, interop, grid, root, data) = await Setup();
        await using (renderer)
        {
            object oldValue = name switch
            {
                "Data" => data, "Columns" => grid.Columns, "Config" => grid.Config, _ => grid.AriaLabel
            };
            object newValue = name switch
            {
                "Data" => new Rows(), "Columns" => new[] { new GridColumn { Key = "id", Header = "Changed" } },
                "Config" => new GridConfig { Selection = new() { Mode = SelectionMode.Cell } }, _ => "Changed"
            };
            interop.Failures["updateInputs"] = new JSException("partial application is possible");
            await renderer.Render(root, (name, newValue));
            Assert.NotEmpty(renderer.Errors);
            interop.Failures.Clear(); renderer.Errors.Clear();
            await renderer.Render(root, (name, oldValue));
            Assert.Equal(3, interop.Syncs.Length);
            Assert.True(interop.Syncs.Last().TryGetProperty(char.ToLowerInvariant(name[0]) + name[1..], out _));
            var count = interop.Syncs.Length;
            await renderer.Render(root);
            Assert.Equal(count, interop.Syncs.Length);
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task DisposalCancelsVersionedSyncAndQueuedRefresh()
    {
        var (renderer, interop, grid, root, _) = await Setup();
        await using (renderer)
        {
            interop.UpdateGate = new();
            await renderer.Render(root, ("DataRevision", 2L));
            var refresh = grid.RefreshDataAsync().AsTask(); await renderer.Drain();
            var count = interop.Syncs.Length;
            await grid.DisposeAsync(); await refresh.WaitAsync(TimeSpan.FromSeconds(2));
            Assert.Equal(count, interop.Syncs.Length);
            Assert.True(interop.Tokens["updateInputs"].IsCancellationRequested);
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task DeclarativeChildOnlyAndNamespaceChangesDoNotTransferRows()
    {
        var interop = new RecordingInterop();
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(interop).BuildServiceProvider();
        await using var renderer = new TestRenderer(services);
        var host = new DeclarativeHost();
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(host));
        await renderer.Render(root, ("Revision", 1L), ("SelfUpdating", true), ("StorageKey", "a")); await renderer.Drain();
        await renderer.Dispatcher.InvokeAsync(() => host.ChildColumn!.ChangeTitle("New department")); await renderer.Drain();
        Assert.False(interop.Syncs.Last().TryGetProperty("data", out _));
        await renderer.Render(root, ("StorageKey", "b"));
        Assert.False(interop.Syncs.Last().TryGetProperty("columns", out _));
        Assert.False(interop.Syncs.Last().TryGetProperty("data", out _));
        Assert.Equal("b", interop.Syncs.Last().GetProperty("columnStateStorageKey").GetString());
        Assert.Empty(renderer.Errors);
    }
}
