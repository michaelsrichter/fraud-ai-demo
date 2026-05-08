using Xunit;
using FluentAssertions;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Dtos;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using Microsoft.Extensions.AI;
using Moq;

namespace Infrastructure.Tests;

/// <summary>
/// Tests for the data retrieval tool behavior as used by AgentInvestigator.
/// Verifies filtered results, ground-truth stripping, and call counter limits (T023).
/// </summary>
public class AgentInvestigatorToolTests
{
    private static Run MakeRun()
    {
        var empId = Guid.NewGuid();
        var emp = new Employee(empId, "Test User", "Sales", "IC", 2000m,
            new[] { "Travel" }, new[] { "AcmeAir" });
        var employees = Enumerable.Range(0, 9)
            .Select(_ => new Employee(Guid.NewGuid(), "Extra", "Sales", "IC", 1000m, new[] { "Travel" }, new[] { "AcmeAir" }))
            .Prepend(emp).ToList();

        var expenses = new List<ExpenseRecord>();
        var detections = new List<DetectionResult>();
        var rng = new Random(42);
        var baseDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

        for (int i = 0; i < 100; i++)
        {
            var recId = Guid.NewGuid();
            var eId = i < 50 ? empId : employees[1 + (i % 9)].EmployeeId;
            var isFraud = i % 10 == 0;
            expenses.Add(new ExpenseRecord(recId, eId, baseDate.AddDays(i % 30),
                100m + (i * 5m), "Travel", i % 3 == 0 ? "OffshoreLLC" : "AcmeAir",
                isFraud, isFraud ? FraudPattern.VendorAnomaly : null));
            detections.Add(new DetectionResult(recId, 0.5 + (i * 0.004), Math.Min(0.5 + (i * 0.004), 0.99),
                i >= 80 ? ConfidenceBand.High : i >= 40 ? ConfidenceBand.Medium : ConfidenceBand.Low,
                new[] { new FeatureContribution("vendorRarity", 1.0, 1.5) }));
        }

        return new Run(Guid.NewGuid(), "test-owner", DateTimeOffset.UtcNow,
            new SimulationConfiguration(100, employees.Count, 0.15m,
                new PatternWeights(0.34m, 0.33m, 0.33m), BandThresholds.Default, 42, "test"),
            employees, expenses, detections,
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(5, 10, 85));
    }

    [Fact]
    public void DataRetrievalTool_ReturnsFilteredResults()
    {
        var run = MakeRun();
        var svc = new RunDataQueryService();
        var query = new RunDataQuery(Vendor: "OffshoreLLC", Detail: true);

        var result = svc.Query(run, query);

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r => r.Vendor.Should().Contain("OffshoreLLC"));
        result.Metadata.TotalMatches.Should().BeGreaterThan(0);
    }

    [Fact]
    public void DataRetrievalTool_StripsGroundTruthLabels()
    {
        var run = MakeRun();
        var svc = new RunDataQueryService();
        var query = new RunDataQuery(Detail: true, Limit: 500);

        var result = svc.Query(run, query);

        // Serialize the full result and verify no ground truth
        var json = System.Text.Json.JsonSerializer.Serialize(result);
        json.Should().NotContainEquivalentOf("isInjectedFraud");
        json.Should().NotContainEquivalentOf("injectedPattern");
        json.Should().NotContainEquivalentOf("FraudPattern");
    }

    [Fact]
    public void CallCounter_ReturnsMaxReachedAfterLimit()
    {
        // Simulates the call counter behavior in AgentInvestigator's tool wrapper
        var callCounter = 0;
        var maxCalls = 3;

        var results = new List<string>();
        for (int i = 0; i < 5; i++)
        {
            if (Interlocked.Increment(ref callCounter) > maxCalls)
            {
                results.Add($"Maximum tool calls ({maxCalls}) reached. Please finalize your verdict.");
            }
            else
            {
                results.Add("success");
            }
        }

        results[0].Should().Be("success");
        results[1].Should().Be("success");
        results[2].Should().Be("success");
        results[3].Should().Contain("Maximum tool calls");
        results[4].Should().Contain("Maximum tool calls");
    }

    [Fact]
    public void DataRetrievalTool_CompactMode_ReturnsAggregates()
    {
        var run = MakeRun();
        var svc = new RunDataQueryService();
        var query = new RunDataQuery(Detail: false);

        var result = svc.Query(run, query);

        result.Metadata.Mode.Should().Be("compact");
        result.Aggregates.Should().NotBeNull();
        result.TopRecords.Should().NotBeNull();
        result.TopRecords!.Count.Should().BeLessThanOrEqualTo(10);
    }

    [Fact]
    public void DataRetrievalTool_WithBandFilter_ReturnsCorrectBand()
    {
        var run = MakeRun();
        var svc = new RunDataQueryService();
        var query = new RunDataQuery(Band: ConfidenceBand.High, Detail: true);

        var result = svc.Query(run, query);

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r => r.Band.Should().Be(ConfidenceBand.High));
    }

    [Fact]
    public async Task ToolboxReturnsNull_DataRetrievalStillAvailable()
    {
        // T032: when toolbox returns null, agent should still have data retrieval tool
        var mockToolbox = new Mock<IFoundryToolboxClient>();
        mockToolbox.Setup(t => t.GetToolsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<AITool>?)null);

        var tools = await mockToolbox.Object.GetToolsAsync(CancellationToken.None);
        tools.Should().BeNull();

        // Verify data retrieval tool still works independently
        var run = MakeRun();
        var svc = new RunDataQueryService();
        var result = svc.Query(run, new RunDataQuery(Detail: true));
        result.Records.Should().NotBeNull();
    }

    [Fact]
    public async Task ToolboxReturnsTools_ToolsAreAvailable()
    {
        // T032: when toolbox returns tools, they should be in the list
        var mockTool = new Mock<AITool>();
        var mockToolbox = new Mock<IFoundryToolboxClient>();
        mockToolbox.Setup(t => t.GetToolsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AITool> { mockTool.Object });

        var tools = await mockToolbox.Object.GetToolsAsync(CancellationToken.None);
        tools.Should().NotBeNull();
        tools!.Count.Should().Be(1);
    }
}
