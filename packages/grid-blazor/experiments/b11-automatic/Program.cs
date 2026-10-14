using B11Host;
using B1Host;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.JSInterop;
var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<Fixture>("#app");
builder.Services.AddScoped<ObservedRuntime>(services => new(services.GetRequiredService<IJSRuntime>()));
await builder.Build().RunAsync();
