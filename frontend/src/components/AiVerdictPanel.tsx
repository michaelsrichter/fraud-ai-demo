import { useState } from "react";
import type { AiInvestigationResult } from "../api/runsClient";
import { AVAILABLE_MODELS } from "../api/runsClient";

interface Props {
  investigation: AiInvestigationResult | null | undefined;
  isLoading: boolean;
  onInvestigate: (modelDeploymentName: string) => void;
}

export function AiVerdictPanel({ investigation, isLoading, onInvestigate }: Props) {
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].name);
  const currentModel = AVAILABLE_MODELS.find((m) => m.name === selectedModel) ?? AVAILABLE_MODELS[0];

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
      {!investigation && !isLoading && (
        <div>
          <p className="muted">No AI investigation has been run for this case yet.</p>
          <button onClick={() => onInvestigate(selectedModel)}>Investigate with AI</button>
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
          <button className="secondary" onClick={() => onInvestigate(selectedModel)}>Retry</button>
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
          <button className="secondary" onClick={() => onInvestigate(selectedModel)}>
            Re-investigate
          </button>
          <span className="help" style={{ marginLeft: 8 }}>Send to AI again (you can pick a different model).</span>
        </div>
      )}
    </div>
  );
}
