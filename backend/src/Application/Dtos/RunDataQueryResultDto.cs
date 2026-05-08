using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;

namespace FraudDemo.Application.Dtos;

/// <summary>Tool response for the Expenses lab data retrieval tool (FR-004).</summary>
public sealed record RunDataQueryResult(
    QueryMetadata Metadata,
    QueryAggregates? Aggregates,
    IReadOnlyList<ExpenseQueryRecord>? TopRecords,
    IReadOnlyList<ExpenseQueryRecord>? Records);

public sealed record QueryMetadata(
    int TotalMatches,
    int ReturnedCount,
    bool Truncated,
    string Mode);

public sealed record QueryAggregates(
    double MeanAmount,
    double MedianAmount,
    double MinAmount,
    double MaxAmount,
    int DistinctVendors,
    int DistinctCategories,
    int DistinctEmployees);

/// <summary>
/// A single expense record returned by the tool. NEVER includes IsInjectedFraud
/// or InjectedPattern (FR-005). Confidence/Band/TopFeatures are null when
/// IncludeConfidence=false (default) to prevent the AI from using ML scores as hints.
/// </summary>
public sealed record ExpenseQueryRecord(
    Guid RecordId,
    Guid EmployeeId,
    string EmployeeName,
    string Department,
    DateTimeOffset SubmittedUtc,
    decimal Amount,
    string Category,
    string Vendor,
    double? Confidence,
    ConfidenceBand? Band,
    IReadOnlyList<FeatureContribution>? TopFeatures);
