import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { listRuns, getRun, createRun, getCase, investigateCase } from "../../src/api/runsClient";

const mockRunSummary = {
  runId: "aaaa-bbbb",
  createdUtc: "2026-01-01T00:00:00Z",
  recordCount: 100,
  bandCounts: { high: 5, medium: 10, low: 85 },
  intensity: 0.1,
  patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
  investigationCount: 0,
};

const mockRun = {
  runId: "aaaa-bbbb",
  createdUtc: "2026-01-01T00:00:00Z",
  configuration: {
    recordCount: 100,
    employeeCount: 10,
    intensity: 0.1,
    patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
    thresholds: { low: 0.55, high: 0.85 },
    seed: null,
    modelDeploymentName: "test",
  },
  bandCounts: { high: 5, medium: 10, low: 85 },
  employees: [],
  expenses: [],
  detectionResults: [],
  investigations: {},
};

const server = setupServer(
  http.get("/api/runs", () => HttpResponse.json({ items: [mockRunSummary], continuationToken: null })),
  http.get("/api/runs/:runId", () => HttpResponse.json(mockRun)),
  http.post("/api/runs", () => HttpResponse.json(mockRun, { status: 201 })),
  http.get("/api/runs/:runId/cases/:caseId", () =>
    HttpResponse.json({
      expense: { recordId: "c1", employeeId: "e1", submittedUtc: "2026-01-01T00:00:00Z", amount: 500, category: "Travel", vendor: "AcmeAir" },
      employee: { employeeId: "e1", name: "Test", department: "Sales", role: "IC", baselineMonthlyExpense: 2000 },
      detection: { recordId: "c1", confidence: 0.7, band: "Medium", contributingFeatures: [{ name: "amountZ", value: 1.5, zScore: 1.5 }] },
      investigation: null,
    })
  ),
  http.post("/api/runs/:runId/cases/:caseId/investigate", () =>
    HttpResponse.json({
      recordId: "c1",
      runId: "aaaa-bbbb",
      requestedUtc: "2026-01-01T00:00:00Z",
      completedUtc: "2026-01-01T00:00:01Z",
      status: "Succeeded",
      verdict: "Likely",
      rationale: "Test rationale",
      keySignals: ["signal1"],
      recommendedAction: "Escalate",
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("runsClient", () => {
  it("listRuns returns validated data", async () => {
    const result = await listRuns(10);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].runId).toBe("aaaa-bbbb");
  });

  it("getRun returns validated run", async () => {
    const run = await getRun("aaaa-bbbb");
    expect(run.runId).toBe("aaaa-bbbb");
    expect(run.bandCounts.high).toBe(5);
  });

  it("createRun posts and returns validated run", async () => {
    const run = await createRun({
      recordCount: 100,
      intensity: 0.1,
      patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
    });
    expect(run.runId).toBe("aaaa-bbbb");
  });

  it("getCase returns validated case", async () => {
    const c = await getCase("aaaa-bbbb", "c1");
    expect(c.expense.amount).toBe(500);
    expect(c.detection.band).toBe("Medium");
  });

  it("investigateCase posts and returns result", async () => {
    const result = await investigateCase("aaaa-bbbb", "c1", "gpt-5.4");
    expect(result.status).toBe("Succeeded");
    expect(result.verdict).toBe("Likely");
  });

  it("rejects malformed response", async () => {
    server.use(http.get("/api/runs", () => HttpResponse.json({ items: "not-an-array" })));
    await expect(listRuns(10)).rejects.toThrow();
  });
});
