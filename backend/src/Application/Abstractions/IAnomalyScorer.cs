using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Abstractions;

public interface IAnomalyScorer
{
    /// <summary>Scores every expense in <paramref name="run"/> and returns one DetectionResult per record (index-aligned).</summary>
    IReadOnlyList<DetectionResult> Score(
        IReadOnlyList<Employee> employees,
        IReadOnlyList<ExpenseRecord> expenses,
        BandThresholds thresholds,
        int? seed);
}
