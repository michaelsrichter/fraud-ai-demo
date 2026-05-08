using Xunit;
using FluentAssertions;
using FraudDemo.Domain.Entities;

namespace Domain.Tests;

public class ToolInvocationTests
{
    [Fact]
    public void Constructor_Rejects_Empty_ToolName()
    {
        var act = () => new ToolInvocation("", "{}", "summary", null, null, 100, true);
        act.Should().Throw<ArgumentException>().WithMessage("*ToolName*");
    }

    [Fact]
    public void Constructor_Rejects_Null_ToolName()
    {
        var act = () => new ToolInvocation(null!, "{}", "summary", null, null, 100, true);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constructor_Rejects_Empty_Parameters()
    {
        var act = () => new ToolInvocation("tool", "", "summary", null, null, 100, true);
        act.Should().Throw<ArgumentException>().WithMessage("*Parameters*");
    }

    [Fact]
    public void Constructor_Rejects_Empty_ResponseSummary()
    {
        var act = () => new ToolInvocation("tool", "{}", "", null, null, 100, true);
        act.Should().Throw<ArgumentException>().WithMessage("*ResponseSummary*");
    }

    [Fact]
    public void Constructor_Rejects_Negative_LatencyMs()
    {
        var act = () => new ToolInvocation("tool", "{}", "summary", null, null, -1, true);
        act.Should().Throw<ArgumentOutOfRangeException>().WithMessage("*LatencyMs*");
    }

    [Fact]
    public void Constructor_Accepts_Valid_Values()
    {
        var inv = new ToolInvocation("query_expense_data", "{\"vendor\":\"AcmeAir\"}", "12 records returned", "truncated data", "Agent reasoning", 150, true);
        inv.ToolName.Should().Be("query_expense_data");
        inv.Parameters.Should().Contain("AcmeAir");
        inv.ResponseSummary.Should().Be("12 records returned");
        inv.ResponseData.Should().Be("truncated data");
        inv.Reasoning.Should().Be("Agent reasoning");
        inv.LatencyMs.Should().Be(150);
        inv.Succeeded.Should().BeTrue();
    }

    [Fact]
    public void Constructor_Accepts_Zero_LatencyMs()
    {
        var inv = new ToolInvocation("tool", "{}", "summary", null, null, 0, true);
        inv.LatencyMs.Should().Be(0);
    }

    [Fact]
    public void Constructor_Accepts_Null_Optional_Fields()
    {
        var inv = new ToolInvocation("tool", "{}", "summary", null, null, 100, false);
        inv.ResponseData.Should().BeNull();
        inv.Reasoning.Should().BeNull();
        inv.Succeeded.Should().BeFalse();
    }
}
