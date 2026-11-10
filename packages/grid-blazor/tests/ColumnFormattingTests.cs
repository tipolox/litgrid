using System.Text.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class ColumnFormattingTests
{
    [Fact]
    public void SerializesTheSharedDescriptorAndDetachesOptionsWithValueEquality()
    {
        var format = new GridValueFormat { Kind = "number", Locale = "en-SG", Options = new JsonObject {
            ["style"] = "currency", ["currency"] = "SGD", ["useGrouping"] = false, ["maximumFractionDigits"] = 2 } };
        var snapshot = GridFormatSnapshot.Capture(format)!;
        var column = new DeclaredColumn("amount", "SGD", 160, null, null, Align: "right", Format: snapshot);
        var json = JsonSerializer.SerializeToElement(column.ToGridColumn());
        Assert.Equal("right", json.GetProperty("align").GetString());
        Assert.Equal("SGD", json.GetProperty("format").GetProperty("options").GetProperty("currency").GetString());
        var identical = new GridValueFormat { Kind = "number", Locale = "en-SG", Options = new JsonObject {
            ["currency"] = "SGD", ["maximumFractionDigits"] = 2, ["useGrouping"] = false, ["style"] = "currency" } };
        Assert.Equal(snapshot, GridFormatSnapshot.Capture(identical));
        format.Options["maximumFractionDigits"] = 0;
        Assert.NotEqual(snapshot, GridFormatSnapshot.Capture(format));
        Assert.Equal(2, snapshot.ToFormat().Options!["maximumFractionDigits"]!.GetValue<double>());
        var detached = snapshot.ToFormat(); detached.Options!["currency"] = "USD";
        Assert.Equal("SGD", snapshot.ToFormat().Options!["currency"]!.GetValue<string>());
    }

    [Fact]
    public void ValidatesBoundedStructuralMetadataAndKeepsRegistryOnFailure()
    {
        var registry = new ColumnRegistry<Employee>(() => { });
        var identity = new object();
        var good = new DeclaredColumn("id", null, null, null, null, Align: GridFormatSnapshot.ValidateAlign("end"));
        registry.Update(identity, good);
        Assert.Throws<ArgumentException>(() => GridFormatSnapshot.ValidateAlign("justify"));
        foreach (var options in new JsonObject[] { new() { ["roundingMode"] = "ceil" }, new() { ["useGrouping"] = "true" }, new() { ["maximumFractionDigits"] = "2" }, new() { ["style"] = null } })
            Assert.Throws<ArgumentException>(() => GridFormatSnapshot.Capture(new() { Kind = "number", Locale = "en-GB", Options = options }));
        Assert.Throws<ArgumentException>(() => GridFormatSnapshot.Capture(new() { Kind = "dateTime", Locale = "en-GB" }));
        Assert.Throws<ArgumentException>(() => GridFormatSnapshot.Capture(new() { Kind = "number", Locale = "" }));
        Assert.Equal(good, Assert.Single(registry.Snapshot()));
        var date = GridFormatSnapshot.Capture(new() { Kind = "dateTime", Locale = "en-GB", Options = new() { ["timeZone"] = "Asia/Singapore", ["timeStyle"] = "short" } });
        registry.Update(identity, good with { Format = date });
        Assert.Equal("Asia/Singapore", Assert.Single(registry.Snapshot()).ToGridColumn().Format!.Options!["timeZone"]!.GetValue<string>());
        // Browser Intl is authoritative for locale/zone/currency support, not .NET CultureInfo.
        Assert.NotNull(GridFormatSnapshot.Capture(new() { Kind = "number", Locale = "zz-ZZ" }));
        Assert.NotNull(GridFormatSnapshot.Capture(new() { Kind = "number", Locale = "en-GB", Options = new() { ["useGrouping"] = "min2" } }));
        Assert.Contains("amount", Assert.ThrowsAny<ArgumentException>(() => GridFormatSnapshot.Capture(new() { Kind = "dateTime", Locale = "en-GB" }, "amount")).Message);
    }
}
