import { useMemo } from "react";
import type { Run } from "../api/runsClient";

interface Props {
  run: Run;
  onSelect: (caseId: string) => void;
  filter?: "all" | "High" | "Medium" | "Low";
}

export function CaseList({ run, onSelect, filter = "all" }: Props) {
  const rows = useMemo(() => {
    const empMap = new Map(run.employees.map((e) => [e.employeeId, e]));
    const detMap = new Map(run.detectionResults.map((d) => [d.recordId, d]));
    return run.expenses
      .map((e) => {
        const det = detMap.get(e.recordId)!;
        const emp = empMap.get(e.employeeId)!;
        return { e, det, emp };
      })
      .filter(({ det }) => filter === "all" || det.band === filter)
      .sort((a, b) => b.det.confidence - a.det.confidence)
      .slice(0, 200);
  }, [run, filter]);

  if (rows.length === 0) {
    return <div className="muted">No cases match this filter.</div>;
  }

  return (
    <div>
      <p className="help">
        Click any row to drill into the case details, see the contributing detection features,
        and optionally request an AI investigation. Sorted by confidence score (highest first).
      </p>
      <div className="case-row" style={{ fontWeight: 600, color: "#94a3b8", cursor: "default" }}>
        <span title="Confidence band: High (likely fraud), Medium (ambiguous), Low (likely clean)">Band</span>
        <span title="ML.NET anomaly confidence score (0–1). Higher = more anomalous.">Score</span>
        <span title="Dollar amount of the expense claim">Amount</span>
        <span title="Vendor name and expense category">Vendor / Category</span>
        <span title="Employee who submitted the expense">Employee</span>
      </div>
      {rows.map(({ e, det, emp }) => (
        <div key={e.recordId} className="case-row" onClick={() => onSelect(e.recordId)}>
          <span className={`band-${det.band.toLowerCase()}`}>{det.band}</span>
          <span>{det.confidence.toFixed(3)}</span>
          <span>${e.amount.toFixed(2)}</span>
          <span>
            {e.vendor} <span className="muted">/ {e.category}</span>
          </span>
          <span>{emp.name.split(" ")[0]}</span>
        </div>
      ))}
      <div className="muted" style={{ marginTop: 8 }}>
        Showing top {rows.length} of {run.expenses.length}.
      </div>
    </div>
  );
}
