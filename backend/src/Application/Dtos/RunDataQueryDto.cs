using FraudDemo.Domain.Enums;

namespace FraudDemo.Application.Dtos;

/// <summary>
/// Filter parameters for the Expenses lab data retrieval tool (FR-002).
/// All filters are optional and combined with AND logic.
/// </summary>
public sealed record RunDataQuery(
    Guid? EmployeeId = null,
    string? Vendor = null,
    string? Category = null,
    ConfidenceBand? Band = null,
    DateTimeOffset? DateRangeStart = null,
    DateTimeOffset? DateRangeEnd = null,
    decimal? MinAmount = null,
    decimal? MaxAmount = null,
    int Limit = 100,
    bool Detail = false,
    bool IncludeConfidence = false)
{
    /// <summary>Clamps limit to [1, 500] per FR-002.</summary>
    public int EffectiveLimit => Math.Clamp(Limit, 1, 500);
}
