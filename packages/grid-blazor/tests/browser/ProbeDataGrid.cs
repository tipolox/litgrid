using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Tipolox.LitGrid.Blazor;

namespace BrowserHost;

// Test-only signal: the base lifecycle has awaited initGrid and acknowledged it in .NET.
public class ProbeDataGrid<TItem> : DataGrid<TItem>
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        await base.OnAfterRenderAsync(firstRender);
        if (firstRender)
        {
            try
            {
                await GetColumnStateAsync();
                await JS.InvokeVoidAsync("recordGridInitialized");
            }
            catch (InvalidOperationException error) when (error.Message == "LitGrid is not available before the Blazor component is mounted.")
            {
                // The navigation regression deliberately disposes during a delayed import.
                // Never signal readiness for that abandoned component.
            }
        }
    }
}
