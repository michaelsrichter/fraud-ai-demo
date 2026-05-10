using FraudDemo.Application.Configuration;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Enums;
using FraudDemo.Functions.Dtos;
using Microsoft.Extensions.Options;

namespace FraudDemo.Functions.Dtos;

public sealed class SimulationConfigurationMapper
{
    private readonly DetectionOptions _detection;
    private readonly FoundryOptions _foundry;

    public SimulationConfigurationMapper(IOptions<DetectionOptions> detection, IOptions<FoundryOptions> foundry)
    {
        _detection = detection.Value;
        _foundry = foundry.Value;
    }

    public SimulationConfiguration Map(SimulationConfigurationDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);
        var weights = dto.PatternWeights is null
            ? PatternWeights.Even
            : new PatternWeights(
                (decimal)dto.PatternWeights.ThresholdGaming,
                (decimal)dto.PatternWeights.UnusualFrequency,
                (decimal)dto.PatternWeights.VendorAnomaly);

        var thresholds = dto.Thresholds is null
            ? new BandThresholds(_detection.DefaultLowThreshold, _detection.DefaultHighThreshold)
            : new BandThresholds((decimal)dto.Thresholds.Low, (decimal)dto.Thresholds.High);

        var scorers = MapScorers(dto.Scorers);

        return new SimulationConfiguration(
            recordCount: dto.RecordCount,
            employeeCount: dto.EmployeeCount ?? SimulationConfiguration.EmployeeCountDefault,
            intensity: (decimal)dto.Intensity,
            patternWeights: weights,
            thresholds: thresholds,
            seed: dto.Seed,
            modelDeploymentName: string.IsNullOrWhiteSpace(_foundry.ModelDeploymentName) ? "gpt-fraud-investigator" : _foundry.ModelDeploymentName,
            scorers: scorers);
    }

    private static IReadOnlyList<ScorerSelection> MapScorers(List<ScorerSelectionDto>? dtos)
    {
        if (dtos is null || dtos.Count == 0)
            return new List<ScorerSelection> { new(ScorerModelId.RandomizedPca, new Dictionary<string, double>()) };

        var registry = ScorerRegistry.Instance;
        var selections = new List<ScorerSelection>(dtos.Count);
        foreach (var dto in dtos)
        {
            var model = registry.GetModel(dto.ModelId)
                ?? throw new ArgumentException($"Unknown scorer model: '{dto.ModelId}'.");

            var parameters = new Dictionary<string, double>();
            if (dto.Parameters is not null)
            {
                foreach (var (key, value) in dto.Parameters)
                {
                    var paramDef = model.Parameters.FirstOrDefault(p => p.Name == key)
                        ?? throw new ArgumentException($"Unknown parameter '{key}' for model '{dto.ModelId}'.");
                    if (paramDef.Min.HasValue && value < paramDef.Min.Value)
                        throw new ArgumentException($"Parameter '{key}' value {value} is below minimum {paramDef.Min.Value}.");
                    if (paramDef.Max.HasValue && value > paramDef.Max.Value)
                        throw new ArgumentException($"Parameter '{key}' value {value} is above maximum {paramDef.Max.Value}.");
                    parameters[key] = value;
                }
            }

            selections.Add(new ScorerSelection(dto.ModelId, parameters));
        }

        return selections;
    }
}
