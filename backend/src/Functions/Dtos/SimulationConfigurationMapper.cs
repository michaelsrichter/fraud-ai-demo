using FraudDemo.Application.Configuration;
using FraudDemo.Domain.Configuration;
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

        return new SimulationConfiguration(
            recordCount: dto.RecordCount,
            employeeCount: dto.EmployeeCount ?? SimulationConfiguration.EmployeeCountDefault,
            intensity: (decimal)dto.Intensity,
            patternWeights: weights,
            thresholds: thresholds,
            seed: dto.Seed,
            modelDeploymentName: string.IsNullOrWhiteSpace(_foundry.ModelDeploymentName) ? "gpt-fraud-investigator" : _foundry.ModelDeploymentName);
    }
}
