# Research: AI Investigation Modes

**Feature**: 004-investigation-modes | **Date**: 2026-05-08

## R1: Debate Mode — Biased Prompt Design

**Decision**: Use the existing base `SystemPrompt` from `AgentInvestigator` as the foundation for both debate agents, with a prepended bias paragraph that modifies the decision framework without replacing the tools, output schema, or case context.

**Rationale**: The spec requires all modes to share the same base prompt structure, tools, and output schema (FR-003). Additive bias instructions keep the core investigator behavior intact while shifting the decision threshold. This follows the existing pattern where `ConsensusCaseFunction` reuses `IAiInvestigator.InvestigateAsync` with different model names but the same prompt.

**Alternatives considered**:
1. Entirely separate system prompts per debate agent — rejected because it duplicates the base prompt, increases maintenance burden, and risks inconsistency when the base prompt evolves.
2. Post-processing bias (adjust verdict after AI returns) — rejected because it defeats the purpose of showing genuinely different AI reasoning in the UI.

**Bias instruction approach**:
- **Fraud-leaning agent**: Prepend instructions emphasizing that the agent should "err strongly on the side of flagging fraud", lower the threshold for "Likely" verdicts, and treat any single anomalous signal as sufficient grounds. The agent should be a "prosecutor" building the strongest case for fraud.
- **Non-fraud-leaning agent**: Prepend instructions emphasizing that the agent should "protect against false positives", require multiple strong converging signals for "Likely", and actively seek innocent explanations. The agent should be a "defense attorney" building the strongest case for legitimacy.

**Implementation**: Add a new method or overload on `AgentInvestigator` that accepts a `systemPromptOverride` parameter, or pass the bias prefix to `InvestigateAsync`. The `DebateCaseFunction` will construct the biased prompt by prepending the bias paragraph to `AgentInvestigator.SystemPromptText`.

## R2: Debate Mode — Arbiter Prompt Design

**Decision**: Model the debate arbiter on the existing Consensus arbiter pattern but tailor it for two-party adversarial input instead of three-party parallel input.

**Rationale**: The Consensus arbiter (`ConsensusCaseFunction.ArbiterSystemPrompt`) already demonstrates the pattern of receiving multiple agent findings as JSON, reasoning over agreements/disagreements, and producing a structured verdict. The Debate arbiter receives exactly two opposing findings (fraud-leaning + non-fraud-leaning) plus the original case context.

**Arbiter output schema**: Reuse the same `ConsensusArbiter` shape from the Consensus mode:
```json
{
  "finalVerdict": "Likely" | "Unlikely" | "Inconclusive",
  "summary": "string (executive summary)",
  "agreements": ["string"],
  "disagreements": ["string"],
  "reasoning": "string"
}
```

**Arbiter tone**: Decisive — "pick the stronger argument and commit to a verdict" (clarification Q5). The arbiter explicitly evaluates which side presented the more compelling evidence.

## R3: Junior → Senior Mode — Confidence Score Extraction

**Decision**: The junior agent's prompt will include an additional output field `"confidenceScore"` (0.0–1.0) in the required JSON schema. The backend will parse this field and compare it against the 0.85 threshold.

**Rationale**: The existing `AiInvestigationResult` does not include a confidence score field (it has verdict, rationale, key signals, recommended action). Rather than modifying the domain entity (which would be a breaking change), the junior endpoint will parse the extended JSON locally and use the confidence score for routing decisions only. The final result returned to the frontend still conforms to the shared output schema.

**Junior prompt extension**: The junior agent gets the same base system prompt but with an additional instruction to include `"confidenceScore": float (0.0 to 1.0)` in its JSON output, representing how certain it is about its verdict.

**Threshold**: 0.85 (clarification Q1). Only confidence > 0.85 skips escalation; 0.85 and below escalate.

**Senior prompt extension**: The senior agent receives the base system prompt plus a preamble containing the junior's preliminary findings, explicitly instructing the senior to evaluate the junior's reasoning and either confirm or override it.

**Alternatives considered**:
1. Use the existing verdict as the confidence proxy (e.g., "Inconclusive" = low confidence) — rejected because it loses granularity and doesn't distinguish between a 60% vs 80% confident "Likely" verdict.
2. Add `ConfidenceScore` to `AiInvestigationResult` — rejected for this feature to avoid modifying the persisted domain entity. Can be added later if needed.

## R4: Backend Endpoint Pattern

**Decision**: Create two new Azure Function endpoints following the `ConsensusCaseFunction` pattern:
- `DebateCaseFunction` → `POST /api/runs/{runId}/cases/{caseId}/debate`
- `JuniorSeniorCaseFunction` → `POST /api/runs/{runId}/cases/{caseId}/junior-senior`

Both endpoints are transient (no persistence), accept `{ temperature, allowConfidenceScores, model? }` in the request body, and return structured JSON responses.

**Rationale**: The `ConsensusCaseFunction` is the established pattern for multi-agent, transient investigation endpoints. Both new endpoints follow the same structure: load case from repository, run agents, aggregate results, return JSON. No new dependencies or infrastructure required.

**Debate endpoint flow**:
1. Load case from `IRunRepository`
2. Run fraud-leaning and non-fraud-leaning agents in parallel via `IAiInvestigator.InvestigateAsync` (with biased system prompts)
3. Collect both results
4. Run arbiter LLM with both findings + case context
5. Return `{ fraudLeaning, nonFraudLeaning, arbiter, finalVerdict }`

**Junior → Senior endpoint flow**:
1. Load case from `IRunRepository`
2. Run junior agent (gpt-5.4-mini) with extended prompt (includes confidenceScore)
3. Parse confidenceScore from response
4. If confidence > 0.85: return junior result with `escalated: false`
5. If confidence ≤ 0.85: run senior agent (gpt-5.4) with junior findings, return senior result with `escalated: true, juniorResult`

## R5: IAiInvestigator Extension for Biased Prompts

**Decision**: Add a `systemPromptOverride` optional parameter to the `InvestigateAsync` interface method, or create a new overload that accepts it.

**Rationale**: The Debate mode requires two agents with different system prompts. The current `IAiInvestigator.InvestigateAsync` uses the hardcoded `SystemPrompt` from `AgentInvestigator`. Adding an optional parameter keeps the existing interface compatible while enabling prompt customization.

**Alternatives considered**:
1. Create a separate `IBiasedInvestigator` interface — rejected because it duplicates the entire investigation pipeline for a single parameter difference.
2. Pass bias via the model name parameter — rejected as semantically incorrect and hacky.
3. Build the biased prompt in the endpoint and call the agent directly (bypass `IAiInvestigator`) — this is actually the simplest approach and follows the `ConsensusCaseFunction` pattern where the arbiter bypasses the interface entirely. **Revised decision**: The Debate endpoint will use `IAiInvestigator` for both biased agents (same as Consensus uses it for all 3 models), but the bias instructions will be prepended to the prompt text, not the system prompt, OR we add a `systemPromptOverride` parameter.

**Final approach**: Add an optional `string? systemPromptOverride = null` parameter to `IAiInvestigator.InvestigateAsync`. When non-null, the implementation uses it instead of the default system prompt. This is a backward-compatible change — all existing callers pass null.

## R6: Frontend Component Architecture

**Decision**: Decompose the existing `AiVerdictPanel` (currently ~350 lines handling both Single Agent and Consensus) into:
1. `AiVerdictPanel` — thin orchestrator with `ModeTabBar` and per-mode panel rendering
2. `ModeTabBar` — horizontal tab bar for mode selection
3. `SingleAgentPanel` — extracted Single Agent logic from current `AiVerdictPanel`
4. `ConsensusPanel` — extracted Consensus logic from current `AiVerdictPanel`
5. `DebatePanel` — new Debate mode UI
6. `JuniorSeniorPanel` — new Junior → Senior mode UI
7. `PromptViewer` — reusable prompt/instruction display component

**Rationale**: The current `AiVerdictPanel` is already large and mixing concerns for two modes. Adding two more modes would make it unwieldy. Decomposition keeps each mode self-contained, testable, and independently modifiable.

**Tab bar design**: Horizontal tabs at the top of the AI Investigation section (clarification Q4). Each tab shows a mode name and a small icon/emoji.

**PromptViewer**: A collapsible panel that displays prompt sections with labels (System Prompt, Bias Instructions, Arbiter Prompt, etc.) in a scrollable code-style container. Each mode panel includes one, passing mode-specific prompts.

## R7: Frontend API Types for New Modes

**Decision**: Add new TypeScript types for Debate and Junior → Senior results in `runsClient.ts`, plus API client functions.

**Debate result type**:
```typescript
interface DebateResult {
  finalVerdict: string;
  temperature: number | null;
  model: string;
  fraudLeaning: { status: string; verdict: string | null; rationale: string | null; keySignals: string[] | null; recommendedAction: string | null; toolTrace: ToolInvocation[] | null; };
  nonFraudLeaning: { status: string; verdict: string | null; rationale: string | null; keySignals: string[] | null; recommendedAction: string | null; toolTrace: ToolInvocation[] | null; };
  arbiter: ConsensusArbiter | null;
}
```

**Junior → Senior result type**:
```typescript
interface JuniorSeniorResult {
  finalVerdict: string;
  escalated: boolean;
  confidenceScore: number;
  escalationThreshold: number;
  temperature: number | null;
  junior: { model: string; status: string; verdict: string | null; rationale: string | null; keySignals: string[] | null; recommendedAction: string | null; confidenceScore: number; toolTrace: ToolInvocation[] | null; };
  senior: { model: string; status: string; verdict: string | null; rationale: string | null; keySignals: string[] | null; recommendedAction: string | null; toolTrace: ToolInvocation[] | null; } | null;
}
```

## R8: Prompt Preview for New Modes

**Decision**: Extend the existing `/api/runs/{runId}/cases/{caseId}/prompt` endpoint (or create a new endpoint variant) to return prompts for all modes, including the bias instructions for Debate and the junior/senior prompts for Junior → Senior.

**Rationale**: FR-033 requires each mode panel to show the active prompts. The existing `PreviewPromptFunction` returns `{ systemPrompt, userPrompt }`. The new modes need additional prompt sections.

**Approach**: The frontend will construct prompt previews from static prompt text exposed by the backend via a new `/api/prompts` endpoint that returns all prompt templates, or more simply, expose the prompt constants as static fields on `AgentInvestigator` (already done for `SystemPromptText`) and return them from a prompts endpoint. For simplicity, the DebatePanel and JuniorSeniorPanel can call the existing prompt preview endpoint and augment the display with the known bias instructions (which are static text).
