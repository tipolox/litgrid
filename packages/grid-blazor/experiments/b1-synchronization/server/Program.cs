using B1Host;
using B1Host.Server;
using Microsoft.JSInterop;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using System.Xml.Linq;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
builder.Services.Configure<KeyManagementOptions>(options => options.XmlRepository = new MemoryKeys());
builder.Logging.ClearProviders(); builder.Logging.AddConsole();
builder.WebHost.UseStaticWebAssets();
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
// Server circuit infrastructure requires its concrete RemoteJSRuntime service.
// Decorate only the test grid's runtime, leaving circuit services intact.
builder.Services.AddScoped<ObservedRuntime>(services => new(services.GetRequiredService<IJSRuntime>()) { DecorateComponent = true });
var app = builder.Build();
app.UseStaticFiles(); app.UseAntiforgery();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
app.Run();

sealed class MemoryKeys : IXmlRepository
{
    private readonly List<XElement> keys = [];
    public IReadOnlyCollection<XElement> GetAllElements() { lock(keys) return keys.Select(key => new XElement(key)).ToArray(); }
    public void StoreElement(XElement key, string name) { lock(keys) keys.Add(new XElement(key)); }
}
