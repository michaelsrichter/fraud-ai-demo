import { useState, useEffect } from "react";
import type { DebateResult, AllPrompts } from "../api/runsClient";
import { AVAILABLE_MODELS, debateInvestigate, getAllPrompts } from "../api/runsClient";
import { ToolTracePanel } from "./ToolTracePanel";
import { InvestigationProgress } from "./InvestigationProgress";
import { PromptViewer } from "./PromptViewer";
import { CostEstimateNote } from "./CostEstimateNote";

interface Props {
  runId: string;
  caseId: string;
}

export function DebatePanel({ runId, caseId }: Props) {
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].name);
  const currentModel = AVAILABLE_MODELS.find((m) => m.name === selectedModel) ?? AVAILABLE_MODELS[0];
  const [temperature, setTemperature] = useState(0.7);
  const [allowConfidenceScores, setAllowConfidenceScores] = useState(false);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<AllPrompts | null>(null);

  useEffect(() => { getAllPrompts().then(setPrompts).catch(console.error); }, []);

  const handleDebate = async () => {
    setLoading(true);
    setDebateResult(null);
    try {
      const result = await debateInvestigate(runId, caseId, selectedModel, temperature, allowConfidenceScores);
      setDebateResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <p className="help">
        Two AI agents independently review the same case with opposing biases — one advocates for fraud,
        the other for legitimacy. A judge arbiter evaluates both arguments and delivers the final verdict.
      </p>

      {/* Model selection */}
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Model</label>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.name} value={m.name}>{m.label} — {m.description}</option>
          ))}
        </select>
        <div className="help" style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
          <span>Input: <strong>{currentModel.inputCost}</strong>/1M tokens</span>
          <span>Output: <strong>{currentModel.outputCost}</strong>/1M tokens</span>
          <span className={`badge badge-${currentModel.tier === "premium" ? "high" : currentModel.tier === "economy" ? "low" : "medium"}`}
                style={{ fontSize: "0.65rem" }}>
            {currentModel.tier === "premium" ? "$$$ Premium" : currentModel.tier === "economy" ? "$ Economy" : "$$ Standard"}
          </span>
        </div>
      </div>

      {/* Temperature */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Temperature: {temperature.toFixed(1)}</label>
        <input type="range" min={0} max={2} step={0.1} value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))} />
      </div>

      {/* Confidence scores toggle */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={allowConfidenceScores}
            onChange={(e) => setAllowConfidenceScores(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Allow ML confidence scores in tool results
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={handleDebate} disabled={loading}>
          {loading ? "Running debate…" : "Run Debate Investigation"}
        </button>
      </div>

      {loading && <InvestigationProgress mode="debate" />}

      {debateResult && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <CostEstimateNote estimate={debateResult.costEstimate ?? null} />
          {/* Side-by-side debate agents */}
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 12px" }}>Opposing Arguments</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
            {/* Fraud Advocate */}
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: 6,
              padding: 12,
              border: "2px solid var(--band-high)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--band-high)" }}>🔴 Fraud Advocate</strong>
                {debateResult.fraudLeaning.status === "Succeeded" ? (
                  <span className={`badge badge-${debateResult.fraudLeaning.verdict === "Likely" ? "high" : debateResult.fraudLeaning.verdict === "Unlikely" ? "low" : "medium"}`}>
                    {debateResult.fraudLeaning.verdict}
                  </span>
                ) : (
                  <span className="badge badge-medium" style={{ fontSize: "0.6rem" }}>Unavailable</span>
                )}
              </div>
              {debateResult.fraudLeaning.rationale && (
                <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 6px", lineHeight: 1.5 }}>
                  {debateResult.fraudLeaning.rationale}
                </p>
              )}
              <CostEstimateNote estimate={debateResult.fraudLeaning.costEstimate ?? null} compact />
              {debateResult.fraudLeaning.keySignals && debateResult.fraudLeaning.keySignals.length > 0 && (
                <ul className="signals" style={{ fontSize: "0.7rem", margin: 0, paddingLeft: 16 }}>
                  {debateResult.fraudLeaning.keySignals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
              {debateResult.fraudLeaning.unavailableReason && (
                <p className="muted" style={{ fontSize: "0.7rem" }}>Reason: {debateResult.fraudLeaning.unavailableReason}</p>
              )}
              <ToolTracePanel trace={debateResult.fraudLeaning.toolTrace} />
            </div>

            {/* Defense Advocate */}
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: 6,
              padding: 12,
              border: "2px solid var(--band-low)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--band-low)" }}>🟢 Defense Advocate</strong>
                {debateResult.nonFraudLeaning.status === "Succeeded" ? (
                  <span className={`badge badge-${debateResult.nonFraudLeaning.verdict === "Likely" ? "high" : debateResult.nonFraudLeaning.verdict === "Unlikely" ? "low" : "medium"}`}>
                    {debateResult.nonFraudLeaning.verdict}
                  </span>
                ) : (
                  <span className="badge badge-medium" style={{ fontSize: "0.6rem" }}>Unavailable</span>
                )}
              </div>
              {debateResult.nonFraudLeaning.rationale && (
                <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 6px", lineHeight: 1.5 }}>
                  {debateResult.nonFraudLeaning.rationale}
                </p>
              )}
              <CostEstimateNote estimate={debateResult.nonFraudLeaning.costEstimate ?? null} compact />
              {debateResult.nonFraudLeaning.keySignals && debateResult.nonFraudLeaning.keySignals.length > 0 && (
                <ul className="signals" style={{ fontSize: "0.7rem", margin: 0, paddingLeft: 16 }}>
                  {debateResult.nonFraudLeaning.keySignals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
              {debateResult.nonFraudLeaning.unavailableReason && (
                <p className="muted" style={{ fontSize: "0.7rem" }}>Reason: {debateResult.nonFraudLeaning.unavailableReason}</p>
              )}
              <ToolTracePanel trace={debateResult.nonFraudLeaning.toolTrace} />
            </div>
          </div>

          {/* Arbiter verdict */}
          {debateResult.arbiter && (
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: 6,
              padding: 16,
              border: "2px solid var(--btn-primary)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>⚖️ Judge's Final Verdict</h3>
                <span className={`badge badge-${
                  debateResult.arbiter.finalVerdict === "Likely" ? "high"
                  : debateResult.arbiter.finalVerdict === "Unlikely" ? "low" : "medium"
                }`} style={{ fontSize: "0.75rem", padding: "3px 10px" }}>
                  {debateResult.arbiter.finalVerdict}
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0 0 12px", fontWeight: 500 }}>
                {debateResult.arbiter.summary}
              </p>

              {debateResult.arbiter.agreements.length > 0 && (
                <>
                  <h4 style={{ fontSize: "0.8rem", margin: "0 0 4px", color: "var(--band-low)" }}>Both Agents Agreed</h4>
                  <ul className="signals" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
                    {debateResult.arbiter.agreements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </>
              )}

              {debateResult.arbiter.disagreements.length > 0 && (
                <>
                  <h4 style={{ fontSize: "0.8rem", margin: "0 0 4px", color: "var(--band-medium)" }}>Points of Contention</h4>
                  <ul className="signals" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
                    {debateResult.arbiter.disagreements.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </>
              )}

              <h4 style={{ fontSize: "0.8rem", margin: "0 0 4px" }}>Reasoning</h4>
              <p className="muted" style={{ fontSize: "0.78rem", margin: 0, lineHeight: 1.6 }}>
                {debateResult.arbiter.reasoning}
              </p>
              <CostEstimateNote estimate={debateResult.arbiterCostEstimate ?? null} compact />
            </div>
          )}

          {!debateResult.arbiter && (
            <div style={{ textAlign: "center", padding: 8 }}>
              <h3 style={{ fontSize: "0.95rem", margin: "0 0 4px" }}>
                Final Verdict:{" "}
                <span className={`badge badge-${
                  debateResult.finalVerdict === "Likely" ? "high"
                  : debateResult.finalVerdict === "Unlikely" ? "low" : "medium"
                }`}>{debateResult.finalVerdict}</span>
              </h3>
              <p className="muted" style={{ fontSize: "0.78rem" }}>Arbiter reasoning unavailable.</p>
            </div>
          )}
        </div>
      )}

      {prompts && (
        <PromptViewer sections={[
          { label: "System Instructions", content: prompts.baseSystemPrompt },
          { label: "🔴 Fraud Advocate Bias", content: prompts.fraudLeaningBias },
          { label: "🟢 Defense Advocate Bias", content: prompts.nonFraudLeaningBias },
          { label: "⚖️ Debate Arbiter Prompt", content: prompts.debateArbiterPrompt },
        ]} />
      )}
    </>
  );
}
