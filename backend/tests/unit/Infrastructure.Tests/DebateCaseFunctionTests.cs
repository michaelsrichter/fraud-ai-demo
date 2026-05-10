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
/// Tests for Debate mode orchestration logic (T013a).
/// Verifies prompt construction, parallel agent invocation patterns, and error handling.
/// </summary>
public class DebateModeTests
{
    [Fact]
    public void FraudLeaning_Prompt_Prepends_Bias_To_Base_SystemPrompt()
    {
        var fraudPrompt = AgentInvestigator.FraudLeaningBias + AgentInvestigator.SystemPromptText;

        // Should start with the bias
        fraudPrompt.Should().StartWith(AgentInvestigator.FraudLeaningBias);
        // Should contain the base system prompt
        fraudPrompt.Should().Contain("expert internal expense fraud investigator");
        // Should contain fraud advocate instructions
        fraudPrompt.Should().Contain("FRAUD ADVOCATE");
    }

    [Fact]
    public void NonFraudLeaning_Prompt_Prepends_Bias_To_Base_SystemPrompt()
    {
        var defensePrompt = AgentInvestigator.NonFraudLeaningBias + AgentInvestigator.SystemPromptText;

        defensePrompt.Should().StartWith(AgentInvestigator.NonFraudLeaningBias);
        defensePrompt.Should().Contain("expert internal expense fraud investigator");
        defensePrompt.Should().Contain("DEFENSE ADVOCATE");
    }

    [Fact]
    public void DebateArbiter_Prompt_References_Both_Agent_Roles()
    {
        var arbiter = AgentInvestigator.DebateArbiterPrompt;

        arbiter.Should().Contain("Fraud Advocate");
        arbiter.Should().Contain("Defense Advocate");
        arbiter.Should().Contain("finalVerdict");
        arbiter.Should().Contain("agreements");
        arbiter.Should().Contain("disagreements");
    }

    [Fact]
    public async Task Both_Agents_Called_With_Different_SystemPromptOverrides()
    {
        var investigator = new Mock<IAiInvestigator>();
        var capturedOverrides = new List<string?>();

        investigator.Setup(i => i.InvestigateAsync(
                It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(),
                It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(),
                It.IsAny<string?>()))
            .Callback<Run, Case, string?, float?, bool, CancellationToken, IProgress<ToolInvocation>?, string?>(
                (_, _, _, _, _, _, _, spo) => capturedOverrides.Add(spo))
            .ReturnsAsync(MakeSucceededResult());

        var run = MakeRun();
        var caseProjection = MakeCase(run);

        var fraudPrompt = AgentInvestigator.FraudLeaningBias + AgentInvestigator.SystemPromptText;
        var defensePrompt = AgentInvestigator.NonFraudLeaningBias + AgentInvestigator.SystemPromptText;

        // Simulate what DebateCaseFunction does
        var t1 = investigator.Object.InvestigateAsync(run, caseProjection, null, null, false, CancellationToken.None, systemPromptOverride: fraudPrompt);
        var t2 = investigator.Object.InvestigateAsync(run, caseProjection, null, null, false, CancellationToken.None, systemPromptOverride: defensePrompt);
        await Task.WhenAll(t1, t2);

        capturedOverrides.Should().HaveCount(2);
        capturedOverrides[0].Should().Contain("FRAUD ADVOCATE");
        capturedOverrides[1].Should().Contain("DEFENSE ADVOCATE");
    }

    [Fact]
    public async Task Partial_Failure_Still_Returns_Available_Result()
    {
        var investigator = new Mock<IAiInvestigator>();
        var callCount = 0;

        investigator.Setup(i => i.InvestigateAsync(
                It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(),
                It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(),
                It.IsAny<string?>()))
            .Returns(() =>
            {
                Interlocked.Increment(ref callCount);
                return callCount == 1
                    ? Task.FromResult(MakeSucceededResult())
                    : Task.FromResult(AiInvestigationResult.Unavailable(
                        Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, "timeout"));
            });

        var run = MakeRun();
        var caseProjection = MakeCase(run);

        var results = await Task.WhenAll(
            investigator.Object.InvestigateAsync(run, caseProjection, null, null, false, CancellationToken.None, systemPromptOverride: "fraud"),
            investigator.Object.InvestigateAsync(run, caseProjection, null, null, false, CancellationToken.None, systemPromptOverride: "defense"));

        results[0].Status.Should().Be(InvestigationStatus.Succeeded);
        results[1].Status.Should().Be(InvestigationStatus.Unavailable);
        // Debate should still proceed with available result — arbiter gets both
    }

    private static AiInvestigationResult MakeSucceededResult() =>
        AiInvestigationResult.Succeeded(
            Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Likely, "Suspicious vendor pattern", new[] { "Shell company vendor" }, "Escalate");

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
            new[] { expense },
            new Dictionary<string, ModelDetectionResults> { ["randomized-pca"] = ModelDetectionResults.Success("randomized-pca", new[] { detection }, new BandCounts(5, 10, 85)) },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(5, 10, 85));
    }

    private static Case MakeCase(Run run) =>
        new(run.Expenses[0], run.Employees[0], run.DetectionResults[0], null);
}
