using Xunit;
using FluentAssertions;
using FraudDemo.Application.Dtos;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;

namespace Application.Tests;

public class RunDataQueryServiceTests
{
    private static readonly Guid Emp1Id = Guid.NewGuid();
    private static readonly Guid Emp2Id = Guid.NewGuid();
    private static readonly Guid Emp3Id = Guid.NewGuid();

    private static Run MakeRun(int expenseCount = 100)
    {
        var employees = new[]
        {
            new Employee(Emp1Id, "Alice Smith", "Sales", "IC", 2000m, new[] { "Travel" }, new[] { "AcmeAir" }),
            new Employee(Emp2Id, "Bob Jones", "Engineering", "IC", 3000m, new[] { "Software" }, new[] { "TechCorp" }),
            new Employee(Emp3Id, "Carol White", "Sales", "Manager", 2500m, new[] { "Travel", "Meals" }, new[] { "AcmeAir", "FoodCo" }),
        };
        // Pad to 10 employees
        var empList = employees.Concat(
            Enumerable.Range(0, 7).Select(i => new Employee(Guid.NewGuid(), $"Extra{i}", "HR", "IC", 1000m, new[] { "Office" }, new[] { "SupplyInc" })))
            .ToList();

        var rng = new Random(42);
        var categories = new[] { "Travel", "Software", "Meals", "Office" };
        var vendors = new[] { "AcmeAir", "TechCorp", "FoodCo", "SupplyInc" };
        var baseDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

        var expenses = new List<ExpenseRecord>();
        var detections = new List<DetectionResult>();

        for (int i = 0; i < expenseCount; i++)
        {
            var recId = Guid.NewGuid();
            var empId = i switch
            {
                < 40 => Emp1Id,
                < 70 => Emp2Id,
                < 90 => Emp3Id,
                _ => empList[3 + (i % 7)].EmployeeId,
            };
            var cat = categories[i % 4];
            var vendor = vendors[i % 4];
            var amount = 100m + (i * 10m);
            var submitted = baseDate.AddDays(i % 60);
            var isFraud = i % 20 == 0;
            var pattern = isFraud ? FraudPattern.VendorAnomaly : (FraudPattern?)null;

            expenses.Add(new ExpenseRecord(recId, empId, submitted, amount, cat, vendor, isFraud, pattern));

            var confidence = 0.1 + (i * 0.008);
            if (confidence > 1.0) confidence = 0.99;
            var band = confidence >= 0.85 ? ConfidenceBand.High
                     : confidence >= 0.55 ? ConfidenceBand.Medium
                     : ConfidenceBand.Low;

            detections.Add(new DetectionResult(recId, confidence, confidence, band,
                new[] { new FeatureContribution("vendorRarity", 1.0, 1.5), new FeatureContribution("amountZ", 0.5, 0.8) }));
        }

        return new Run(Guid.NewGuid(), "test-owner", DateTimeOffset.UtcNow,
            new SimulationConfiguration(expenseCount, empList.Count, 0.15m,
                new PatternWeights(0.34m, 0.33m, 0.33m), BandThresholds.Default, 42, "test"),
            empList, expenses, detections,
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(5, 10, 85));
    }

    private readonly RunDataQueryService _sut = new();

    // T014(a): filter by vendor returns only matching records
    [Fact]
    public void Query_FilterByVendor_ReturnsOnlyMatchingRecords()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Vendor: "AcmeAir", Detail: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r => r.Vendor.Should().Contain("AcmeAir"));
        result.Metadata.TotalMatches.Should().BeGreaterThan(0);
    }

    // T014(b): filter by employeeId returns correct subset
    [Fact]
    public void Query_FilterByEmployeeId_ReturnsCorrectSubset()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(EmployeeId: Emp1Id, Detail: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r => r.EmployeeId.Should().Be(Emp1Id));
        result.Metadata.TotalMatches.Should().Be(40);
    }

    // T014(c): filter by band returns correct band
    [Fact]
    public void Query_FilterByBand_ReturnsCorrectBand()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Band: ConfidenceBand.High, Detail: true, IncludeConfidence: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r => r.Band.Should().Be(ConfidenceBand.High));
    }

    // T014(d): filter by date range works
    [Fact]
    public void Query_FilterByDateRange_ReturnsRecordsInRange()
    {
        var run = MakeRun();
        var start = new DateTimeOffset(2026, 1, 10, 0, 0, 0, TimeSpan.Zero);
        var end = new DateTimeOffset(2026, 1, 20, 0, 0, 0, TimeSpan.Zero);
        var result = _sut.Query(run, new RunDataQuery(DateRangeStart: start, DateRangeEnd: end, Detail: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r =>
        {
            r.SubmittedUtc.Should().BeOnOrAfter(start);
            r.SubmittedUtc.Should().BeOnOrBefore(end);
        });
        result.Metadata.TotalMatches.Should().BeGreaterThan(0);
    }

    // T014(e): filter by amount range works
    [Fact]
    public void Query_FilterByAmountRange_ReturnsRecordsInRange()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(MinAmount: 200m, MaxAmount: 400m, Detail: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r =>
        {
            r.Amount.Should().BeGreaterThanOrEqualTo(200m);
            r.Amount.Should().BeLessThanOrEqualTo(400m);
        });
    }

    // T014(f): compact mode returns aggregates + top-10 by score
    [Fact]
    public void Query_CompactMode_ReturnsAggregatesAndTop10()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: false));

        result.Metadata.Mode.Should().Be("compact");
        result.Aggregates.Should().NotBeNull();
        result.TopRecords.Should().NotBeNull();
        result.TopRecords!.Count.Should().BeLessThanOrEqualTo(10);
        result.Records.Should().BeNull();
    }

    // T014(g): detail mode returns full records up to limit
    [Fact]
    public void Query_DetailMode_ReturnsFullRecordsUpToLimit()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 20));

        result.Metadata.Mode.Should().Be("detail");
        result.Records.Should().NotBeNull();
        result.Records!.Count.Should().BeLessThanOrEqualTo(20);
        result.Aggregates.Should().BeNull();
        result.TopRecords.Should().BeNull();
    }

    // T014(h): limit=500 max enforced
    [Fact]
    public void Query_LimitCappedAt500()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 9999));

        result.Records.Should().NotBeNull();
        result.Records!.Count.Should().BeLessThanOrEqualTo(500);
    }

    // T014(i): empty filter matches all records
    [Fact]
    public void Query_EmptyFilter_MatchesAllRecords()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 500));

        result.Metadata.TotalMatches.Should().Be(100);
    }

    // T014(j): IsInjectedFraud and InjectedPattern NEVER appear in output (FR-005)
    [Fact]
    public void Query_NeverExposesGroundTruthLabels()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 500));

        var json = System.Text.Json.JsonSerializer.Serialize(result);
        json.Should().NotContainEquivalentOf("isInjectedFraud");
        json.Should().NotContainEquivalentOf("injectedPattern");
    }

    [Fact]
    public void Query_DefaultStripsConfidenceScores()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 5));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r =>
        {
            r.Confidence.Should().BeNull();
            r.Band.Should().BeNull();
            r.TopFeatures.Should().BeNull();
        });
    }

    [Fact]
    public void Query_IncludeConfidenceReturnsScores()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 5, IncludeConfidence: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r =>
        {
            r.Confidence.Should().NotBeNull();
            r.Band.Should().NotBeNull();
            r.TopFeatures.Should().NotBeNull();
        });
    }

    // T015: compact mode aggregates correctness
    [Fact]
    public void Query_CompactAggregates_AreCorrect()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: false));

        result.Aggregates.Should().NotBeNull();
        var agg = result.Aggregates!;

        // Amounts are 100, 110, 120, ..., 1090 (100 items)
        // Mean = (100 + 1090) / 2 = 595
        agg.MeanAmount.Should().BeApproximately(595.0, 1.0);
        // Median of 100 items = avg of 50th and 51st = (590 + 600) / 2 = 595
        agg.MedianAmount.Should().BeApproximately(595.0, 1.0);
        agg.MinAmount.Should().Be(100.0);
        agg.MaxAmount.Should().Be(1090.0);
        agg.DistinctVendors.Should().Be(4);
        agg.DistinctCategories.Should().Be(4);
        agg.DistinctEmployees.Should().BeGreaterThanOrEqualTo(3);
    }

    [Fact]
    public void Query_CompactAggregates_DistinctCounts_AreCorrect()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(EmployeeId: Emp1Id, Detail: false));

        result.Aggregates.Should().NotBeNull();
        result.Aggregates!.DistinctEmployees.Should().Be(1);
    }

    // T016: empty result set returns zero-count metadata and null aggregates/records gracefully
    [Fact]
    public void Query_NoMatches_ReturnsZeroCountMetadata()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Vendor: "NonExistentVendorXYZ123"));

        result.Metadata.TotalMatches.Should().Be(0);
        result.Metadata.ReturnedCount.Should().Be(0);
        result.Metadata.Truncated.Should().BeFalse();
    }

    [Fact]
    public void Query_NoMatches_CompactMode_ReturnsEmptyGracefully()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Vendor: "NonExistentVendorXYZ123", Detail: false));

        result.Metadata.Mode.Should().Be("compact");
        result.Aggregates.Should().NotBeNull();
        result.TopRecords.Should().NotBeNull();
        result.TopRecords!.Should().BeEmpty();
    }

    [Fact]
    public void Query_NoMatches_DetailMode_ReturnsEmptyGracefully()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Vendor: "NonExistentVendorXYZ123", Detail: true));

        result.Metadata.Mode.Should().Be("detail");
        result.Records.Should().NotBeNull();
        result.Records!.Should().BeEmpty();
    }

    [Fact]
    public void Query_DetailMode_SortsByConfidenceDescending()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 50));

        result.Records.Should().NotBeNull();
        var confidences = result.Records!.Select(r => r.Confidence).ToList();
        confidences.Should().BeInDescendingOrder();
    }

    [Fact]
    public void Query_CombinedFilters_AndLogic()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(EmployeeId: Emp1Id, Vendor: "AcmeAir", Detail: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().AllSatisfy(r =>
        {
            r.EmployeeId.Should().Be(Emp1Id);
            r.Vendor.Should().Contain("AcmeAir");
        });
    }

    [Fact]
    public void Query_RecordContainsTopFeatures()
    {
        var run = MakeRun();
        var result = _sut.Query(run, new RunDataQuery(Detail: true, Limit: 1, IncludeConfidence: true));

        result.Records.Should().NotBeNull();
        result.Records!.Should().HaveCountGreaterThan(0);
        result.Records![0].TopFeatures.Should().NotBeEmpty();
    }
}
