import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JuniorSeniorPanel } from "../../src/components/JuniorSeniorPanel";

// Mock the API module
vi.mock("../../src/api/runsClient", async () => {
  const actual = await vi.importActual("../../src/api/runsClient");
  return {
    ...actual,
    juniorSeniorInvestigate: vi.fn(),
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

import { juniorSeniorInvestigate } from "../../src/api/runsClient";

describe("JuniorSeniorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders temperature control but no model selector", () => {
    render(<JuniorSeniorPanel runId="run-1" caseId="case-1" />);

    expect(screen.getByText(/Temperature/)).toBeInTheDocument();
    expect(screen.getByText("Run Investigation")).toBeInTheDocument();
    // Should NOT have a model selector — models are internally configured
    expect(screen.queryByText("Model")).not.toBeInTheDocument();
  });

  it("displays non-escalated result with confidence badge", async () => {
    const user = userEvent.setup();
    vi.mocked(juniorSeniorInvestigate).mockResolvedValue({
      finalVerdict: "Likely",
      escalated: false,
      confidenceScore: 0.92,
      escalationThreshold: 0.85,
      temperature: 0.7,
      junior: {
        model: "gpt-5.4-mini",
        status: "Succeeded",
        verdict: "Likely",
        rationale: "Clear threshold gaming",
        keySignals: ["$950 near threshold"],
        recommendedAction: "Flag",
        confidenceScore: 0.92,
        toolTrace: null,
      },
      senior: null,
    });

    render(<JuniorSeniorPanel runId="run-1" caseId="case-1" />);
    await user.click(screen.getByText("Run Investigation"));

    await waitFor(() => {
      expect(screen.getByText(/High Confidence/)).toBeInTheDocument();
      expect(screen.getByText("92%")).toBeInTheDocument();
    });
  });

  it("displays escalated result with junior and senior sections", async () => {
    const user = userEvent.setup();
    vi.mocked(juniorSeniorInvestigate).mockResolvedValue({
      finalVerdict: "Unlikely",
      escalated: true,
      confidenceScore: 0.65,
      escalationThreshold: 0.85,
      temperature: 0.7,
      junior: {
        model: "gpt-5.4-mini",
        status: "Succeeded",
        verdict: "Likely",
        rationale: "Some suspicious signals",
        keySignals: ["Unusual timing"],
        recommendedAction: "Escalate",
        confidenceScore: 0.65,
        toolTrace: null,
      },
      senior: {
        model: "gpt-5.4",
        status: "Succeeded",
        verdict: "Unlikely",
        rationale: "Vendor is legitimate after deeper analysis",
        keySignals: ["Vendor used by 12 employees"],
        recommendedAction: "Approve",
        toolTrace: null,
      },
    });

    render(<JuniorSeniorPanel runId="run-1" caseId="case-1" />);
    await user.click(screen.getByText("Run Investigation"));

    await waitFor(() => {
      expect(screen.getByText(/Case Escalated to Senior/)).toBeInTheDocument();
      expect(screen.getByText("65%")).toBeInTheDocument();
      expect(screen.getByText(/Junior Investigator/)).toBeInTheDocument();
      expect(screen.getByText(/Senior Investigator/)).toBeInTheDocument();
      expect(screen.getByText("Vendor is legitimate after deeper analysis")).toBeInTheDocument();
    });
  });
});
