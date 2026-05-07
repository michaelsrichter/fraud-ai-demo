import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CaseList } from "../../src/components/CaseList";
import type { Run } from "../../src/api/runsClient";

const mockRun: Run = {
  runId: "r1",
  createdUtc: "2026-01-01T00:00:00Z",
  configuration: {
    recordCount: 3,
    intensity: 0.1,
    patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
  },
  bandCounts: { high: 1, medium: 1, low: 1 },
  employees: [
    { employeeId: "e1", name: "Alice Smith", department: "Sales", role: "IC", baselineMonthlyExpense: 2000 },
  ],
  expenses: [
    { recordId: "c1", employeeId: "e1", submittedUtc: "2026-01-01T00:00:00Z", amount: 999, category: "Travel", vendor: "AcmeAir" },
    { recordId: "c2", employeeId: "e1", submittedUtc: "2026-01-02T00:00:00Z", amount: 50, category: "Meals", vendor: "FineDine" },
    { recordId: "c3", employeeId: "e1", submittedUtc: "2026-01-03T00:00:00Z", amount: 500, category: "Office", vendor: "PrintCo" },
  ],
  detectionResults: [
    { recordId: "c1", confidence: 0.95, band: "High" as const, contributingFeatures: [{ name: "amountZ", value: 2.0, zScore: 2.0 }] },
    { recordId: "c2", confidence: 0.6, band: "Medium" as const, contributingFeatures: [{ name: "amountZ", value: 0.5, zScore: 0.5 }] },
    { recordId: "c3", confidence: 0.2, band: "Low" as const, contributingFeatures: [{ name: "amountZ", value: 0.1, zScore: 0.1 }] },
  ],
};

describe("CaseList", () => {
  it("renders rows sorted by confidence", () => {
    const onSelect = vi.fn();
    render(<CaseList run={mockRun} onSelect={onSelect} />);
    const rows = screen.getAllByText(/\d+\.\d{3}/);
    expect(rows[0].textContent).toBe("0.950");
  });

  it("filters by band", () => {
    const onSelect = vi.fn();
    render(<CaseList run={mockRun} onSelect={onSelect} filter="High" />);
    expect(screen.getByText("0.950")).toBeInTheDocument();
    expect(screen.queryByText("0.200")).not.toBeInTheDocument();
  });

  it("clicking a row fires the onSelect callback", () => {
    const onSelect = vi.fn();
    render(<CaseList run={mockRun} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("0.950").closest(".case-row")!);
    expect(onSelect).toHaveBeenCalledWith("c1");
  });
});
