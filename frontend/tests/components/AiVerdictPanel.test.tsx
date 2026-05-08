import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiVerdictPanel } from "../../src/components/AiVerdictPanel";
import type { AiInvestigationResult, ConsensusResult } from "../../src/api/runsClient";

// Mock the consensus function so we can test the rendered state
vi.mock("../../src/api/runsClient", async () => {
  const actual = await vi.importActual("../../src/api/runsClient");
  return { ...actual as object };
});

describe("AiVerdictPanel", () => {
  it("renders empty state when no investigation", () => {
    render(<AiVerdictPanel investigation={null} isLoading={false} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    expect(screen.getByText(/investigate with ai/i)).toBeInTheDocument();
  });

  it("renders succeeded state with verdict and rationale", () => {
    const result: AiInvestigationResult = {
      recordId: "c1",
      runId: "r1",
      requestedUtc: "2026-01-01T00:00:00Z",
      completedUtc: "2026-01-01T00:00:05Z",
      status: "Succeeded",
      verdict: "Likely",
      rationale: "Multiple suspicious indicators",
      keySignals: ["High amount", "Rare vendor"],
      recommendedAction: "Escalate to compliance",
    };
    render(<AiVerdictPanel investigation={result} isLoading={false} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    expect(screen.getByText("Likely")).toBeInTheDocument();
    expect(screen.getByText("Multiple suspicious indicators")).toBeInTheDocument();
    expect(screen.getByText("High amount")).toBeInTheDocument();
    expect(screen.getByText("Rare vendor")).toBeInTheDocument();
    expect(screen.getByText(/escalate to compliance/i)).toBeInTheDocument();
  });

  it("renders unavailable state with reason", () => {
    const result: AiInvestigationResult = {
      recordId: "c1",
      runId: "r1",
      requestedUtc: "2026-01-01T00:00:00Z",
      status: "Unavailable",
      unavailableReason: "timeout",
    };
    render(<AiVerdictPanel investigation={result} isLoading={false} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("timeout")).toBeInTheDocument();
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<AiVerdictPanel investigation={null} isLoading={true} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    expect(screen.getByText(/investigating/i)).toBeInTheDocument();
  });

  it("has a model selector", () => {
    const { container } = render(<AiVerdictPanel investigation={null} isLoading={false} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    const select = container.querySelector("select");
    expect(select).toBeTruthy();
    expect(select?.options.length).toBeGreaterThan(0);
  });

  it("has a consensus button", () => {
    render(<AiVerdictPanel investigation={null} isLoading={false} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    expect(screen.getByText(/consensus/i)).toBeInTheDocument();
  });

  it("has a preview prompt button", () => {
    render(<AiVerdictPanel investigation={null} isLoading={false} onInvestigate={vi.fn()} runId="r1" caseId="c1" />);
    expect(screen.getByText(/preview ai prompt/i)).toBeInTheDocument();
  });
});
