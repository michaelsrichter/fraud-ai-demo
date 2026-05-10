using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Banding;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.ML;
using Microsoft.ML.Data;

namespace FraudDemo.Infrastructure.Detection;

/// <summary>
/// ML.NET-backed anomaly scorer (Constitution XII — library-first).
/// Uses <see cref="MLContext"/>'s Randomized PCA trainer to fit a low-rank
/// reconstruction over the engineered feature matrix; the per-row anomaly
/// score is calibrated into [0,1] confidence using the run's own score
/// distribution (logistic squash around the median).
/// </summary>
public sealed class MlNetAnomalyScorer : IAnomalyScorer
{
    private readonly ILogger<MlNetAnomalyScorer> _logger;

    public string ModelId => ScorerModelId.RandomizedPca;

    public MlNetAnomalyScorer(ILogger<MlNetAnomalyScorer> logger)
    {
        _logger = logger;
    }

    private sealed class FeatureRow
    {
        [VectorType(6)]
        public float[] Features { get; set; } = Array.Empty<float>();
    }

    private sealed class ScoredRow
    {
        public float Score { get; set; }
    }

    public IReadOnlyList<DetectionResult> Score(
        IReadOnlyList<Employee> employees,
        IReadOnlyList<ExpenseRecord> expenses,
        BandThresholds thresholds,
        int? seed,
        Dictionary<string, double>? parameterOverrides = null)
    {
        ArgumentNullException.ThrowIfNull(employees);
        ArgumentNullException.ThrowIfNull(expenses);
        ArgumentNullException.ThrowIfNull(thresholds);
        if (expenses.Count == 0) throw new ArgumentException("At least one expense required.", nameof(expenses));

        var builder = new FraudFeatureBuilder();
        var matrix = builder.Build(employees, expenses);

        _logger.LogInformation("Detection processing started: {Records} records, {Features} features", expenses.Count, matrix.Names.Count);

        var ml = new MLContext(seed: seed);
        var rows = matrix.Rows.Select(r => new FeatureRow { Features = r }).ToList();
        var data = ml.Data.LoadFromEnumerable(rows);

        // RandomizedPca handles >=2 features and >=rank rows; fall back gracefully if too few rows.
        var rank = Math.Min(4, Math.Max(1, matrix.Names.Count - 1));
        if (parameterOverrides?.TryGetValue("rank", out var rankOverride) == true)
            rank = Math.Clamp((int)rankOverride, 1, Math.Max(1, matrix.Names.Count - 1));
        var pipeline = ml.AnomalyDetection.Trainers.RandomizedPca(
            featureColumnName: nameof(FeatureRow.Features),
            rank: rank,
            ensureZeroMean: true,
            seed: seed);

        var model = pipeline.Fit(data);
        var transformed = model.Transform(data);
        var scored = ml.Data.CreateEnumerable<ScoredRow>(transformed, reuseRowObject: false).ToList();

        // Calibrate into [0,1] using min/max of the raw scores in this run.
        var raw = scored.Select(s => (double)s.Score).ToArray();
        var min = raw.Min();
        var max = raw.Max();
        var range = max - min;
        var safeRange = range <= 1e-9 ? 1.0 : range;

        var detections = new List<DetectionResult>(expenses.Count);
        for (var i = 0; i < expenses.Count; i++)
        {
            var rawScore = raw[i];
            var normalized = (rawScore - min) / safeRange; // 0..1
            // Apply gentle logistic squash so distribution is more usable
            var confidence = 1.0 / (1.0 + Math.Exp(-6.0 * (normalized - 0.5)));
            confidence = Math.Clamp(confidence, 0.0, 1.0);

            var band = BandingHelpers.Assign(confidence, thresholds);
            var contributors = TopFeatures(matrix, i, take: 5);
            detections.Add(new DetectionResult(
                expenses[i].RecordId,
                rawScore,
                confidence,
                band,
                contributors));
        }

        return detections;
    }

    private static IReadOnlyList<FeatureContribution> TopFeatures(
        FraudFeatureBuilder.FeatureMatrix matrix,
        int rowIndex,
        int take)
    {
        var values = matrix.Rows[rowIndex];
        var z = matrix.ZScoreRows[rowIndex];
        var pairs = new List<FeatureContribution>(matrix.Names.Count);
        for (var f = 0; f < matrix.Names.Count; f++)
        {
            pairs.Add(new FeatureContribution(matrix.Names[f], values[f], z[f]));
        }
        return pairs
            .OrderByDescending(p => Math.Abs(p.ZScore))
            .Take(take)
            .ToList();
    }
}
