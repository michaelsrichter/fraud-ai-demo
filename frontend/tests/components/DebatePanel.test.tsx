import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DebatePanel } from "../../src/components/DebatePanel";

// Mock the API module
vi.mock("../../src/api/runsClient", async () => {
  const actual = await vi.importActual("../../src/api/runsClient");
  return {
    ...actual,
    debateInvestigate: vi.fn(),
    getAllPrompts: vi.fn().mockResolvedValue({
      baseSystemPrompt: "Base prompt",
      fraudLeaningBias: "Fraud bias",
      nonFraudLeaningBias: "Defense bias",
      debateArbiterPrompt: "Arbiter prompt",
      juniorConfidenceExtension: "Junior ext",
      seniorPreambleTemplate: "Senior template",
      consensusArbiterPrompt: "Consensus arbiter",
    }),
  };
});

import { debateInvestigate } from "../../src/api/runsClient";

describe("DebatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders model selector and temperature controls", () => {
    render(<DebatePanel runId="run-1" caseId="case-1" />);

    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText(/Temperature/)).toBeInTheDocument();
    expect(screen.getByText("Run Debate Investigation")).toBeInTheDocument();
  });

  it("shows loading state when investigation is running", async () => {
    const user = userEvent.setup();
    // Make the API hang
    vi.mocked(debateInvestigate).mockReturnValue(new Promise(() => {}));

    render(<DebatePanel runId="run-1" caseId="case-1" />);
    await user.click(screen.getByText("Run Debate Investigation"));

    expect(screen.getByText("Running debate…")).toBeInTheDocument();
  });

  it("displays fraud-leaning and non-fraud-leaning results with role labels", async () => {
    const user = userEvent.setup();
    vi.mocked(debateInvestigate).mockResolvedValue({
      finalVerdict: "Likely",
      temperature: 0.7,
      model: "gpt-5.4",
      fraudLeaning: {
        status: "Succeeded",
        verdict: "Likely",
        rationale: "Clear fraud signals",
        keySignals: ["Shell company vendor"],
        recommendedAction: "Flag",
        unavailableReason: null,
        toolTrace: null,
      },
      nonFraudLeaning: {
        status: "Succeeded",
        verdict: "Unlikely",
        rationale: "Normal business expense",
        keySignals: ["Common category"],
        recommendedAction: "Approve",
        unavailableReason: null,
        toolTrace: null,
      },
      arbiter: {
        finalVerdict: "Likely",
        summary: "Fraud advocate was more compelling",
        agreements: ["Unusual vendor"],
        disagreements: ["Amount interpretation"],
        reasoning: "The vendor evidence is strong",
      },
    });

    render(<DebatePanel runId="run-1" caseId="case-1" />);
    await user.click(screen.getByText("Run Debate Investigation"));

    await waitFor(() => {
      expect(screen.getByText("🔴 Fraud Advocate")).toBeInTheDocument();
      expect(screen.getByText("🟢 Defense Advocate")).toBeInTheDocument();
      expect(screen.getByText("Clear fraud signals")).toBeInTheDocument();
      expect(screen.getByText("Normal business expense")).toBeInTheDocument();
    });
  });

  it("displays arbiter verdict", async () => {
    const user = userEvent.setup();
    vi.mocked(debateInvestigate).mockResolvedValue({
      finalVerdict: "Likely",
      temperature: 0.7,
      model: "gpt-5.4",
      fraudLeaning: { status: "Succeeded", verdict: "Likely", rationale: "Fraud", keySignals: ["Signal"], recommendedAction: "Flag", unavailableReason: null, toolTrace: null },
      nonFraudLeaning: { status: "Succeeded", verdict: "Unlikely", rationale: "Normal", keySignals: ["OK"], recommendedAction: "Approve", unavailableReason: null, toolTrace: null },
      arbiter: {
        finalVerdict: "Likely",
        summary: "Fraud advocate prevails",
        agreements: ["Both noted vendor"],
        disagreements: ["Amount reading"],
        reasoning: "Evidence supports fraud",
      },
    });

    render(<DebatePanel runId="run-1" caseId="case-1" />);
    await user.click(screen.getByText("Run Debate Investigation"));

    await waitFor(() => {
      expect(screen.getByText("⚖️ Judge's Final Verdict")).toBeInTheDocument();
      expect(screen.getByText("Fraud advocate prevails")).toBeInTheDocument();
    });
  });
});
