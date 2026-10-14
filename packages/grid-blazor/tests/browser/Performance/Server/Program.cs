using BrowserHost.Performance;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using System.Xml.Linq;

var builder = WebApplication.CreateBuilder(args);
// Isolated test host: no user-profile keys or Windows event-log writes.
builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
builder.Services.Configure<KeyManagementOptions>(settings => settings.XmlRepository = new MemoryKeyRepository());
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.WebHost.UseStaticWebAssets();
builder.Services.AddRazorComponents().AddInteractiveServerComponents();
var app = builder.Build();
app.UseStaticFiles();
app.UseAntiforgery();
// Serve the shared experimental module directly instead of duplicating assets.
app.MapGet("/performance-prototype.js", () => Results.File(
    Path.GetFullPath("../../wwwroot/performance-prototype.js", builder.Environment.ContentRootPath), "text/javascript"));
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
app.Run();

sealed class MemoryKeyRepository : IXmlRepository
{
    private readonly List<XElement> elements = [];
    public IReadOnlyCollection<XElement> GetAllElements()
    {
        lock (elements) return elements.Select(item => new XElement(item)).ToArray();
    }
    public void StoreElement(XElement element, string friendlyName)
    {
        lock (elements) elements.Add(new XElement(element));
    }
}
