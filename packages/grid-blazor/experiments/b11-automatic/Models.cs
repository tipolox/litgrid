using System.Collections;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Components;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using B1Host;
using Tipolox.LitGrid.Blazor;

namespace B11Host;

public sealed class Row(int id) : INotifyPropertyChanged
{
    private string name = "Employee " + id;
    private PropertyChangedEventHandler? handlers;
    private int subscribers;
    public int Id { get; set; } = id;
    public string Name { get => name; set { name = value; handlers?.Invoke(this, new(nameof(Name))); } }
    public decimal Balance { get; set; } = id * 1.25m;
    public DateTime Joined { get; set; } = new(2020, 1, 1);
    public string Department { get; set; } = "Engineering";
    public bool Active { get; set; } = true;
    public string Alias { get; set; } = "alias";
    public string Status { get; set; } = "active";
    public double Ratio { get; set; } = 0.75;
    public int Rating { get; set; } = 5;
    [JsonIgnore] public int Subscribers => subscribers;
    public event PropertyChangedEventHandler? PropertyChanged { add { handlers += value; subscribers++; } remove { handlers -= value; subscribers--; } }
}
public interface ICounted { int Enumerations { get; } int Visits { get; } }
public sealed class CountedList(List<Row> rows) : IEnumerable<Row>, ICounted
{
    public List<Row> Rows { get; } = rows;
    public int Enumerations { get; private set; }
    public int Visits { get; private set; }
    public IEnumerator<Row> GetEnumerator() { Enumerations++; foreach (var row in Rows) { Visits++; yield return row; } }
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
public sealed class CountedObservable(IEnumerable<Row> rows) : ObservableCollection<Row>(rows), IEnumerable<Row>, ICounted
{
    public int Enumerations { get; private set; }
    public int Visits { get; private set; }
    IEnumerator<Row> IEnumerable<Row>.GetEnumerator() { Enumerations++; foreach (var row in Items) { Visits++; yield return row; } }
    IEnumerator IEnumerable.GetEnumerator() => ((IEnumerable<Row>)this).GetEnumerator();
}
// Decorate only the component, preserving the Server circuit runtime.
public sealed class ObservedGrid : DataGrid<Row>
{
    [Inject] private ObservedRuntime Observed { get; set; } = default!;
    [DynamicDependency(DynamicallyAccessedMemberTypes.NonPublicProperties, typeof(DataGrid<Row>))]
    protected override void OnInitialized()
    {
        base.OnInitialized();
        typeof(DataGrid<Row>).GetProperty("JSRuntime", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(this, Observed);
    }
}
