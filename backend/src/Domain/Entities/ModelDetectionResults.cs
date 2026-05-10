using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Enums;

namespace FraudDemo.Domain.Entities;

/// <summary>Wraps a single model's detection output within a run.</summary>
public sealed record ModelDetectionResults
{
    public string ModelId { get; }
    public ModelScoringStatus Status { get; }
    public string? ErrorMessage { get; }
    public IReadOnlyList<DetectionResult> Results { get; }
    public BandCounts BandCounts { get; }

    public ModelDetectionResults(
        string modelId,
        ModelScoringStatus status,
        string? errorMessage,
        IReadOnlyList<DetectionResult> results,
        BandCounts bandCounts)
    {
        if (string.IsNullOrWhiteSpace(modelId))
            throw new ArgumentException("ModelId required.", nameof(modelId));
        ArgumentNullException.ThrowIfNull(results);
        ArgumentNullException.ThrowIfNull(bandCounts);
        if (status == ModelScoringStatus.Error && string.IsNullOrWhiteSpace(errorMessage))
            throw new ArgumentException("ErrorMessage required when status is Error.", nameof(errorMessage));

        ModelId = modelId;
        Status = status;
        ErrorMessage = errorMessage;
        Results = results;
        BandCounts = bandCounts;
    }

    public static ModelDetectionResults Success(
        string modelId,
        IReadOnlyList<DetectionResult> results,
        BandCounts bandCounts) =>
        new(modelId, ModelScoringStatus.Success, null, results, bandCounts);

    public static ModelDetectionResults Error(string modelId, string errorMessage) =>
        new(modelId, ModelScoringStatus.Error, errorMessage, Array.Empty<DetectionResult>(), new BandCounts(0, 0, 0));
}
