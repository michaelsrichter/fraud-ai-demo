using FluentAssertions;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using Xunit;

namespace FraudDemo.Domain.Tests;

public class RunInvariantTests
{
    private static (Employee employee, ExpenseRecord expense, DetectionResult detection) Triple()
    {
        var empId = Guid.NewGuid();
        var recId = Guid.NewGuid();
        var emp = new Employee(empId, "Alice", "Sales", "IC", 1_000m, new[] { "Travel" }, new[] { "AcmeAir" });
        var exp = new ExpenseRecord(recId, empId, DateTimeOffset.UtcNow, 250m, "Travel", "AcmeAir", false, null);
        var det = new DetectionResult(
            recId,
            rawScore: 0.5,
            confidence: 0.5,
            band: ConfidenceBand.Medium,
            contributingFeatures: new[] { new FeatureContribution("amountZ", 1.5, 1.5) });
        return (emp, exp, det);
    }

    [Fact]
    public void Run_with_mismatched_detection_count_throws()
    {
        var (emp, exp, _) = Triple();
        var cfg = SimulationConfiguration.CreateDefault("dep");

        var act = () => new Run(
            Guid.NewGuid(),
            "v1",
            DateTimeOffset.UtcNow,
            cfg,
            new[] { emp }.Concat(Enumerable.Range(0, 9).Select(_ => emp)).ToList(),
            new[] { exp },
            new Dictionary<string, ModelDetectionResults>
            {
                ["randomized-pca"] = ModelDetectionResults.Success("randomized-pca", Array.Empty<DetectionResult>(), new BandCounts(0, 0, 0)),
            },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(0, 0, 1));

        act.Should().Throw<ArgumentException>().WithMessage("*equal*");
    }

    [Fact]
    public void Run_with_dangling_investigation_key_throws()
    {
        var (emp, exp, det) = Triple();
        var cfg = SimulationConfiguration.CreateDefault("dep");
        var stranger = Guid.NewGuid();
        var dict = new Dictionary<Guid, AiInvestigationResult>
        {
            [stranger] = AiInvestigationResult.Unavailable(stranger, Guid.NewGuid(), DateTimeOffset.UtcNow, "test"),
        };

        var act = () => new Run(
            Guid.NewGuid(),
            "v1",
            DateTimeOffset.UtcNow,
            cfg,
            Enumerable.Range(0, 10).Select(_ => emp).ToList(),
            new[] { exp },
            new Dictionary<string, ModelDetectionResults>
            {
                ["randomized-pca"] = ModelDetectionResults.Success("randomized-pca", new[] { det }, new BandCounts(0, 1, 0)),
            },
            dict,
            new BandCounts(0, 1, 0));

        act.Should().Throw<ArgumentException>().WithMessage("*unknown RecordId*");
    }
}
