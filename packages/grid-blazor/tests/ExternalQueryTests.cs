using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class ExternalQueryTests
{
    [Fact]
    public void QueryContractPreservesExactStringsAndExplicitUnknownTotals()
    {
        var state = new GridExternalState<object> { RequestId = 9, Query = new() { PageIndex = 2, PageSize = 20,
            Filters = [new() { ColumnKey = "amount", Operator = FilterOperator.GreaterThan, Value = "9007199254740993.01" }] },
            Total = new() { Kind = "unknown", HasMore = true } };
        var json = JsonSerializer.Serialize(state);
        Assert.Contains("\"requestId\":9", json);
        Assert.Contains("\"pageIndex\":2", json);
        Assert.Contains("9007199254740993.01", json);
        Assert.Contains("\"hasMore\":true", json);
        Assert.DoesNotContain("totalRows", json);
        Assert.Contains("\"queryMode\":\"external\"", JsonSerializer.Serialize(new GridConfig { QueryMode = "external" }));
    }

    [Fact]
    public async Task QueryCallbackAndMethodsRespectComponentLifetime()
    {
        var grid = new DataGrid<object>();
        var calls = 0;
#pragma warning disable BL0005
        grid.OnQueryChange = new EventCallback<GridQueryChangeDetail>(null, (GridQueryChangeDetail _) => calls++);
#pragma warning restore BL0005
        await grid.HandleQueryChange(new() { Reason = "page", RequestId = 3 });
        Assert.Equal(1, calls);
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.GetQueryAsync().AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.RefreshQueryAsync().AsTask());
        await grid.DisposeAsync();
        await grid.HandleQueryChange(new());
        Assert.Equal(1, calls);
    }
}
