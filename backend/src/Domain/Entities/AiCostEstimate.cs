namespace FraudDemo.Domain.Entities;

public sealed record AiCostEstimate(
    string Model,
    int InputTokens,
    int OutputTokens,
    decimal InputCostUsd,
    decimal OutputCostUsd,
    decimal TotalCostUsd,
    bool PricingKnown);
