using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Tipolox.LitGrid.Blazor;

public partial class DataGrid<TItem> : ComponentBase, IAsyncDisposable
{
    private const string GridUnavailableMessage = "LitGrid is not available before the Blazor component is mounted.";
    private const string InteropPath = "./_content/Tipolox.LitGrid.Blazor/dist/index.js";

    private ElementReference elementRef;
    private DotNetObjectReference<DataGrid<TItem>>? dotNetRef;
    private IJSObjectReference? module;
    private bool isInitialized;

    [Inject]
    private IJSRuntime JSRuntime { get; set; } = default!;

    [Parameter]
    public IEnumerable<TItem> Data { get; set; } = [];

    [Parameter]
    public IReadOnlyList<GridColumn> Columns { get; set; } = [];

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
        if (firstRender)
        {
            dotNetRef = DotNetObjectReference.Create(this);
            module = await JSRuntime.InvokeAsync<IJSObjectReference>("import", InteropPath);
            await module.InvokeVoidAsync("initGrid", elementRef, dotNetRef, GetGridInputs());
            isInitialized = true;
        }
    }

    protected override async Task OnParametersSetAsync()
    {
        if (isInitialized && module != null)
        {
            await module.InvokeVoidAsync("updateInputs", elementRef, GetGridInputs());
        }
    }

    [JSInvokable]
    public async Task HandleColumnStateChange(ColumnStateChangeDetail detail)
    {
        if (OnColumnStateChange.HasDelegate)
        {
            await OnColumnStateChange.InvokeAsync(detail);
        }
    }

    [JSInvokable]
    public async Task HandleColumnReorder(ColumnReorderDetail detail)
    {
        if (OnColumnReorder.HasDelegate)
        {
            await OnColumnReorder.InvokeAsync(detail);
        }
    }

    [JSInvokable]
    public async Task HandleColumnVisibilityChange(ColumnVisibilityChangeDetail detail)
    {
        if (OnColumnVisibilityChange.HasDelegate)
        {
            await OnColumnVisibilityChange.InvokeAsync(detail);
        }
    }

    private object GetGridInputs()
    {
        return new
        {
            data = Data,
            columns = Columns,
            config = Config,
            theme = Theme == GridTheme.Dark ? "dark" : "light",
            ariaLabel = AriaLabel,
            ariaDescription = AriaDescription,
            screenReaderAnnouncements = ScreenReaderAnnouncements,
            height = Height,
            rowHeight = RowHeight,
            overscan = Overscan,
            columnOverscan = ColumnOverscan,
            bestFitSampleSize = BestFitSampleSize,
            quickSearchDebounceThreshold = QuickSearchDebounceThreshold,
            quickSearchDebounceMs = QuickSearchDebounceMs,
            columnStateStorageKey = ColumnStateStorageKey
        };
    }

    private IJSObjectReference RequireModule()
    {
        if (!isInitialized || module == null)
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
        if (module != null)
        {
            try
            {
                await module.InvokeVoidAsync("disposeGrid", elementRef);
                await module.DisposeAsync();
            }
            catch (JSDisconnectedException)
            {
                // Disconnected during disposal is expected in Blazor Server / WebAssembly unloads
            }
        }

        dotNetRef?.Dispose();
    }
}
