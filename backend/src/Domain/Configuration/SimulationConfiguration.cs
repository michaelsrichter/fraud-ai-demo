namespace FraudDemo.Domain.Configuration;

/// <summary>Frozen configuration for a single Run (FR-002, FR-003, FR-004, FR-009).</summary>
public sealed record SimulationConfiguration
{
    public const int RecordCountCap = 50_000;
    public const int RecordCountDefault = 5_000;
    public const int EmployeeCountMin = 10;
    public const int EmployeeCountMax = 500;
    public const int EmployeeCountDefault = 100;

    public int RecordCount { get; }
    public int EmployeeCount { get; }
    public decimal Intensity { get; }
    public PatternWeights PatternWeights { get; }
    public BandThresholds Thresholds { get; }
    public int? Seed { get; }
    public string ModelDeploymentName { get; }

    public SimulationConfiguration(
        int recordCount,
        int employeeCount,
        decimal intensity,
        PatternWeights patternWeights,
        BandThresholds thresholds,
        int? seed,
        string modelDeploymentName)
    {
        if (recordCount < 1 || recordCount > RecordCountCap)
            throw new ArgumentOutOfRangeException(nameof(recordCount), recordCount, $"RecordCount must be 1..{RecordCountCap} (FR-004).");
        if (employeeCount < EmployeeCountMin || employeeCount > EmployeeCountMax)
            throw new ArgumentOutOfRangeException(nameof(employeeCount), employeeCount, $"EmployeeCount must be {EmployeeCountMin}..{EmployeeCountMax}.");
        if (intensity < 0m || intensity > 1m)
            throw new ArgumentOutOfRangeException(nameof(intensity), intensity, "Intensity must be in [0,1].");
        ArgumentNullException.ThrowIfNull(patternWeights);
        ArgumentNullException.ThrowIfNull(thresholds);
        if (string.IsNullOrWhiteSpace(modelDeploymentName))
            throw new ArgumentException("ModelDeploymentName must be non-empty.", nameof(modelDeploymentName));

        RecordCount = recordCount;
        EmployeeCount = employeeCount;
        Intensity = intensity;
        PatternWeights = patternWeights.Normalized();
        Thresholds = thresholds;
        Seed = seed;
        ModelDeploymentName = modelDeploymentName;
    }

    public static SimulationConfiguration CreateDefault(string modelDeploymentName) =>
        new(
            recordCount: RecordCountDefault,
            employeeCount: EmployeeCountDefault,
            intensity: 0.05m,
            patternWeights: PatternWeights.Even,
            thresholds: BandThresholds.Default,
            seed: null,
            modelDeploymentName: modelDeploymentName);
}
