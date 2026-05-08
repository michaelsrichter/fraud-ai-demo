using Xunit;
using FluentAssertions;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;

namespace Domain.Tests;

public class AiInvestigationResultToolTraceTests
{
    [Fact]
    public void Succeeded_With_ToolTrace_Preserves_Trace()
    {
        var trace = new List<ToolInvocation>
        {
            new("query_expense_data", "{\"vendor\":\"AcmeAir\"}", "5 records returned", null, null, 200, true),
            new("code_interpreter", "{\"code\":\"print(42)\"}", "Output: 42", "42", "The answer is 42", 1500, true),
        };

        var result = AiInvestigationResult.Succeeded(
            Guid.NewGuid(), Guid.NewGuid(),
            DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Likely, "Suspicious",
            new[] { "Signal 1" }, "Escalate",
            toolTrace: trace);

        result.ToolTrace.Should().NotBeNull();
        result.ToolTrace.Should().HaveCount(2);
        result.ToolTrace![0].ToolName.Should().Be("query_expense_data");
        result.ToolTrace![1].ToolName.Should().Be("code_interpreter");
    }

    [Fact]
    public void Succeeded_Without_ToolTrace_Has_Null_Trace()
    {
        var result = AiInvestigationResult.Succeeded(
            Guid.NewGuid(), Guid.NewGuid(),
            DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Unlikely, "Normal expense",
            new[] { "Clean signals" }, "No action");

        result.ToolTrace.Should().BeNull();
    }

    [Fact]
    public void Unavailable_Has_Null_ToolTrace()
    {
        var result = AiInvestigationResult.Unavailable(
            Guid.NewGuid(), Guid.NewGuid(),
            DateTimeOffset.UtcNow, "timeout");

        result.ToolTrace.Should().BeNull();
    }

    [Fact]
    public void Backward_Compat_Constructor_Without_ToolTrace_Defaults_To_Null()
    {
        // Existing code that doesn't pass toolTrace should still work
        var result = new AiInvestigationResult(
            Guid.NewGuid(), Guid.NewGuid(),
            DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            InvestigationStatus.Succeeded,
            FraudLikelihood.Likely, "reason",
            new[] { "signal" }, "action", null);

        result.ToolTrace.Should().BeNull();
    }
}
