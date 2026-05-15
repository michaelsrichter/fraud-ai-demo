import type { AiCostEstimate } from "../api/runsClient";

interface Props {
  estimate: AiCostEstimate | null | undefined;
  compact?: boolean;
}

function formatUsd(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function CostEstimateNote({ estimate, compact = false }: Props) {
  if (!estimate) return null;

  return (
    <p className="muted" style={{ margin: compact ? "4px 0 0" : "8px 0 0", fontSize: compact ? "0.7rem" : "0.75rem" }}>
      Estimated cost: <strong>{formatUsd(estimate.totalCostUsd)}</strong>
      {" "}
      ({estimate.model}, in {estimate.inputTokens.toLocaleString()} tok, out {estimate.outputTokens.toLocaleString()} tok)
      {!estimate.pricingKnown && " - pricing unavailable for this model"}
    </p>
  );
}
