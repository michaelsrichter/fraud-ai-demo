import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { BandCounts } from "../api/runsClient";

interface Props {
  counts: BandCounts;
}

export function BandChart({ counts }: Props) {
  const data = [
    { band: "High", value: counts.high, fill: "#ef4444" },
    { band: "Medium", value: counts.medium, fill: "#f59e0b" },
    { band: "Low", value: counts.low, fill: "#22c55e" },
  ];
  const total = counts.high + counts.medium + counts.low;
  if (total === 0) {
    return <div className="muted">No detection data yet — generate a run to populate this chart.</div>;
  }
  return (
    <div>
      <p className="help">
        Each expense record is scored by ML.NET anomaly detection and placed into a confidence band.{" "}
        <strong style={{ color: "#ef4444" }}>High</strong> = strong fraud signal,{" "}
        <strong style={{ color: "#f59e0b" }}>Medium</strong> = ambiguous — good candidates for AI investigation,{" "}
        <strong style={{ color: "#22c55e" }}>Low</strong> = likely legitimate.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="band" stroke="var(--text-muted)" />
          <YAxis stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, _name: string, props: { payload: { band: string } }) => {
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
              return [`${value} records (${pct}%)`, props.payload.band];
            }}
          />
          <Bar dataKey="value">
            {data.map((entry) => (
              <Cell key={entry.band} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="help" style={{ textAlign: "center" }}>
        {counts.high + counts.medium} of {total} records flagged ({((counts.high + counts.medium) / total * 100).toFixed(1)}%)
      </p>
    </div>
  );
}
