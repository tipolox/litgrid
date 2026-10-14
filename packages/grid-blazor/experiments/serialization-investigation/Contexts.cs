using System.Text.Json.Serialization;
using BrowserHost.Performance;

namespace SerializationInvestigation;

public sealed class DataEnvelope<T> { public T[] Data { get; set; } = []; }

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true, MaxDepth = 32, GenerationMode = JsonSourceGenerationMode.Metadata)]
[JsonSerializable(typeof(AccountRow10[]))]
[JsonSerializable(typeof(AccountRow120[]))]
[JsonSerializable(typeof(DataEnvelope<AccountRow10>))]
[JsonSerializable(typeof(DataEnvelope<AccountRow120>))]
public partial class MetadataContext : JsonSerializerContext { }

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true, MaxDepth = 32, GenerationMode = JsonSourceGenerationMode.Default)]
[JsonSerializable(typeof(AccountRow10[]))]
[JsonSerializable(typeof(AccountRow120[]))]
[JsonSerializable(typeof(DataEnvelope<AccountRow10>))]
[JsonSerializable(typeof(DataEnvelope<AccountRow120>))]
public partial class FastContext : JsonSerializerContext { }
