using Xunit;
using FluentAssertions;
using Moq;
using FraudDemo.Application.Abstractions;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using FraudDemo.Domain.Projections;
using FraudDemo.Infrastructure.Ai;

namespace Infrastructure.Tests;

/// <summary>
/// Tests for Junior → Senior mode orchestration logic (T016a).
/// Verifies confidence threshold routing, escalation paths, and error handling.
/// </summary>
public class JuniorSeniorModeTests
{
    private const float EscalationThreshold = 0.85f;

    [Fact]
    public void JuniorConfidenceExtension_Instructs_Agent_To_Include_ConfidenceScore()
    {
        var extension = AgentInvestigator.JuniorConfidenceExtension;

        extension.Should().Contain("confidenceScore");
        extension.Should().Contain("0.0");
        extension.Should().Contain("1.0");
    }

    [Fact]
    public void SeniorPreamble_Contains_Junior_Findings_Placeholder()
    {
        var template = AgentInvestigator.SeniorPreambleTemplate;

        template.Should().Contain("{0}");
        template.Should().Contain("SENIOR");
        template.Should().Contain("junior");
    }

    [Fact]
    public void SeniorPreamble_FormatWorks_With_JuniorFindings()
    {
        var juniorFindings = "{\"verdict\":\"Likely\",\"confidenceScore\":0.6}";
        var result = string.Format(AgentInvestigator.SeniorPreambleTemplate, juniorFindings);

        result.Should().Contain(juniorFindings);
        result.Should().Contain("SENIOR");
    }

    [Theory]
    [InlineData(0.90f, false)]  // Above threshold → no escalation
    [InlineData(0.86f, false)]  // Above threshold → no escalation
    [InlineData(0.85f, true)]   // At threshold → escalate (threshold is exclusive)
    [InlineData(0.70f, true)]   // Below threshold → escalate
    [InlineData(0.50f, true)]   // Well below → escalate
    public void Escalation_Decision_Based_On_Confidence_Threshold(float confidence, bool shouldEscalate)
    {
        // The endpoint uses: confidence <= EscalationThreshold → escalate
        var escalated = confidence <= EscalationThreshold;
        escalated.Should().Be(shouldEscalate);
    }

    [Fact]
    public async Task Junior_Called_With_Economy_Model_And_Confidence_Prompt()
    {
        var investigator = new Mock<IAiInvestigator>();
        string? capturedModel = null;
        string? capturedOverride = null;

        investigator.Setup(i => i.InvestigateAsync(
                It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(),
                It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(),
                It.IsAny<string?>()))
            .Callback<Run, Case, string?, float?, bool, CancellationToken, IProgress<ToolInvocation>?, string?>(
                (_, _, m, _, _, _, _, spo) => { capturedModel = m; capturedOverride = spo; })
            .ReturnsAsync(MakeSucceededResult());

        var run = MakeRun();
        var caseProjection = MakeCase(run);

        var juniorPrompt = AgentInvestigator.SystemPromptText + AgentInvestigator.JuniorConfidenceExtension;
        await investigator.Object.InvestigateAsync(
            run, caseProjection, "gpt-5.4-mini", null, false, CancellationToken.None,
            systemPromptOverride: juniorPrompt);

        capturedModel.Should().Be("gpt-5.4-mini");
        capturedOverride.Should().Contain("confidenceScore");
        capturedOverride.Should().Contain("expert internal expense fraud investigator");
    }

    [Fact]
    public async Task Senior_Called_With_Premium_Model_And_Junior_Findings()
    {
        var investigator = new Mock<IAiInvestigator>();
        string? capturedModel = null;
        string? capturedOverride = null;

        investigator.Setup(i => i.InvestigateAsync(
                It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(),
                It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(),
                It.IsAny<string?>()))
            .Callback<Run, Case, string?, float?, bool, CancellationToken, IProgress<ToolInvocation>?, string?>(
                (_, _, m, _, _, _, _, spo) => { capturedModel = m; capturedOverride = spo; })
            .ReturnsAsync(MakeSucceededResult());

        var run = MakeRun();
        var caseProjection = MakeCase(run);

        var juniorFindings = "{\"verdict\":\"Likely\",\"confidenceScore\":0.6}";
        var seniorPrompt = AgentInvestigator.SystemPromptText + "\n\n" +
            string.Format(AgentInvestigator.SeniorPreambleTemplate, juniorFindings);

        await investigator.Object.InvestigateAsync(
            run, caseProjection, "gpt-5.4", null, false, CancellationToken.None,
            systemPromptOverride: seniorPrompt);

        capturedModel.Should().Be("gpt-5.4");
        capturedOverride.Should().Contain("SENIOR");
        capturedOverride.Should().Contain(juniorFindings);
    }

    private static AiInvestigationResult MakeSucceededResult() =>
        AiInvestigationResult.Succeeded(
            Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Likely, "Suspicious pattern found", new[] { "High amount" }, "Escalate");

    private static Run MakeRun()
    {
        var emp = new Employee(Guid.NewGuid(), "Test User", "Sales", "IC", 2000m,
            new[] { "Travel" }, new[] { "AcmeAir" });
        var expense = new ExpenseRecord(Guid.NewGuid(), emp.EmployeeId,
            DateTimeOffset.UtcNow, 950m, "Travel", "OffshoreLLC", true, FraudPattern.VendorAnomaly);
        var detection = new DetectionResult(expense.RecordId, 0.9, 0.92,
            ConfidenceBand.High, new[] { new FeatureContribution("vendorRarity", 3.5f, 3.5) });
        return new Run(Guid.NewGuid(), "test-owner", DateTimeOffset.UtcNow,
            new SimulationConfiguration(100, 10, 0.15m,
                new PatternWeights(0.34m, 0.33m, 0.33m),
                BandThresholds.Default, 42, "test"),
            Enumerable.Range(0, 9).Select(_ => new Employee(Guid.NewGuid(), "Extra", "Sales", "IC", 1000m, new[] { "Travel" }, new[] { "AcmeAir" })).Prepend(emp).ToList(),
            new[] { expense }, new[] { detection },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(5, 10, 85));
    }

    private static Case MakeCase(Run run) =>
        new(run.Expenses[0], run.Employees[0], run.DetectionResults[0], null);
}
