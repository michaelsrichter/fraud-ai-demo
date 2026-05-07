namespace FraudDemo.Domain.Configuration;

/// <summary>Lower/upper threshold bounds for assigning <see cref="Enums.ConfidenceBand"/>.</summary>
public sealed record BandThresholds
{
    public decimal Low { get; }
    public decimal High { get; }

    public BandThresholds(decimal low, decimal high)
    {
        if (low <= 0m || low >= 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(low), low, "Low must be in (0,1).");
        }
        if (high <= 0m || high >= 1m)
        {
            throw new ArgumentOutOfRangeException(nameof(high), high, "High must be in (0,1).");
        }
        if (low >= high)
        {
            throw new ArgumentException("Low must be strictly less than High.", nameof(low));
        }
        Low = low;
        High = high;
    }

    public static BandThresholds Default { get; } = new(0.55m, 0.85m);
}
