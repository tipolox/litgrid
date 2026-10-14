using System.Buffers;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.JSInterop;

namespace BrowserHost.Performance;

// Test-only consumer implementation. No production API or synchronization changes.
public static class CooperativeTransfer
{
    public const int TargetBytes = 64 * 1024;
    public const int MaximumRowBytes = 1024 * 1024;
    public const int MaximumRowsPerBatch = 128;
    public const double TargetSliceMs = 8;

    public static JsonSerializerOptions InteropOptions() => new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        MaxDepth = 32
    };

    public static void ValidateCollection<T>(IEnumerable<T> source, JsonSerializerOptions options)
    {
        // Row framing cannot preserve collection-level transformations or $id/$ref state.
        if (options.ReferenceHandler != null)
            throw new NotSupportedException("Reference handlers require the legacy whole-collection path.");
        foreach (var type in new[] { source.GetType(), typeof(IEnumerable<T>) })
        {
            if (type.GetCustomAttributes(typeof(JsonConverterAttribute), true).Length != 0 ||
                options.GetConverter(type).GetType().Assembly != typeof(JsonSerializer).Assembly)
                throw new NotSupportedException("Custom collection converters require the legacy path.");
        }
    }

    public static async Task<TransferMetrics> SendAsync<T>(IJSObjectReference module,
        IEnumerable<T> source, JsonSerializerOptions options, CancellationToken cancellationToken = default)
    {
        ValidateCollection(source, options);
        var metrics = new TransferMetrics();
        var totalAllocated = GC.GetAllocatedBytesForCurrentThread();
        var total = Stopwatch.StartNew();
        // One writer/buffer at a time, plus one exact-size byte[] required by standard interop.
        var buffer = new ArrayBufferWriter<byte>(TargetBytes);
        using var writer = new Utf8JsonWriter(buffer);
        using var iterator = source.GetEnumerator();
        writer.WriteStartArray();
        int batchRows = 0;
        await module.InvokeVoidAsync("beginTransfer");
        var slice = Stopwatch.StartNew();
        try
        {
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var beforeAllocation = GC.GetAllocatedBytesForCurrentThread();
                var stage = Stopwatch.StartNew();
                var hasNext = iterator.MoveNext();
                metrics.EnumerationMs += stage.Elapsed.TotalMilliseconds;
                metrics.ManagedAllocatedBytes += GC.GetAllocatedBytesForCurrentThread() - beforeAllocation;
                if (!hasNext) break;
                beforeAllocation = GC.GetAllocatedBytesForCurrentThread();
                stage.Restart();
                var before = writer.BytesCommitted + writer.BytesPending;
                JsonSerializer.Serialize(writer, iterator.Current, options);
                writer.Flush();
                metrics.EncodingMs += stage.Elapsed.TotalMilliseconds;
                metrics.ManagedAllocatedBytes += GC.GetAllocatedBytesForCurrentThread() - beforeAllocation;
                if (writer.BytesCommitted - before > MaximumRowBytes)
                    throw new NotSupportedException("A row exceeds the prototype's 1 MiB limit; use the legacy path.");
                metrics.Rows++;
                batchRows++;
                if (buffer.WrittenCount >= TargetBytes || batchRows >= MaximumRowsPerBatch || slice.Elapsed.TotalMilliseconds >= TargetSliceMs)
                {
                    await FlushAsync();
                    batchRows = 0;
                    buffer.Clear();
                    writer.Reset(buffer);
                    writer.WriteStartArray();
                    slice.Restart();
                }
            }
            if (batchRows > 0) await FlushAsync();
            cancellationToken.ThrowIfCancellationRequested();
            await module.InvokeVoidAsync("commitTransfer");
        }
        finally
        {
            // Also releases staging after a converter/enumerator/interop exception.
            await module.InvokeVoidAsync("abortTransfer");
        }
        metrics.ElapsedMs = total.Elapsed.TotalMilliseconds;
        metrics.TotalManagedAllocatedBytes = GC.GetAllocatedBytesForCurrentThread() - totalAllocated;
        return metrics;

        async Task FlushAsync()
        {
            writer.WriteEndArray();
            writer.Flush();
            var allocated = GC.GetAllocatedBytesForCurrentThread();
            var bytes = buffer.WrittenSpan.ToArray();
            metrics.ManagedAllocatedBytes += GC.GetAllocatedBytesForCurrentThread() - allocated;
            metrics.PayloadBytes += bytes.Length;
            metrics.MaximumBatchBytes = Math.Max(metrics.MaximumBatchBytes, bytes.Length);
            metrics.Batches++;
            var dispatch = Stopwatch.StartNew();
            // Awaited acknowledgement is backpressure; append yields via a browser timer.
            var accepted = await module.InvokeAsync<bool>("appendBytes", bytes);
            metrics.InteropAwaitMs += dispatch.Elapsed.TotalMilliseconds;
            if (!accepted) throw new OperationCanceledException("Browser cancelled the transfer.");
            cancellationToken.ThrowIfCancellationRequested();
        }
    }
}

public sealed class TransferMetrics
{
    public int Rows { get; set; }
    public int Batches { get; set; }
    public int MaximumBatchBytes { get; set; }
    public long PayloadBytes { get; set; }
    public long ManagedAllocatedBytes { get; set; }
    public long TotalManagedAllocatedBytes { get; set; }
    public double EnumerationMs { get; set; }
    public double EncodingMs { get; set; }
    public double InteropAwaitMs { get; set; }
    public double ElapsedMs { get; set; }
}
