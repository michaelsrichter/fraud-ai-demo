using FluentAssertions;
using FraudDemo.Domain.Configuration;
using Xunit;

namespace FraudDemo.Domain.Tests;

public class SimulationConfigurationTests
{
    private static SimulationConfiguration Build(
        int recordCount = 5_000,
        int employeeCount = 100,
        decimal intensity = 0.05m,
        PatternWeights? weights = null,
        BandThresholds? thresholds = null) =>
        new(
            recordCount,
            employeeCount,
            intensity,
            weights ?? PatternWeights.Even,
            thresholds ?? BandThresholds.Default,
            seed: 42,
            modelDeploymentName: "gpt-fraud-investigator");

    [Fact]
    public void Default_factory_succeeds()
    {
        var act = () => Build();
        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(50_001)]
    [InlineData(-1)]
    public void RecordCount_outside_range_is_rejected(int recordCount)
    {
        var act = () => Build(recordCount: recordCount);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(9)]
    [InlineData(501)]
    public void EmployeeCount_outside_range_is_rejected(int employeeCount)
    {
        var act = () => Build(employeeCount: employeeCount);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(1.01)]
    public void Intensity_outside_unit_interval_is_rejected(double intensity)
    {
        var act = () => Build(intensity: (decimal)intensity);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void All_zero_weights_are_rejected()
    {
        var act = () => new PatternWeights(0m, 0m, 0m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Negative_weight_is_rejected()
    {
        var act = () => new PatternWeights(-0.1m, 0.5m, 0.5m);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Weights_are_normalized_to_sum_one()
    {
        var weights = new PatternWeights(2m, 1m, 1m).Normalized();
        (weights.ThresholdGaming + weights.UnusualFrequency + weights.VendorAnomaly)
            .Should().BeApproximately(1m, 1e-6m);
    }

    [Theory]
    [InlineData(0.6, 0.5)]
    [InlineData(0.5, 0.5)]
    [InlineData(0.0, 0.5)]
    [InlineData(0.5, 1.0)]
    public void Invalid_thresholds_are_rejected(double low, double high)
    {
        var act = () => new BandThresholds((decimal)low, (decimal)high);
        act.Should().Throw<Exception>();
    }
}
