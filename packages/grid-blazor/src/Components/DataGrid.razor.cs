using System.Runtime.ExceptionServices;
using Microsoft.AspNetCore.Components;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;

namespace Tipolox.LitGrid.Blazor;

public partial class DataGrid<TItem> : ComponentBase, IAsyncDisposable
{
    private const string GridUnavailableMessage = "LitGrid is not available before the Blazor component is mounted.";
    private const string InteropPath = "./_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js";

    private ElementReference elementRef;
    private DotNetObjectReference<DataGrid<TItem>>? dotNetRef;
    private IJSObjectReference? module;
    private bool isInitialized;
    private bool disposed;
    private bool inputsPending = true;
    private bool renderQueued;
    private readonly SemaphoreSlim synchronization = new(1, 1);
    private readonly CancellationTokenSource lifetime = new();
    private readonly ColumnRegistry<TItem> columnRegistry;
    private DeclaredColumn[]? synchronizedColumns;
    private bool? synchronizedDeclarativeMode;

    public DataGrid() => columnRegistry = new ColumnRegistry<TItem>(SchemaChanged);

    [Inject]
    private IJSRuntime JSRuntime { get; set; } = default!;

    [Inject]
    private ILogger<DataGrid<TItem>> Logger { get; set; } = NullLogger<DataGrid<TItem>>.Instance;

    [Parameter]
    public IEnumerable<TItem> Data { get; set; } = [];

    [Parameter]
    public IReadOnlyList<GridColumn> Columns { get; set; } = [];

    [Parameter]
    public RenderFragment? ChildContent { get; set; }

    [Parameter]
    public GridConfig Config { get; set; } = new();

    [Parameter]
    public GridTheme Theme { get; set; } = GridTheme.Light;

    [Parameter]
    public string AriaLabel { get; set; } = "Data grid";

    [Parameter]
    public string AriaDescription { get; set; } = string.Empty;

    [Parameter]
    public bool ScreenReaderAnnouncements { get; set; } = true;

    [Parameter]
    public double Height { get; set; } = 320;

    [Parameter]
    public double RowHeight { get; set; } = 36;

    [Parameter]
    public int Overscan { get; set; } = 4;

    [Parameter]
    public int ColumnOverscan { get; set; } = 2;

    [Parameter]
    public int BestFitSampleSize { get; set; } = 10;

    [Parameter]
    public int QuickSearchDebounceThreshold { get; set; } = 10000;

    [Parameter]
    public int QuickSearchDebounceMs { get; set; } = 150;

    [Parameter]
    public string? ColumnStateStorageKey { get; set; }

    [Parameter]
    public EventCallback<ColumnStateChangeDetail> OnColumnStateChange { get; set; }

    [Parameter]
    public EventCallback<ColumnReorderDetail> OnColumnReorder { get; set; }

    [Parameter]
    public EventCallback<ColumnVisibilityChangeDetail> OnColumnVisibilityChange { get; set; }

    public ElementReference Element => elementRef;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        // Render completion is the public Blazor boundary at which child registrations,
        // parameter updates and removals have all been processed for this batch.
        if (disposed) return;
        try
        {
            await synchronization.WaitAsync(lifetime.Token);
        }
        catch (OperationCanceledException) when (disposed) { return; }
        try
        {
            if (disposed) return;
            var declarative = ChildContent != null;
            ValidateColumnSources();
            var snapshot = declarative ? columnRegistry.Snapshot() : null;
            var schemaChanged = synchronizedDeclarativeMode != declarative ||
                (declarative && (synchronizedColumns == null || !snapshot!.SequenceEqual(synchronizedColumns)));
            if (isInitialized && !inputsPending && !schemaChanged) return;

            if (module == null)
            {
                // Cancel the .NET wait, not ownership of a JS reference that can
                // arrive after navigation. A late import is disposed separately.
                var importing = JSRuntime.InvokeAsync<IJSObjectReference>("import", InteropPath).AsTask();
                try { module = await importing.WaitAsync(lifetime.Token); }
                catch (OperationCanceledException) when (disposed)
                {
                    _ = DisposeLateImportAsync(importing, Logger);
                    return;
                }
                if (disposed) return;
            }

            // Capture again after the import await: parameters may have changed while
            // loading the module. Updates after this point are serialized by the gate.
            declarative = ChildContent != null;
            ValidateColumnSources();
            snapshot = declarative ? columnRegistry.Snapshot() : null;
            schemaChanged = synchronizedDeclarativeMode != declarative ||
                (declarative && (synchronizedColumns == null || !snapshot!.SequenceEqual(synchronizedColumns)));
            var includeData = inputsPending || !isInitialized;
            inputsPending = false;
            var inputs = GetGridInputs(snapshot, declarative, includeData, schemaChanged);
            if (!isInitialized)
            {
                dotNetRef ??= DotNetObjectReference.Create(this);
                await module.InvokeVoidAsync("initGrid", lifetime.Token, elementRef, dotNetRef, inputs);
                isInitialized = !disposed;
            }
            else await module.InvokeVoidAsync("updateInputs", lifetime.Token, elementRef, inputs);
            if (disposed) return;
            synchronizedColumns = snapshot;
            synchronizedDeclarativeMode = declarative;
        }
        catch (Exception exception) when (disposed && exception is JSDisconnectedException or OperationCanceledException)
        {
            // Navigation may disconnect an import/update that was already in flight.
        }
        catch
        {
            inputsPending = true;
            throw;
        }
        finally
        {
            synchronization.Release();
        }
    }

    protected override void OnParametersSet()
    {
        ValidateColumnSources();
        // Keep the existing same-reference List<T> and row mutation behavior.
        inputsPending = true;
    }

    private static async Task DisposeLateImportAsync(Task<IJSObjectReference> importing, ILogger logger)
    {
        try
        {
            var imported = await importing;
            await imported.DisposeAsync();
        }
        catch (Exception exception) when (exception is JSDisconnectedException or OperationCanceledException) { }
        catch (Exception exception)
        {
            // Disposal already returned, so report unexpected deferred errors
            // through application logging instead of losing an unobserved task.
            logger.LogError(exception, "LitGrid deferred module import or reference cleanup failed after disposal.");
        }
    }

    private void ValidateColumnSources()
    {
        if (ChildContent != null && Columns.Count > 0)
            throw new InvalidOperationException("DataGrid accepts either nonempty Columns or declarative ChildContent, not both. Remove one column source.");
    }

    private void SchemaChanged()
    {
        if (disposed || renderQueued) return;
        renderQueued = true;
        _ = InvokeAsync(async () =>
        {
            // Coalesce all registrations in a render into one follow-up render.
            await Task.Yield();
            renderQueued = false;
            if (!disposed) StateHasChanged();
        });
    }

    [JSInvokable]
    public async Task HandleColumnStateChange(ColumnStateChangeDetail detail)
    {
        if (!disposed && OnColumnStateChange.HasDelegate)
        {
            await OnColumnStateChange.InvokeAsync(detail);
        }
    }

    [JSInvokable]
    public async Task HandleColumnReorder(ColumnReorderDetail detail)
    {
        if (!disposed && OnColumnReorder.HasDelegate)
        {
            await OnColumnReorder.InvokeAsync(detail);
        }
    }

    [JSInvokable]
    public async Task HandleColumnVisibilityChange(ColumnVisibilityChangeDetail detail)
    {
        if (!disposed && OnColumnVisibilityChange.HasDelegate)
        {
            await OnColumnVisibilityChange.InvokeAsync(detail);
        }
    }

    private object GetGridInputs(DeclaredColumn[]? snapshot, bool declarative, bool includeData, bool schemaChanged)
    {
        var inputs = new Dictionary<string, object?>
        {
            ["config"] = Config,
            ["theme"] = Theme == GridTheme.Dark ? "dark" : "light",
            ["ariaLabel"] = AriaLabel,
            ["ariaDescription"] = AriaDescription,
            ["screenReaderAnnouncements"] = ScreenReaderAnnouncements,
            ["height"] = Height,
            ["rowHeight"] = RowHeight,
            ["overscan"] = Overscan,
            ["columnOverscan"] = ColumnOverscan,
            ["bestFitSampleSize"] = BestFitSampleSize,
            ["quickSearchDebounceThreshold"] = QuickSearchDebounceThreshold,
            ["quickSearchDebounceMs"] = QuickSearchDebounceMs,
            ["columnStateStorageKey"] = ColumnStateStorageKey,
            ["declarativeColumns"] = declarative
        };
        if (includeData) inputs["data"] = Data;
        if (!declarative) inputs["columns"] = Columns;
        else if (schemaChanged)
        {
            inputs["columns"] = snapshot!.Select(column => column.ToGridColumn()).ToArray();
            var previous = synchronizedColumns?.ToDictionary(column => column.Key);
            inputs["columnOrderChanged"] = previous != null && snapshot.Any(column =>
                previous.TryGetValue(column.Key, out var old) ? old.Order != column.Order : column.Order != null);
        }
        return inputs;
    }

    private IJSObjectReference RequireModule()
    {
        if (disposed || !isInitialized || module == null)
        {
            throw new InvalidOperationException(GridUnavailableMessage);
        }
        return module;
    }

    public async ValueTask<double> GetRowHeightAsync(int rowIndex)
    {
        return await RequireModule().InvokeAsync<double>("getRowHeight", elementRef, rowIndex);
    }

    public async ValueTask<double> GetColumnWidthAsync(GridColumn column)
    {
        return await RequireModule().InvokeAsync<double>("getColumnWidth", elementRef, column);
    }

    public async ValueTask SetRowHeightAsync(int rowIndex, double height)
    {
        await RequireModule().InvokeVoidAsync("setRowHeight", elementRef, rowIndex, height);
    }

    public async ValueTask ResetRowHeightAsync(int rowIndex)
    {
        await RequireModule().InvokeVoidAsync("resetRowHeight", elementRef, rowIndex);
    }

    public async ValueTask ResetAllRowHeightsAsync()
    {
        await RequireModule().InvokeVoidAsync("resetAllRowHeights", elementRef);
    }

    public async ValueTask SetColumnWidthAsync(string columnKey, double width)
    {
        await RequireModule().InvokeVoidAsync("setColumnWidth", elementRef, columnKey, width);
    }

    public async ValueTask ResetColumnWidthAsync(string columnKey)
    {
        await RequireModule().InvokeVoidAsync("resetColumnWidth", elementRef, columnKey);
    }

    public async ValueTask ResetAllColumnWidthsAsync()
    {
        await RequireModule().InvokeVoidAsync("resetAllColumnWidths", elementRef);
    }

    public async ValueTask MoveColumnAsync(string columnKey, int targetIndex)
    {
        await RequireModule().InvokeVoidAsync("moveColumn", elementRef, columnKey, targetIndex);
    }

    public async ValueTask<string[]> GetColumnOrderAsync()
    {
        return await RequireModule().InvokeAsync<string[]>("getColumnOrder", elementRef);
    }

    public async ValueTask SetColumnOrderAsync(IEnumerable<string> columnKeys)
    {
        await RequireModule().InvokeVoidAsync("setColumnOrder", elementRef, columnKeys);
    }

    public async ValueTask ResetColumnOrderAsync()
    {
        await RequireModule().InvokeVoidAsync("resetColumnOrder", elementRef);
    }

    public async ValueTask SetColumnVisibleAsync(string columnKey, bool visible)
    {
        await RequireModule().InvokeVoidAsync("setColumnVisible", elementRef, columnKey, visible);
    }

    public async ValueTask<bool> IsColumnVisibleAsync(string columnKey)
    {
        return await RequireModule().InvokeAsync<bool>("isColumnVisible", elementRef, columnKey);
    }

    public async ValueTask<string[]> GetVisibleColumnKeysAsync()
    {
        return await RequireModule().InvokeAsync<string[]>("getVisibleColumnKeys", elementRef);
    }

    public async ValueTask ResetColumnVisibilityAsync()
    {
        await RequireModule().InvokeVoidAsync("resetColumnVisibility", elementRef);
    }

    public async ValueTask<GridColumnState> GetColumnStateAsync()
    {
        return await RequireModule().InvokeAsync<GridColumnState>("getColumnState", elementRef);
    }

    public async ValueTask SetColumnStateAsync(GridColumnState state)
    {
        await RequireModule().InvokeVoidAsync("setColumnState", elementRef, state);
    }

    public async ValueTask ResetColumnStateAsync()
    {
        await RequireModule().InvokeVoidAsync("resetColumnState", elementRef);
    }

    public async ValueTask<double?> BestFitColumnAsync(string columnKey)
    {
        return await RequireModule().InvokeAsync<double?>("bestFitColumn", elementRef, columnKey);
    }

    public async ValueTask<BestFitColumnWidth[]> BestFitAllColumnsAsync()
    {
        return await RequireModule().InvokeAsync<BestFitColumnWidth[]>("bestFitAllColumns", elementRef);
    }

    public async ValueTask<bool> CopySelectedCellsAsync()
    {
        return await RequireModule().InvokeAsync<bool>("copySelectedCells", elementRef);
    }

    public async ValueTask<bool> CopySelectedRowsAsync()
    {
        return await RequireModule().InvokeAsync<bool>("copySelectedRows", elementRef);
    }

    public async ValueTask SetQuickSearchAsync(string query)
    {
        await RequireModule().InvokeVoidAsync("setQuickSearch", elementRef, query);
    }

    public async ValueTask ClearQuickSearchAsync()
    {
        await RequireModule().InvokeVoidAsync("clearQuickSearch", elementRef);
    }

    public async ValueTask<string> GetQuickSearchAsync()
    {
        return await RequireModule().InvokeAsync<string>("getQuickSearch", elementRef);
    }

    public async ValueTask SetFilterAsync(GridFilter filter)
    {
        await RequireModule().InvokeVoidAsync("setFilter", elementRef, filter);
    }

    public async ValueTask ClearFilterAsync(string? columnKey = null)
    {
        await RequireModule().InvokeVoidAsync("clearFilter", elementRef, columnKey);
    }

    public async ValueTask<GridFilter[]> GetFiltersAsync()
    {
        return await RequireModule().InvokeAsync<GridFilter[]>("getFilters", elementRef);
    }

    public async ValueTask SetPageAsync(int pageIndex)
    {
        await RequireModule().InvokeVoidAsync("setPage", elementRef, pageIndex);
    }

    public async ValueTask SetPageSizeAsync(int pageSize)
    {
        await RequireModule().InvokeVoidAsync("setPageSize", elementRef, pageSize);
    }

    public async ValueTask<GridPaginationState> GetPaginationAsync()
    {
        return await RequireModule().InvokeAsync<GridPaginationState>("getPagination", elementRef);
    }

    public async ValueTask<int> GetTotalRowCountAsync()
    {
        return await RequireModule().InvokeAsync<int>("getTotalRowCount", elementRef);
    }

    public async ValueTask SelectRowAsync(int rowIndex, SelectionIntent? intent = null)
    {
        await RequireModule().InvokeVoidAsync("selectRow", elementRef, rowIndex, intent?.ToString().ToLowerInvariant());
    }

    public async ValueTask SelectAllRowsAsync()
    {
        await RequireModule().InvokeVoidAsync("selectAllRows", elementRef);
    }

    public async ValueTask ClearSelectionAsync()
    {
        await RequireModule().InvokeVoidAsync("clearSelection", elementRef);
    }

    public async ValueTask<GridSelection> GetSelectionAsync()
    {
        return await RequireModule().InvokeAsync<GridSelection>("getSelection", elementRef);
    }

    public async ValueTask<bool> IsRowSelectedAsync(int rowIndex)
    {
        return await RequireModule().InvokeAsync<bool>("isRowSelected", elementRef, rowIndex);
    }

    public async ValueTask<bool> IsCellSelectedAsync(int rowIndex, string columnKey)
    {
        return await RequireModule().InvokeAsync<bool>("isCellSelected", elementRef, rowIndex, columnKey);
    }

    public async ValueTask DisposeAsync()
    {
        if (disposed) return;
        disposed = true;
        isInitialized = false;
        columnRegistry.Dispose();
        // Cancel pending interop and semaphore waiters before waiting for the owner
        // to release the gate. Cleanup uses its own token, not the canceled lifetime.
        lifetime.Cancel();
        await synchronization.WaitAsync();
        try
        {
            if (module != null)
            {
                Exception? cleanupFailure = null;
                try
                {
                    using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    await module.InvokeVoidAsync("disposeGrid", cleanup.Token, elementRef);
                }
                catch (Exception exception) when (exception is JSDisconnectedException or OperationCanceledException) { }
                catch (Exception exception) { cleanupFailure = exception; }
                finally
                {
                    try
                    {
                        // IJSObjectReference.DisposeAsync has no cancellation overload.
                        // Await reference cleanup rather than abandoning it on a timer.
                        await module.DisposeAsync();
                    }
                    catch (Exception exception) when (exception is JSDisconnectedException or OperationCanceledException) { }
                    catch (Exception exception)
                    {
                        if (cleanupFailure != null) throw new AggregateException(cleanupFailure, exception);
                        throw;
                    }
                    finally { module = null; }
                }
                if (cleanupFailure != null) ExceptionDispatchInfo.Capture(cleanupFailure).Throw();
            }
        }
        finally
        {
            dotNetRef?.Dispose();
            dotNetRef = null;
            synchronization.Release();
            lifetime.Dispose();
        }
    }
}
