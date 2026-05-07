using Xunit;
using System.Diagnostics;
using FluentAssertions;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Infrastructure.Detection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Application.Tests;

public class PerformanceSmokeTests
{
    [Fact(Skip = "manual")]
    public void Generate_And_Detect_5000_Records_Under_5_Seconds()
    {
        var rng = new Random(42);
        var gen = new EmployeeGenerator();
        var employees = gen.Generate(100, rng);
        var injector = new FraudInjector();
        var config = new SimulationConfiguration(
            recordCount: 5000, employeeCount: 100, intensity: 0.15m,
            patternWeights: new PatternWeights(0.34m, 0.33m, 0.33m),
            thresholds: BandThresholds.Default, seed: 42, modelDeploymentName: "test");

        var sw = Stopwatch.StartNew();
        var expenses = injector.Generate(employees, config, DateTimeOffset.UtcNow, new Random(42));
        var scorer = new MlNetAnomalyScorer(NullLogger<MlNetAnomalyScorer>.Instance);
        var results = scorer.Score(employees, expenses, BandThresholds.Default, 42);
        sw.Stop();

        results.Should().HaveCount(5000);
        sw.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(5), "SC-002: generate+detect should complete within 5s");
    }
}
