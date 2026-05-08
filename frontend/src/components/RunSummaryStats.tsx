import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Run } from "../api/runsClient";

interface Props {
  run: Run;
}

interface ScatterPoint {
  amount: number;
  confidence: number;
  band: string;
  vendor: string;
  employee: string;
  recordId: string;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function RunSummaryStats({ run }: Props) {
  const stats = useMemo(() => {
    const expenses = run.expenses;
    const detMap = new Map(run.detectionResults.map((d) => [d.recordId, d]));
    const empMap = new Map(run.employees.map((e) => [e.employeeId, e]));

    // Date range
    const dates = expenses.map((e) => new Date(e.submittedUtc).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Distinct counts
    const distinctEmployees = new Set(expenses.map((e) => e.employeeId)).size;
    const distinctVendors = new Set(expenses.map((e) => e.vendor)).size;
    const distinctCategories = new Set(expenses.map((e) => e.category)).size;

    // Amounts
    const amounts = expenses.map((e) => e.amount);
    const avgAmount = mean(amounts);
    const medianAmount = median(amounts);

    // Per-employee stats
    const empTxns = new Map<string, number[]>();
    for (const e of expenses) {
      if (!empTxns.has(e.employeeId)) empTxns.set(e.employeeId, []);
      empTxns.get(e.employeeId)!.push(e.amount);
    }
    const txnCounts = [...empTxns.values()].map((arr) => arr.length);
    const avgTxnsPerEmployee = mean(txnCounts);
    const empMeans = [...empTxns.values()].map((arr) => mean(arr));
    const avgMeanPerEmployee = mean(empMeans);
    const medianMeanPerEmployee = median(empMeans);

    // Per-category stats
    const catAmounts = new Map<string, number[]>();
    for (const e of expenses) {
      if (!catAmounts.has(e.category)) catAmounts.set(e.category, []);
      catAmounts.get(e.category)!.push(e.amount);
    }
    const catStats = [...catAmounts.entries()].map(([cat, arr]) => ({
      category: cat,
      mean: mean(arr),
      median: median(arr),
      count: arr.length,
    })).sort((a, b) => b.count - a.count);

    // Per-vendor stats (top 5)
    const vendorAmounts = new Map<string, number[]>();
    for (const e of expenses) {
      if (!vendorAmounts.has(e.vendor)) vendorAmounts.set(e.vendor, []);
      vendorAmounts.get(e.vendor)!.push(e.amount);
    }
    const vendorStats = [...vendorAmounts.entries()].map(([vendor, arr]) => ({
      vendor,
      mean: mean(arr),
      median: median(arr),
      count: arr.length,
    })).sort((a, b) => b.count - a.count).slice(0, 8);

    // Scatter data
    const scatterData: ScatterPoint[] = expenses.map((e) => {
      const det = detMap.get(e.recordId);
      const emp = empMap.get(e.employeeId);
      return {
        amount: e.amount,
        confidence: det?.confidence ?? 0,
        band: det?.band ?? "Low",
        vendor: e.vendor,
        employee: emp?.name ?? e.employeeId,
        recordId: e.recordId,
      };
    });

    return {
      minDate, maxDate, distinctEmployees, distinctVendors, distinctCategories,
      totalRecords: expenses.length,
      avgAmount, medianAmount,
      avgTxnsPerEmployee, avgMeanPerEmployee, medianMeanPerEmployee,
      catStats, vendorStats, scatterData,
    };
  }, [run]);

  const bandColor = (band: string) => {
    switch (band) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      default: return "#22c55e";
    }
  };

  return (
    <>
      {/* Summary Stats Grid */}
      <div className="panel">
        <h2 style={{ margin: "0 0 12px" }}>Dataset Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <StatCard label="Records" value={stats.totalRecords.toLocaleString()} />
          <StatCard label="Date Range" value={`${stats.minDate.toLocaleDateString()} – ${stats.maxDate.toLocaleDateString()}`} small />
          <StatCard label="Employees" value={stats.distinctEmployees.toString()} />
          <StatCard label="Vendors" value={stats.distinctVendors.toString()} />
          <StatCard label="Categories" value={stats.distinctCategories.toString()} />
          <StatCard label="Avg Txns/Employee" value={stats.avgTxnsPerEmployee.toFixed(1)} />
          <StatCard label="Mean Amount" value={`$${stats.avgAmount.toFixed(2)}`} />
          <StatCard label="Median Amount" value={`$${stats.medianAmount.toFixed(2)}`} />
        </div>

        {/* Band counts inline */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem" }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>High: {run.bandCounts.high}</span>
          </span>
          <span style={{ fontSize: "0.8rem" }}>
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>Medium: {run.bandCounts.medium}</span>
          </span>
          <span style={{ fontSize: "0.8rem" }}>
            <span style={{ color: "#22c55e", fontWeight: 600 }}>Low: {run.bandCounts.low}</span>
          </span>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {run.bandCounts.high + run.bandCounts.medium} of {stats.totalRecords} flagged ({((run.bandCounts.high + run.bandCounts.medium) / stats.totalRecords * 100).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Scatter Plot */}
      <div className="panel">
        <h2 style={{ margin: "0 0 4px" }}>Anomaly Scatter Plot</h2>
        <p className="help">
          Each dot is an expense record. X-axis = dollar amount, Y-axis = ML anomaly confidence score.
          Color indicates band: <span style={{ color: "#ef4444" }}>High</span>,{" "}
          <span style={{ color: "#f59e0b" }}>Medium</span>,{" "}
          <span style={{ color: "#22c55e" }}>Low</span>.
          Anomalies cluster in the upper region.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              type="number"
              dataKey="amount"
              name="Amount"
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}`}
            />
            <YAxis
              type="number"
              dataKey="confidence"
              name="Confidence"
              domain={[0, 1]}
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text)",
                fontSize: "0.8rem",
              }}
              formatter={(_value: unknown, name: string, props: { payload?: ScatterPoint }) => {
                const p = props.payload;
                if (!p) return [String(_value), name];
                if (name === "Amount") return [`$${p.amount.toFixed(2)}`, name];
                if (name === "Confidence") return [p.confidence.toFixed(4), name];
                return [String(_value), name];
              }}
              labelFormatter={(_label: unknown, payload: Array<{ payload?: ScatterPoint }>) => {
                const p = payload?.[0]?.payload;
                return p ? `${p.employee} · ${p.vendor} (${p.band})` : "";
              }}
            />
            <Scatter data={stats.scatterData} isAnimationActive={false}>
              {stats.scatterData.map((point, i) => (
                <Cell key={i} fill={bandColor(point.band)} fillOpacity={0.6} r={2.5} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Per-category and per-vendor breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="panel">
          <h2 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>By Category</h2>
          <table className="feature-table">
            <thead><tr><th>Category</th><th>Count</th><th>Mean</th><th>Median</th></tr></thead>
            <tbody>
              {stats.catStats.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.count}</td>
                  <td>${c.mean.toFixed(2)}</td>
                  <td>${c.median.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Top Vendors</h2>
          <table className="feature-table">
            <thead><tr><th>Vendor</th><th>Count</th><th>Mean</th><th>Median</th></tr></thead>
            <tbody>
              {stats.vendorStats.map((v) => (
                <tr key={v.vendor}>
                  <td>{v.vendor}</td>
                  <td>{v.count}</td>
                  <td>${v.mean.toFixed(2)}</td>
                  <td>${v.median.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{
      background: "var(--bg)",
      borderRadius: 6,
      padding: "8px 12px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: small ? "0.75rem" : "1.1rem", fontWeight: 600, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
