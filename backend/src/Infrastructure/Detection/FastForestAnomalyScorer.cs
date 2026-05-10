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
/// ML.NET-backed scorer using Fast Forest binary classification (Constitution XII — library-first).
/// Supervised ensemble of random decision trees. Each tree votes on whether a record is fraud;
/// the fraction of trees voting "fraud" becomes the confidence score. No additional calibration
/// is needed since the output is already a [0,1] probability.
/// </summary>
public sealed class FastForestAnomalyScorer : IAnomalyScorer
{
    private readonly ILogger<FastForestAnomalyScorer> _logger;

    public string ModelId => ScorerModelId.FastForest;

    public FastForestAnomalyScorer(ILogger<FastForestAnomalyScorer> logger)
    {
        _logger = logger;
    }

    private sealed class LabeledFeatureRow
    {
        [VectorType(6)]
        public float[] Features { get; set; } = Array.Empty<float>();
        public bool Label { get; set; }
    }

    private sealed class ForestPrediction
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

        _logger.LogInformation("FastForest scoring started: {Records} records, {Features} features", expenses.Count, matrix.Names.Count);

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
        var numberOfTrees = 50;
        var numberOfLeaves = 20;
        var minimumExampleCountPerLeaf = 10;
        if (parameterOverrides is not null)
        {
            if (parameterOverrides.TryGetValue("numberOfTrees", out var treesVal))
                numberOfTrees = Math.Clamp((int)treesVal, 10, 500);
            if (parameterOverrides.TryGetValue("numberOfLeaves", out var leavesVal))
                numberOfLeaves = Math.Clamp((int)leavesVal, 2, 128);
            if (parameterOverrides.TryGetValue("minimumExampleCountPerLeaf", out var minVal))
                minimumExampleCountPerLeaf = Math.Clamp((int)minVal, 1, 100);
        }

        var trainer = ml.BinaryClassification.Trainers.FastForest(
            labelColumnName: nameof(LabeledFeatureRow.Label),
            featureColumnName: nameof(LabeledFeatureRow.Features),
            numberOfTrees: numberOfTrees,
            numberOfLeaves: numberOfLeaves,
            minimumExampleCountPerLeaf: minimumExampleCountPerLeaf);

        // FastForest is uncalibrated — wrap with Platt calibration to produce a Probability column
        var pipeline = trainer.Append(ml.BinaryClassification.Calibrators.Platt());

        var model = pipeline.Fit(data);
        var transformed = model.Transform(data);
        var predictions = ml.Data.CreateEnumerable<ForestPrediction>(transformed, reuseRowObject: false).ToList();

        var detections = new List<DetectionResult>(expenses.Count);
        for (var i = 0; i < expenses.Count; i++)
        {
            // FastForest probability = fraction of trees voting "fraud", already in [0,1]
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

        _logger.LogInformation("FastForest scoring completed: {Records} records scored", expenses.Count);
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
