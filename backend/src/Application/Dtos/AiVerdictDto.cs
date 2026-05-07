using System.Text.Json.Serialization;
using FraudDemo.Domain.Enums;

namespace FraudDemo.Application.Dtos;

/// <summary>Structured-output schema returned by the AI agent (FR-012).</summary>
public sealed record AiVerdictDto(
    [property: JsonPropertyName("verdict")] FraudLikelihood Verdict,
    [property: JsonPropertyName("rationale")] string Rationale,
    [property: JsonPropertyName("keySignals")] IReadOnlyList<string> KeySignals,
    [property: JsonPropertyName("recommendedAction")] string RecommendedAction);
