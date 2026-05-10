import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteRun, getRun, getModelDetectionResults } from "../api/runsClient";
import { RunSummaryStats } from "../components/RunSummaryStats";
import { CaseList } from "../components/CaseList";
import { HowItWorksPanel } from "../components/HowItWorksPanel";

export function RunDetailRoute() {
  const { runId } = useParams<{ runId: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "High" | "Medium" | "Low">("Medium");

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRun(runId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      navigate("/labs/expenses");
    },
  });

  const run = runQuery.data;
  const detectionResults = run ? getModelDetectionResults(run) : [];
  const bandCounts = run ? {
    high: detectionResults.filter(d => d.band === "High").length,
    medium: detectionResults.filter(d => d.band === "Medium").length,
    low: detectionResults.filter(d => d.band === "Low").length,
  } : null;
  const investigatedCount = run ? Object.keys(run.investigations ?? {}).length : 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 24px" }}>
      {/* Sub-header bar */}
      <div className="run-subheader">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link to="/labs/expenses" className="back-link">&larr; All Runs</Link>
          <span className="run-subheader-divider" />
          {run && (
            <>
              <span className="run-subheader-title">Run {run.runId.slice(0, 8)}</span>
              <span className="run-subheader-stat">{run.expenses.length.toLocaleString()} records</span>
              <span className="run-subheader-stat">intensity {run.configuration.intensity.toFixed(2)}</span>
              {bandCounts && (
                <>
                  <span className="run-subheader-badge badge-high">{bandCounts.high} High</span>
                  <span className="run-subheader-badge badge-medium">{bandCounts.medium} Medium</span>
                  <span className="run-subheader-badge badge-low">{bandCounts.low} Low</span>
                </>
              )}
              <span className="run-subheader-stat">{investigatedCount} investigated</span>
            </>
          )}
        </div>
        {run && (
          <button
            className="secondary"
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            onClick={() => { if (confirm("Delete this run?")) deleteMutation.mutate(); }}
          >
            Delete
          </button>
        )}
      </div>

      {runQuery.isLoading && <p style={{ padding: 24 }}>Loading run…</p>}
      {runQuery.error && <p className="error" style={{ padding: 24 }}>{(runQuery.error as Error).message}</p>}
      {run && (
        <>
          {/* CTA banner */}
          <a href="#cases-section" className="cta-banner" onClick={(e) => {
            e.preventDefault();
            setFilter("Medium");
            document.getElementById("cases-section")?.scrollIntoView({ behavior: "smooth" });
          }}>
            <div className="cta-banner-icon">🔍</div>
            <div>
              <strong>Investigate ambiguous cases</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", opacity: 0.85 }}>
                {bandCounts?.medium ?? 0} medium-confidence cases need AI investigation — the ML model was inconclusive.
                Click any case below to send it to the AI agent for a deeper analysis.
              </p>
            </div>
            <span className="cta-banner-arrow">↓</span>
          </a>

          <RunSummaryStats run={run} />
          <HowItWorksPanel labName="expenses" />

          <div className="panel" id="cases-section">
            <h2>Cases</h2>
            <p className="help">
              <strong>Medium-band</strong> cases have ambiguous ML signals — these are the best candidates
              for AI investigation. Click a row to inspect and investigate.
            </p>
            <div style={{ marginBottom: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(["all", "High", "Medium", "Low"] as const).map((f) => (
                <button
                  key={f}
                  className={f === filter ? "" : "secondary"}
                  style={{ marginRight: 0, position: "relative" }}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f === "Medium" && f !== filter && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--band-medium)",
                    }} />
                  )}
                </button>
              ))}
            </div>
            <CaseList
              run={run}
              filter={filter}
              onSelect={(caseId) => navigate(`/labs/expenses/${runId}/cases/${caseId}`)}
            />
          </div>
        </>
      )}
    </div>
  );
}
