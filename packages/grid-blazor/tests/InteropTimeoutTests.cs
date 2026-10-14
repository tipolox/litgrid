using System.Text.Json;
using System.ComponentModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class InteropTimeoutTests
{
    // Exercise the real JSRuntime timeout/overload behavior, not an injected OCE.
    private sealed class Runtime : JSRuntime
    {
        public Runtime() => DefaultAsyncTimeout = TimeSpan.FromMilliseconds(100);
        internal bool LoseNext;
        internal bool LoseImport;
        internal TaskCompletionSource Started = new(TaskCreationOptions.RunContinuationsAsynchronously);
        internal List<(long Id, string Name, JsonElement Inputs)> Calls = [];
        protected override void EndInvokeDotNet(DotNetInvocationInfo invocationInfo, in DotNetInvocationResult invocationResult) { }
        protected override void BeginInvokeJS(long taskId, string identifier, string? argsJson, JSCallResultType resultType, long targetInstanceId)
        {
            var args = JsonSerializer.Deserialize<JsonElement>(argsJson ?? "[]");
            Calls.Add((taskId, identifier, args));
            if (identifier == "import")
            {
                if (LoseImport) { LoseImport = false; Started.TrySetResult(); return; }
                DotNetDispatcher.EndInvokeJS(this, $"[{taskId},true,{{\"__jsObjectId\":1}}]");
                return;
            }
            if (LoseNext && identifier is "initGrid" or "updateInputs")
            {
                LoseNext = false;
                Started.TrySetResult();
                return; // Transport drops the acknowledgment.
            }
            Acknowledge(taskId);
        }
        internal void Acknowledge(long id) => DotNetDispatcher.EndInvokeJS(this, $"[{id},true,null]");
    }
    private static async Task<(TestRenderer Renderer, Runtime Runtime, DataGrid<Employee> Grid, int Root, List<Employee> Rows)> Setup(bool initialize = true)
    {
        var runtime = new Runtime { LoseNext = !initialize };
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(runtime).BuildServiceProvider();
        var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<Employee>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        var rows = new List<Employee> { new() { Id = 1, Name = "Original" } };
        await renderer.Render(root, ("Data", rows));
        return (renderer, runtime, grid, root, rows);
    }
    [Theory]
    [InlineData(DataSyncMode.Automatic)]
    [InlineData(DataSyncMode.Legacy)]
    public async Task FrameworkTimeoutReleasesGateAndQueuedRefreshRetriesLatestValues(DataSyncMode mode)
    {
        var (renderer, runtime, grid, root, rows) = await Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("DataSyncMode", mode));
            runtime.LoseNext = true;
            rows[0].Name = "Unacknowledged";
            var failed = grid.RefreshDataAsync().AsTask();
            await runtime.Started.Task.WaitAsync(TimeSpan.FromSeconds(2));
            var lost = runtime.Calls.Last().Id;
            rows[0].Name = "Original";
            var queued = grid.RefreshDataAsync().AsTask();
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => failed.WaitAsync(TimeSpan.FromSeconds(2)));
            await queued.WaitAsync(TimeSpan.FromSeconds(2));
            var count = runtime.Calls.Count;
            // A late acknowledgment cannot resurrect the failed successful-state snapshot.
            runtime.Acknowledge(lost);
            Assert.Equal("Original", runtime.Calls.Last().Inputs[1].GetProperty("data")[0].GetProperty("employee_name").GetString());
            await renderer.Render(root);
            Assert.Equal(count + (mode == DataSyncMode.Legacy ? 1 : 0), runtime.Calls.Count);
            Assert.Empty(renderer.Errors);
        }
    }
    [Fact]
    public async Task ParameterRenderTimeoutPreservesCircuitAndPendingRetry()
    {
        var (renderer, runtime, _, root, _) = await Setup();
        await using (renderer)
        {
            runtime.LoseNext = true;
            await renderer.Render(root, ("DataRevision", 1L));
            await runtime.Started.Task.WaitAsync(TimeSpan.FromSeconds(2));
            await Task.Delay(200);
            await renderer.Drain();
            Assert.Empty(renderer.Errors);
            var before = runtime.Calls.Count;
            // Reverting the revision must still retry the uncertain data operation.
            await renderer.Render(root, ("DataRevision", (long?)null));
            Assert.Equal(before + 1, runtime.Calls.Count);
            Assert.True(runtime.Calls.Last().Inputs[1].TryGetProperty("data", out _));
        }
    }
    private sealed class NotifyingRow : INotifyPropertyChanged
    {
        public string Name { get; set; } = "initial";
        public event PropertyChangedEventHandler? PropertyChanged;
        public void Change() { Name = "notified"; PropertyChanged?.Invoke(this, new(nameof(Name))); }
    }
    [Fact]
    public async Task PropertyNotificationTimeoutRemainsPendingUntilAValidRenderRetries()
    {
        var runtime = new Runtime();
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(runtime).BuildServiceProvider();
        await using var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<NotifyingRow>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        var row = new NotifyingRow();
        await renderer.Render(root, ("Data", new[] { row }));
        runtime.LoseNext = true;
        row.Change();
        await runtime.Started.Task.WaitAsync(TimeSpan.FromSeconds(2));
        await Task.Delay(200); await renderer.Drain();
        Assert.Empty(renderer.Errors);
        var count = runtime.Calls.Count;
        await renderer.Render(root);
        Assert.Equal(count + 1, runtime.Calls.Count);
        Assert.Equal("notified", runtime.Calls.Last().Inputs[1].GetProperty("data")[0].GetProperty("name").GetString());
    }
    [Fact]
    public async Task ImportTimeoutPreservesCircuitAndAllowsInitializationRetry()
    {
        var runtime = new Runtime { LoseImport = true };
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(runtime).BuildServiceProvider();
        await using var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<Employee>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        await renderer.Render(root, ("Data", new[] { new Employee { Name = "initial" } }));
        await Task.Delay(200); await renderer.Drain();
        Assert.Empty(renderer.Errors);
        await renderer.Render(root);
        Assert.Equal(2, runtime.Calls.Count(c => c.Name == "import"));
        Assert.Single(runtime.Calls, c => c.Name == "initGrid");
    }
    [Fact]
    public async Task InitializationTimeoutRemainsRetryable()
    {
        var (renderer, runtime, _, root, _) = await Setup(initialize: false);
        await using (renderer)
        {
            await Task.Delay(200); await renderer.Drain();
            Assert.Empty(renderer.Errors);
            await renderer.Render(root);
            Assert.Equal(2, runtime.Calls.Count(c => c.Name == "initGrid"));
        }
    }
    [Fact]
    public async Task DisposalCancelsWaitWithoutDisablingFrameworkDeadline()
    {
        var (renderer, runtime, grid, _, _) = await Setup();
        await using (renderer)
        {
            runtime.LoseNext = true;
            var pending = grid.RefreshDataAsync().AsTask();
            await runtime.Started.Task.WaitAsync(TimeSpan.FromSeconds(2));
            await grid.DisposeAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(2));
            await pending.WaitAsync(TimeSpan.FromSeconds(2));
            await grid.DisposeAsync();
            Assert.Empty(renderer.Errors);
        }
    }
}
