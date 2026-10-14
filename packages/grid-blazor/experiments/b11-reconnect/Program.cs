using B1Host;
using ReconnectHost;
using Microsoft.JSInterop;
using Microsoft.AspNetCore.DataProtection;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
builder.WebHost.UseStaticWebAssets();
builder.Services.AddRazorComponents().AddInteractiveServerComponents(options => {
    // Accelerated framework timeout only in this fault-injection test host.
    options.JSInteropDefaultCallTimeout = TimeSpan.FromSeconds(
        int.Parse(Environment.GetEnvironmentVariable("LITGRID_TEST_INTEROP_SECONDS") ?? "5"));
    options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromSeconds(
        int.Parse(Environment.GetEnvironmentVariable("LITGRID_TEST_RETENTION_SECONDS") ?? "60"));
});
builder.Services.AddScoped<ObservedRuntime>(s => new(s.GetRequiredService<IJSRuntime>()));
var app = builder.Build();
app.UseStaticFiles(); app.UseAntiforgery();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
app.Run();
