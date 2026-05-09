import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getCase, getRun, investigateCase, trackActivity, FEATURE_EXPLANATIONS } from "../api/runsClient";
import { AiVerdictPanel } from "../components/AiVerdictPanel";

export function CaseDetailRoute() {
  const { runId, caseId } = useParams<{ runId: string; caseId: string }>();
  const qc = useQueryClient();

  const caseQuery = useQuery({
    queryKey: ["case", runId, caseId],
    queryFn: () => getCase(runId!, caseId!),
    enabled: !!runId && !!caseId,
  });

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  });

  const investigateMutation = useMutation({
    mutationFn: ({ model, temperature, allowConfidenceScores }: { model: string; temperature?: number; allowConfidenceScores?: boolean }) =>
      investigateCase(runId!, caseId!, model, temperature, allowConfidenceScores),
    onSuccess: () => {
      trackActivity("ai-investigation");
      qc.invalidateQueries({ queryKey: ["case", runId, caseId] });
      qc.invalidateQueries({ queryKey: ["run", runId] });
    },
  });

  const employeeHistory = useMemo(() => {
    if (!runQuery.data || !caseQuery.data) return null;
    const empId = caseQuery.data.employee.employeeId;
    const detMap = new Map(runQuery.data.detectionResults.map((d) => [d.recordId, d]));
    return runQuery.data.expenses
      .filter((e) => e.employeeId === empId)
      .map((e) => ({ expense: e, detection: detMap.get(e.recordId)! }))
      .sort((a, b) => new Date(b.expense.submittedUtc).getTime() - new Date(a.expense.submittedUtc).getTime());
  }, [runQuery.data, caseQuery.data]);

  if (caseQuery.isLoading) return <div className="main">Loading case…</div>;
  if (caseQuery.error) return <div className="main error">{(caseQuery.error as Error).message}</div>;
  if (!caseQuery.data) return null;

  const c = caseQuery.data;
  const det = c.detection;

  const dayOfWeek = new Date(c.expense.submittedUtc).toLocaleDateString(undefined, { weekday: "long" });
  const isWeekend = ["Saturday", "Sunday"].includes(dayOfWeek);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Back link */}
      <Link to={`/labs/expenses/${runId}`} style={{ fontSize: "0.85rem", marginBottom: 16, display: "inline-block" }}>&larr; Back to run</Link>

      {/* Expense header banner */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>
              ${c.expense.amount.toFixed(2)}
              <span className={`badge badge-${det.band.toLowerCase()}`} style={{ marginLeft: 12, fontSize: "0.7rem", verticalAlign: "middle" }}>
                {det.band} Risk
              </span>
            </h1>
            {c.expense.isInjectedFraud && (
              <p style={{ color: "#f87171", fontSize: "0.78rem", margin: "4px 0 0" }}>
                Ground truth: injected fraud ({c.expense.injectedPattern})
              </p>
            )}
          </div>
          <a
            href="#ai-investigation"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "var(--btn-primary)",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            🤖 Run AI Investigation
          </a>
        </div>

        {/* Expense dimensions */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginTop: 16,
          padding: "16px 0 0",
          borderTop: "1px solid var(--border)",
        }}>
          <div>
            <div className="help" style={{ margin: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.expense.category}</div>
          </div>
          <div>
            <div className="help" style={{ margin: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vendor</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.expense.vendor}</div>
          </div>
          <div>
            <div className="help" style={{ margin: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Submitted</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              {new Date(c.expense.submittedUtc).toLocaleDateString()}
              {isWeekend && <span style={{ color: "var(--band-medium)", marginLeft: 6, fontSize: "0.75rem" }}>⚠ Weekend</span>}
            </div>
          </div>
          <div>
            <div className="help" style={{ margin: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employee</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.employee.name}</div>
            <div className="muted" style={{ fontSize: "0.75rem" }}>{c.employee.role} · {c.employee.department}</div>
          </div>
          <div>
            <div className="help" style={{ margin: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Baseline Spend</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>${c.employee.baselineMonthlyExpense.toFixed(0)}/mo</div>
          </div>
          <div>
            <div className="help" style={{ margin: 0, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>ML Score</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{det.confidence.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* ML Detection panel */}
      <div className="panel">
          <h1>
            ML Detection &nbsp;
            <span className={`badge badge-${det.band.toLowerCase()}`}>{det.band}</span>
          </h1>
          <p className="help">
            This score was computed by ML.NET's RandomizedPCA anomaly detector. It measures how
            statistically unusual this expense is compared to the rest of the dataset. The band
            thresholds (default: Low &lt; 0.55, Medium 0.55–0.85, High &gt; 0.85) determine the classification.
          </p>
          <p>
            <strong>Confidence score:</strong> {det.confidence.toFixed(4)}
            <span className="muted"> (0 = normal, 1 = highly anomalous)</span>
          </p>
          <div style={{ background: "var(--bg)", borderRadius: 4, padding: "4px 0", margin: "8px 0" }}>
            <div style={{
              width: `${Math.min(det.confidence * 100, 100)}%`,
              height: 8,
              borderRadius: 4,
              background: det.confidence >= 0.85 ? "var(--band-high)" : det.confidence >= 0.55 ? "var(--band-medium)" : "var(--band-low)",
            }} />
          </div>
          <h2>Contributing features</h2>
          <p className="help">
            Each feature captures a different fraud signal. The <strong>value</strong> is the raw
            measurement; the <strong>z-score</strong> shows how many standard deviations it is from the
            population mean. |z| &gt; 2.0 = top ~2% (highly anomalous), |z| &gt; 1.5 = notably unusual.
          </p>
          <table className="feature-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Value</th>
                <th>Z-score</th>
                <th style={{ width: 120 }}>Magnitude</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {det.contributingFeatures.map((f) => {
                const absZ = Math.abs(f.zScore);
                const info = FEATURE_EXPLANATIONS[f.name];
                const barWidth = Math.min(absZ / 4 * 100, 100);
                const barColor = absZ > 2 ? "var(--band-high)" : absZ > 1.5 ? "var(--band-medium)" : "var(--band-low)";
                const signalLevel = absZ > 2 ? "🔴 Anomalous" : absZ > 1.5 ? "🟡 Unusual" : "🟢 Normal";
                return (
                  <tr key={f.name} title={info?.description ?? ""}>
                    <td>
                      <strong>{info?.label ?? f.name}</strong>
                      <div className="help" style={{ margin: 0 }}>{info?.description ?? ""}</div>
                    </td>
                    <td>{f.value.toFixed(3)}</td>
                    <td style={{ fontWeight: absZ > 1.5 ? 600 : 400, color: absZ > 2 ? "var(--band-high)" : undefined }}>
                      {f.zScore >= 0 ? "+" : ""}{f.zScore.toFixed(3)}
                    </td>
                    <td>
                      <div style={{ background: "var(--bg)", borderRadius: 3, height: 10 }}>
                        <div style={{ width: `${barWidth}%`, height: 10, borderRadius: 3, background: barColor, transition: "width 0.3s" }} />
                      </div>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{signalLevel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {det.contributingFeatures.some(f => Math.abs(f.zScore) > 2) && (
            <p className="help" style={{ color: "var(--band-high)", marginTop: 8 }}>
              ⚠ One or more features are highly anomalous (|z| &gt; 2.0) — this case warrants investigation.
            </p>
          )}
        </div>
        <div id="ai-investigation">
          <AiVerdictPanel
            investigation={c.investigation ?? null}
            isLoading={investigateMutation.isPending}
            onInvestigate={(model, temperature, allowConfidenceScores) => investigateMutation.mutate({ model, temperature, allowConfidenceScores })}
            runId={runId!}
            caseId={caseId!}
          />
        </div>
        {investigateMutation.error && (
          <p className="error">{(investigateMutation.error as Error).message}</p>
        )}
        {employeeHistory && employeeHistory.length > 1 && (
          <div className="panel">
            <h2>Other expenses by {c.employee.name}</h2>
            <p className="help">
              All {employeeHistory.length} expenses submitted by this employee in the dataset.
              The current case is highlighted. Look for patterns — clustering near $1,000,
              unusual vendors, or weekend submissions.
            </p>
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Band</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {employeeHistory.map(({ expense: e, detection: d }) => (
                  <tr
                    key={e.recordId}
                    style={e.recordId === caseId ? { background: "var(--bg-hover)", fontWeight: 600 } : undefined}
                  >
                    <td>{new Date(e.submittedUtc).toLocaleDateString()}</td>
                    <td>${e.amount.toFixed(2)}</td>
                    <td>{e.category}</td>
                    <td>{e.vendor}</td>
                    <td><span className={`band-${d.band.toLowerCase()}`}>{d.band}</span></td>
                    <td>{d.confidence.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="help" style={{ marginTop: 8 }}>
              Total: ${employeeHistory.reduce((s, h) => s + h.expense.amount, 0).toFixed(2)} across{" "}
              {employeeHistory.length} expenses ·{" "}
              {new Set(employeeHistory.map((h) => h.expense.vendor)).size} distinct vendors ·{" "}
              {employeeHistory.filter((h) => h.detection.band !== "Low").length} flagged
            </p>
          </div>
        )}
    </div>
  );
}
