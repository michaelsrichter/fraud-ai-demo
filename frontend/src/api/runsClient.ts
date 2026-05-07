import { z } from "zod";

const ConfidenceBand = z.enum(["High", "Medium", "Low"]);
const FraudPattern = z.enum(["ThresholdGaming", "UnusualFrequency", "VendorAnomaly"]);
const FraudLikelihood = z.enum(["Likely", "Unlikely", "Inconclusive"]);
const InvestigationStatus = z.enum(["Succeeded", "Unavailable"]);

export const PatternWeightsSchema = z.object({
  thresholdGaming: z.number().min(0).max(1),
  unusualFrequency: z.number().min(0).max(1),
  vendorAnomaly: z.number().min(0).max(1),
});
export type PatternWeights = z.infer<typeof PatternWeightsSchema>;

export const BandThresholdsSchema = z.object({
  low: z.number().min(0).max(1),
  high: z.number().min(0).max(1),
});
export type BandThresholds = z.infer<typeof BandThresholdsSchema>;

export const SimulationConfigurationSchema = z.object({
  recordCount: z.number().int().min(1).max(50_000),
  employeeCount: z.number().int().min(10).max(500).optional(),
  intensity: z.number().min(0).max(1),
  patternWeights: PatternWeightsSchema,
  thresholds: BandThresholdsSchema.optional(),
  seed: z.number().int().nullable().optional(),
});
export type SimulationConfiguration = z.infer<typeof SimulationConfigurationSchema>;

export const BandCountsSchema = z.object({
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
});
export type BandCounts = z.infer<typeof BandCountsSchema>;

export const FeatureContributionSchema = z.object({
  name: z.string(),
  value: z.number(),
  zScore: z.number(),
});
export type FeatureContribution = z.infer<typeof FeatureContributionSchema>;

export const DetectionResultSchema = z.object({
  recordId: z.string(),
  confidence: z.number(),
  band: ConfidenceBand,
  contributingFeatures: z.array(FeatureContributionSchema),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

export const ExpenseRecordSchema = z.object({
  recordId: z.string(),
  employeeId: z.string(),
  submittedUtc: z.string(),
  amount: z.number(),
  category: z.string(),
  vendor: z.string(),
  isInjectedFraud: z.boolean().optional(),
  injectedPattern: FraudPattern.nullable().optional(),
});
export type ExpenseRecord = z.infer<typeof ExpenseRecordSchema>;

export const EmployeeSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
  department: z.string(),
  role: z.string(),
  baselineMonthlyExpense: z.number(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

export const AiInvestigationResultSchema = z.object({
  recordId: z.string(),
  runId: z.string(),
  requestedUtc: z.string(),
  completedUtc: z.string().nullable().optional(),
  status: InvestigationStatus,
  verdict: FraudLikelihood.nullable().optional(),
  rationale: z.string().nullable().optional(),
  keySignals: z.array(z.string()).nullable().optional(),
  recommendedAction: z.string().nullable().optional(),
  unavailableReason: z.string().nullable().optional(),
});
export type AiInvestigationResult = z.infer<typeof AiInvestigationResultSchema>;

export const RunSchema = z.object({
  runId: z.string(),
  createdUtc: z.string(),
  configuration: SimulationConfigurationSchema.extend({
    modelDeploymentName: z.string().optional(),
  }),
  bandCounts: BandCountsSchema,
  employees: z.array(EmployeeSchema),
  expenses: z.array(ExpenseRecordSchema),
  detectionResults: z.array(DetectionResultSchema),
  investigations: z.record(AiInvestigationResultSchema).optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const RunSummarySchema = z.object({
  runId: z.string(),
  createdUtc: z.string(),
  recordCount: z.number(),
  bandCounts: BandCountsSchema,
  intensity: z.number(),
  patternWeights: PatternWeightsSchema,
  investigationCount: z.number(),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

export const RunListSchema = z.object({
  items: z.array(RunSummarySchema),
  continuationToken: z.string().nullable().optional(),
});
export type RunList = z.infer<typeof RunListSchema>;

export const CaseSchema = z.object({
  expense: ExpenseRecordSchema,
  employee: EmployeeSchema,
  detection: DetectionResultSchema,
  investigation: AiInvestigationResultSchema.nullable().optional(),
});
export type Case = z.infer<typeof CaseSchema>;

const API_BASE = "/api";

async function jsonRequest<T>(url: string, init: RequestInit, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
      else if (body?.title) detail = body.title;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return schema.parse(data);
}

export async function createRun(config: SimulationConfiguration): Promise<Run> {
  return jsonRequest(`${API_BASE}/runs`, { method: "POST", body: JSON.stringify(config) }, RunSchema);
}

export async function listRuns(take = 20): Promise<RunList> {
  return jsonRequest(`${API_BASE}/runs?take=${take}`, { method: "GET" }, RunListSchema);
}

export async function getRun(runId: string): Promise<Run> {
  return jsonRequest(`${API_BASE}/runs/${runId}`, { method: "GET" }, RunSchema);
}

export async function getCase(runId: string, caseId: string): Promise<Case> {
  return jsonRequest(`${API_BASE}/runs/${runId}/cases/${caseId}`, { method: "GET" }, CaseSchema);
}

export async function investigateCase(runId: string, caseId: string): Promise<AiInvestigationResult> {
  return jsonRequest(
    `${API_BASE}/runs/${runId}/cases/${caseId}/investigate`,
    { method: "POST" },
    AiInvestigationResultSchema,
  );
}
