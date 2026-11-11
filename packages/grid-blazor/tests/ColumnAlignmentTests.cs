using System.Text.Json;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class ColumnAlignmentTests
{
    [Theory]
    [InlineData("start")]
    [InlineData("center")]
    [InlineData("end")]
    [InlineData("left")]
    [InlineData("right")]
    public void SerializesSharedAlignmentForProgrammaticAndDeclaredColumns(string align)
    {
        var column = new DeclaredColumn("amount", "Amount", 160, null, null, Align: ColumnAlignment.Validate(align, "amount"));
        var json = JsonSerializer.SerializeToElement(column.ToGridColumn());
        Assert.Equal(align, json.GetProperty("align").GetString());
        var plain = JsonSerializer.SerializeToElement(new GridColumn { Key = "amount" });
        Assert.False(plain.TryGetProperty("align", out _));
    }

    [Fact]
    public void InvalidAlignmentBlocksRegistrySnapshotsAndRecoversWithoutReplacingValidEntries()
    {
        var changes = 0;
        var registry = new ColumnRegistry<Employee>(() => changes++);
        var identity = new object();
        var column = new DeclaredColumn("id", null, null, null, null, Align: "end");
        registry.Update(identity, column);
        var valid = registry.Snapshot();
        Assert.Contains("id", Assert.Throws<ColumnAlignmentException>(() => ColumnAlignment.Validate("justify", "id")).Message);
        registry.ReportAlignmentError(identity, new("bad alignment"));
        Assert.Throws<ColumnAlignmentException>(() => registry.Snapshot());
        var count = changes;
        registry.ReportAlignmentError(identity, new("bad alignment"));
        Assert.Equal(count, changes);
        registry.Update(identity, column);
        Assert.Same(valid, registry.Snapshot());
        registry.ReportAlignmentError(identity, new("bad again"));
        registry.Remove(identity);
        Assert.Empty(registry.Snapshot());
        registry.ReportAlignmentError(new object(), new("initial error"));
        registry.Dispose();
        Assert.Empty(registry.Snapshot());
    }
}
