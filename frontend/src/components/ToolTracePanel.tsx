import { useState } from "react";
import type { ToolInvocation } from "../api/runsClient";

interface Props {
  trace: ToolInvocation[] | null | undefined;
}

export function ToolTracePanel({ trace }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!trace || trace.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
          Agent Reasoning Trace
        </span>
        <span className="badge badge-low" style={{ fontSize: "0.6rem" }}>
          {trace.length} tool call{trace.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isOpen ? "▾" : "▸"}</span>
      </div>
      {isOpen && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {trace.map((inv, i) => (
            <ToolInvocationCard key={i} invocation={inv} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolInvocationCard({ invocation, index }: { invocation: ToolInvocation; index: number }) {
  const [showParams, setShowParams] = useState(false);
  const [showFullOutput, setShowFullOutput] = useState(false);

  const isCodeInterpreter = invocation.toolName.includes("code_interpreter") || invocation.toolName.includes("python");
  const icon = isCodeInterpreter ? "🐍" : "🔍";

  // Try to extract Python code from parameters for Code Interpreter
  let pythonCode: string | null = null;
  if (isCodeInterpreter) {
    try {
      const params = JSON.parse(invocation.parameters);
      pythonCode = params.code || params.input || null;
    } catch { /* ignore */ }
  }

  const responseData = invocation.responseData ?? "";
  const isLongOutput = responseData.length > 500;

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${invocation.succeeded ? "var(--border)" : "var(--band-high)"}`,
      borderRadius: 6,
      padding: 10,
      fontSize: "0.78rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>{icon}</span>
          <strong>Step {index + 1}: {invocation.toolName}</strong>
          {!invocation.succeeded && <span className="badge badge-high" style={{ fontSize: "0.55rem" }}>Failed</span>}
        </div>
        <span className="muted" style={{ fontSize: "0.7rem" }}>{invocation.latencyMs}ms</span>
      </div>

      {/* Response summary — always visible */}
      <p style={{ margin: "2px 0 4px", color: "var(--text-muted)" }}>{invocation.responseSummary}</p>

      {/* Parameters — collapsible */}
      <div>
        <span
          style={{ fontSize: "0.7rem", color: "var(--link)", cursor: "pointer" }}
          onClick={() => setShowParams(!showParams)}
        >
          {showParams ? "Hide parameters" : "Show parameters"}
        </span>
        {showParams && (
          <pre style={{
            background: "var(--bg)",
            borderRadius: 4,
            padding: 6,
            marginTop: 4,
            fontSize: "0.7rem",
            whiteSpace: "pre-wrap",
            color: "var(--text-muted)",
            maxHeight: 150,
            overflow: "auto",
          }}>
            {formatJson(invocation.parameters)}
          </pre>
        )}
      </div>

      {/* Code Interpreter: Python code block */}
      {pythonCode && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>Python code:</span>
          <pre style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            borderRadius: 4,
            padding: 8,
            marginTop: 4,
            fontSize: "0.7rem",
            whiteSpace: "pre-wrap",
            maxHeight: 200,
            overflow: "auto",
          }}>
            {pythonCode}
          </pre>
        </div>
      )}

      {/* Response data — truncated with show more */}
      {responseData && (
        <div style={{ marginTop: 4 }}>
          <pre style={{
            background: "var(--bg)",
            borderRadius: 4,
            padding: 6,
            fontSize: "0.7rem",
            whiteSpace: "pre-wrap",
            color: "var(--text-muted)",
            maxHeight: showFullOutput ? 400 : 80,
            overflow: "auto",
          }}>
            {showFullOutput ? responseData : responseData.slice(0, 500)}
            {isLongOutput && !showFullOutput && "…"}
          </pre>
          {isLongOutput && (
            <span
              style={{ fontSize: "0.65rem", color: "var(--link)", cursor: "pointer" }}
              onClick={() => setShowFullOutput(!showFullOutput)}
            >
              {showFullOutput ? "Show less" : `Show more (${responseData.length} chars)`}
            </span>
          )}
        </div>
      )}

      {/* Agent reasoning */}
      {invocation.reasoning && (
        <div style={{ marginTop: 4, fontStyle: "italic", color: "var(--text-help)", fontSize: "0.72rem" }}>
          {invocation.reasoning}
        </div>
      )}
    </div>
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
