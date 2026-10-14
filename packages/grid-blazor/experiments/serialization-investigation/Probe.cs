using System.Buffers;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using BrowserHost.Performance;

namespace SerializationInvestigation;

public static class Probe
{
    private static readonly JsonSerializerOptions ReflectionOptions = Options();
    private static readonly Dictionary<string, object> Sources = [];
    private static JsonSerializerOptions Options() => new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true, MaxDepth = 32
    };

    public static object Run(string fixture, string mode, int count, int repetition)
    {
        if (fixture == "narrow")
            return Measure(GetRows(fixture, count, i => new AccountRow10(i)), fixture, mode, repetition);
        if (fixture == "wide")
            return Measure(GetRows(fixture, count, i => new AccountRow120(i)), fixture, mode, repetition);
        throw new ArgumentException(fixture);
    }

    private static T[] GetRows<T>(string fixture, int count, Func<int, T> create)
    {
        var key = fixture + count;
        if (!Sources.TryGetValue(key, out var rows))
            Sources[key] = rows = Enumerable.Range(1, count).Select(create).ToArray();
        return (T[])rows;
    }

    private static object Measure<T>(T[] rows, string fixture, string mode, int repetition)
    {
        // Setup and semantic checking are outside the timed region. One row warms contracts.
        JsonSerializer.SerializeToUtf8Bytes(rows.Take(1).ToArray(), ReflectionOptions);
        var envelope = new DataEnvelope<T> { Data = rows };
        var dictionary = new Dictionary<string, object?> { ["data"] = rows };
        var metaArray = (JsonTypeInfo<T[]>)MetadataContext.Default.GetTypeInfo(typeof(T[]))!;
        var fastArray = (JsonTypeInfo<T[]>)FastContext.Default.GetTypeInfo(typeof(T[]))!;
        var metaRow = (JsonTypeInfo<T>)MetadataContext.Default.GetTypeInfo(typeof(T))!;
        var fastRow = (JsonTypeInfo<T>)FastContext.Default.GetTypeInfo(typeof(T))!;
        var fastEnvelope = (JsonTypeInfo<DataEnvelope<T>>)FastContext.Default.GetTypeInfo(typeof(DataEnvelope<T>))!;
        var converterOptions = Options();
        converterOptions.Converters.Add(new UnusedGuidConverter());
        var converterContext = new FastContext(converterOptions);
        var converterArray = (JsonTypeInfo<T[]>)converterContext.GetTypeInfo(typeof(T[]))!;
        var buffer = new ArrayBufferWriter<byte>(Math.Max(65536, rows.Length * (fixture == "wide" ? 2700 : 280)));
        using var writer = new Utf8JsonWriter(buffer);
        var fresh = Options();
        // An independent resolver avoids equivalent-options shared caches in the cold control.
        fresh.TypeInfoResolver = new DefaultJsonTypeInfoResolver();
        var decimalProperties = typeof(T).GetProperties().Where(p => p.PropertyType == typeof(decimal)).ToArray();
        var decimals = mode.StartsWith("primitive-")
            ? rows.SelectMany(row => decimalProperties.Select(p => (decimal)p.GetValue(row)!)).ToArray() : [];
        var doubles = mode == "primitive-double" ? decimals.Select(x => (double)x).ToArray() : [];
        var rawNumbers = mode == "primitive-raw-decimal"
            ? decimals.Select(x => JsonSerializer.SerializeToUtf8Bytes(x)).ToArray() : [];
        var allocations = GC.GetAllocatedBytesForCurrentThread();
        var collections = Enumerable.Range(0, 3).Select(GC.CollectionCount).ToArray();
        var watch = Stopwatch.StartNew();
        Span<byte> numericUtf8 = stackalloc byte[128];
        Span<char> numericChars = stackalloc char[128];
        byte[]? bytes = null;
        string? json = null;
        decimal sum = 0;
        int formattedLength = 0;
        switch (mode)
        {
            case "reflection-array-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(rows, ReflectionOptions); break;
            case "reflection-fresh-array-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(rows, fresh); break;
            case "reflection-envelope-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(envelope, ReflectionOptions); break;
            case "reflection-dictionary-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(dictionary, ReflectionOptions); break;
            case "reflection-array-string": json = JsonSerializer.Serialize(rows, ReflectionOptions); break;
            case "metadata-array-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(rows, metaArray); break;
            case "fast-array-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(rows, fastArray); break;
            case "fast-with-unused-converter": bytes = JsonSerializer.SerializeToUtf8Bytes(rows, converterArray); break;
            case "fast-envelope-bytes": bytes = JsonSerializer.SerializeToUtf8Bytes(envelope, fastEnvelope); break;
            case "reflection-whole-writer": JsonSerializer.Serialize(writer, rows, ReflectionOptions); break;
            case "metadata-whole-writer": JsonSerializer.Serialize(writer, rows, metaArray); break;
            case "fast-whole-writer": JsonSerializer.Serialize(writer, rows, fastArray); break;
            case "reflection-row-writer":
            case "metadata-row-writer":
            case "fast-row-writer":
                writer.WriteStartArray();
                foreach (var row in rows)
                {
                    if (mode == "reflection-row-writer") JsonSerializer.Serialize(writer, row, ReflectionOptions);
                    else JsonSerializer.Serialize(writer, row, mode == "metadata-row-writer" ? metaRow : fastRow);
                }
                writer.WriteEndArray(); break;
            case "primitive-decimal":
                writer.WriteStartArray(); foreach (var value in decimals) writer.WriteNumberValue(value); writer.WriteEndArray(); break;
            case "primitive-double":
                writer.WriteStartArray(); foreach (var value in doubles) writer.WriteNumberValue(value); writer.WriteEndArray(); break;
            case "primitive-raw-decimal":
                writer.WriteStartArray(); foreach (var value in rawNumbers) writer.WriteRawValue(value, true); writer.WriteEndArray(); break;
            case "primitive-reflection-getters":
                foreach (var row in rows) foreach (var property in decimalProperties) sum += (decimal)property.GetValue(row)!;
                break;
            case "primitive-decimal-tryformat-utf8":
                foreach (var value in decimals) { value.TryFormat(numericUtf8, out var written, provider: System.Globalization.CultureInfo.InvariantCulture); formattedLength += written; }
                break;
            case "primitive-decimal-tryformat-chars":
                foreach (var value in decimals) { value.TryFormat(numericChars, out var written, provider: System.Globalization.CultureInfo.InvariantCulture); formattedLength += written; }
                break;
            default: throw new ArgumentException(mode);
        }
        writer.Flush();
        watch.Stop();
        var elapsed = watch.Elapsed.TotalMilliseconds;
        var allocated = GC.GetAllocatedBytesForCurrentThread() - allocations;
        var gc = Enumerable.Range(0, 3).Select(g => GC.CollectionCount(g) - collections[g]).ToArray();
        var actual = bytes ?? (json != null ? System.Text.Encoding.UTF8.GetBytes(json) : buffer.WrittenSpan.ToArray());
        bool equivalent = true;
        if (!mode.StartsWith("primitive-"))
        {
            var expected = mode.Contains("envelope") || mode.Contains("dictionary")
                ? JsonSerializer.SerializeToUtf8Bytes(dictionary, ReflectionOptions)
                : JsonSerializer.SerializeToUtf8Bytes(rows, ReflectionOptions);
            equivalent = actual.AsSpan().SequenceEqual(expected);
            if (!equivalent) throw new InvalidOperationException("Serialization byte mismatch: " + mode);
        }
        GC.KeepAlive(sum);
        GC.KeepAlive(formattedLength);
        return new { fixture, mode, rows = rows.Length, repetition, elapsedMs = elapsed,
            allocatedBytes = allocated, gcCollections = gc, payloadBytes = actual.Length, equivalent,
            fastArrayHandler = fastArray.SerializeHandler != null, fastRowHandler = fastRow.SerializeHandler != null,
            runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
            serializerAssembly = typeof(JsonSerializer).Assembly.GetName().Version!.ToString(),
            serializerBuild = typeof(JsonSerializer).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            dynamicCodeCompiled = RuntimeFeature.IsDynamicCodeCompiled,
            dynamicCodeSupported = RuntimeFeature.IsDynamicCodeSupported };
    }

    private sealed class UnusedGuidConverter : System.Text.Json.Serialization.JsonConverter<Guid>
    {
        public override Guid Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options) => reader.GetGuid();
        public override void Write(Utf8JsonWriter writer, Guid value, JsonSerializerOptions options) => writer.WriteStringValue(value);
    }
}
