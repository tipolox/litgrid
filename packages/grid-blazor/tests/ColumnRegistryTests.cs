using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class ColumnRegistryTests
{
    [Fact]
    public void PresentationErrorsBlockSnapshotsWithoutReplacingEntriesAndRecoverOrDispose()
    {
        var changes=0;
        var registry=new ColumnRegistry<Employee>(()=>changes++);
        var identity=new object();
        var column=new DeclaredColumn("id",null,null,null,null);
        registry.Update(identity,column);
        var valid=registry.Snapshot();
        registry.ReportPresentationError(identity,new("bad format"));
        Assert.Throws<ColumnPresentationException>(()=>registry.Snapshot());
        var count=changes;
        registry.ReportPresentationError(identity,new("bad format"));
        Assert.Equal(count,changes);
        registry.Update(identity,column);
        Assert.Same(valid,registry.Snapshot());
        registry.ReportPresentationError(identity,new("bad again"));
        registry.Remove(identity);
        Assert.Empty(registry.Snapshot());
        registry.ReportPresentationError(new object(),new("initial error"));
        registry.Dispose();
        Assert.Empty(registry.Snapshot());
    }

    [Fact]
    public void RegistersUpdatesOrdersRemovesAndBoundsLifetime()
    {
        var changes = 0;
        var registry = new ColumnRegistry<Employee>(() => changes++);
        var first = new object(); var second = new object(); var third = new object();
        var name = new DeclaredColumn("employee_name", "Name", 220d, null, null);
        registry.Update(first, name);
        registry.Update(second, new("id", "ID", 80d, false, 0));
        registry.Update(third, new("department", "Department", null, true, 0));
        Assert.Equal(new[] { "id", "department", "employee_name" }, registry.Snapshot().Select(column => column.Key));
        registry.Update(first, name);
        Assert.Equal(3, changes);
        registry.Update(first, name with { Order = -1, Title = "Person" });
        Assert.Equal("employee_name", registry.Snapshot()[0].Key);
        registry.Remove(second);
        Assert.Equal(2, registry.Snapshot().Length);
        registry.Dispose();
        registry.Update(first, name);
        registry.Remove(third);
        Assert.Empty(registry.Snapshot());
        Assert.Equal(5, changes);
    }

    [Fact]
    public void ValidatesDuplicatesAtSnapshotAllowingAtomicKeySwaps()
    {
        var registry = new ColumnRegistry<Employee>(() => { });
        var first = new object(); var second = new object();
        registry.Update(first, new("id", null, null, null, null));
        registry.Update(second, new("name", null, null, null, null));
        registry.Update(first, new("name", null, null, null, null));
        Assert.Contains("Duplicate", Assert.Throws<InvalidOperationException>(() => registry.Snapshot()).Message);
        registry.Update(second, new("id", null, null, null, null));
        Assert.Equal(new[] { "name", "id" }, registry.Snapshot().Select(column => column.Key));
    }
}
