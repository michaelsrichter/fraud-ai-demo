namespace FraudDemo.Domain.Configuration;

/// <summary>Metadata for an available ML scoring model.</summary>
public sealed record ScorerModelDefinition(
    string ModelId,
    string DisplayName,
    string Description,
    IReadOnlyList<ModelParameterDef> Parameters);
