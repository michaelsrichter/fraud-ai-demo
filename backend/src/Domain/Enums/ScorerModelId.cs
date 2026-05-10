namespace FraudDemo.Domain.Enums;

/// <summary>String constants for available ML scoring model identifiers.</summary>
public static class ScorerModelId
{
    public const string RandomizedPca = "randomized-pca";
    public const string SdcaLogistic = "sdca-logistic";
    public const string FastForest = "fast-forest";
}
