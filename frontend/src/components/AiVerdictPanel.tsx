import type { AiInvestigationResult } from "../api/runsClient";

interface Props {
  investigation: AiInvestigationResult | null | undefined;
  isLoading: boolean;
  onInvestigate: () => void;
}

export function AiVerdictPanel({ investigation, isLoading, onInvestigate }: Props) {
  return (
    <div className="panel">
      <h2>AI Investigation</h2>
      <p className="help">
        Send this case to the AI agent (GPT-4.1 via Microsoft Foundry) for a structured fraud assessment.
        The AI receives the expense details, employee profile, 90-day history, and peer comparison — but
        never the ground-truth labels. It returns a verdict, rationale, key signals, and recommended action.
      </p>
      {!investigation && !isLoading && (
        <div>
          <p className="muted">No AI investigation has been run for this case yet.</p>
          <button onClick={onInvestigate}>Investigate with AI</button>
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
          <button className="secondary" onClick={onInvestigate}>Retry</button>
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
          <button className="secondary" onClick={onInvestigate}>
            Re-investigate
          </button>
          <span className="help" style={{ marginLeft: 8 }}>Send to AI again for a fresh analysis.</span>
        </div>
      )}
    </div>
  );
}
