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
  scorers: z.array(z.object({
    modelId: z.string(),
    parameters: z.record(z.number()).optional(),
  })).optional(),
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

export const ToolInvocationSchema = z.object({
  toolName: z.string(),
  parameters: z.string(),
  responseSummary: z.string(),
  responseData: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional(),
  latencyMs: z.number(),
  succeeded: z.boolean(),
});
export type ToolInvocation = z.infer<typeof ToolInvocationSchema>;

export const AiCostEstimateSchema = z.object({
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  inputCostUsd: z.number().nonnegative(),
  outputCostUsd: z.number().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
  pricingKnown: z.boolean(),
});
export type AiCostEstimate = z.infer<typeof AiCostEstimateSchema>;

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
  toolTrace: z.array(ToolInvocationSchema).nullable().optional(),
  modelDeploymentName: z.string().nullable().optional(),
  costEstimate: AiCostEstimateSchema.nullable().optional(),
});
export type AiInvestigationResult = z.infer<typeof AiInvestigationResultSchema>;

export const ModelDetectionResultsSchema = z.object({
  modelId: z.string(),
  status: z.enum(["Success", "Error"]),
  errorMessage: z.string().nullable().optional(),
  results: z.array(DetectionResultSchema),
  bandCounts: BandCountsSchema,
});
export type ModelDetectionResults = z.infer<typeof ModelDetectionResultsSchema>;

export const RunSchema = z.object({
  runId: z.string(),
  createdUtc: z.string(),
  configuration: SimulationConfigurationSchema.extend({
    modelDeploymentName: z.string().optional(),
  }),
  bandCounts: BandCountsSchema,
  employees: z.array(EmployeeSchema),
  expenses: z.array(ExpenseRecordSchema),
  // Support both legacy flat array and new dictionary
  detectionResults: z.array(DetectionResultSchema).optional(),
  modelResults: z.record(ModelDetectionResultsSchema).optional(),
  investigations: z.record(AiInvestigationResultSchema).optional(),
});
export type Run = z.infer<typeof RunSchema>;

/** Get the detection results for a given model (or the primary/first model). */
export function getModelDetectionResults(run: Run, modelId?: string): DetectionResult[] {
  if (run.modelResults) {
    const id = modelId ?? Object.keys(run.modelResults)[0];
    const m = id ? run.modelResults[id] : undefined;
    if (m?.status === "Success") return m.results;
    return [];
  }
  return run.detectionResults ?? [];
}

/** Get available model IDs from a run. */
export function getAvailableModelIds(run: Run): string[] {
  if (run.modelResults) return Object.keys(run.modelResults);
  return ["randomized-pca"];
}

/** Get band counts for a specific model. */
export function getModelBandCounts(run: Run, modelId?: string): BandCounts {
  if (run.modelResults) {
    const id = modelId ?? Object.keys(run.modelResults)[0];
    const m = id ? run.modelResults[id] : undefined;
    if (m?.status === "Success") return m.bandCounts;
  }
  return run.bandCounts;
}

export type ScorerModelDefinition = {
  modelId: string;
  displayName: string;
  description: string;
  parameters: { name: string; displayName: string; description: string; dataType: string; defaultValue: number; min?: number; max?: number }[];
};

export async function fetchScorers(): Promise<{ models: ScorerModelDefinition[] }> {
  const res = await fetch(`${API_BASE}/scorers`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

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

function getUserId(): string {
  try {
    const raw = localStorage.getItem("fraud-lab-profile");
    if (raw) return JSON.parse(raw).id ?? "";
  } catch { /* ignore */ }
  return "";
}

async function jsonRequest<T>(url: string, init: RequestInit, schema: z.ZodSchema<T>): Promise<T> {
  const userId = getUserId();
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", "X-User-Id": userId, ...(init.headers ?? {}) },
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

export async function investigateCase(runId: string, caseId: string, modelDeploymentName?: string, temperature?: number, allowConfidenceScores?: boolean): Promise<AiInvestigationResult> {
  return jsonRequest(
    `${API_BASE}/runs/${runId}/cases/${caseId}/investigate`,
    { method: "POST", body: JSON.stringify({ modelDeploymentName, temperature, allowConfidenceScores }) },
    AiInvestigationResultSchema,
  );
}

/**
 * Stream an investigation via SSE. Emits tool_call events as they happen,
 * then a complete or error event with the full result (FR-017).
 */
export async function streamInvestigation(
  runId: string,
  caseId: string,
  options: { modelDeploymentName?: string; temperature?: number; allowConfidenceScores?: boolean },
  onToolCall: (invocation: ToolInvocation) => void,
  onComplete: (result: AiInvestigationResult) => void,
  onError: (err: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/investigate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(options),
      signal,
    });
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok) {
    onError(new Error(`${response.status} ${response.statusText}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError(new Error("Response body is not readable"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let receivedTerminal = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline (SSE frame boundary)
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? ""; // Last element is incomplete — keep in buffer

      for (const frame of frames) {
        if (!frame.trim()) continue;
        const lines = frame.split("\n");
        let eventType = "";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (!eventType || !data) continue;

        try {
          if (eventType === "tool_call") {
            onToolCall(ToolInvocationSchema.parse(JSON.parse(data)));
          } else if (eventType === "complete") {
            onComplete(AiInvestigationResultSchema.parse(JSON.parse(data)));
            receivedTerminal = true;
          } else if (eventType === "error") {
            const result = AiInvestigationResultSchema.parse(JSON.parse(data));
            onError(new Error(result.unavailableReason ?? "Investigation failed"));
            receivedTerminal = true;
          }
        } catch (parseErr) {
          onError(parseErr instanceof Error ? parseErr : new Error(String(parseErr)));
          receivedTerminal = true;
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return; // Clean abort
    onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!receivedTerminal) {
    onError(new Error("Stream closed without terminal event (possible timeout)"));
  }
}

export interface ConsensusArbiter {
  finalVerdict: string;
  summary: string;
  agreements: string[];
  disagreements: string[];
  reasoning: string;
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
    costEstimate: AiCostEstimate | null;
    toolTrace: ToolInvocation[] | null;
  }>;
  arbiter: ConsensusArbiter | null;
  arbiterCostEstimate?: AiCostEstimate | null;
  costEstimate?: AiCostEstimate | null;
}

export async function consensusInvestigate(runId: string, caseId: string, temperature?: number, allowConfidenceScores?: boolean): Promise<ConsensusResult> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/consensus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ temperature, allowConfidenceScores }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Investigation Mode types (004-investigation-modes) ---

export type InvestigationMode = "single" | "consensus" | "debate" | "junior-senior";

export interface InvestigationModeInfo {
  key: InvestigationMode;
  label: string;
  description: string;
  icon: string;
}

export const INVESTIGATION_MODES: InvestigationModeInfo[] = [
  { key: "single", label: "Single Agent", description: "One AI investigator reviews the case", icon: "🔍" },
  { key: "consensus", label: "Consensus", description: "Multiple models + arbiter vote", icon: "🤝" },
  { key: "debate", label: "Debate", description: "Opposing viewpoints + judge", icon: "⚖️" },
  { key: "junior-senior", label: "Junior → Senior", description: "Escalation pipeline", icon: "📈" },
];

// --- Debate Mode types ---

export interface DebateAgentResult {
  status: string;
  verdict: string | null;
  rationale: string | null;
  keySignals: string[] | null;
  recommendedAction: string | null;
  unavailableReason: string | null;
  costEstimate?: AiCostEstimate | null;
  toolTrace: ToolInvocation[] | null;
}

export interface DebateResult {
  finalVerdict: string;
  temperature: number | null;
  model: string;
  fraudLeaning: DebateAgentResult;
  nonFraudLeaning: DebateAgentResult;
  arbiter: ConsensusArbiter | null;
  arbiterCostEstimate?: AiCostEstimate | null;
  costEstimate?: AiCostEstimate | null;
}

export async function debateInvestigate(
  runId: string,
  caseId: string,
  model?: string,
  temperature?: number,
  allowConfidenceScores?: boolean,
): Promise<DebateResult> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/debate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature, allowConfidenceScores }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Junior → Senior Mode types ---

export interface JuniorResult {
  model: string;
  status: string;
  verdict: string | null;
  rationale: string | null;
  keySignals: string[] | null;
  recommendedAction: string | null;
  confidenceScore: number;
  costEstimate?: AiCostEstimate | null;
  toolTrace: ToolInvocation[] | null;
}

export interface SeniorResult {
  model: string;
  status: string;
  verdict: string | null;
  rationale: string | null;
  keySignals: string[] | null;
  recommendedAction: string | null;
  costEstimate?: AiCostEstimate | null;
  toolTrace: ToolInvocation[] | null;
}

export interface JuniorSeniorResult {
  finalVerdict: string;
  escalated: boolean;
  confidenceScore: number;
  escalationThreshold: number;
  temperature: number | null;
  costEstimate?: AiCostEstimate | null;
  junior: JuniorResult;
  senior: SeniorResult | null;
}

export async function juniorSeniorInvestigate(
  runId: string,
  caseId: string,
  temperature?: number,
  allowConfidenceScores?: boolean,
): Promise<JuniorSeniorResult> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/junior-senior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ temperature, allowConfidenceScores }),
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
  const res = await fetch(`${API_BASE}/runs/${runId}`, { method: "DELETE", headers: { "X-User-Id": getUserId() } });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: ${res.status} ${res.statusText}`);
  }
}

export function trackActivity(activity: "expense-run" | "insurance-run" | "payment-run" | "ai-investigation") {
  const userId = getUserId();
  if (!userId) return;
  fetch(`${API_BASE}/profiles/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, activity }),
  }).catch(() => { /* best-effort */ });
}

export async function getPromptPreview(runId: string, caseId: string): Promise<{ systemPrompt: string; userPrompt: string }> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cases/${caseId}/prompt`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export interface AllPrompts {
  baseSystemPrompt: string;
  fraudLeaningBias: string;
  nonFraudLeaningBias: string;
  debateArbiterPrompt: string;
  juniorConfidenceExtension: string;
  seniorPreambleTemplate: string;
  consensusArbiterPrompt: string;
}

export async function getAllPrompts(): Promise<AllPrompts> {
  const res = await fetch(`${API_BASE}/prompts`);
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
