import { useState } from "react";
import type { AiInvestigationResult, ConsensusResult } from "../api/runsClient";
import { AVAILABLE_MODELS, getPromptPreview, consensusInvestigate } from "../api/runsClient";

interface Props {
  investigation: AiInvestigationResult | null | undefined;
  isLoading: boolean;
  onInvestigate: (modelDeploymentName: string, temperature?: number) => void;
  runId: string;
  caseId: string;
}

export function AiVerdictPanel({ investigation, isLoading, onInvestigate, runId, caseId }: Props) {
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].name);
  const currentModel = AVAILABLE_MODELS.find((m) => m.name === selectedModel) ?? AVAILABLE_MODELS[0];
  const [temperature, setTemperature] = useState(0.7);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [consensusResult, setConsensusResult] = useState<ConsensusResult | null>(null);
  const [loadingConsensus, setLoadingConsensus] = useState(false);

  const handleShowPrompt = async () => {
    if (showPrompt) { setShowPrompt(false); return; }
    setLoadingPrompt(true);
    try {
      const data = await getPromptPreview(runId, caseId);
      setPromptData(data);
      setShowPrompt(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleConsensus = async () => {
    setLoadingConsensus(true);
    setConsensusResult(null);
    try {
      const result = await consensusInvestigate(runId, caseId, temperature);
      setConsensusResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConsensus(false);
    }
  };

  return (
    <div className="panel">
      <h2>AI Investigation</h2>
      <p className="help">
        Send this case to the AI agent via Microsoft Foundry for a structured fraud assessment.
        The AI receives the expense details, employee profile, 90-day history, and peer comparison — but
        never the ground-truth labels. Choose a model below — costs vary significantly between tiers.
      </p>
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
        <p className="help">
          A typical investigation uses ~2K input + ~500 output tokens.
          Est. cost per call: {currentModel.tier === "economy" ? "~$0.004" : "~$0.013"}.
          Mini is ~70% cheaper than flagship models.
        </p>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Temperature: {temperature.toFixed(1)}</label>
        <span className="help">
          Controls creativity. 0.0 = deterministic, 1.0 = creative, 1.5+ = very creative.
          Higher values may produce more nuanced reasoning but less consistent results.
        </span>
        <input type="range" min={0} max={2} step={0.1} value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button className="secondary" style={{ fontSize: "0.75rem" }} onClick={handleShowPrompt}>
          {loadingPrompt ? "Loading…" : showPrompt ? "Hide prompt" : "Preview AI prompt"}
        </button>
        <button className="secondary" style={{ fontSize: "0.75rem" }} onClick={handleConsensus} disabled={loadingConsensus}>
          {loadingConsensus ? "Running all models…" : "Consensus (all 3 models)"}
        </button>
      </div>
      <p className="help">
        <strong>Note:</strong> The AI does NOT receive the ML confidence score or band — it reasons
        independently from raw expense data, feature z-scores, employee profile, and peer comparison.
      </p>
      {consensusResult && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 8px" }}>
            Consensus: <span className={`badge badge-${consensusResult.consensusVerdict === "Likely" ? "high" : consensusResult.consensusVerdict === "Unlikely" ? "low" : "medium"}`}>
              {consensusResult.consensusVerdict}
            </span>
            <span className="muted" style={{ marginLeft: 8 }}>
              ({consensusResult.succeededCount}/{consensusResult.modelCount} models responded)
            </span>
          </h2>
          {consensusResult.models.map((m) => (
            <div key={m.model} style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
              <p style={{ margin: "0 0 4px" }}>
                <strong>{m.model}</strong>:{" "}
                {m.status === "Succeeded" ? (
                  <span className={`badge badge-${m.verdict === "Likely" ? "high" : m.verdict === "Unlikely" ? "low" : "medium"}`}>
                    {m.verdict}
                  </span>
                ) : (
                  <span className="badge badge-medium">Unavailable: {m.unavailableReason}</span>
                )}
              </p>
              {m.rationale && <p className="muted" style={{ fontSize: "0.8rem", margin: "4px 0" }}>{m.rationale}</p>}
              {m.keySignals && m.keySignals.length > 0 && (
                <ul className="signals" style={{ fontSize: "0.75rem" }}>
                  {m.keySignals.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {showPrompt && promptData && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12, maxHeight: 400, overflow: "auto", fontSize: "0.78rem" }}>
          <h2 style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>System instructions</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)", margin: "0 0 12px" }}>{promptData.systemPrompt}</pre>
          <h2 style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>Case prompt (sent to model)</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "var(--text)", margin: 0 }}>{promptData.userPrompt}</pre>
        </div>
      )}
      {!investigation && !isLoading && (
        <div>
          <p className="muted">No AI investigation has been run for this case yet.</p>
          <button onClick={() => onInvestigate(selectedModel, temperature)}>Investigate with AI</button>
          <p className="help" style={{ marginTop: 8 }}>Typically completes in 5–15 seconds. Timeout at 30 s.</p>
        </div>
      )}
      {isLoading && <p className="muted">Investigating… The AI agent is analyzing this case (≤30 s).</p>}
      {investigation?.status === "Unavailable" && (
        <div>
          <p>
            <span className="badge badge-medium">Unavailable</span> &nbsp;
            <span className="muted">{investigation.unavailableReason ?? "unknown reason"}</span>
          </p>
          <p className="help">
            The AI service was unreachable or timed out. The demo continues to work without it — this
            is the graceful degradation behavior. Check that Foundry__Endpoint is configured.
          </p>
          <button className="secondary" onClick={() => onInvestigate(selectedModel, temperature)}>Retry</button>
        </div>
      )}
      {investigation?.status === "Succeeded" && (
        <div>
          <p>
            <strong>Verdict:</strong>{" "}
            <span
              className={`badge ${
                investigation.verdict === "Likely"
                  ? "badge-high"
                  : investigation.verdict === "Unlikely"
                    ? "badge-low"
                    : "badge-medium"
              }`}
            >
              {investigation.verdict}
            </span>
            <span className="help" style={{ marginLeft: 8 }}>
              {investigation.verdict === "Likely"
                ? "The AI believes this is likely fraudulent."
                : investigation.verdict === "Unlikely"
                  ? "The AI found no strong fraud indicators."
                  : "The AI found mixed or weak signals — further review recommended."}
            </span>
          </p>
          <h2>Rationale</h2>
          <p className="help">The AI's reasoning for its verdict, based on the case data provided.</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{investigation.rationale}</p>
          <h2>Key signals</h2>
          <p className="help">Specific data points the AI identified as noteworthy.</p>
          <ul className="signals">
            {investigation.keySignals?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <p>
            <strong>Recommended action:</strong> {investigation.recommendedAction}
          </p>
          <button className="secondary" onClick={() => onInvestigate(selectedModel, temperature)}>
            Re-investigate
          </button>
          <span className="help" style={{ marginLeft: 8 }}>Send to AI again (you can pick a different model).</span>
        </div>
      )}
    </div>
  );
}
