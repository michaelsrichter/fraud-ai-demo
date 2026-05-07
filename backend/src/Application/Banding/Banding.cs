using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Enums;

namespace FraudDemo.Application.Banding;

public static class BandingHelpers
{
    public static ConfidenceBand Assign(double confidence, BandThresholds thresholds)
    {
        if (confidence >= (double)thresholds.High) return ConfidenceBand.High;
        if (confidence >= (double)thresholds.Low) return ConfidenceBand.Medium;
        return ConfidenceBand.Low;
    }

    public static BandCounts Count(IEnumerable<ConfidenceBand> bands)
    {
        int high = 0, medium = 0, low = 0;
        foreach (var b in bands)
        {
            switch (b)
            {
                case ConfidenceBand.High: high++; break;
                case ConfidenceBand.Medium: medium++; break;
                default: low++; break;
            }
        }
        return new BandCounts(high, medium, low);
    }
}
