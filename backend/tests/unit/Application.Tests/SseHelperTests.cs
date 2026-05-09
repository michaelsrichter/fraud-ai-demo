using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;
using FluentAssertions;
using FraudDemo.Functions.Endpoints;

namespace Application.Tests;

/// <summary>
/// Tests for SseHelper SSE event formatting (T057).
/// </summary>
public class SseHelperTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    [Fact]
    public async Task WriteSseEventAsync_Produces_Correct_Format()
    {
        using var ms = new MemoryStream();
        var data = new { name = "test", value = 42 };

        await SseHelper.WriteSseEventAsync(ms, "tool_call", data, JsonOptions, CancellationToken.None);

        var output = Encoding.UTF8.GetString(ms.ToArray());
        output.Should().Be("event: tool_call\ndata: {\"name\":\"test\",\"value\":42}\n\n");
    }

    [Fact]
    public async Task WriteSseEventAsync_Handles_Special_Characters()
    {
        using var ms = new MemoryStream();
        var data = new { message = "hello \"world\" & <tag>" };

        await SseHelper.WriteSseEventAsync(ms, "complete", data, JsonOptions, CancellationToken.None);

        var output = Encoding.UTF8.GetString(ms.ToArray());
        output.Should().StartWith("event: complete\ndata: ");
        output.Should().EndWith("\n\n");
        // JSON should be valid and parseable
        var jsonPart = output.Replace("event: complete\ndata: ", "").TrimEnd('\n');
        var parsed = JsonSerializer.Deserialize<JsonElement>(jsonPart);
        parsed.GetProperty("message").GetString().Should().Be("hello \"world\" & <tag>");
    }

    [Fact]
    public async Task WriteSseEventAsync_Flushes_Stream()
    {
        var ms = new FlushTrackingStream();
        var data = new { ok = true };

        await SseHelper.WriteSseEventAsync(ms, "test", data, JsonOptions, CancellationToken.None);

        ms.FlushCount.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task WriteSseEventAsync_Multiple_Events_Produce_Separate_Frames()
    {
        using var ms = new MemoryStream();

        await SseHelper.WriteSseEventAsync(ms, "tool_call", new { step = 1 }, JsonOptions, CancellationToken.None);
        await SseHelper.WriteSseEventAsync(ms, "tool_call", new { step = 2 }, JsonOptions, CancellationToken.None);
        await SseHelper.WriteSseEventAsync(ms, "complete", new { done = true }, JsonOptions, CancellationToken.None);

        var output = Encoding.UTF8.GetString(ms.ToArray());
        var frames = output.Split("\n\n", StringSplitOptions.RemoveEmptyEntries);
        frames.Should().HaveCount(3);
        frames[0].Should().StartWith("event: tool_call");
        frames[1].Should().StartWith("event: tool_call");
        frames[2].Should().StartWith("event: complete");
    }

    private sealed class FlushTrackingStream : MemoryStream
    {
        public int FlushCount { get; private set; }

        public override async Task FlushAsync(CancellationToken cancellationToken)
        {
            FlushCount++;
            await base.FlushAsync(cancellationToken);
        }
    }
}
