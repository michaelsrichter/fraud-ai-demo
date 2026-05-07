import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createRun, deleteRun, listRuns, type SimulationConfiguration } from "../api/runsClient";
import { ConfigPanel } from "../components/ConfigPanel";

export function RunsRoute() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const runsQuery = useQuery({ queryKey: ["runs"], queryFn: () => listRuns(20) });

  const createMutation = useMutation({
    mutationFn: (config: SimulationConfiguration) => createRun(config),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      navigate(`/runs/${run.runId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (runId: string) => deleteRun(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Fraud Demo</h1>
        <a href="/how-it-works" style={{ fontSize: "0.8rem" }}>How it works &rarr;</a>
        <ConfigPanel onGenerate={(c) => createMutation.mutate(c)} isGenerating={createMutation.isPending} />
        {createMutation.error && <p className="error">{(createMutation.error as Error).message}</p>}
        <h2>Prior runs</h2>
        <p className="help">Click a run to re-open it. Compare band distributions across different configurations.</p>
        {runsQuery.isLoading && <p className="muted">Loading…</p>}
        {runsQuery.data?.items.map((r) => (
          <div key={r.runId} className="run-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div onClick={() => navigate(`/runs/${r.runId}`)} style={{ flex: 1, cursor: "pointer" }}>
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
      </aside>
      <main className="main">
        <div className="panel">
          <h2>AI-Powered Expense Fraud Detection Demo</h2>
          <p className="muted">
            This demo contrasts <strong>deterministic ML detection</strong> with <strong>AI-powered investigation</strong> on
            synthetic expense data. Here's how to use it:
          </p>
          <ol className="muted" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Configure</strong> — Use the sidebar to set how many expense records to generate, how much
            fraud to inject (intensity), and which fraud patterns to emphasize.</li>
            <li><strong>Generate</strong> — Click Generate to create a synthetic dataset. The backend synthesizes
            employee profiles and expense records, injects fraud at the configured rate, then scores every
            record with ML.NET's RandomizedPCA anomaly detector.</li>
            <li><strong>Review bands</strong> — Records are bucketed into <span style={{color:"#ef4444"}}>High</span>,{" "}
            <span style={{color:"#f59e0b"}}>Medium</span>, and <span style={{color:"#22c55e"}}>Low</span> confidence
            bands. Higher intensity → more records in the High band.</li>
            <li><strong>Drill into cases</strong> — Click any row to see the expense details, the employee profile,
            and which features (amount z-score, vendor rarity, weekend submission, etc.) drove the anomaly score.</li>
            <li><strong>AI investigation</strong> — From any case, click "Investigate with AI" and choose a model
            (gpt-4.1, o3, or o4-mini) from the dropdown — all deployed in Microsoft Foundry.</li>
          </ol>
          <p className="muted">
            Try the <strong>Low</strong> preset first, then switch to <strong>High — Vendor</strong> and compare how
            the band chart shifts. That's the demo's headline narrative.
          </p>
        </div>
      </main>
    </div>
  );
}
