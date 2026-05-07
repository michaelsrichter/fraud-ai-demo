using Xunit;
using FluentAssertions;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Infrastructure.Detection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Application.Tests;

public class AnomalyScorerTests
{
    private static (IReadOnlyList<FraudDemo.Domain.Entities.Employee> employees, IReadOnlyList<FraudDemo.Domain.Entities.ExpenseRecord> expenses)
        GenerateTestData(int seed = 42, int records = 500)
    {
        var rng = new Random(seed);
        var gen = new EmployeeGenerator();
        var employees = gen.Generate(50, rng);
        var injector = new FraudInjector();
        var config = new SimulationConfiguration(
            recordCount: records, employeeCount: 50, intensity: 0.15m,
            patternWeights: new PatternWeights(0.34m, 0.33m, 0.33m),
            thresholds: BandThresholds.Default, seed: seed, modelDeploymentName: "test");
        var expenses = injector.Generate(employees, config, DateTimeOffset.UtcNow, new Random(seed));
        return (employees, expenses);
    }

    [Fact]
    public void Score_Returns_Confidence_In_Zero_One_Range()
    {
        var (employees, expenses) = GenerateTestData();
        var scorer = new MlNetAnomalyScorer(NullLogger<MlNetAnomalyScorer>.Instance);
        var results = scorer.Score(employees, expenses, BandThresholds.Default, 42);
        results.Should().HaveCount(expenses.Count);
        results.Should().AllSatisfy(r =>
        {
            r.Confidence.Should().BeInRange(0.0, 1.0);
        });
    }

    [Fact]
    public void Score_Is_Deterministic_With_Same_Seed()
    {
        var (emp1, exp1) = GenerateTestData(seed: 77);
        var (emp2, exp2) = GenerateTestData(seed: 77);
        var scorer = new MlNetAnomalyScorer(NullLogger<MlNetAnomalyScorer>.Instance);
        var r1 = scorer.Score(emp1, exp1, BandThresholds.Default, 77);
        var r2 = scorer.Score(emp2, exp2, BandThresholds.Default, 77);
        r1.Select(r => r.Confidence).Should().Equal(r2.Select(r => r.Confidence));
    }

    [Fact]
    public void Score_Assigns_Contributing_Features()
    {
        var (employees, expenses) = GenerateTestData();
        var scorer = new MlNetAnomalyScorer(NullLogger<MlNetAnomalyScorer>.Instance);
        var results = scorer.Score(employees, expenses, BandThresholds.Default, 42);
        results.Should().AllSatisfy(r =>
        {
            r.ContributingFeatures.Should().NotBeEmpty();
            r.ContributingFeatures.Should().AllSatisfy(f => f.Name.Should().NotBeNullOrWhiteSpace());
        });
    }
}
