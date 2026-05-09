import { useRef, useState } from "react";
import type { AiInvestigationResult, ConsensusResult, ToolInvocation } from "../api/runsClient";
import { AVAILABLE_MODELS, getPromptPreview, consensusInvestigate, streamInvestigation } from "../api/runsClient";
import { ToolTracePanel } from "./ToolTracePanel";
import { InvestigationProgress } from "./InvestigationProgress";

interface Props {
  investigation: AiInvestigationResult | null | undefined;
  isLoading: boolean;
  onInvestigate: (modelDeploymentName: string, temperature?: number, allowConfidenceScores?: boolean) => void;
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
  const [allowConfidenceScores, setAllowConfidenceScores] = useState(false);

  // Streaming state (FR-017, FR-018)
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingTrace, setStreamingTrace] = useState<ToolInvocation[]>([]);
  const [streamResult, setStreamResult] = useState<AiInvestigationResult | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleStreamInvestigate = () => {
    // Cancel any in-progress stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setStreamingTrace([]);
    setStreamResult(null);
    setStreamError(null);

    streamInvestigation(
      runId,
      caseId,
      { modelDeploymentName: selectedModel, temperature, allowConfidenceScores },
      (inv) => setStreamingTrace((prev) => [...prev, inv]),
      (result) => {
        setStreamResult(result);
        setIsStreaming(false);
        // Also trigger the parent's cache invalidation via the original callback path
        onInvestigate(selectedModel, temperature, allowConfidenceScores);
      },
      (err) => {
        setStreamError(err.message);
        setIsStreaming(false);
        // Fallback: trigger non-streaming investigation
        onInvestigate(selectedModel, temperature, allowConfidenceScores);
      },
      controller.signal,
    );
  };

  // Use streaming result if available, otherwise fall back to parent's investigation prop
  const displayInvestigation = streamResult ?? investigation;

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
      const result = await consensusInvestigate(runId, caseId, temperature, allowConfidenceScores);
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
        <span className="help">
          Controls creativity. 0.0 = deterministic, 1.0 = creative. Higher = more nuanced but less consistent.
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
        <span className="help">
          {allowConfidenceScores
            ? "⚠ The AI agent will see ML confidence scores, bands, and feature z-scores when querying expense data. This gives the AI hints about which records the ML model found suspicious."
            : "The AI agent will NOT see ML confidence scores or bands — it must reason independently from raw expense data only."}
        </span>
      </div>

      {/* Action buttons — grouped together */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {!displayInvestigation && !isLoading && !isStreaming && (
          <button onClick={handleStreamInvestigate}>Investigate with AI</button>
        )}
        {displayInvestigation?.status === "Succeeded" && !isStreaming && (
          <button className="secondary" onClick={handleStreamInvestigate}>
            Re-investigate
          </button>
        )}
        {displayInvestigation?.status === "Unavailable" && !isStreaming && (
          <button className="secondary" onClick={handleStreamInvestigate}>Retry</button>
        )}
        <button
          className="secondary"
          style={{ fontSize: "0.8rem" }}
          onClick={handleConsensus}
          disabled={loadingConsensus}
        >
          {loadingConsensus ? "Running all 3 models…" : "Consensus (all 3 models)"}
        </button>
        <button
          className="secondary"
          style={{ fontSize: "0.8rem" }}
          onClick={handleShowPrompt}
        >
          {loadingPrompt ? "Loading…" : showPrompt ? "Hide prompt" : "Preview AI prompt"}
        </button>
      </div>

      <p className="help" style={{ marginBottom: 12 }}>
        <strong>Note:</strong> The AI does NOT receive the ML confidence score or band — it reasons
        independently from raw expense data, feature z-scores, employee profile, and peer comparison.
      </p>

      {(isLoading || isStreaming) && (
        <>
          <InvestigationProgress mode="single" toolCallCount={streamingTrace.length} />
          {streamingTrace.length > 0 && (
            <ToolTracePanel trace={streamingTrace} isStreaming={isStreaming} />
          )}
        </>
      )}

      {/* Streaming error */}
      {streamError && !isStreaming && (
        <p className="help" style={{ color: "var(--band-high)", marginBottom: 8 }}>
          Streaming failed: {streamError}. Falling back to standard request.
        </p>
      )}

      {/* Single model result */}
      {displayInvestigation?.status === "Unavailable" && !isStreaming && (
        <div style={{ marginBottom: 12 }}>
          <p>
            <span className="badge badge-medium">Unavailable</span>{" "}
            <span className="muted">{displayInvestigation.unavailableReason ?? "unknown reason"}</span>
          </p>
          <p className="help">
            The AI service was unreachable or timed out. Check that Foundry__Endpoint is configured.
          </p>
        </div>
      )}

      {displayInvestigation?.status === "Succeeded" && !isStreaming && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 8px" }}>
            Single Model Result:{" "}
            <span
              className={`badge ${
                displayInvestigation.verdict === "Likely" ? "badge-high"
                : displayInvestigation.verdict === "Unlikely" ? "badge-low" : "badge-medium"
              }`}
            >
              {displayInvestigation.verdict}
            </span>
          </h3>
          <p style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", margin: "0 0 8px" }}>{displayInvestigation.rationale}</p>
          <h4 style={{ fontSize: "0.85rem", margin: "8px 0 4px" }}>Key signals</h4>
          <ul className="signals" style={{ fontSize: "0.8rem" }}>
            {displayInvestigation.keySignals?.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <p style={{ fontSize: "0.85rem" }}>
            <strong>Recommended action:</strong> {displayInvestigation.recommendedAction}
          </p>
          <ToolTracePanel trace={displayInvestigation.toolTrace} />
        </div>
      )}

      {/* Consensus loading state */}
      {loadingConsensus && <InvestigationProgress mode="consensus" />}

      {/* Consensus results — side by side */}
      {consensusResult && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 12px" }}>
            Model Responses
            <span className="muted" style={{ marginLeft: 8, fontSize: "0.8rem", fontWeight: 400 }}>
              ({consensusResult.succeededCount}/{consensusResult.modelCount} responded)
            </span>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
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

          {/* Arbiter analysis */}
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

      {/* Prompt preview */}
      {showPrompt && promptData && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, maxHeight: 400, overflow: "auto", fontSize: "0.78rem" }}>
          <h3 style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>System instructions</h3>
          <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)", margin: "0 0 12px" }}>{promptData.systemPrompt}</pre>
          <h3 style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>Case prompt (sent to model)</h3>
          <pre style={{ whiteSpace: "pre-wrap", color: "var(--text)", margin: 0 }}>{promptData.userPrompt}</pre>
        </div>
      )}
    </div>
  );
}
