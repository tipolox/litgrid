using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using SerializationInvestigation;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
await builder.Build().RunAsync();
