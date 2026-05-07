using FraudDemo.Domain.Configuration;

namespace FraudDemo.Domain.Projections;

public sealed record RunSummary(
    Guid RunId,
    DateTimeOffset CreatedUtc,
    int RecordCount,
    BandCounts BandCounts,
    decimal Intensity,
    PatternWeights PatternWeights,
    int InvestigationCount);
