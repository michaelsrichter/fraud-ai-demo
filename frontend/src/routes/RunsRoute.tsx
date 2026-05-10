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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 24px" }}>
      <div className="panel">
        <h2>AI-Powered Expense Fraud Detection</h2>
        <p className="muted" style={{ lineHeight: 1.8 }}>
          This demo contrasts <strong>deterministic ML detection</strong> with <strong>AI-powered investigation</strong> on
          synthetic expense data. Configure the dataset, fraud patterns, and scoring models below, then generate a run.
        </p>
      </div>

      <ConfigPanel onGenerate={(c) => createMutation.mutate(c)} isGenerating={createMutation.isPending} />
      {createMutation.error && <p className="error" style={{ margin: "8px 0" }}>{(createMutation.error as Error).message}</p>}

      {/* Prior runs */}
      {runsQuery.data && runsQuery.data.items.length > 0 && (
        <div id="prior-runs" className="panel" style={{ marginTop: 16 }}>
          <h2 style={{ margin: "0 0 6px" }}>Prior Runs</h2>
          <p className="help">Click a run to re-open it.</p>
          {runsQuery.data.items.map((r) => (
            <div key={r.runId} className="run-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div onClick={() => navigate(`/labs/expenses/${r.runId}`)} style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ fontSize: "0.85rem" }}>{new Date(r.createdUtc).toLocaleString()}</div>
                <div className="muted" style={{ fontSize: "0.75rem" }}>
                  {r.recordCount} records · H{r.bandCounts.high} / M{r.bandCounts.medium} / L{r.bandCounts.low}
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
        </div>
      )}
      {runsQuery.isLoading && <p className="muted" style={{ padding: 16 }}>Loading…</p>}
    </div>
  );
}
