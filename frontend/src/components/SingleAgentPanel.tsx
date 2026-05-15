import { useRef, useState, useEffect } from "react";
import type { AiInvestigationResult, AllPrompts, ToolInvocation } from "../api/runsClient";
import { AVAILABLE_MODELS, getPromptPreview, getAllPrompts, streamInvestigation } from "../api/runsClient";
import { ToolTracePanel } from "./ToolTracePanel";
import { InvestigationProgress } from "./InvestigationProgress";
import { PromptViewer } from "./PromptViewer";
import { CostEstimateNote } from "./CostEstimateNote";

interface Props {
  investigation: AiInvestigationResult | null | undefined;
  isLoading: boolean;
  onInvestigate: (modelDeploymentName: string, temperature?: number, allowConfidenceScores?: boolean) => void;
  runId: string;
  caseId: string;
}

export function SingleAgentPanel({ investigation, isLoading, onInvestigate, runId, caseId }: Props) {
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].name);
  const currentModel = AVAILABLE_MODELS.find((m) => m.name === selectedModel) ?? AVAILABLE_MODELS[0];
  const [temperature, setTemperature] = useState(0.7);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [allowConfidenceScores, setAllowConfidenceScores] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingTrace, setStreamingTrace] = useState<ToolInvocation[]>([]);
  const [streamResult, setStreamResult] = useState<AiInvestigationResult | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [prompts, setPrompts] = useState<AllPrompts | null>(null);

  useEffect(() => { getAllPrompts().then(setPrompts).catch(console.error); }, []);

  const handleStreamInvestigate = () => {
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
        onInvestigate(selectedModel, temperature, allowConfidenceScores);
      },
      (err) => {
        setStreamError(err.message);
        setIsStreaming(false);
        onInvestigate(selectedModel, temperature, allowConfidenceScores);
      },
      controller.signal,
    );
  };

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

  return (
    <>
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

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {!displayInvestigation && !isLoading && !isStreaming && (
          <button onClick={handleStreamInvestigate}>Investigate with AI</button>
        )}
        {displayInvestigation?.status === "Succeeded" && !isStreaming && (
          <button className="secondary" onClick={handleStreamInvestigate}>Re-investigate</button>
        )}
        {displayInvestigation?.status === "Unavailable" && !isStreaming && (
          <button className="secondary" onClick={handleStreamInvestigate}>Retry</button>
        )}
        <button className="secondary" style={{ fontSize: "0.8rem" }} onClick={handleShowPrompt}>
          {loadingPrompt ? "Loading…" : showPrompt ? "Hide prompt" : "Preview AI prompt"}
        </button>
      </div>

      {(isLoading || isStreaming) && (
        <>
          <InvestigationProgress mode="single" toolCallCount={streamingTrace.length} />
          {streamingTrace.length > 0 && (
            <ToolTracePanel trace={streamingTrace} isStreaming={isStreaming} />
          )}
        </>
      )}

      {streamError && !isStreaming && (
        <p className="help" style={{ color: "var(--band-high)", marginBottom: 8 }}>
          Streaming failed: {streamError}. Falling back to standard request.
        </p>
      )}

      {displayInvestigation?.status === "Unavailable" && !isStreaming && (
        <div style={{ marginBottom: 12 }}>
          <p>
            <span className="badge badge-medium">Unavailable</span>{" "}
            <span className="muted">{displayInvestigation.unavailableReason ?? "unknown reason"}</span>
          </p>
          <CostEstimateNote estimate={displayInvestigation.costEstimate} />
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
          <CostEstimateNote estimate={displayInvestigation.costEstimate} />
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

      {showPrompt && promptData && (
        <div style={{ background: "var(--bg)", borderRadius: 6, padding: 12, maxHeight: 400, overflow: "auto", fontSize: "0.78rem" }}>
          <h3 style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>System instructions</h3>
          <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)", margin: "0 0 12px" }}>{promptData.systemPrompt}</pre>
          <h3 style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>Case prompt (sent to model)</h3>
          <pre style={{ whiteSpace: "pre-wrap", color: "var(--text)", margin: 0 }}>{promptData.userPrompt}</pre>
        </div>
      )}

      {prompts && (
        <PromptViewer sections={[
          { label: "System Instructions", content: prompts.baseSystemPrompt },
        ]} />
      )}
    </>
  );
}
