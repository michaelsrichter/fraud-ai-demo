using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Services;

public static class AiCostEstimator
{
    private const decimal TokensPerMillion = 1_000_000m;

    private static readonly IReadOnlyDictionary<string, (decimal InputUsdPer1M, decimal OutputUsdPer1M)> PricingByModel
        = new Dictionary<string, (decimal InputUsdPer1M, decimal OutputUsdPer1M)>(StringComparer.OrdinalIgnoreCase)
        {
            ["gpt-5.4"] = (2.50m, 15.00m),
            ["gpt-5.3-chat"] = (1.75m, 14.00m),
            ["gpt-5.4-mini"] = (0.75m, 4.50m),
        };

    public static AiCostEstimate Estimate(string model, int inputTokens, int outputTokens)
    {
        if (inputTokens < 0) inputTokens = 0;
        if (outputTokens < 0) outputTokens = 0;

        if (!PricingByModel.TryGetValue(model, out var pricing))
        {
            return new AiCostEstimate(
                Model: model,
                InputTokens: inputTokens,
                OutputTokens: outputTokens,
                InputCostUsd: 0m,
                OutputCostUsd: 0m,
                TotalCostUsd: 0m,
                PricingKnown: false);
        }

        var inputCost = (inputTokens / TokensPerMillion) * pricing.InputUsdPer1M;
        var outputCost = (outputTokens / TokensPerMillion) * pricing.OutputUsdPer1M;

        return new AiCostEstimate(
            Model: model,
            InputTokens: inputTokens,
            OutputTokens: outputTokens,
            InputCostUsd: decimal.Round(inputCost, 6),
            OutputCostUsd: decimal.Round(outputCost, 6),
            TotalCostUsd: decimal.Round(inputCost + outputCost, 6),
            PricingKnown: true);
    }

    public static int EstimateTokensFromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0;
        // Coarse token estimate for English text and JSON payloads.
        return (int)Math.Ceiling(text.Length / 4.0);
    }

    public static int EstimateTokensFromChars(long charCount)
    {
        if (charCount <= 0) return 0;
        return (int)Math.Ceiling(charCount / 4.0);
    }

    public static AiCostEstimate Sum(string modelLabel, IEnumerable<AiCostEstimate?> estimates)
    {
        var list = estimates.Where(e => e is not null).Select(e => e!).ToList();
        if (list.Count == 0)
        {
            return new AiCostEstimate(modelLabel, 0, 0, 0m, 0m, 0m, PricingKnown: false);
        }

        return new AiCostEstimate(
            Model: modelLabel,
            InputTokens: list.Sum(e => e.InputTokens),
            OutputTokens: list.Sum(e => e.OutputTokens),
            InputCostUsd: decimal.Round(list.Sum(e => e.InputCostUsd), 6),
            OutputCostUsd: decimal.Round(list.Sum(e => e.OutputCostUsd), 6),
            TotalCostUsd: decimal.Round(list.Sum(e => e.TotalCostUsd), 6),
            PricingKnown: list.Any(e => e.PricingKnown));
    }
}
