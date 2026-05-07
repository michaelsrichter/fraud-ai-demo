namespace FraudDemo.Domain.Configuration;

/// <summary>Per-pattern injection weights (FR-002, FR-003). Normalized to sum 1.0.</summary>
public sealed record PatternWeights
{
    public decimal ThresholdGaming { get; }
    public decimal UnusualFrequency { get; }
    public decimal VendorAnomaly { get; }

    public PatternWeights(decimal thresholdGaming, decimal unusualFrequency, decimal vendorAnomaly)
    {
        if (thresholdGaming < 0m)
            throw new ArgumentOutOfRangeException(nameof(thresholdGaming), thresholdGaming, "Weight cannot be negative.");
        if (unusualFrequency < 0m)
            throw new ArgumentOutOfRangeException(nameof(unusualFrequency), unusualFrequency, "Weight cannot be negative.");
        if (vendorAnomaly < 0m)
            throw new ArgumentOutOfRangeException(nameof(vendorAnomaly), vendorAnomaly, "Weight cannot be negative.");

        var sum = thresholdGaming + unusualFrequency + vendorAnomaly;
        if (sum <= 0m)
            throw new ArgumentException("At least one pattern weight must be positive.", nameof(thresholdGaming));

        ThresholdGaming = thresholdGaming;
        UnusualFrequency = unusualFrequency;
        VendorAnomaly = vendorAnomaly;
    }

    public PatternWeights Normalized()
    {
        var sum = ThresholdGaming + UnusualFrequency + VendorAnomaly;
        return new PatternWeights(ThresholdGaming / sum, UnusualFrequency / sum, VendorAnomaly / sum);
    }

    public static PatternWeights Even { get; } = new(1m / 3m, 1m / 3m, 1m / 3m);
}
