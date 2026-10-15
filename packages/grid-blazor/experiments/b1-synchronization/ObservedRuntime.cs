using System.Collections;
using Microsoft.JSInterop;

namespace B1Host;

// Test instrumentation at the actual public interop boundary. No alternate serializer.
public sealed class ObservedRuntime(IJSRuntime inner) : IJSRuntime
{
    public int Calls, Transfers, Columns, Configurations, InFlight;
    public bool DelayNextSync;
    public bool DecorateComponent;
    public async ValueTask<T> InvokeAsync<T>(string name, object?[]? args)
    {
        if (name == "import") Calls++;
        var result = await inner.InvokeAsync<T>(name, args);
        return result is IJSObjectReference module ? (T)(object)new ObservedModule(module, this) : result;
    }
    public async ValueTask<T> InvokeAsync<T>(string name, CancellationToken token, object?[]? args)
    {
        if (name == "import") Calls++;
        var result = await inner.InvokeAsync<T>(name, token, args);
        return result is IJSObjectReference module ? (T)(object)new ObservedModule(module, this) : result;
    }
    private sealed class ObservedModule(IJSObjectReference inner, ObservedRuntime owner) : IJSObjectReference
    {
        public ValueTask<T> InvokeAsync<T>(string name, object?[]? args) => InvokeCoreAsync<T>(name, null, args);
        public ValueTask<T> InvokeAsync<T>(string name, CancellationToken token, object?[]? args)
            => InvokeCoreAsync<T>(name, token, args);
        private async ValueTask<T> InvokeCoreAsync<T>(string name, CancellationToken? token, object?[]? args)
        {
            owner.Calls++;
            if (name is "initGrid" or "updateInputs" && args?.LastOrDefault() is IDictionary<string, object?> inputs)
            {
                if (inputs.ContainsKey("data")) owner.Transfers++;
                if (inputs.ContainsKey("columns")) owner.Columns++;
                if (inputs.ContainsKey("config")) owner.Configurations++;
            }
            owner.InFlight++;
            try
            {
                if (name == "updateInputs" && owner.DelayNextSync)
                {
                    owner.DelayNextSync = false;
                    await Task.Delay(250, token ?? CancellationToken.None);
                }
                // Even an explicit CancellationToken.None overrides JSRuntime's
                // default timeout. The decorator must preserve overload semantics.
                return token.HasValue ? await inner.InvokeAsync<T>(name, token.Value, args)
                    : await inner.InvokeAsync<T>(name, args);
            }
            finally { owner.InFlight--; }
        }
        public ValueTask DisposeAsync() => inner.DisposeAsync();
    }
}

public sealed class ObservedRows<T>(List<T> items) : IEnumerable<T>
{
    public List<T> Items { get; } = items;
    public int Enumerations, Visits;
    public IEnumerator<T> GetEnumerator()
    {
        Enumerations++;
        foreach (var item in Items) { Visits++; yield return item; }
    }
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
