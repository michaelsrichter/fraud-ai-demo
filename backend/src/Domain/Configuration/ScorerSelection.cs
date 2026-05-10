namespace FraudDemo.Domain.Configuration;

/// <summary>User's choice of a model + optional parameter overrides for a single run.</summary>
public sealed record ScorerSelection(
    string ModelId,
    IReadOnlyDictionary<string, double> Parameters);
