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
/// ML.NET-backed scorer using SDCA Logistic Regression (Constitution XII — library-first).
/// Supervised binary classifier that uses ground-truth <see cref="ExpenseRecord.IsFraud"/>
/// labels from synthetic data to learn a linear decision boundary. The Platt-calibrated
/// probability output is used directly as the anomaly confidence score.
/// </summary>
public sealed class SdcaAnomalyScorer : IAnomalyScorer
{
    private readonly ILogger<SdcaAnomalyScorer> _logger;

    public string ModelId => ScorerModelId.SdcaLogistic;

    public SdcaAnomalyScorer(ILogger<SdcaAnomalyScorer> logger)
    {
        _logger = logger;
    }

    private sealed class LabeledFeatureRow
    {
        [VectorType(6)]
        public float[] Features { get; set; } = Array.Empty<float>();
        public bool Label { get; set; }
    }

    private sealed class SdcaPrediction
    {
        public bool PredictedLabel { get; set; }
        public float Probability { get; set; }
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

        _logger.LogInformation("SDCA scoring started: {Records} records, {Features} features", expenses.Count, matrix.Names.Count);

        var ml = new MLContext(seed: seed);

        // Build labeled rows — IsFraud is the ground truth from synthetic generation
        var rows = new List<LabeledFeatureRow>(expenses.Count);
        for (var i = 0; i < expenses.Count; i++)
        {
            rows.Add(new LabeledFeatureRow
            {
                Features = matrix.Rows[i],
                Label = expenses[i].IsInjectedFraud,
            });
        }

        var data = ml.Data.LoadFromEnumerable(rows);

        // Extract parameter overrides
        var l1 = 0.1f;
        var l2 = 0.1f;
        var maxIterations = 100;
        if (parameterOverrides is not null)
        {
            if (parameterOverrides.TryGetValue("l1Regularization", out var l1Val))
                l1 = (float)Math.Clamp(l1Val, 0.0, 10.0);
            if (parameterOverrides.TryGetValue("l2Regularization", out var l2Val))
                l2 = (float)Math.Clamp(l2Val, 0.0, 10.0);
            if (parameterOverrides.TryGetValue("maximumNumberOfIterations", out var iterVal))
                maxIterations = Math.Clamp((int)iterVal, 10, 1000);
        }

        var pipeline = ml.BinaryClassification.Trainers.SdcaLogisticRegression(
            labelColumnName: nameof(LabeledFeatureRow.Label),
            featureColumnName: nameof(LabeledFeatureRow.Features),
            l1Regularization: l1,
            l2Regularization: l2,
            maximumNumberOfIterations: maxIterations);

        var model = pipeline.Fit(data);
        var transformed = model.Transform(data);
        var predictions = ml.Data.CreateEnumerable<SdcaPrediction>(transformed, reuseRowObject: false).ToList();

        var detections = new List<DetectionResult>(expenses.Count);
        for (var i = 0; i < expenses.Count; i++)
        {
            // Platt-calibrated probability is already in [0,1]
            var confidence = Math.Clamp(predictions[i].Probability, 0.0, 1.0);
            var band = BandingHelpers.Assign(confidence, thresholds);
            var contributors = TopFeatures(matrix, i, take: 5);
            detections.Add(new DetectionResult(
                expenses[i].RecordId,
                predictions[i].Score,
                confidence,
                band,
                contributors));
        }

        _logger.LogInformation("SDCA scoring completed: {Records} records scored", expenses.Count);
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
