using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Abstractions;

public interface IAnomalyScorer
{
    string ModelId { get; }

    /// <summary>Scores every expense in <paramref name="expenses"/> and returns one DetectionResult per record (index-aligned).</summary>
    IReadOnlyList<DetectionResult> Score(
        IReadOnlyList<Employee> employees,
        IReadOnlyList<ExpenseRecord> expenses,
        BandThresholds thresholds,
        int? seed,
        Dictionary<string, double>? parameterOverrides = null);
}
