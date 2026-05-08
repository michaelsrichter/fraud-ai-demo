import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunSummaryStats } from "../../src/components/RunSummaryStats";
import type { Run } from "../../src/api/runsClient";

function makeRun(): Run {
  const employees = [
    { employeeId: "e1", name: "Alice Smith", department: "Sales", role: "IC", baselineMonthlyExpense: 2000 },
    { employeeId: "e2", name: "Bob Jones", department: "Engineering", role: "Manager", baselineMonthlyExpense: 1500 },
  ];
  const expenses = [
    { recordId: "r1", employeeId: "e1", submittedUtc: "2026-01-15T10:00:00Z", amount: 500, category: "Travel", vendor: "AcmeAir" },
    { recordId: "r2", employeeId: "e1", submittedUtc: "2026-01-20T14:00:00Z", amount: 950, category: "Travel", vendor: "ShellCorp" },
    { recordId: "r3", employeeId: "e2", submittedUtc: "2026-02-01T09:00:00Z", amount: 200, category: "Office", vendor: "SupplyHQ" },
    { recordId: "r4", employeeId: "e2", submittedUtc: "2026-02-10T16:00:00Z", amount: 1200, category: "Travel", vendor: "AcmeAir" },
  ];
  const detectionResults = [
    { recordId: "r1", confidence: 0.3, band: "Low" as const, contributingFeatures: [{ name: "amountZ", value: 0.5, zScore: 0.5 }] },
    { recordId: "r2", confidence: 0.9, band: "High" as const, contributingFeatures: [{ name: "vendorRarity", value: 3.0, zScore: 3.0 }] },
    { recordId: "r3", confidence: 0.4, band: "Low" as const, contributingFeatures: [{ name: "amountZ", value: -0.5, zScore: -0.5 }] },
    { recordId: "r4", confidence: 0.7, band: "Medium" as const, contributingFeatures: [{ name: "amountZ", value: 1.5, zScore: 1.5 }] },
  ];

  return {
    runId: "run-1",
    createdUtc: "2026-02-15T00:00:00Z",
    configuration: {
      recordCount: 4,
      intensity: 0.15,
      patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
    },
    employees,
    expenses,
    detectionResults,
    bandCounts: { high: 1, medium: 1, low: 2 },
  } as Run;
}

describe("RunSummaryStats", () => {
  it("renders dataset summary stat cards", () => {
    render(<RunSummaryStats run={makeRun()} />);
    // Should show record count
    expect(screen.getByText("4")).toBeInTheDocument();
    // Should show employees label
    expect(screen.getByText("Employees")).toBeInTheDocument();
    // Should show category count
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("renders band counts inline", () => {
    render(<RunSummaryStats run={makeRun()} />);
    expect(screen.getByText(/High: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Medium: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Low: 2/)).toBeInTheDocument();
  });

  it("renders anomaly scatter plot heading", () => {
    render(<RunSummaryStats run={makeRun()} />);
    expect(screen.getByText("Anomaly Scatter Plot")).toBeInTheDocument();
  });

  it("renders per-category breakdown table", () => {
    render(<RunSummaryStats run={makeRun()} />);
    expect(screen.getByText("By Category")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText("Office")).toBeInTheDocument();
  });

  it("renders per-vendor breakdown table", () => {
    render(<RunSummaryStats run={makeRun()} />);
    expect(screen.getByText("Top Vendors")).toBeInTheDocument();
    expect(screen.getByText("AcmeAir")).toBeInTheDocument();
  });

  it("renders dataset summary heading", () => {
    render(<RunSummaryStats run={makeRun()} />);
    expect(screen.getByText("Dataset Summary")).toBeInTheDocument();
  });

  it("shows vendor and employee labels", () => {
    render(<RunSummaryStats run={makeRun()} />);
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Vendors")).toBeInTheDocument();
  });
});
