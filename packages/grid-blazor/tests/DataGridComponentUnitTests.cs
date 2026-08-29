using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class DataGridComponentUnitTests
{
    [Fact]
    public async Task ImperativeMethods_ThrowWhenComponentNotMounted()
    {
        var grid = new DataGrid<object>();

        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.GetRowHeightAsync(0).AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.SetColumnWidthAsync("col1", 100).AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.GetColumnOrderAsync().AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.GetColumnStateAsync().AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.BestFitColumnAsync("col1").AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.CopySelectedRowsAsync().AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.SetQuickSearchAsync("query").AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.SetFilterAsync(new GridFilter()).AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.SetPageAsync(1).AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.SelectAllRowsAsync().AsTask());
    }

    [Fact]
    public async Task EventCallbacks_TriggerWhenInvokedByInterop()
    {
        var grid = new DataGrid<object>();

        ColumnStateChangeDetail? stateResult = null;
        ColumnReorderDetail? reorderResult = null;
        ColumnVisibilityChangeDetail? visibilityResult = null;

#pragma warning disable BL0005
        grid.OnColumnStateChange = new Microsoft.AspNetCore.Components.EventCallback<ColumnStateChangeDetail>(
            null,
            (ColumnStateChangeDetail d) => { stateResult = d; }
        );
        grid.OnColumnReorder = new Microsoft.AspNetCore.Components.EventCallback<ColumnReorderDetail>(
            null,
            (ColumnReorderDetail d) => { reorderResult = d; }
        );
        grid.OnColumnVisibilityChange = new Microsoft.AspNetCore.Components.EventCallback<ColumnVisibilityChangeDetail>(
            null,
            (ColumnVisibilityChangeDetail d) => { visibilityResult = d; }
        );
#pragma warning restore BL0005

        var expectedState = new ColumnStateChangeDetail { Reason = ColumnStateChangeReason.Reorder };
        var expectedReorder = new ColumnReorderDetail { ColumnKey = "key1", PreviousIndex = 0, CurrentIndex = 1 };
        var expectedVisibility = new ColumnVisibilityChangeDetail { ColumnKey = "key1", Visible = false };

        await grid.HandleColumnStateChange(expectedState);
        await grid.HandleColumnReorder(expectedReorder);
        await grid.HandleColumnVisibilityChange(expectedVisibility);

        Assert.Same(expectedState, stateResult);
        Assert.Same(expectedReorder, reorderResult);
        Assert.Same(expectedVisibility, visibilityResult);
    }
}
