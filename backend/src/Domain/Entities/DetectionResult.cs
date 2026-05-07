using FraudDemo.Domain.Enums;

namespace FraudDemo.Domain.Entities;

public sealed record DetectionResult
{
    public Guid RecordId { get; }
    public double RawScore { get; }
    public double Confidence { get; }
    public ConfidenceBand Band { get; }
    public IReadOnlyList<FeatureContribution> ContributingFeatures { get; }

    public DetectionResult(
        Guid recordId,
        double rawScore,
        double confidence,
        ConfidenceBand band,
        IReadOnlyList<FeatureContribution> contributingFeatures)
    {
        if (recordId == Guid.Empty) throw new ArgumentException("RecordId required.", nameof(recordId));
        if (double.IsNaN(rawScore) || double.IsInfinity(rawScore))
            throw new ArgumentException("RawScore must be a finite number.", nameof(rawScore));
        if (confidence < 0.0 || confidence > 1.0)
            throw new ArgumentOutOfRangeException(nameof(confidence), confidence, "Confidence must be in [0,1].");
        ArgumentNullException.ThrowIfNull(contributingFeatures);
        if (contributingFeatures.Count == 0)
            throw new ArgumentException("ContributingFeatures must be non-empty.", nameof(contributingFeatures));

        RecordId = recordId;
        RawScore = rawScore;
        Confidence = confidence;
        Band = band;
        ContributingFeatures = contributingFeatures;
    }
}
