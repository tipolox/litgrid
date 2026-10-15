using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using BrowserHost.Performance;
using Microsoft.AspNetCore.Components;
using Tipolox.LitGrid.Blazor;
namespace B1Host;

// Server-only instrumentation. Rendering, parameters, synchronization, public
// methods and disposal are all inherited unchanged from the production component.
public sealed class ObservedGrid : DataGrid<AccountRow10>
{
    [Inject] private ObservedRuntime Observed { get; set; } = default!;
    [DynamicDependency(DynamicallyAccessedMemberTypes.NonPublicProperties, typeof(DataGrid<AccountRow10>))]
    protected override void OnInitialized()
    {
        base.OnInitialized();
        typeof(DataGrid<AccountRow10>).GetProperty("JSRuntime", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(this, Observed);
    }
}
