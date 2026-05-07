import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getCase, getRun, investigateCase } from "../api/runsClient";
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
    mutationFn: (modelDeploymentName: string) => investigateCase(runId!, caseId!, modelDeploymentName),
    onSuccess: () => {
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

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to={`/runs/${runId}`}>&larr; Back to run</Link>
        <h2>Expense details</h2>
        <p className="help">The individual expense claim under review.</p>
        <p>
          <strong>${c.expense.amount.toFixed(2)}</strong> &middot; {c.expense.category}
        </p>
        <p className="muted">{c.expense.vendor}</p>
        <p className="muted">{new Date(c.expense.submittedUtc).toLocaleString()}</p>
        {c.expense.isInjectedFraud && (
          <p style={{ color: "#f87171", fontSize: "0.8rem" }}>Ground truth: injected fraud ({c.expense.injectedPattern})</p>
        )}
        <h2>Employee profile</h2>
        <p className="help">The synthetic employee who submitted this expense.</p>
        <p>
          <strong>{c.employee.name}</strong>
        </p>
        <p className="muted">
          {c.employee.role} · {c.employee.department}
        </p>
        <p className="muted" title="Average monthly expense this employee generates in the simulation">
          Baseline spend: ${c.employee.baselineMonthlyExpense.toFixed(0)} / month
        </p>
      </aside>
      <main className="main">
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
          <h2>Top contributing features</h2>
          <p className="help">
            The features that pushed this record's anomaly score up or down.
            Higher |z-score| means more deviation from the norm.
          </p>
          <table className="feature-table">
            <thead>
              <tr>
                <th title="Feature name from the 6-dimensional fraud signal vector">Name</th>
                <th title="Raw feature value for this record">Value</th>
                <th title="Standard deviations from the population mean — large values flag outliers">Z-score</th>
              </tr>
            </thead>
            <tbody>
              {det.contributingFeatures.map((f) => (
                <tr key={f.name}>
                  <td>{f.name}</td>
                  <td>{f.value.toFixed(3)}</td>
                  <td>{f.zScore.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AiVerdictPanel
          investigation={c.investigation ?? null}
          isLoading={investigateMutation.isPending}
          onInvestigate={(model) => investigateMutation.mutate(model)}
        />
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
      </main>
    </div>
  );
}
