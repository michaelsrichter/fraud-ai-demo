using System.Text.Json.Serialization;

namespace FraudDemo.Functions.Dtos;

public sealed record SimulationConfigurationDto(
    [property: JsonPropertyName("recordCount")] int RecordCount,
    [property: JsonPropertyName("intensity")] double Intensity,
    [property: JsonPropertyName("patternWeights")] PatternWeightsDto PatternWeights,
    [property: JsonPropertyName("employeeCount")] int? EmployeeCount = null,
    [property: JsonPropertyName("thresholds")] BandThresholdsDto? Thresholds = null,
    [property: JsonPropertyName("seed")] int? Seed = null,
    [property: JsonPropertyName("scorers")] List<ScorerSelectionDto>? Scorers = null);

public sealed record ScorerSelectionDto(
    [property: JsonPropertyName("modelId")] string ModelId,
    [property: JsonPropertyName("parameters")] Dictionary<string, double>? Parameters = null);

public sealed record PatternWeightsDto(
    [property: JsonPropertyName("thresholdGaming")] double ThresholdGaming,
    [property: JsonPropertyName("unusualFrequency")] double UnusualFrequency,
    [property: JsonPropertyName("vendorAnomaly")] double VendorAnomaly);

public sealed record BandThresholdsDto(
    [property: JsonPropertyName("low")] double Low,
    [property: JsonPropertyName("high")] double High);
