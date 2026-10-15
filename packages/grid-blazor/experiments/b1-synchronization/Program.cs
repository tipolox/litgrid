using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.JSInterop;
using B1Host;
var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<Fixture>("#app");
var runtime = builder.Services.Last(service => service.ServiceType == typeof(IJSRuntime));
builder.Services.AddScoped<ObservedRuntime>(services => new((IJSRuntime)(runtime.ImplementationInstance ??
    runtime.ImplementationFactory?.Invoke(services) ?? ActivatorUtilities.CreateInstance(services, runtime.ImplementationType!))));
builder.Services.AddScoped<IJSRuntime>(services => services.GetRequiredService<ObservedRuntime>());
await builder.Build().RunAsync();
