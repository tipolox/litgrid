using System.Text.Json;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class SerializationAndModelsTests
{
    [Fact]
    public void GridColumn_SerializesToJsonExpectedly()
    {
        var col = new GridColumn
        {
            Key = "name",
            Header = "Full Name",
            Width = 150,
            Hidden = false
        };

        var json = JsonSerializer.Serialize(col);
        Assert.Contains("\"key\":\"name\"", json);
        Assert.Contains("\"header\":\"Full Name\"", json);
        Assert.Contains("\"width\":150", json);
        Assert.Contains("\"hidden\":false", json);
    }

    [Fact]
    public void GridConfig_SerializesWithCorrectCamelCaseAndEnums()
    {
        var config = new GridConfig
        {
            Selection = new GridSelectionConfig
            {
                Mode = SelectionMode.MultiRow,
                Checkboxes = true
            },
            RowHeader = new GridRowHeaderConfig
            {
                Enabled = true,
                Width = 48
            },
            Pagination = new GridPaginationConfig
            {
                Enabled = true,
                PageSize = 25,
                PageIndex = 0
            }
        };

        var json = JsonSerializer.Serialize(config);
        Assert.Contains("\"mode\":\"multi-row\"", json);
        Assert.Contains("\"checkboxes\":true", json);
        Assert.Contains("\"rowHeader\":{\"enabled\":true,\"width\":48}", json);
        Assert.Contains("\"pagination\":{\"enabled\":true,\"pageSize\":25,\"pageIndex\":0}", json);
    }

    [Fact]
    public void GridFilter_SerializesAndDeserializesCorrectly()
    {
        var filter = new GridFilter
        {
            ColumnKey = "department",
            Operator = FilterOperator.StartsWith,
            Value = "Eng"
        };

        var json = JsonSerializer.Serialize(filter);
        Assert.Contains("\"columnKey\":\"department\"", json);
        Assert.Contains("\"operator\":\"startsWith\"", json);
        Assert.Contains("\"value\":\"Eng\"", json);

        var deserialized = JsonSerializer.Deserialize<GridFilter>(json);
        Assert.NotNull(deserialized);
        Assert.Equal("department", deserialized.ColumnKey);
        Assert.Equal(FilterOperator.StartsWith, deserialized.Operator);
    }

    [Fact]
    public void GridColumnState_RoundTripsAccurately()
    {
        var state = new GridColumnState
        {
            Version = 1,
            Columns =
            [
                new GridColumnStateColumn { Key = "id", Width = 80, Visible = true },
                new GridColumnStateColumn { Key = "secret", Width = null, Visible = false }
            ]
        };

        var json = JsonSerializer.Serialize(state);
        var deserialized = JsonSerializer.Deserialize<GridColumnState>(json);

        Assert.NotNull(deserialized);
        Assert.Equal(1, deserialized.Version);
        Assert.Equal(2, deserialized.Columns.Length);
        Assert.Equal("id", deserialized.Columns[0].Key);
        Assert.Equal(80, deserialized.Columns[0].Width);
        Assert.True(deserialized.Columns[0].Visible);
        Assert.Equal("secret", deserialized.Columns[1].Key);
        Assert.Null(deserialized.Columns[1].Width);
        Assert.False(deserialized.Columns[1].Visible);
    }

    [Fact]
    public void EventDetails_DeserializesExpectedly()
    {
        var reorderJson = """{"columnKey":"colA","previousIndex":0,"currentIndex":2,"columnOrder":["colB","colC","colA"]}""";
        var reorderDetail = JsonSerializer.Deserialize<ColumnReorderDetail>(reorderJson);
        Assert.NotNull(reorderDetail);
        Assert.Equal("colA", reorderDetail.ColumnKey);
        Assert.Equal(0, reorderDetail.PreviousIndex);
        Assert.Equal(2, reorderDetail.CurrentIndex);
        Assert.Equal(3, reorderDetail.ColumnOrder.Length);

        var visibilityJson = """{"columnKey":"colB","visible":false,"visibleColumnKeys":["colA","colC"]}""";
        var visibilityDetail = JsonSerializer.Deserialize<ColumnVisibilityChangeDetail>(visibilityJson);
        Assert.NotNull(visibilityDetail);
        Assert.Equal("colB", visibilityDetail.ColumnKey);
        Assert.False(visibilityDetail.Visible);
        Assert.Equal(2, visibilityDetail.VisibleColumnKeys.Length);

        var stateChangeJson = """{"reason":"resize","state":{"version":1,"columns":[{"key":"colA","width":200,"visible":true}]}}""";
        var stateDetail = JsonSerializer.Deserialize<ColumnStateChangeDetail>(stateChangeJson);
        Assert.NotNull(stateDetail);
        Assert.Equal(ColumnStateChangeReason.Resize, stateDetail.Reason);
        Assert.Single(stateDetail.State.Columns);
        Assert.Equal(200, stateDetail.State.Columns[0].Width);
    }
}
