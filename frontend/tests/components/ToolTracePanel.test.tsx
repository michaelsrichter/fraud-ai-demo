import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolTracePanel } from "../../src/components/ToolTracePanel";
import type { ToolInvocation } from "../../src/api/runsClient";

describe("ToolTracePanel", () => {
  it("renders nothing when trace is null", () => {
    const { container } = render(<ToolTracePanel trace={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when trace is empty", () => {
    const { container } = render(<ToolTracePanel trace={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders trace header with tool count", () => {
    const trace: ToolInvocation[] = [
      { toolName: "query_expense_data", parameters: '{"vendor":"AcmeAir"}', responseSummary: "5 records returned", responseData: null, reasoning: null, latencyMs: 150, succeeded: true },
    ];
    render(<ToolTracePanel trace={trace} />);
    expect(screen.getByText("Agent Reasoning Trace")).toBeInTheDocument();
    expect(screen.getByText("1 tool call")).toBeInTheDocument();
  });

  it("renders plural tool count for multiple calls", () => {
    const trace: ToolInvocation[] = [
      { toolName: "query_expense_data", parameters: '{}', responseSummary: "5 records", responseData: null, reasoning: null, latencyMs: 100, succeeded: true },
      { toolName: "code_interpreter", parameters: '{"code":"print(42)"}', responseSummary: "Output: 42", responseData: "42", reasoning: "Used for analysis", latencyMs: 500, succeeded: true },
    ];
    render(<ToolTracePanel trace={trace} />);
    expect(screen.getByText("2 tool calls")).toBeInTheDocument();
  });

  it("shows pulsing indicator when isStreaming is true", () => {
    const trace: ToolInvocation[] = [
      { toolName: "query_expense_data", parameters: '{}', responseSummary: "3 records", responseData: null, reasoning: null, latencyMs: 80, succeeded: true },
    ];
    render(<ToolTracePanel trace={trace} isStreaming={true} />);
    expect(screen.getByText("Agent is reasoning…")).toBeInTheDocument();
  });

  it("auto-expands when streaming", () => {
    const trace: ToolInvocation[] = [
      { toolName: "query_expense_data", parameters: '{}', responseSummary: "3 records", responseData: null, reasoning: null, latencyMs: 80, succeeded: true },
    ];
    render(<ToolTracePanel trace={trace} isStreaming={true} />);
    // The tool invocation card content should be visible (auto-expanded)
    expect(screen.getByText("3 records")).toBeInTheDocument();
  });

  it("shows waiting message when streaming with empty trace", () => {
    render(<ToolTracePanel trace={[]} isStreaming={true} />);
    expect(screen.getByText("Waiting for tool calls…")).toBeInTheDocument();
  });

  it("does not show pulsing indicator when isStreaming is false", () => {
    const trace: ToolInvocation[] = [
      { toolName: "query_expense_data", parameters: '{}', responseSummary: "3 records", responseData: null, reasoning: null, latencyMs: 80, succeeded: true },
    ];
    render(<ToolTracePanel trace={trace} isStreaming={false} />);
    expect(screen.queryByText("Agent is reasoning…")).not.toBeInTheDocument();
  });
});
