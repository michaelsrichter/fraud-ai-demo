import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createRun, getRun, type SimulationConfiguration } from "../api/runsClient";
import { BandChart } from "../components/BandChart";
import { CaseList } from "../components/CaseList";
import { ConfigPanel } from "../components/ConfigPanel";

export function RunDetailRoute() {
  const { runId } = useParams<{ runId: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "High" | "Medium" | "Low">("all");

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  });

  const createMutation = useMutation({
    mutationFn: (config: SimulationConfiguration) => createRun(config),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      navigate(`/runs/${run.runId}`);
    },
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/runs">&larr; Back to runs</Link>
        <ConfigPanel
          initial={runQuery.data?.configuration}
          onGenerate={(c) => createMutation.mutate(c)}
          isGenerating={createMutation.isPending}
        />
      </aside>
      <main className="main">
        {runQuery.isLoading && <p>Loading run…</p>}
        {runQuery.error && <p className="error">{(runQuery.error as Error).message}</p>}
        {runQuery.data && (
          <>
            <div className="panel">
              <h1>Run {runQuery.data.runId.slice(0, 8)}</h1>
              <p className="muted">
                Created {new Date(runQuery.data.createdUtc).toLocaleString()} · {runQuery.data.expenses.length}{" "}
                records · intensity {runQuery.data.configuration.intensity.toFixed(2)}
              </p>
              <BandChart counts={runQuery.data.bandCounts} />
            </div>
            <div className="panel">
              <h2>Cases</h2>
              <p className="help">
                Filter by confidence band, then click a row to inspect the case. Medium-band cases are
                the best candidates for AI investigation — they have ambiguous signals.
              </p>
              <div style={{ marginBottom: 8 }}>
                {(["all", "High", "Medium", "Low"] as const).map((f) => (
                  <button
                    key={f}
                    className={f === filter ? "" : "secondary"}
                    style={{ marginRight: 4 }}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <CaseList
                run={runQuery.data}
                filter={filter}
                onSelect={(caseId) => navigate(`/runs/${runId}/cases/${caseId}`)}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
