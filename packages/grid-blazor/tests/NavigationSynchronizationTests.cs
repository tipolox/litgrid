using System.Reflection;
using System.Text.Json;
using Microsoft.JSInterop;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class NavigationSynchronizationTests
{
    private sealed class TestGrid : DataGrid<object>
    {
        public Task Initialize() => OnAfterRenderAsync(true);
        public async Task Update()
        {
            OnParametersSet();
            await OnAfterRenderAsync(false);
        }
    }

    private sealed class Interop : IJSRuntime, IJSObjectReference
    {
        public List<(string Name, object?[] Arguments)> Calls { get; } = [];
        public bool FailNextUpdate { get; set; }
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args)
        {
            Calls.Add((identifier, args ?? []));
            if (identifier == "updateInputs" && FailNextUpdate)
            {
                FailNextUpdate = false;
                throw new JSException("Test failure");
            }
            return ValueTask.FromResult(identifier == "import" ? (TValue)(object)this : default!);
        }
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
            => InvokeAsync<TValue>(identifier, args);
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
        public JsonElement LastInputs => JsonSerializer.SerializeToElement(Calls.Last().Arguments.Last());
    }

    [Fact]
    public async Task ParameterUpdates_ResendCollections_AndSupportReplacementAndSameReferenceMutations()
    {
        var interop = new Interop();
        var grid = new TestGrid();
        typeof(DataGrid<object>).GetProperty("JSRuntime", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(grid, interop);
#pragma warning disable BL0005
        var items = new List<MutableItem> { new() { Name = "Ada" }, new() { Name = "Grace" } };
        var columns = new List<GridColumn> { new() { Key = "Name" } };
        grid.Data = items;
        grid.DataSyncMode = DataSyncMode.Legacy;
        grid.Columns = columns;
        await grid.Initialize();
        Assert.Equal(2, interop.LastInputs.GetProperty("data").GetArrayLength());
        Assert.Single(interop.LastInputs.GetProperty("columns").EnumerateArray());
        for (var change = 0; change < 4; change++)
        {
            switch (change)
            {
                case 0: grid.Theme = GridTheme.Dark; break;
                case 1: grid.AriaLabel = "People"; break;
                case 2: grid.AriaDescription = "Help"; break;
                case 3: grid.ScreenReaderAnnouncements = false; break;
            }
            await grid.Update();
            Assert.Equal(2, interop.LastInputs.GetProperty("data").GetArrayLength());
            Assert.False(interop.LastInputs.TryGetProperty("columns", out _));
        }
        // Parent rerenders must continue to serialize in-place collection/item changes.
        items.Add(new() { Name = "Katherine" });
        items[0].Name = "Updated Ada";
        columns[0].Header = "Full name";
        columns.Add(new() { Key = "Team" });
        await grid.Update();
        Assert.Same(items, grid.Data);
        Assert.Same(columns, grid.Columns);
        Assert.Equal(3, interop.LastInputs.GetProperty("data").GetArrayLength());
        Assert.Equal("Updated Ada", interop.LastInputs.GetProperty("data")[0].GetProperty("Name").GetString());
        Assert.Equal(2, interop.LastInputs.GetProperty("columns").GetArrayLength());
        Assert.Equal("Full name", interop.LastInputs.GetProperty("columns")[0].GetProperty("header").GetString());
        items.RemoveAt(1);
        columns.RemoveAt(1);
        await grid.Update();
        Assert.Equal(2, interop.LastInputs.GetProperty("data").GetArrayLength());
        Assert.Single(interop.LastInputs.GetProperty("columns").EnumerateArray());
        grid.Data = new object[] { new { Name = "Lin" } };
        await grid.Update();
        Assert.Equal("Lin", interop.LastInputs.GetProperty("data")[0].GetProperty("Name").GetString());
        Assert.False(interop.LastInputs.TryGetProperty("columns", out _));
        grid.Columns = new[] { new GridColumn { Key = "Name", Header = "Person" } };
        await grid.Update();
        Assert.Equal("Person", interop.LastInputs.GetProperty("columns")[0].GetProperty("header").GetString());
        Assert.Single(interop.LastInputs.GetProperty("data").EnumerateArray());
        grid.Data = new object[] { new { Name = "Retry" } };
        interop.FailNextUpdate = true;
        await Assert.ThrowsAsync<JSException>(() => grid.Update());
        await grid.Update();
        Assert.Equal("Retry", interop.LastInputs.GetProperty("data")[0].GetProperty("Name").GetString());
#pragma warning restore BL0005
        await grid.DisposeAsync();
    }

    private sealed class MutableItem
    {
        public string Name { get; set; } = string.Empty;
    }
}
