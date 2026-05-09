using Xunit;
using FluentAssertions;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using FraudDemo.Domain.Projections;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Application.Tests;

/// <summary>
/// Tests that InvestigateCaseHandler correctly passes IProgress through to IAiInvestigator (T056).
/// </summary>
public class InvestigateCaseHandlerStreamTests
{
    private static Run MakeRun()
    {
        var emp = new Employee(Guid.NewGuid(), "Test User", "Sales", "IC", 2000m,
            new[] { "Travel" }, new[] { "AcmeAir" });
        var expense = new ExpenseRecord(Guid.NewGuid(), emp.EmployeeId,
            DateTimeOffset.UtcNow, 500m, "Travel", "AcmeAir", false, null);
        var detection = new DetectionResult(expense.RecordId, 0.5, 0.6,
            ConfidenceBand.Medium, new[] { new FeatureContribution("amountZ", 1.0f, 1.0) });
        return new Run(Guid.NewGuid(), "test-owner", DateTimeOffset.UtcNow,
            new SimulationConfiguration(100, 10, 0.1m,
                new PatternWeights(0.34m, 0.33m, 0.33m),
                BandThresholds.Default, 42, "test"),
            Enumerable.Range(0, 9).Select(_ => new Employee(Guid.NewGuid(), "Extra", "Sales", "IC", 1000m, new[] { "Travel" }, new[] { "AcmeAir" })).Prepend(emp).ToList(),
            new[] { expense }, new[] { detection },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(0, 1, 99));
    }

    [Fact]
    public async Task HandleAsync_Passes_Progress_To_Investigator()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var repo = new Mock<IRunRepository>();
        var investigator = new Mock<IAiInvestigator>();
        IProgress<ToolInvocation>? capturedProgress = null;

        repo.Setup(r => r.LoadAsync(run.RunId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RunWithEtag(run, "etag-1"));
        repo.Setup(r => r.UpdateAsync(It.IsAny<Run>(), "etag-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync("etag-2");

        var aiResult = AiInvestigationResult.Succeeded(
            expense.RecordId, run.RunId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Likely, "Suspicious pattern", new[] { "High amount" }, "Escalate");

        investigator.Setup(i => i.InvestigateAsync(
                It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(),
                It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(), It.IsAny<string?>()))
            .Callback<Run, Case, string?, float?, bool, CancellationToken, IProgress<ToolInvocation>?, string?>(
                (_, _, _, _, _, _, p, _) => capturedProgress = p)
            .ReturnsAsync(aiResult);

        var handler = new InvestigateCaseHandler(repo.Object, investigator.Object,
            new SystemClock(), NullLogger<InvestigateCaseHandler>.Instance);

        var progress = new Progress<ToolInvocation>(_ => { });
        await handler.HandleAsync(
            new InvestigateCaseRequest(run.RunId, expense.RecordId), CancellationToken.None, progress);

        capturedProgress.Should().BeSameAs(progress);
    }

    [Fact]
    public async Task HandleAsync_Null_Progress_Works()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var repo = new Mock<IRunRepository>();
        var investigator = new Mock<IAiInvestigator>();

        repo.Setup(r => r.LoadAsync(run.RunId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RunWithEtag(run, "etag-1"));
        repo.Setup(r => r.UpdateAsync(It.IsAny<Run>(), "etag-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync("etag-2");

        var aiResult = AiInvestigationResult.Succeeded(
            expense.RecordId, run.RunId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Likely, "Suspicious pattern", new[] { "High amount" }, "Escalate");

        investigator.Setup(i => i.InvestigateAsync(
                It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(),
                It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(), It.IsAny<string?>()))
            .ReturnsAsync(aiResult);

        var handler = new InvestigateCaseHandler(repo.Object, investigator.Object,
            new SystemClock(), NullLogger<InvestigateCaseHandler>.Instance);

        var result = await handler.HandleAsync(
            new InvestigateCaseRequest(run.RunId, expense.RecordId), CancellationToken.None);

        result.Persisted.Should().BeTrue();
        result.Investigation.Status.Should().Be(InvestigationStatus.Succeeded);
    }
}
