using Xunit;
using System.Linq;
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

public class InvestigateCaseHandlerTests
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
            Enumerable.Range(0, 9).Select(_ => new Employee(Guid.NewGuid(), "Extra", "Sales", "IC", 1000m, new[] { "Travel" }, new[] { "AcmeAir" })).Prepend(emp).ToList(), new[] { expense },
            new Dictionary<string, ModelDetectionResults> { ["randomized-pca"] = ModelDetectionResults.Success("randomized-pca", new[] { detection }, new BandCounts(0, 1, 99)) },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(0, 1, 99));
    }

    [Fact]
    public async Task HandleAsync_Succeeded_Investigation_Is_Persisted()
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

        investigator.Setup(i => i.InvestigateAsync(It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(), It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(), It.IsAny<string?>()))
            .ReturnsAsync(aiResult);

        var handler = new InvestigateCaseHandler(repo.Object, investigator.Object,
            new SystemClock(), NullLogger<InvestigateCaseHandler>.Instance);

        var result = await handler.HandleAsync(
            new InvestigateCaseRequest(run.RunId, expense.RecordId), CancellationToken.None);

        result.Persisted.Should().BeTrue();
        result.Investigation.Status.Should().Be(InvestigationStatus.Succeeded);
        repo.Verify(r => r.UpdateAsync(It.IsAny<Run>(), "etag-1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_Unavailable_Investigation_Is_Not_Persisted()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var repo = new Mock<IRunRepository>();
        var investigator = new Mock<IAiInvestigator>();

        repo.Setup(r => r.LoadAsync(run.RunId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RunWithEtag(run, "etag-1"));

        var aiResult = AiInvestigationResult.Unavailable(
            expense.RecordId, run.RunId, DateTimeOffset.UtcNow, "timeout");

        investigator.Setup(i => i.InvestigateAsync(It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(), It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(), It.IsAny<string?>()))
            .ReturnsAsync(aiResult);

        var handler = new InvestigateCaseHandler(repo.Object, investigator.Object,
            new SystemClock(), NullLogger<InvestigateCaseHandler>.Instance);

        var result = await handler.HandleAsync(
            new InvestigateCaseRequest(run.RunId, expense.RecordId), CancellationToken.None);

        result.Persisted.Should().BeFalse();
        result.Investigation.Status.Should().Be(InvestigationStatus.Unavailable);
        repo.Verify(r => r.UpdateAsync(It.IsAny<Run>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ETag_Conflict_Retries_Once()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var repo = new Mock<IRunRepository>();
        var investigator = new Mock<IAiInvestigator>();

        repo.Setup(r => r.LoadAsync(run.RunId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RunWithEtag(run, "etag-1"));
        // First update fails (412), second succeeds
        repo.SetupSequence(r => r.UpdateAsync(It.IsAny<Run>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null) // 412
            .ReturnsAsync("etag-3");

        var aiResult = AiInvestigationResult.Succeeded(
            expense.RecordId, run.RunId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
            FraudLikelihood.Unlikely, "Normal", new[] { "Nothing" }, "Close");

        investigator.Setup(i => i.InvestigateAsync(It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(), It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(), It.IsAny<string?>()))
            .ReturnsAsync(aiResult);

        var handler = new InvestigateCaseHandler(repo.Object, investigator.Object,
            new SystemClock(), NullLogger<InvestigateCaseHandler>.Instance);

        var result = await handler.HandleAsync(
            new InvestigateCaseRequest(run.RunId, expense.RecordId), CancellationToken.None);

        result.Investigation.Status.Should().Be(InvestigationStatus.Succeeded);
        // Should have loaded twice (initial + retry)
        repo.Verify(r => r.LoadAsync(run.RunId, It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Theory]
    [InlineData(ConfidenceBand.High)]
    [InlineData(ConfidenceBand.Medium)]
    [InlineData(ConfidenceBand.Low)]
    public async Task HandleAsync_Allows_All_Bands(ConfidenceBand band)
    {
        var emp = new Employee(Guid.NewGuid(), "Band Test", "Eng", "IC", 1000m,
            new[] { "Office" }, new[] { "PrintCo" });
        var expense = new ExpenseRecord(Guid.NewGuid(), emp.EmployeeId,
            DateTimeOffset.UtcNow, 200m, "Office", "PrintCo", false, null);
        var detection = new DetectionResult(expense.RecordId, 0.5, 0.5,
            band, new[] { new FeatureContribution("test", 1.0f, 1.0) });
        var run = new Run(Guid.NewGuid(), "test-owner", DateTimeOffset.UtcNow,
            new SimulationConfiguration(100, 10, 0.1m,
                new PatternWeights(0.34m, 0.33m, 0.33m),
                BandThresholds.Default, 42, "test"),
            Enumerable.Range(0, 9).Select(_ => new Employee(Guid.NewGuid(), "Extra", "Sales", "IC", 1000m, new[] { "Travel" }, new[] { "AcmeAir" })).Prepend(emp).ToList(),
            new[] { expense },
            new Dictionary<string, ModelDetectionResults> { ["randomized-pca"] = ModelDetectionResults.Success("randomized-pca", new[] { detection }, new BandCounts(1, 1, 98)) },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(1, 1, 98));

        var repo = new Mock<IRunRepository>();
        var investigator = new Mock<IAiInvestigator>();

        repo.Setup(r => r.LoadAsync(run.RunId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RunWithEtag(run, "etag-1"));
        repo.Setup(r => r.UpdateAsync(It.IsAny<Run>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("etag-2");

        investigator.Setup(i => i.InvestigateAsync(It.IsAny<Run>(), It.IsAny<Case>(), It.IsAny<string?>(), It.IsAny<float?>(), It.IsAny<bool>(), It.IsAny<CancellationToken>(), It.IsAny<IProgress<ToolInvocation>?>(), It.IsAny<string?>()))
            .ReturnsAsync(AiInvestigationResult.Succeeded(
                expense.RecordId, run.RunId, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow,
                FraudLikelihood.Inconclusive, "test", new[] { "s" }, "none"));

        var handler = new InvestigateCaseHandler(repo.Object, investigator.Object,
            new SystemClock(), NullLogger<InvestigateCaseHandler>.Instance);

        var result = await handler.HandleAsync(
            new InvestigateCaseRequest(run.RunId, expense.RecordId), CancellationToken.None);

        result.Investigation.Status.Should().Be(InvestigationStatus.Succeeded);
    }
}
