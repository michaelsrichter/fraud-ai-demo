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

export async function investigateCase(runId: string, caseId: string, modelDeploymentName?: string, temperature?: number): Promise<AiInvestigationResult> {
  return jsonRequest(
    `${API_BASE}/runs/${runId}/cases/${caseId}/investigate`,
    { method: "POST", body: JSON.stringify({ modelDeploymentName, temperature }) },
    AiInvestigationResultSchema,
  );
}

export interface ConsensusResult {
  consensusVerdict: string;
  modelCount: number;
  succeededCount: number;
  temperature: number | null;
  models: Array<{
    model: string;
    status: string;
    verdict: string | null;
    rationale: string | null;
    keySignals: string[] | null;
    recommendedAction: string | null;
    unavailableReason: string | null;
  }>;
}

export async function consensusInvestigate(runId: string, caseId: string, temperature?: number): Promise<ConsensusResult> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/consensus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ temperature }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const AVAILABLE_MODELS = [
  {
    name: "gpt-5.4",
    label: "GPT-5.4",
    description: "Latest flagship. Strongest reasoning & agentic workflows.",
    inputCost: "$2.50",
    outputCost: "$15.00",
    tier: "premium" as const,
  },
  {
    name: "gpt-5.3-chat",
    label: "GPT-5.3 Chat",
    description: "Strong all-rounder. Frontier coding + reasoning.",
    inputCost: "$1.75",
    outputCost: "$14.00",
    tier: "standard" as const,
  },
  {
    name: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Cost-efficient. Good quality at ~70% lower cost.",
    inputCost: "$0.75",
    outputCost: "$4.50",
    tier: "economy" as const,
  },
] as const;

export async function deleteRun(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/runs/${runId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: ${res.status} ${res.statusText}`);
  }
}

export async function getPromptPreview(runId: string, caseId: string): Promise<{ systemPrompt: string; userPrompt: string }> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/prompt`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const FEATURE_EXPLANATIONS: Record<string, { label: string; description: string; fraudSignal: string }> = {
  vendorRarity: {
    label: "Vendor Rarity",
    description: "How rare this vendor is across the entire dataset (-log of frequency). Higher = more unusual.",
    fraudSignal: "Suspicious shell-company vendors appear very rarely, causing high rarity scores.",
  },
  amountZ: {
    label: "Amount Z-Score",
    description: "How far this expense amount deviates from the population mean, in standard deviations.",
    fraudSignal: "Unusually high amounts stand out — especially near policy thresholds.",
  },
  amountVsThresholdGap: {
    label: "Threshold Gaming",
    description: "Binary signal: 1.0 if the amount is within $50 of the $1,000 approval threshold.",
    fraudSignal: "Fraudsters often submit expenses just under the auto-approval limit.",
  },
  frequencyZ: {
    label: "Frequency Z-Score",
    description: "How much this employee's submission count deviates from the average across all employees.",
    fraudSignal: "Excessive submission frequency can indicate systematic abuse.",
  },
  categoryDeviation: {
    label: "Category Deviation",
    description: "Binary signal: 1.0 if the expense category is atypical for this employee's profile.",
    fraudSignal: "Submitting in unfamiliar categories may indicate misclassification or fabrication.",
  },
  weekendSubmission: {
    label: "Weekend Submission",
    description: "Binary signal: 1.0 if submitted on Saturday or Sunday.",
    fraudSignal: "Legitimate business expenses are rarely submitted on weekends.",
  },
};
