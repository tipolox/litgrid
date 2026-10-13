using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.JSInterop;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public record ColumnSpec(string Id, Expression<Func<Employee, object?>>? Field = null,
    string? Key = null, string? Title = null, object? Width = null, bool? Hidden = null, int? Order = null);

// Exercise the public Renderer lifecycle; no private render-tree inspection or fake
// calls to child lifecycle methods. The Razor fixture also compiles generic cascading.
#pragma warning disable BL0006
internal sealed class TestRenderer(IServiceProvider services) : Renderer(services, NullLoggerFactory.Instance)
{
    public override Dispatcher Dispatcher { get; } = Dispatcher.CreateDefault();
    public List<Exception> Errors { get; } = [];
    protected override void HandleException(Exception exception) => Errors.Add(exception);
    protected override Task UpdateDisplayAsync(in RenderBatch renderBatch) => Task.CompletedTask;
    internal int Mount(IComponent component) => AssignRootComponentId(component);
    internal Task Render(int id, params (string Name, object? Value)[] parameters)
        => Dispatcher.InvokeAsync(() => RenderRootComponentAsync(id,
            ParameterView.FromDictionary(parameters.ToDictionary(pair => pair.Name, pair => pair.Value))));
    internal Task Drain() => Dispatcher.InvokeAsync(async () => { await Task.Yield(); await Task.Yield(); });
}
#pragma warning restore BL0006

internal sealed class RecordingInterop : IJSRuntime, IJSObjectReference
{
    internal List<(string Name, JsonElement Inputs)> Calls { get; } = [];
    internal TaskCompletionSource? ImportGate { get; set; }
    internal TaskCompletionSource? UpdateGate { get; set; }
    internal TaskCompletionSource? InitializationGate { get; set; }
    internal TaskCompletionSource? UpdateStarted { get; set; }
    internal Dictionary<string, Exception> Failures { get; } = [];
    internal Dictionary<string, CancellationToken> Tokens { get; } = [];
    internal Exception? ModuleDisposalFailure { get; set; }
    internal Exception? LateImportFailure { get; set; }
    internal TaskCompletionSource ModuleDisposalStarted { get; } = new();
    internal DotNetObjectReference<DataGrid<Employee>>? Reference { get; private set; }
    internal int ModuleDisposals { get; private set; }
    private readonly JsonSerializerOptions json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args)
        => InvokeAsync<TValue>(identifier, CancellationToken.None, args);
    public async ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        Calls.Add((identifier, JsonSerializer.SerializeToElement(args?.LastOrDefault(), json)));
        Tokens[identifier] = cancellationToken;
        if (identifier == "updateInputs") UpdateStarted?.TrySetResult();
        if (identifier == "initGrid") Reference = (DotNetObjectReference<DataGrid<Employee>>)args![1]!;
        if (Failures.TryGetValue(identifier, out var failure)) throw failure;
        if (identifier == "import")
        {
            if (ImportGate != null) await ImportGate.Task.WaitAsync(cancellationToken);
            if (LateImportFailure != null) throw LateImportFailure;
            return (TValue)(object)this;
        }
        if (identifier == "initGrid" && InitializationGate != null) await InitializationGate.Task.WaitAsync(cancellationToken);
        if (identifier == "updateInputs" && UpdateGate != null) await UpdateGate.Task.WaitAsync(cancellationToken);
        return default!;
    }
    public ValueTask DisposeAsync()
    {
        ModuleDisposals++;
        ModuleDisposalStarted.TrySetResult();
        return ModuleDisposalFailure == null ? ValueTask.CompletedTask : ValueTask.FromException(ModuleDisposalFailure);
    }
    internal JsonElement[] Syncs => Calls.Where(call => call.Name is "initGrid" or "updateInputs").Select(call => call.Inputs).ToArray();
}

internal sealed class RecordingLogger : ILogger<DataGrid<Employee>>
{
    internal List<Exception> Errors { get; } = [];
    internal TaskCompletionSource Logged { get; } = new();
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        if (exception != null) Errors.Add(exception);
        Logged.TrySetResult();
    }
}

public class DeclarativeComponentTests
{
    private static (TestRenderer Renderer, RecordingInterop Interop, int Root) Setup(DeclarativeHost? host = null, RecordingLogger? logger = null)
    {
        var interop = new RecordingInterop();
        var collection = new ServiceCollection().AddLogging().AddSingleton<IJSRuntime>(interop);
        if (logger != null) collection.AddSingleton<ILogger<DataGrid<Employee>>>(logger);
        var services = collection.BuildServiceProvider();
        var renderer = new TestRenderer(services);
        host ??= new DeclarativeHost();
        return (renderer, interop, renderer.Dispatcher.InvokeAsync(() => renderer.Mount(host)).GetAwaiter().GetResult());
    }

    private static ColumnSpec[] Basic => [new("id", e => e.Id, Title: "ID", Width: "80"), new("name", e => e.Name, Title: "Name", Width: 220)];

    private static void AssertReleased(DataGrid<Employee> grid, RecordingInterop interop)
    {
        Assert.Throws<ObjectDisposedException>(() => _ = interop.Reference!.Value);
        var gate = (SemaphoreSlim)typeof(DataGrid<Employee>)
            .GetField("synchronization", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(grid)!;
        Assert.Equal(1, gate.CurrentCount);
        Assert.Equal(1, interop.ModuleDisposals);
    }

    [Theory]
    [InlineData("import")]
    [InlineData("module")]
    public async Task UnexpectedLateImportCleanupFailuresAreLogged(string target)
    {
        var logger = new RecordingLogger();
        var (renderer, interop, root) = Setup(logger: logger);
        interop.ImportGate = new();
        await renderer.Render(root, ("Specs", Basic));
        await renderer.Drain();
        await renderer.Dispatcher.InvokeAsync(async () => await ((IAsyncDisposable)renderer).DisposeAsync())
            .WaitAsync(TimeSpan.FromSeconds(2));
        var failure = new JSException("Unexpected deferred failure");
        if (target == "import") interop.LateImportFailure = failure;
        else interop.ModuleDisposalFailure = failure;
        interop.ImportGate.SetResult();
        await logger.Logged.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Same(failure, Assert.Single(logger.Errors));
        Assert.Empty(interop.Syncs);
    }

    [Fact]
    public async Task LateDisconnectedImportIsHandledWithoutUnexpectedErrors()
    {
        var logger = new RecordingLogger();
        var (renderer, interop, root) = Setup(logger: logger);
        interop.ImportGate = new();
        await renderer.Render(root, ("Specs", Basic));
        await renderer.Drain();
        await renderer.Dispatcher.InvokeAsync(async () => await ((IAsyncDisposable)renderer).DisposeAsync());
        interop.LateImportFailure = new JSDisconnectedException("Disconnected during navigation");
        interop.ImportGate.SetResult();
        await renderer.Drain();
        Assert.Empty(logger.Errors);
        Assert.Empty(interop.Syncs);
    }

    [Theory]
    [InlineData("initGrid")]
    [InlineData("updateInputs")]
    public async Task DisposalCancelsPendingInteropAndQueuedSynchronization(string stage)
    {
        var host = new DeclarativeHost();
        var (renderer, interop, root) = Setup(host);
        await using (renderer)
        {
            var pending = new TaskCompletionSource();
            if (stage == "initGrid") interop.InitializationGate = pending;
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            if (stage == "updateInputs")
            {
                interop.UpdateGate = pending;
                await renderer.Render(root, ("Specs", new[] { Basic[0] with { Title = "First" } }));
                await renderer.Drain();
            }
            // Queue another render behind the operation owning the gate.
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            var count = interop.Syncs.Length;
            await renderer.Dispatcher.InvokeAsync(async () => await host.Grid!.DisposeAsync())
                .WaitAsync(TimeSpan.FromSeconds(2));
            await renderer.Drain();
            Assert.False(pending.Task.IsCompleted);
            Assert.True(interop.Tokens[stage].IsCancellationRequested);
            Assert.False(interop.Tokens["disposeGrid"].IsCancellationRequested);
            AssertReleased(host.Grid!, interop);
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            Assert.Equal(count, interop.Syncs.Length);
            await Assert.ThrowsAsync<InvalidOperationException>(() => host.Grid!.GetColumnOrderAsync().AsTask());
            Assert.Empty(renderer.Errors);
        }
    }

    [Theory]
    [InlineData("grid", "cancel")]
    [InlineData("grid", "disconnect")]
    [InlineData("module", "cancel")]
    [InlineData("module", "disconnect")]
    [InlineData("both", "cancel")]
    [InlineData("both", "disconnect")]
    public async Task ExpectedCleanupFailuresReleaseReferencesAndGate(string target, string reason)
    {
        var host = new DeclarativeHost();
        var (renderer, interop, root) = Setup(host);
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            Exception failure = reason == "cancel" ? new OperationCanceledException() : new JSDisconnectedException("Disconnected");
            if (target is "grid" or "both") interop.Failures["disposeGrid"] = failure;
            if (target is "module" or "both") interop.ModuleDisposalFailure = failure;
            await renderer.Dispatcher.InvokeAsync(async () => await host.Grid!.DisposeAsync());
            Assert.True(interop.Tokens["disposeGrid"].CanBeCanceled);
            AssertReleased(host.Grid!, interop);
            await host.Grid!.DisposeAsync();
            Assert.Equal(1, interop.ModuleDisposals);
            Assert.Empty(renderer.Errors);
        }
    }

    [Theory]
    [InlineData("grid")]
    [InlineData("module")]
    public async Task UnexpectedCleanupErrorsPropagateAfterReleasingReferences(string target)
    {
        var host = new DeclarativeHost();
        var (renderer, interop, root) = Setup(host);
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            var failure = new JSException("Unexpected cleanup failure");
            if (target == "grid") interop.Failures["disposeGrid"] = failure;
            else interop.ModuleDisposalFailure = failure;
            var actual = await Assert.ThrowsAsync<JSException>(() => renderer.Dispatcher.InvokeAsync(async () => await host.Grid!.DisposeAsync()));
            Assert.Same(failure, actual);
            AssertReleased(host.Grid!, interop);
        }
    }

    [Fact]
    public async Task UnexpectedInitializationErrorIsReportedAndCanRetryNormally()
    {
        var host = new DeclarativeHost();
        var (renderer, interop, root) = Setup(host);
        await using (renderer)
        {
            var failure = new JSException("Unexpected initialization failure");
            interop.Failures["initGrid"] = failure;
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            Assert.Contains(renderer.Errors, error => ReferenceEquals(error, failure) ||
                error is AggregateException aggregate && aggregate.Flatten().InnerExceptions.Contains(failure));
            var reference = interop.Reference;
            interop.Failures.Clear();
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            Assert.Same(reference, interop.Reference);
            Assert.Equal("id", interop.Syncs.Last().GetProperty("columns")[0].GetProperty("key").GetString());
        }
        AssertReleased(host.Grid!, interop);
    }

    [Fact]
    public async Task BothUnexpectedCleanupErrorsArePreserved()
    {
        var host = new DeclarativeHost();
        var (renderer, interop, root) = Setup(host);
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            var gridFailure = new JSException("Grid cleanup failed");
            var moduleFailure = new JSException("Module cleanup failed");
            interop.Failures["disposeGrid"] = gridFailure;
            interop.ModuleDisposalFailure = moduleFailure;
            var actual = await Assert.ThrowsAsync<AggregateException>(() => renderer.Dispatcher.InvokeAsync(async () => await host.Grid!.DisposeAsync()));
            Assert.Equal(new Exception[] { gridFailure, moduleFailure }, actual.InnerExceptions);
            AssertReleased(host.Grid!, interop);
        }
    }

    [Fact]
    public async Task ChildOnlyUpdatesNotifyOwnerWithoutReserializingData()
    {
        var host = new DeclarativeHost();
        var (renderer, interop, root) = Setup(host);
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic), ("SelfUpdating", true));
            await renderer.Drain();
            Assert.Equal(3, interop.Syncs.Single().GetProperty("columns").GetArrayLength());
            await host.ChildColumn!.ChangeTitle("Team");
            await renderer.Drain();
            var update = interop.Syncs.Last();
            Assert.False(update.TryGetProperty("data", out _));
            Assert.Equal("Team", update.GetProperty("columns")[2].GetProperty("header").GetString());
            Assert.Equal(2, interop.Syncs.Length);
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task OverlappingUpdatesApplyLatestSnapshotAndRemainSerialized()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            interop.UpdateGate = new();
            await renderer.Render(root, ("Specs", new[] { Basic[0] with { Title = "First" } }));
            await renderer.Drain();
            Assert.Equal(2, interop.Syncs.Length);
            await renderer.Render(root, ("Specs", new[] { Basic[0] with { Title = "Latest" }, Basic[1] }));
            await renderer.Drain();
            Assert.Equal(2, interop.Syncs.Length);
            var latestStarted = interop.UpdateStarted = new TaskCompletionSource();
            interop.UpdateGate.SetResult();
            await latestStarted.Task.WaitAsync(TimeSpan.FromSeconds(2));
            await renderer.Drain();
            Assert.Equal("Latest", interop.Syncs.Last().GetProperty("columns")[0].GetProperty("header").GetString());
            Assert.Equal(3, interop.Syncs.Length);
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task CascadesTypeMountsCompleteSchemaAndSkipsUnchangedMetadata()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            Assert.Empty(renderer.Errors);
            var initial = Assert.Single(interop.Syncs);
            Assert.Equal(new[] { "id", "employee_name" }, initial.GetProperty("columns").EnumerateArray().Select(column => column.GetProperty("key").GetString()));
            Assert.Equal(80, initial.GetProperty("columns")[0].GetProperty("width").GetDouble());
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            var update = interop.Syncs.Last();
            Assert.False(update.TryGetProperty("columns", out _));
            Assert.True(update.TryGetProperty("data", out _));
            Assert.Equal(2, interop.Syncs.Length);
        }
        Assert.Equal(1, interop.ModuleDisposals);
        Assert.Single(interop.Calls, call => call.Name == "disposeGrid");
    }

    [Fact]
    public async Task DynamicParametersRemovalReplacementAndEmptySchemaAreBatched()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            await renderer.Render(root, ("Specs", new[] { Basic[1] with { Title = "Person", Order = 0, Hidden = true }, Basic[0] with { Order = 1 } }));
            await renderer.Drain();
            Assert.Equal(2, interop.Syncs.Length);
            var changed = interop.Syncs.Last();
            Assert.True(changed.GetProperty("columnOrderChanged").GetBoolean());
            Assert.Equal("Person", changed.GetProperty("columns")[0].GetProperty("header").GetString());
            Assert.True(changed.GetProperty("columns")[0].GetProperty("hidden").GetBoolean());
            await renderer.Render(root, ("Specs", new[] { new ColumnSpec("department", e => e.Department) }));
            await renderer.Drain();
            Assert.Single(interop.Syncs.Last().GetProperty("columns").EnumerateArray());
            await renderer.Render(root, ("Specs", Array.Empty<ColumnSpec>()));
            await renderer.Drain();
            Assert.Empty(interop.Syncs.Last().GetProperty("columns").EnumerateArray());
            Assert.True(interop.Syncs.Last().GetProperty("declarativeColumns").GetBoolean());
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task ProgrammaticColumnsKeepLiteralKeysAndLegacyInference()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Declarative", false), ("Programmatic", new[] { new GridColumn { Key = "Name" } }));
            await renderer.Drain();
            Assert.Equal("Name", interop.Syncs.Last().GetProperty("columns")[0].GetProperty("key").GetString());
            await renderer.Render(root, ("Programmatic", Array.Empty<GridColumn>()));
            await renderer.Drain();
            Assert.False(interop.Syncs.Last().GetProperty("declarativeColumns").GetBoolean());
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task DeclarativeAndProgrammaticColumnsProduceEquivalentDefinitions()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic));
            await renderer.Drain();
            var declared = interop.Syncs.Single().GetProperty("columns").GetRawText();
            await renderer.Render(root, ("Declarative", false), ("Programmatic", new[] {
                new GridColumn { Key = "id", Header = "ID", Width = 80d },
                new GridColumn { Key = "employee_name", Header = "Name", Width = 220d }
            }));
            await renderer.Drain();
            Assert.Equal(declared, interop.Syncs.Last().GetProperty("columns").GetRawText());
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task WideSchemaBatchesRegistrationsAndRemovalsIntoOneInteropPerRender()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            var specs = Enumerable.Range(0, 120).Select(i => new ColumnSpec($"c{i}", Key: $"c{i}", Order: i)).ToArray();
            await renderer.Render(root, ("Specs", specs));
            await renderer.Drain();
            Assert.Equal(120, interop.Syncs.Single().GetProperty("columns").GetArrayLength());
            for (var i = 0; i < 5; i++)
            {
                await renderer.Render(root, ("Specs", specs.Select(spec => spec with { }).ToArray()));
                await renderer.Drain();
                Assert.False(interop.Syncs.Last().TryGetProperty("columns", out _));
            }
            await renderer.Render(root, ("Specs", Array.Empty<ColumnSpec>()));
            await renderer.Drain();
            Assert.Equal(7, interop.Syncs.Length);
            Assert.Empty(interop.Syncs.Last().GetProperty("columns").EnumerateArray());
            Assert.Empty(renderer.Errors);
        }
    }

    [Fact]
    public async Task NestedGridsAreIsolated()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic), ("Nested", true));
            await renderer.Drain();
            Assert.Empty(renderer.Errors);
            Assert.Equal(new[] { 1, 2 }, interop.Calls.Where(call => call.Name == "initGrid")
                .Select(call => call.Inputs.GetProperty("columns").GetArrayLength()).Order());
        }
    }

    [Fact]
    public async Task MismatchedNestedColumnCannotRegisterWithOuterGrid()
    {
        var (renderer, interop, root) = Setup();
        await using (renderer)
        {
            await renderer.Render(root, ("Specs", Basic), ("MismatchedNested", true));
            await renderer.Drain();
            Assert.Contains(renderer.Errors, error => error.Message.Contains("same TItem"));
            var schemas = interop.Calls.Where(call => call.Name == "initGrid")
                .Select(call => call.Inputs.GetProperty("columns").GetArrayLength()).Distinct().Order().ToArray();
            Assert.Equal(new[] { 0, 2 }, schemas);
        }
    }

    [Theory]
    [InlineData("mixed")]
    [InlineData("duplicate")]
    [InlineData("mismatch")]
    [InlineData("missing")]
    public async Task RejectsInvalidColumnConfiguration(string scenario)
    {
        var (renderer, _, root) = Setup();
        await using (renderer)
        {
            var specs = scenario switch
            {
                "duplicate" => new[] { Basic[0], Basic[0] with { Id = "second" } },
                "mismatch" => new[] { Basic[0] with { Key = "Id" } },
                "missing" => new[] { new ColumnSpec("empty") },
                _ => Basic
            };
            await renderer.Render(root, ("Specs", specs), ("Programmatic", scenario == "mixed" ? new[] { new GridColumn { Key = "id" } } : Array.Empty<GridColumn>()));
            await renderer.Drain();
            Assert.NotEmpty(renderer.Errors);
        }
    }

    [Fact]
    public async Task DisposalWhileImportIsPendingDoesNotInitializeGrid()
    {
        var (renderer, interop, root) = Setup();
        interop.ImportGate = new();
        await renderer.Render(root, ("Specs", Basic));
        await renderer.Drain();
        var disposing = renderer.Dispatcher.InvokeAsync(async () => await ((IAsyncDisposable)renderer).DisposeAsync());
        await disposing.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Empty(interop.Syncs);
        Assert.False(interop.ImportGate.Task.IsCompleted);
        Assert.False(interop.Tokens["import"].CanBeCanceled);
        Assert.Equal(0, interop.ModuleDisposals);
        interop.ImportGate.SetResult();
        await interop.ModuleDisposalStarted.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Equal(1, interop.ModuleDisposals);
    }
}
