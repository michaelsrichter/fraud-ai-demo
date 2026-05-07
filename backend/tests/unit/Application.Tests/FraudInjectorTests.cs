using Xunit;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using FluentAssertions;
using FraudDemo.Application.Services;

namespace Application.Tests;

public class FraudInjectorTests
{
    private readonly FraudInjector _injector = new();

    private IReadOnlyList<Employee> MakeEmployees(int count, Random rng)
    {
        var gen = new EmployeeGenerator();
        return gen.Generate(count, rng);
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(0.05)]
    [InlineData(0.25)]
    [InlineData(0.5)]
    public void Inject_Produces_Expected_Fraud_Share(double intensity)
    {
        var rng = new Random(42);
        var employees = MakeEmployees(50, rng);
        var config = new FraudDemo.Domain.Configuration.SimulationConfiguration(
            recordCount: 2000, employeeCount: 50, intensity: (decimal)intensity,
            patternWeights: new FraudDemo.Domain.Configuration.PatternWeights(0.34m, 0.33m, 0.33m),
            thresholds: FraudDemo.Domain.Configuration.BandThresholds.Default,
            seed: 42, modelDeploymentName: "test");
        var expenses = _injector.Generate(employees, config, DateTimeOffset.UtcNow, rng);
        expenses.Should().HaveCount(2000);
        var fraudCount = expenses.Count(e => e.IsInjectedFraud);
        var expectedApprox = (int)(2000 * intensity);
        fraudCount.Should().BeInRange(Math.Max(0, expectedApprox - 50), expectedApprox + 50);
    }

    [Fact]
    public void Inject_With_Same_Seed_Is_Deterministic()
    {
        var employees1 = MakeEmployees(30, new Random(1));
        var employees2 = MakeEmployees(30, new Random(1));
        var config = new FraudDemo.Domain.Configuration.SimulationConfiguration(
            recordCount: 500, employeeCount: 30, intensity: 0.15m,
            patternWeights: new FraudDemo.Domain.Configuration.PatternWeights(0.5m, 0.3m, 0.2m),
            thresholds: FraudDemo.Domain.Configuration.BandThresholds.Default,
            seed: 99, modelDeploymentName: "test");
        var result1 = _injector.Generate(employees1, config, DateTimeOffset.UtcNow, new Random(99));
        var result2 = _injector.Generate(employees2, config, DateTimeOffset.UtcNow, new Random(99));
        result1.Select(e => e.Amount).Should().Equal(result2.Select(e => e.Amount));
    }

    [Fact]
    public void Inject_Respects_Pattern_Weights()
    {
        var rng = new Random(7);
        var employees = MakeEmployees(50, rng);
        var config = new FraudDemo.Domain.Configuration.SimulationConfiguration(
            recordCount: 5000, employeeCount: 50, intensity: 0.3m,
            patternWeights: new FraudDemo.Domain.Configuration.PatternWeights(0.8m, 0.1m, 0.1m),
            thresholds: FraudDemo.Domain.Configuration.BandThresholds.Default,
            seed: 7, modelDeploymentName: "test");
        var expenses = _injector.Generate(employees, config, DateTimeOffset.UtcNow, new Random(7));
        var fraudExpenses = expenses.Where(e => e.IsInjectedFraud).ToList();
        fraudExpenses.Should().NotBeEmpty();
        var thresholdGaming = fraudExpenses.Count(e => e.InjectedPattern == FraudDemo.Domain.Enums.FraudPattern.ThresholdGaming);
        thresholdGaming.Should().BeGreaterThan(fraudExpenses.Count / 3,
            "threshold gaming has 80% weight so should dominate");
    }
}
