import { useState, useEffect } from "react";

interface Props {
  /** Which mode is running */
  mode: "single" | "consensus";
  /** Number of tool calls received via streaming (optional) */
  toolCallCount?: number;
}

const STAGES = [
  { label: "Connecting to AI agent", minSec: 0 },
  { label: "Loading Foundry Toolbox", minSec: 2 },
  { label: "Agent querying expense data", minSec: 5 },
  { label: "Agent analyzing patterns", minSec: 10 },
  { label: "Running code interpreter", minSec: 20 },
  { label: "Agent forming verdict", minSec: 40 },
  { label: "Finalizing investigation", minSec: 60 },
];

export function InvestigationProgress({ mode, toolCallCount }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const currentStage = [...STAGES].reverse().find((s) => elapsed >= s.minSec) ?? STAGES[0];
  const progressPct = Math.min((elapsed / 120) * 100, 95);

  return (
    <div style={{
      background: "var(--bg)",
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="progress-pulse" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {mode === "consensus" ? "Running 3 models + arbiter" : "AI Agent Investigating"}
          </span>
        </div>
        <span className="muted" style={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" }}>
          {elapsed}s elapsed
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: "var(--border)",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 10,
      }}>
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "var(--btn-primary)",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Current stage */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
        {toolCallCount && toolCallCount > 0
          ? `🔍 ${toolCallCount} tool call${toolCallCount !== 1 ? "s" : ""} — ${currentStage.label}…`
          : `${currentStage.label}…`}
      </div>

      {/* Pipeline stages */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {STAGES.map((s, i) => {
          const done = elapsed >= (STAGES[i + 1]?.minSec ?? 999);
          const active = s === currentStage;
          return (
            <span
              key={i}
              style={{
                fontSize: "0.65rem",
                padding: "2px 6px",
                borderRadius: 3,
                background: done ? "var(--band-low)" : active ? "var(--btn-primary)" : "var(--bg-surface)",
                color: done || active ? "#fff" : "var(--text-muted)",
                opacity: elapsed < s.minSec ? 0.4 : 1,
                transition: "all 0.3s ease",
              }}
            >
              {done ? "✓ " : active ? "● " : ""}{s.label}
            </span>
          );
        })}
      </div>

      {elapsed > 60 && (
        <p className="muted" style={{ fontSize: "0.75rem", marginTop: 8 }}>
          The agent is using Code Interpreter for deep analysis — this takes extra time.
        </p>
      )}
    </div>
  );
}
