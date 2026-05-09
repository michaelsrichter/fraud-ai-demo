import { useState, useEffect } from "react";
import type { JuniorSeniorResult, AllPrompts } from "../api/runsClient";
import { juniorSeniorInvestigate, getAllPrompts } from "../api/runsClient";
import { ToolTracePanel } from "./ToolTracePanel";
import { InvestigationProgress } from "./InvestigationProgress";
import { PromptViewer } from "./PromptViewer";

interface Props {
  runId: string;
  caseId: string;
}

export function JuniorSeniorPanel({ runId, caseId }: Props) {
  const [temperature, setTemperature] = useState(0.7);
  const [allowConfidenceScores, setAllowConfidenceScores] = useState(false);
  const [result, setResult] = useState<JuniorSeniorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<AllPrompts | null>(null);

  useEffect(() => { getAllPrompts().then(setPrompts).catch(console.error); }, []);

  const handleInvestigate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await juniorSeniorInvestigate(runId, caseId, temperature, allowConfidenceScores);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <p className="help">
        A cost-efficient junior model (GPT-5.4 Mini) reviews the case first. If its confidence
        is below {"\u2264"} 85%, the case escalates to a premium senior model (GPT-5.4) for a deeper review.
      </p>

      {/* Temperature */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Temperature: {temperature.toFixed(1)}</label>
        <span className="help">
          Controls creativity. Models are pre-configured (Junior: GPT-5.4 Mini, Senior: GPT-5.4).
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
        <button onClick={handleInvestigate} disabled={loading}>
          {loading ? "Investigating…" : "Run Investigation"}
        </button>
      </div>

      {loading && <InvestigationProgress mode="junior-senior" />}

      {result && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          {/* Escalation status banner */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 6,
            background: result.escalated ? "rgba(var(--band-medium-rgb, 230, 160, 50), 0.1)" : "rgba(var(--band-low-rgb, 60, 180, 100), 0.1)",
            border: `1px solid ${result.escalated ? "var(--band-medium)" : "var(--band-low)"}`,
          }}>
            <span style={{ fontSize: "1.1rem" }}>{result.escalated ? "📈" : "✅"}</span>
            <div>
              <strong style={{ fontSize: "0.85rem" }}>
                {result.escalated ? "Case Escalated to Senior" : "High Confidence — No Escalation Needed"}
              </strong>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                Junior confidence: {(result.confidenceScore * 100).toFixed(0)}% (threshold: {(result.escalationThreshold * 100).toFixed(0)}%)
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4 }}>
              <span>Junior Confidence</span>
              <span style={{ fontWeight: 600 }}>{(result.confidenceScore * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%",
                width: `${result.confidenceScore * 100}%`,
                background: result.confidenceScore > result.escalationThreshold ? "var(--band-low)" : "var(--band-medium)",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }} />
              {/* Threshold marker */}
              <div style={{
                position: "absolute",
                left: `${result.escalationThreshold * 100}%`,
                top: 0,
                bottom: 0,
                width: 2,
                background: "var(--text)",
                opacity: 0.5,
              }} />
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2, textAlign: "right" }}>
              Escalation threshold: {(result.escalationThreshold * 100).toFixed(0)}%
            </div>
          </div>

          {/* Junior result */}
          <div style={{
            background: "var(--bg-surface)",
            borderRadius: 6,
            padding: 12,
            border: "1px solid var(--border)",
            marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: "0.8rem" }}>📋 Junior Investigator ({result.junior.model})</strong>
              {result.junior.status === "Succeeded" ? (
                <span className={`badge badge-${result.junior.verdict === "Likely" ? "high" : result.junior.verdict === "Unlikely" ? "low" : "medium"}`}>
                  {result.junior.verdict}
                </span>
              ) : (
                <span className="badge badge-medium" style={{ fontSize: "0.6rem" }}>Unavailable</span>
              )}
            </div>
            {result.junior.rationale && (
              <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 6px", lineHeight: 1.5 }}>{result.junior.rationale}</p>
            )}
            {result.junior.keySignals && result.junior.keySignals.length > 0 && (
              <ul className="signals" style={{ fontSize: "0.7rem", margin: 0, paddingLeft: 16 }}>
                {result.junior.keySignals.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
            <ToolTracePanel trace={result.junior.toolTrace} />
          </div>

          {/* Senior result (only if escalated) */}
          {result.escalated && result.senior && (
            <div style={{
              background: "var(--bg-surface)",
              borderRadius: 6,
              padding: 12,
              border: "2px solid var(--btn-primary)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: "0.8rem" }}>🎓 Senior Investigator ({result.senior.model})</strong>
                {result.senior.status === "Succeeded" ? (
                  <span className={`badge badge-${result.senior.verdict === "Likely" ? "high" : result.senior.verdict === "Unlikely" ? "low" : "medium"}`}>
                    {result.senior.verdict}
                  </span>
                ) : (
                  <span className="badge badge-medium" style={{ fontSize: "0.6rem" }}>Unavailable</span>
                )}
              </div>
              {result.senior.rationale && (
                <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 6px", lineHeight: 1.5 }}>{result.senior.rationale}</p>
              )}
              {result.senior.keySignals && result.senior.keySignals.length > 0 && (
                <ul className="signals" style={{ fontSize: "0.7rem", margin: 0, paddingLeft: 16 }}>
                  {result.senior.keySignals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
              <ToolTracePanel trace={result.senior.toolTrace} />
            </div>
          )}

          {result.escalated && !result.senior && (
            <div style={{ textAlign: "center", padding: 8 }}>
              <p className="muted" style={{ fontSize: "0.78rem" }}>Senior agent was unavailable — showing junior result only.</p>
            </div>
          )}

          {/* Final verdict */}
          <div style={{ textAlign: "center", marginTop: 12, padding: "8px 0" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Final Verdict: </span>
            <span className={`badge badge-${
              result.finalVerdict === "Likely" ? "high"
              : result.finalVerdict === "Unlikely" ? "low" : "medium"
            }`} style={{ fontSize: "0.8rem", padding: "3px 12px" }}>
              {result.finalVerdict}
            </span>
            <span className="muted" style={{ fontSize: "0.75rem", marginLeft: 8 }}>
              (from {result.escalated ? "senior" : "junior"} agent)
            </span>
          </div>
        </div>
      )}

      {prompts && (
        <PromptViewer sections={[
          { label: "System Instructions", content: prompts.baseSystemPrompt },
          { label: "📋 Junior Confidence Extension", content: prompts.juniorConfidenceExtension },
          { label: "🎓 Senior Preamble Template", content: prompts.seniorPreambleTemplate },
        ]} />
      )}
    </>
  );
}
