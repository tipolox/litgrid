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
    private volatile bool disposed;
    private bool inputsPending = true;
    private bool renderQueued;
    private readonly SemaphoreSlim synchronization = new(1, 1);
    private readonly CancellationTokenSource lifetime = new();
    private readonly ColumnRegistry<TItem> columnRegistry;
    private DeclaredColumn[]? synchronizedColumns;
    private bool? synchronizedDeclarativeMode;
    private IEnumerable<TItem>? synchronizedData;
    private long? synchronizedDataRevision;
    private bool dataSynchronized;
    private bool failedDataPending;
    private IEnumerable<TItem>? boundData;
    private DataSyncMode? boundDataSyncMode;
    private long sourceGeneration;
    private long synchronizedSourceGeneration;
    private readonly DataChangeTracker<TItem> dataChanges;
    private long notificationVersion;
    private long synchronizedNotificationVersion;
    private int notificationRenderQueued;
    private DataSyncMode? synchronizedDataSyncMode;
    private readonly HashSet<string> retryInputs = [];
    private bool retryColumnOrder;
    private Dictionary<string, object?> synchronizedScalars = [];
    private ConfigurationSnapshot? synchronizedConfiguration;

    public DataGrid()
    {
        columnRegistry = new ColumnRegistry<TItem>(SchemaChanged);
        dataChanges = new DataChangeTracker<TItem>(DataChanged);
    }

    [Inject]
    private IJSRuntime JSRuntime { get; set; } = default!;

    [Inject]
    private ILogger<DataGrid<TItem>> Logger { get; set; } = NullLogger<DataGrid<TItem>>.Instance;

    [Parameter]
    public IEnumerable<TItem> Data { get; set; } = [];

    /// <summary>
    /// Optional caller-owned change signal. Revision changes (including null transitions)
    /// synchronize alongside replacements, notifications and explicit refreshes.
    /// An unchanged revision never suppresses a supported notification in Automatic mode.
    /// </summary>
    [Parameter]
    public long? DataRevision { get; set; }

    /// <summary>
    /// Automatic relies on replacements, supported notifications, revisions or refresh;
    /// reference equality does not detect arbitrary in-place mutations. Legacy with a
    /// null revision retains v1.0.3 synchronization on every parent parameter update.
    /// </summary>
    [Parameter]
    public DataSyncMode DataSyncMode { get; set; } = DataSyncMode.Automatic;

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

    protected override Task OnAfterRenderAsync(bool firstRender) => SynchronizeAsync();

    private async Task SynchronizeAsync(bool forceData = false)
    {
        // Render completion is the public Blazor boundary at which child registrations,
        // parameter updates and removals have all been processed for this batch.
        if (disposed) return;
        Dictionary<string, object?>? attemptedInputs = null;
        var dataAttempted = false;
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
            var snapshot = CaptureColumns(declarative);
            var schemaChanged = synchronizedDeclarativeMode != declarative ||
                synchronizedColumns == null || !snapshot.SequenceEqual(synchronizedColumns) || retryInputs.Contains("columns");
            if (isInitialized && !inputsPending && !schemaChanged && !forceData && !failedDataPending &&
                retryInputs.Count == 0 && Volatile.Read(ref notificationVersion) == synchronizedNotificationVersion) return;

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
            snapshot = CaptureColumns(declarative);
            schemaChanged = synchronizedDeclarativeMode != declarative ||
                synchronizedColumns == null || !snapshot.SequenceEqual(synchronizedColumns) || retryInputs.Contains("columns");
            // Capture the exact successful operation, never the live parameters after
            // an await. A newer render remains pending and compares against this state.
            var data = Data;
            var revision = DataRevision;
            var mode = DataSyncMode;
            var notifications = Volatile.Read(ref notificationVersion);
            var sourceVersion = sourceGeneration;
            var includeData = forceData || failedDataPending || retryInputs.Contains("data") || !dataSynchronized ||
                !ReferenceEquals(data, synchronizedData) || revision != synchronizedDataRevision ||
                mode != synchronizedDataSyncMode || sourceVersion != synchronizedSourceGeneration || notifications != synchronizedNotificationVersion ||
                (mode == DataSyncMode.Legacy && revision == null && inputsPending);
            dataAttempted = includeData;
            if (includeData) dataChanges.Reconcile(forceData || failedDataPending || revision != synchronizedDataRevision);
            var scalars = CaptureScalars();
            var configuration = ConfigurationSnapshot.Capture(Config);
            inputsPending = false;
            var inputs = GetGridInputs(snapshot, declarative, includeData, schemaChanged, data, scalars, configuration);
            if (isInitialized && inputs.Count == 0) return;
            inputs["declarativeColumns"] = declarative;
            attemptedInputs = inputs;
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
            synchronizedScalars = scalars;
            synchronizedConfiguration = configuration;
            retryInputs.Clear();
            retryColumnOrder = false;
            if (includeData)
            {
                // A newer source may have arrived while interop awaited. Keep the
                // successful operation's tokens without retaining its obsolete source.
                synchronizedData = sourceGeneration == sourceVersion && ReferenceEquals(Data, data) ? data : null;
                synchronizedSourceGeneration = sourceVersion;
                synchronizedDataRevision = revision;
                synchronizedDataSyncMode = mode;
                synchronizedNotificationVersion = notifications;
                dataSynchronized = true;
                failedDataPending = false;
            }
        }
        catch (Exception exception) when (disposed && exception is JSDisconnectedException or OperationCanceledException)
        {
            // Navigation may disconnect an import/update that was already in flight.
        }
        catch
        {
            inputsPending = true;
            if (attemptedInputs != null)
            {
                // JS may have applied earlier fields before a later setter failed.
                // Retry those fields even if newer parameters revert to the last
                // successful values; do not mistake that reversion for a no-op.
                retryInputs.UnionWith(attemptedInputs.Keys.Where(key => key is not "declarativeColumns" and not "columnOrderChanged"));
                retryColumnOrder |= attemptedInputs.TryGetValue("columnOrderChanged", out var changed) && changed is true;
            }
            // An explicit refresh must remain retryable even when its reference and
            // revision already matched the last successful transfer.
            if (forceData || dataAttempted) failedDataPending = true;
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
        if (!Enum.IsDefined(DataSyncMode)) throw new ArgumentOutOfRangeException(nameof(DataSyncMode));
        if (!ReferenceEquals(boundData, Data) || boundDataSyncMode != DataSyncMode)
        {
            boundData = Data;
            boundDataSyncMode = DataSyncMode;
            sourceGeneration++;
        }
        dataChanges.SetSource(DataSyncMode == DataSyncMode.Automatic ? Data : null);
        // Release the obsolete source even if synchronization of its replacement fails.
        if (!ReferenceEquals(Data, synchronizedData)) synchronizedData = null;
        inputsPending = true;
    }

    private void DataChanged()
    {
        if (disposed) return;
        Interlocked.Increment(ref notificationVersion);
        if (Interlocked.Exchange(ref notificationRenderQueued, 1) == 0) _ = RenderDataChangesAsync();
    }

    private async Task RenderDataChangesAsync()
    {
        try
        {
            // A bounded batch window coalesces synchronous and background event bursts.
            // No per-item interop; render completion uses the existing synchronization gate.
            await Task.Delay(1, lifetime.Token).ConfigureAwait(false);
            await InvokeAsync(() =>
            {
                Interlocked.Exchange(ref notificationRenderQueued, 0);
                if (!disposed) StateHasChanged();
            });
        }
        catch (Exception exception) when (disposed && exception is OperationCanceledException or ObjectDisposedException) { }
        catch (Exception exception)
        {
            Interlocked.Exchange(ref notificationRenderQueued, 0);
            try { if (!disposed) await DispatchExceptionAsync(exception); }
            catch (Exception dispatchFailure) when (disposed && dispatchFailure is ObjectDisposedException or InvalidOperationException) { }
        }
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

    private DeclaredColumn[] CaptureColumns(bool declarative) => declarative ? columnRegistry.Snapshot() :
        Columns.Select(column => new DeclaredColumn(column.Key, column.Header, column.Width, column.Hidden, null)).ToArray();

    private Dictionary<string, object?> CaptureScalars() => new()
    {
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
        ["columnStateStorageKey"] = ColumnStateStorageKey
    };

    // Copy supported mutable configuration values without serializing it to compare.
    private sealed record ConfigurationSnapshot(SelectionMode? Mode, bool? Checkboxes,
        bool? RowHeaderEnabled, double? RowHeaderWidth, bool? PaginationEnabled, int? PageSize, int? PageIndex)
    {
        internal static ConfigurationSnapshot Capture(GridConfig config) => new(config.Selection?.Mode,
            config.Selection?.Checkboxes, config.RowHeader?.Enabled, config.RowHeader?.Width,
            config.Pagination?.Enabled, config.Pagination?.PageSize, config.Pagination?.PageIndex);
        internal GridConfig ToConfig() => new()
        {
            Selection = new() { Mode = Mode, Checkboxes = Checkboxes },
            RowHeader = new() { Enabled = RowHeaderEnabled, Width = RowHeaderWidth },
            Pagination = new() { Enabled = PaginationEnabled, PageSize = PageSize, PageIndex = PageIndex }
        };
    }

    private Dictionary<string, object?> GetGridInputs(DeclaredColumn[] snapshot, bool declarative,
        bool includeData, bool schemaChanged, IEnumerable<TItem> data,
        Dictionary<string, object?> scalars, ConfigurationSnapshot configuration)
    {
        var inputs = scalars.Where(pair => !synchronizedScalars.TryGetValue(pair.Key, out var old) ||
            !Equals(old, pair.Value) || retryInputs.Contains(pair.Key)).ToDictionary(pair => pair.Key, pair => pair.Value);
        if (configuration != synchronizedConfiguration || retryInputs.Contains("config")) inputs["config"] = configuration.ToConfig();
        if (includeData) inputs["data"] = data;
        if (schemaChanged)
        {
            inputs["columns"] = snapshot.Select(column => column.ToGridColumn()).ToArray();
            if (declarative)
            {
                var previous = synchronizedDeclarativeMode == true ? synchronizedColumns?.ToDictionary(column => column.Key) : null;
                inputs["columnOrderChanged"] = retryColumnOrder || previous != null && snapshot.Any(column =>
                    previous.TryGetValue(column.Key, out var old) ? old.Order != column.Order : column.Order != null);
            }
        }
        return inputs;
    }

    /// <summary>Forces row synchronization through the normal lifecycle gate.</summary>
    public async ValueTask RefreshDataAsync()
    {
        RequireModule();
        await InvokeAsync(async () =>
        {
            RequireModule();
            await SynchronizeAsync(forceData: true);
        });
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
        dataChanges.Dispose();
        boundData = null;
        synchronizedData = null;
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
