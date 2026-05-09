import { useState, useEffect } from "react";
import type { ConsensusResult, AllPrompts } from "../api/runsClient";
import { consensusInvestigate, getAllPrompts } from "../api/runsClient";
import { ToolTracePanel } from "./ToolTracePanel";
import { InvestigationProgress } from "./InvestigationProgress";
import { PromptViewer } from "./PromptViewer";

interface Props {
  runId: string;
  caseId: string;
}

export function ConsensusPanel({ runId, caseId }: Props) {
  const [temperature, setTemperature] = useState(0.7);
  const [allowConfidenceScores, setAllowConfidenceScores] = useState(false);
  const [consensusResult, setConsensusResult] = useState<ConsensusResult | null>(null);
  const [loadingConsensus, setLoadingConsensus] = useState(false);
  const [prompts, setPrompts] = useState<AllPrompts | null>(null);

  useEffect(() => { getAllPrompts().then(setPrompts).catch(console.error); }, []);

  const handleConsensus = async () => {
    setLoadingConsensus(true);
    setConsensusResult(null);
    try {
      const result = await consensusInvestigate(runId, caseId, temperature, allowConfidenceScores);
      setConsensusResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConsensus(false);
    }
  };

  return (
    <>
      <p className="help">
        Run all three models (GPT-5.4, GPT-5.3 Chat, GPT-5.4 Mini) simultaneously on the same case.
        A senior arbiter AI reviews all verdicts and makes the final call.
      </p>

      {/* Temperature */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Temperature: {temperature.toFixed(1)}</label>
        <span className="help">
          Controls creativity. 0.0 = deterministic, 1.0 = creative.
        </span>
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
        <button onClick={handleConsensus} disabled={loadingConsensus}>
          {loadingConsensus ? "Running all 3 models…" : "Run Consensus Investigation"}
        </button>
      </div>

      {loadingConsensus && <InvestigationProgress mode="consensus" />}

      {consensusResult && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 12px" }}>
            Model Responses
            <span className="muted" style={{ marginLeft: 8, fontSize: "0.8rem", fontWeight: 400 }}>
              ({consensusResult.succeededCount}/{consensusResult.modelCount} responded)
            </span>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
            {consensusResult.models.map((m) => (
              <div key={m.model} style={{
                background: "var(--bg-surface)",
                borderRadius: 6,
                padding: 12,
                border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: "0.8rem" }}>{m.model}</strong>
                  {m.status === "Succeeded" ? (
                    <span className={`badge badge-${m.verdict === "Likely" ? "high" : m.verdict === "Unlikely" ? "low" : "medium"}`}>
                      {m.verdict}
                    </span>
                  ) : (
                    <span className="badge badge-medium" style={{ fontSize: "0.6rem" }}>Unavailable</span>
                  )}
                </div>
                {m.rationale && (
                  <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 6px", lineHeight: 1.5 }}>{m.rationale}</p>
                )}
                {m.keySignals && m.keySignals.length > 0 && (
                  <ul className="signals" style={{ fontSize: "0.7rem", margin: 0, paddingLeft: 16 }}>
                    {m.keySignals.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
                    {m.keySignals.length > 5 && <li className="muted">+{m.keySignals.length - 5} more</li>}
                  </ul>
                )}
                {m.unavailableReason && (
                  <p className="muted" style={{ fontSize: "0.7rem" }}>Reason: {m.unavailableReason}</p>
                )}
                <ToolTracePanel trace={m.toolTrace} />
              </div>
            ))}
          </div>

          {consensusResult.arbiter && (
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: 6,
              padding: 16,
              border: "2px solid var(--btn-primary)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Arbiter Final Verdict</h3>
                <span className={`badge badge-${
                  consensusResult.arbiter.finalVerdict === "Likely" ? "high"
                  : consensusResult.arbiter.finalVerdict === "Unlikely" ? "low" : "medium"
                }`} style={{ fontSize: "0.75rem", padding: "3px 10px" }}>
                  {consensusResult.arbiter.finalVerdict}
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0 0 12px", fontWeight: 500 }}>
                {consensusResult.arbiter.summary}
              </p>

              {consensusResult.arbiter.agreements.length > 0 && (
                <>
                  <h4 style={{ fontSize: "0.8rem", margin: "0 0 4px", color: "var(--band-low)" }}>Agreements</h4>
                  <ul className="signals" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
                    {consensusResult.arbiter.agreements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </>
              )}

              {consensusResult.arbiter.disagreements.length > 0 && (
                <>
                  <h4 style={{ fontSize: "0.8rem", margin: "0 0 4px", color: "var(--band-medium)" }}>Key Differences</h4>
                  <ul className="signals" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
                    {consensusResult.arbiter.disagreements.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </>
              )}

              <h4 style={{ fontSize: "0.8rem", margin: "0 0 4px" }}>Reasoning</h4>
              <p className="muted" style={{ fontSize: "0.78rem", margin: 0, lineHeight: 1.6 }}>
                {consensusResult.arbiter.reasoning}
              </p>
            </div>
          )}

          {!consensusResult.arbiter && (
            <div style={{ textAlign: "center", padding: 8 }}>
              <h3 style={{ fontSize: "0.95rem", margin: "0 0 4px" }}>
                Consensus:{" "}
                <span className={`badge badge-${
                  consensusResult.consensusVerdict === "Likely" ? "high"
                  : consensusResult.consensusVerdict === "Unlikely" ? "low" : "medium"
                }`}>{consensusResult.consensusVerdict}</span>
              </h3>
              <p className="muted" style={{ fontSize: "0.78rem" }}>Arbiter reasoning unavailable — verdict based on majority vote.</p>
            </div>
          )}
        </div>
      )}

      {prompts && (
        <PromptViewer sections={[
          { label: "System Instructions", content: prompts.baseSystemPrompt },
          { label: "Consensus Arbiter Prompt", content: prompts.consensusArbiterPrompt },
        ]} />
      )}
    </>
  );
}
