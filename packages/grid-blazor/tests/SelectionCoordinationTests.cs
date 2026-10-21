using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class SelectionCoordinationTests
{
    [Fact]
    public void IdentityConfigurationAndSnapshotsDeserializeWithoutIndexIdentityConfusion()
    {
        var config = new GridConfig { Selection = new() { Mode = SelectionMode.Row, RowKey = "id", ScopeKey = "account/site" } };
        var json = JsonSerializer.Serialize(config);
        Assert.Contains("\"rowKey\":\"id\"", json);
        Assert.Contains("\"scopeKey\":\"account/site\"", json);
        var detail = JsonSerializer.Deserialize<SelectionChangeDetail>("""
            {"mode":"row","scopeKey":"account/site","rowIndex":2,"columnKey":null,"anchorRowIndex":2,"rowIndexes":[2],"cells":[],"rows":[{"rowIndex":2,"key":"property-uuid","row":{"id":"property-uuid"}}]}
            """)!;
        Assert.Equal(SelectionMode.Row, detail.Mode);
        Assert.Equal("account/site", detail.ScopeKey.GetString());
        Assert.Equal("property-uuid", detail.Rows[0].Key.GetString());
        Assert.Equal(2, detail.Rows[0].RowIndex);
    }

    [Fact]
    public async Task SelectionCallbackStopsAfterDisposalAndMethodsGuardUnmountedComponents()
    {
        var grid = new DataGrid<object>();
        var calls = 0;
#pragma warning disable BL0005
        grid.OnSelectionChange = new EventCallback<SelectionChangeDetail>(null, (SelectionChangeDetail _) => { calls++; });
#pragma warning restore BL0005
        await grid.HandleSelectionChange(new());
        Assert.Equal(1, calls);
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.SelectRowByKeyAsync("uuid").AsTask());
        await Assert.ThrowsAsync<InvalidOperationException>(() => grid.GetSelectionSnapshotAsync().AsTask());
        await grid.DisposeAsync();
        await grid.HandleSelectionChange(new());
        Assert.Equal(1, calls);
    }
}
