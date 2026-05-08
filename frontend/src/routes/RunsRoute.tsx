import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createRun, deleteRun, listRuns, trackActivity, type SimulationConfiguration } from "../api/runsClient";
import { ConfigPanel } from "../components/ConfigPanel";

export function RunsRoute() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const runsQuery = useQuery({ queryKey: ["runs"], queryFn: () => listRuns(20) });

  const createMutation = useMutation({
    mutationFn: (config: SimulationConfiguration) => createRun(config),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      trackActivity("expense-run");
      navigate(`/labs/expenses/${run.runId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (runId: string) => deleteRun(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <ConfigPanel onGenerate={(c) => createMutation.mutate(c)} isGenerating={createMutation.isPending} />
        {createMutation.error && <p className="error">{(createMutation.error as Error).message}</p>}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <h2 style={{ margin: "0 0 6px" }}>Prior runs</h2>
          <p className="help">Click a run to re-open it.</p>
          {runsQuery.isLoading && <p className="muted">Loading…</p>}
          {runsQuery.data?.items.map((r) => (
          <div key={r.runId} className="run-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div onClick={() => navigate(`/labs/expenses/${r.runId}`)} style={{ flex: 1, cursor: "pointer" }}>
              <div style={{ fontSize: "0.8rem" }}>{new Date(r.createdUtc).toLocaleString()}</div>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                {r.recordCount} rec · H{r.bandCounts.high}/M{r.bandCounts.medium}/L{r.bandCounts.low}
              </div>
            </div>
            <button
              className="secondary"
              style={{ padding: "2px 6px", fontSize: "0.7rem", flexShrink: 0 }}
              title="Delete this run"
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.runId); }}
            >
              ✕
            </button>
          </div>
        ))}
        {runsQuery.data?.items.length === 0 && <p className="muted">No runs yet.</p>}
        </div>
      </aside>
      <main className="main">
        <div className="panel">
          <h2>AI-Powered Expense Fraud Detection</h2>
          <p className="muted" style={{ lineHeight: 1.8 }}>
            This demo contrasts <strong>deterministic ML detection</strong> with <strong>AI-powered investigation</strong> on
            synthetic expense data.
          </p>
          <ol className="muted" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Generate a run</strong> — Use the <strong>⚡ Generate New Run</strong> button in the sidebar. Pick a preset or customize the fraud configuration.</li>
            <li><strong>Review the results</strong> — Records are bucketed into <span style={{color:"#ef4444"}}>High</span>,{" "}
            <span style={{color:"#f59e0b"}}>Medium</span>, and <span style={{color:"#22c55e"}}>Low</span> confidence bands by the ML anomaly detector.</li>
            <li><strong>Investigate with AI</strong> — Medium-band cases have ambiguous signals. Click into any case and send it to the AI agent for a deeper investigation using tool-augmented reasoning.</li>
          </ol>
          {runsQuery.data?.items.length === 0 && (
            <p style={{ marginTop: 12, padding: "12px 16px", background: "var(--badge-medium-bg)", color: "var(--badge-medium-fg)", borderRadius: 8, fontSize: "0.9rem" }}>
              👈 <strong>Get started</strong> — Click <strong>⚡ Generate New Run</strong> in the sidebar to create your first dataset.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
