using Xunit;
using FluentAssertions;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
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

        scorer.Setup(s => s.Score(
            It.IsAny<IReadOnlyList<Employee>>(),
            It.IsAny<IReadOnlyList<ExpenseRecord>>(),
            It.IsAny<BandThresholds>(),
            It.IsAny<int?>()))
            .Returns((IReadOnlyList<Employee> emp, IReadOnlyList<ExpenseRecord> exp, BandThresholds t, int? s) =>
            {
                return exp.Select(e => new DetectionResult(
                    e.RecordId, 0.5, 0.5, FraudDemo.Domain.Enums.ConfidenceBand.Medium,
                    new[] { new FeatureContribution("test", 1.0f, 1.0) })).ToList();
            });

        repo.Setup(r => r.CreateAsync(It.IsAny<Run>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("etag-1");

        var handler = new GenerateRunHandler(
            clock, rng, employeeGen, injector, scorer.Object, repo.Object,
            NullLogger<GenerateRunHandler>.Instance);

        var config = new SimulationConfiguration(
            recordCount: 100, employeeCount: 20, intensity: 0.1m,
            patternWeights: new PatternWeights(0.34m, 0.33m, 0.33m),
            thresholds: BandThresholds.Default, seed: 42, modelDeploymentName: "test");

        var run = await handler.HandleAsync(config, "test-owner", CancellationToken.None);

        run.Should().NotBeNull();
        run.Expenses.Should().HaveCount(100);
        run.Employees.Should().HaveCount(20);
        run.DetectionResults.Should().HaveCount(100);
        scorer.Verify(s => s.Score(
            It.IsAny<IReadOnlyList<Employee>>(),
            It.IsAny<IReadOnlyList<ExpenseRecord>>(),
            It.IsAny<BandThresholds>(),
            It.IsAny<int?>()), Times.Once);
        repo.Verify(r => r.CreateAsync(It.IsAny<Run>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
