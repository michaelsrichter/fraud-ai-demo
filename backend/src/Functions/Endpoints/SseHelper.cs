using System.Text.Json;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// Writes Server-Sent Events to an HTTP response stream (FR-017, research R6).
/// </summary>
public static class SseHelper
{
    /// <summary>
    /// Writes a single SSE event: <c>event: {eventType}\ndata: {json}\n\n</c> and flushes.
    /// </summary>
    public static async Task WriteSseEventAsync(Stream stream, string eventType, object data, JsonSerializerOptions options, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(data, data.GetType(), options);
        var payload = $"event: {eventType}\ndata: {json}\n\n";
        var bytes = System.Text.Encoding.UTF8.GetBytes(payload);
        await stream.WriteAsync(bytes, ct);
        await stream.FlushAsync(ct);
    }
}
