using System.Collections.ObjectModel;
using System.Reflection;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.JSInterop;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class ObsoleteSourceRetentionTests
{
    private static object? SuccessfulSource(DataGrid<AutomaticDataSynchronizationTests.Row> grid) =>
        grid.GetType().GetField("synchronizedData", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(grid);

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static async Task<(TestRenderer Renderer, RecordingInterop Interop, DataGrid<AutomaticDataSynchronizationTests.Row> Grid, int Root, WeakReference Old)> Overlap()
    {
        var interop = new RecordingInterop();
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(interop).BuildServiceProvider();
        var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<AutomaticDataSynchronizationTests.Row>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        ObservableCollection<AutomaticDataSynchronizationTests.Row>? old = [new() { Id = 1 }];
        var weak = new WeakReference(old);
        await renderer.Render(root, ("Data", old));
        interop.UpdateGate = new(TaskCreationOptions.RunContinuationsAsynchronously);
        interop.UpdateStarted = new(TaskCreationOptions.RunContinuationsAsynchronously);
        Task? refreshing = grid.RefreshDataAsync().AsTask();
        await interop.UpdateStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await renderer.Render(root, ("Data", new ObservableCollection<AutomaticDataSynchronizationTests.Row> { new() { Id = 2 } }));
        Assert.Equal(2, interop.Syncs.Length); // replacement waits at the existing gate
        interop.Failures["updateInputs"] = new JSException("replacement failed");
        var replacementStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        interop.UpdateStarted = replacementStarted;
        interop.UpdateGate.SetResult(); await refreshing; refreshing = null;
        await replacementStarted.Task.WaitAsync(TimeSpan.FromSeconds(5)); await renderer.Drain();
        old = null;
        return (renderer, interop, grid, root, weak);
    }

    [Fact]
    public async Task ObsoleteInFlightSuccessDoesNotRestoreItsSourceAfterReplacementFails()
    {
        var (renderer, interop, grid, root, old) = await Overlap();
        await using (renderer)
        {
            Assert.NotEmpty(renderer.Errors);
            Assert.Null(SuccessfulSource(grid));
            GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();
            Assert.False(old.IsAlive);
            interop.Failures.Clear(); await renderer.Render(root); await renderer.Drain();
            Assert.Same(grid.Data, SuccessfulSource(grid));
            Assert.Equal(2, interop.Syncs.Last().GetProperty("data")[0].GetProperty("id").GetInt32());
        }
    }

    [Fact]
    public async Task SourceReplacementBackToTheCapturedReferenceStillSynchronizesTheLatestRows()
    {
        var interop = new RecordingInterop();
        var services = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(interop).BuildServiceProvider();
        await using var renderer = new TestRenderer(services);
        var grid = await renderer.Dispatcher.InvokeAsync(() => renderer.Create<DataGrid<Employee>>());
        var root = await renderer.Dispatcher.InvokeAsync(() => renderer.Mount(grid));
        var original = new List<Employee> { new() { Name = "Original" } };
        await renderer.Render(root, ("Data", original));
        interop.UpdateGate = new(TaskCreationOptions.RunContinuationsAsynchronously);
        interop.UpdateStarted = new(TaskCreationOptions.RunContinuationsAsynchronously);
        var refreshing = grid.RefreshDataAsync().AsTask();
        await interop.UpdateStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await renderer.Render(root, ("Data", new List<Employee>()));
        original[0].Name = "Latest";
        await renderer.Render(root, ("Data", original));
        interop.UpdateGate.SetResult(); await refreshing;
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        while (interop.Syncs.Length < 3) await Task.Delay(5, timeout.Token);
        Assert.Equal("Latest", interop.Syncs.Last().GetProperty("data")[0].GetProperty("employee_name").GetString());
        await renderer.Render(root); Assert.Equal(3, interop.Syncs.Length); Assert.Empty(renderer.Errors);
    }
}
