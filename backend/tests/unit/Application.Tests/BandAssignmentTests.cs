using Xunit;
using FluentAssertions;
using FraudDemo.Application.Banding;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Enums;

namespace Application.Tests;

public class BandAssignmentTests
{
    private static readonly BandThresholds Default = BandThresholds.Default; // 0.55, 0.85

    [Theory]
    [InlineData(0.0, ConfidenceBand.Low)]
    [InlineData(0.54, ConfidenceBand.Low)]
    [InlineData(0.549, ConfidenceBand.Low)]
    [InlineData(0.55, ConfidenceBand.Medium)]
    [InlineData(0.7, ConfidenceBand.Medium)]
    [InlineData(0.849, ConfidenceBand.Medium)]
    [InlineData(0.85, ConfidenceBand.High)]
    [InlineData(0.9, ConfidenceBand.High)]
    [InlineData(1.0, ConfidenceBand.High)]
    public void Assign_Maps_Confidence_To_Correct_Band(double confidence, ConfidenceBand expected)
    {
        BandingHelpers.Assign(confidence, Default).Should().Be(expected);
    }

    [Fact]
    public void Count_Tallies_All_Bands()
    {
        var bands = new[] { ConfidenceBand.High, ConfidenceBand.High, ConfidenceBand.Medium, ConfidenceBand.Low, ConfidenceBand.Low, ConfidenceBand.Low };
        var counts = BandingHelpers.Count(bands);
        counts.High.Should().Be(2);
        counts.Medium.Should().Be(1);
        counts.Low.Should().Be(3);
    }

    [Fact]
    public void Count_Empty_Returns_All_Zeros()
    {
        var counts = BandingHelpers.Count(Enumerable.Empty<ConfidenceBand>());
        counts.High.Should().Be(0);
        counts.Medium.Should().Be(0);
        counts.Low.Should().Be(0);
    }

    [Fact]
    public void Custom_Thresholds_Are_Respected()
    {
        var tight = new BandThresholds(0.3m, 0.6m);
        BandingHelpers.Assign(0.29, tight).Should().Be(ConfidenceBand.Low);
        BandingHelpers.Assign(0.3, tight).Should().Be(ConfidenceBand.Medium);
        BandingHelpers.Assign(0.6, tight).Should().Be(ConfidenceBand.High);
    }
}
