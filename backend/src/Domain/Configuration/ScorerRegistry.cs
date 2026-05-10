using FraudDemo.Domain.Enums;

namespace FraudDemo.Domain.Configuration;

/// <summary>Singleton catalog of available scoring models and their parameter definitions.</summary>
public sealed class ScorerRegistry
{
    public static readonly ScorerRegistry Instance = new();

    public IReadOnlyList<ScorerModelDefinition> AvailableModels { get; }

    private readonly Dictionary<string, ScorerModelDefinition> _byId;

    private ScorerRegistry()
    {
        AvailableModels = new List<ScorerModelDefinition>
        {
            new(
                ScorerModelId.RandomizedPca,
                "Randomized PCA",
                "Unsupervised anomaly detection using principal component analysis. Records that reconstruct poorly receive high anomaly scores.",
                new List<ModelParameterDef>
                {
                    new("rank", "PCA Rank", "Number of principal components to retain. Lower values detect more anomalies.", ParameterType.Int, 4, 1, 6),
                }),
            new(
                ScorerModelId.SdcaLogistic,
                "SDCA Logistic Regression",
                "Supervised binary classifier using stochastic dual coordinate ascent. Uses ground-truth fraud labels to learn a linear decision boundary.",
                new List<ModelParameterDef>
                {
                    new("l1Regularization", "L1 Regularization", "Controls sparsity of model weights. Higher values produce simpler models.", ParameterType.Float, 0.1, 0.0, 10.0),
                    new("l2Regularization", "L2 Regularization", "Controls smoothness of model weights. Higher values reduce overfitting.", ParameterType.Float, 0.1, 0.0, 10.0),
                    new("maximumNumberOfIterations", "Max Iterations", "Maximum training iterations. More iterations may improve accuracy.", ParameterType.Int, 100, 10, 1000),
                }),
            new(
                ScorerModelId.FastForest,
                "Fast Forest",
                "Supervised ensemble of random decision trees. Fraction of trees voting 'fraud' becomes the confidence score.",
                new List<ModelParameterDef>
                {
                    new("numberOfTrees", "Number of Trees", "Trees in the forest. More trees improve accuracy but increase scoring time.", ParameterType.Int, 50, 10, 500),
                    new("numberOfLeaves", "Max Leaves per Tree", "Maximum leaf nodes per tree. More leaves capture complex patterns but risk overfitting.", ParameterType.Int, 20, 2, 128),
                    new("minimumExampleCountPerLeaf", "Min Examples per Leaf", "Minimum records per leaf node. Higher values produce more conservative trees.", ParameterType.Int, 10, 1, 100),
                }),
        };

        _byId = AvailableModels.ToDictionary(m => m.ModelId);
    }

    public ScorerModelDefinition? GetModel(string modelId) =>
        _byId.GetValueOrDefault(modelId);
}
