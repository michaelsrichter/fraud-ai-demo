using Xunit;
using FluentAssertions;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Application.Tests;

public class GenerateRunHandlerTests
{
    [Fact]
    public async Task HandleAsync_Orchestrates_Full_Pipeline()
    {
        var clock = new SystemClock();
        var rng = new DefaultRandomSource();
        var employeeGen = new EmployeeGenerator();
        var injector = new FraudInjector();
        var scorer = new Mock<IAnomalyScorer>();
        var repo = new Mock<IRunRepository>();

        scorer.Setup(s => s.ModelId).Returns(ScorerModelId.RandomizedPca);
        scorer.Setup(s => s.Score(
            It.IsAny<IReadOnlyList<Employee>>(),
            It.IsAny<IReadOnlyList<ExpenseRecord>>(),
            It.IsAny<BandThresholds>(),
            It.IsAny<int?>(),
            It.IsAny<Dictionary<string, double>?>()))
            .Returns((IReadOnlyList<Employee> emp, IReadOnlyList<ExpenseRecord> exp, BandThresholds t, int? s, Dictionary<string, double>? p) =>
            {
                return exp.Select(e => new DetectionResult(
                    e.RecordId, 0.5, 0.5, ConfidenceBand.Medium,
                    new[] { new FeatureContribution("test", 1.0f, 1.0) })).ToList();
            });

        repo.Setup(r => r.CreateAsync(It.IsAny<Run>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("etag-1");

        var handler = new GenerateRunHandler(
            clock, rng, employeeGen, injector, new[] { scorer.Object }, repo.Object,
            NullLogger<GenerateRunHandler>.Instance);

        var config = new SimulationConfiguration(
            recordCount: 100, employeeCount: 20, intensity: 0.1m,
            patternWeights: new PatternWeights(0.34m, 0.33m, 0.33m),
            thresholds: BandThresholds.Default, seed: 42, modelDeploymentName: "test");

        var run = await handler.HandleAsync(config, "test-owner", CancellationToken.None);

        run.Should().NotBeNull();
        run.Expenses.Should().HaveCount(100);
        run.Employees.Should().HaveCount(20);
        run.ModelResults.Should().ContainKey(ScorerModelId.RandomizedPca);
        run.ModelResults[ScorerModelId.RandomizedPca].Results.Should().HaveCount(100);
        run.DetectionResults.Should().HaveCount(100);
        scorer.Verify(s => s.Score(
            It.IsAny<IReadOnlyList<Employee>>(),
            It.IsAny<IReadOnlyList<ExpenseRecord>>(),
            It.IsAny<BandThresholds>(),
            It.IsAny<int?>(),
            It.IsAny<Dictionary<string, double>?>()), Times.Once);
        repo.Verify(r => r.CreateAsync(It.IsAny<Run>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_MultiModel_Partial_Failure_Still_Persists()
    {
        var clock = new SystemClock();
        var rng = new DefaultRandomSource();
        var employeeGen = new EmployeeGenerator();
        var injector = new FraudInjector();

        var goodScorer = new Mock<IAnomalyScorer>();
        goodScorer.Setup(s => s.ModelId).Returns(ScorerModelId.RandomizedPca);
        goodScorer.Setup(s => s.Score(It.IsAny<IReadOnlyList<Employee>>(), It.IsAny<IReadOnlyList<ExpenseRecord>>(), It.IsAny<BandThresholds>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, double>?>()))
            .Returns((IReadOnlyList<Employee> emp, IReadOnlyList<ExpenseRecord> exp, BandThresholds t, int? s, Dictionary<string, double>? p) =>
                exp.Select(e => new DetectionResult(e.RecordId, 0.3, 0.3, ConfidenceBand.Low, new[] { new FeatureContribution("test", 1f, 1) })).ToList());

        var badScorer = new Mock<IAnomalyScorer>();
        badScorer.Setup(s => s.ModelId).Returns(ScorerModelId.SdcaLogistic);
        badScorer.Setup(s => s.Score(It.IsAny<IReadOnlyList<Employee>>(), It.IsAny<IReadOnlyList<ExpenseRecord>>(), It.IsAny<BandThresholds>(), It.IsAny<int?>(), It.IsAny<Dictionary<string, double>?>()))
            .Throws(new InvalidOperationException("Model training failed"));

        var repo = new Mock<IRunRepository>();
        repo.Setup(r => r.CreateAsync(It.IsAny<Run>(), It.IsAny<CancellationToken>())).ReturnsAsync("etag-1");

        var handler = new GenerateRunHandler(
            clock, rng, employeeGen, injector,
            new[] { goodScorer.Object, badScorer.Object }, repo.Object,
            NullLogger<GenerateRunHandler>.Instance);

        var config = new SimulationConfiguration(
            recordCount: 50, employeeCount: 10, intensity: 0.1m,
            patternWeights: PatternWeights.Even, thresholds: BandThresholds.Default, seed: 42,
            modelDeploymentName: "test",
            scorers: new List<ScorerSelection>
            {
                new(ScorerModelId.RandomizedPca, new Dictionary<string, double>()),
                new(ScorerModelId.SdcaLogistic, new Dictionary<string, double>()),
            });

        var run = await handler.HandleAsync(config, "owner", CancellationToken.None);

        run.ModelResults.Should().HaveCount(2);
        run.ModelResults[ScorerModelId.RandomizedPca].Status.Should().Be(ModelScoringStatus.Success);
        run.ModelResults[ScorerModelId.SdcaLogistic].Status.Should().Be(ModelScoringStatus.Error);
        run.ModelResults[ScorerModelId.SdcaLogistic].ErrorMessage.Should().Contain("Model training failed");
    }
}
