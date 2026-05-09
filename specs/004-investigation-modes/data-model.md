# Data Model: AI Investigation Modes

**Feature**: 004-investigation-modes | **Date**: 2026-05-08

## Existing Entities (Unchanged)

### AiInvestigationResult

The shared output entity used by all investigation modes. No modifications needed.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| RecordId | Guid | required, non-empty | Case expense record ID |
| RunId | Guid | required, non-empty | Parent run ID |
| RequestedUtc | DateTimeOffset | required | When investigation was requested |
| CompletedUtc | DateTimeOffset? | null if unavailable | When investigation completed |
| Status | InvestigationStatus | required | Succeeded / Failed / Unavailable |
| Verdict | FraudLikelihood? | null if unavailable | Likely / Unlikely / Inconclusive |
| Rationale | string? | max 2000 chars | AI reasoning text |
| KeySignals | IReadOnlyList\<string\>? | 1–10 entries | Evidence summary items |
| RecommendedAction | string? | required on success | Suggested next step |
| UnavailableReason | string? | required when unavailable | Error context |
| ToolTrace | IReadOnlyList\<ToolInvocation\>? | optional | Agent tool calls during investigation |

### ToolInvocation

| Field | Type | Constraints |
|-------|------|-------------|
| ToolName | string | required, non-empty |
| Parameters | string | required, non-empty (JSON) |
| ResponseSummary | string | required, non-empty |
| ResponseData | string? | optional, raw data |
| Reasoning | string? | optional, agent reasoning |
| LatencyMs | long | >= 0 |
| Succeeded | bool | required |

### InvestigationStatus (enum)

`Succeeded` | `Failed` | `Unavailable`

### FraudLikelihood (enum)

`Likely` | `Unlikely` | `Inconclusive`

## New Response DTOs (Transient — Not Persisted)

These are HTTP response shapes for the new endpoints. They are not domain entities and are not persisted.

### DebateResponse

Returned by `POST /api/runs/{runId}/cases/{caseId}/debate`

| Field | Type | Notes |
|-------|------|-------|
| finalVerdict | string | Arbiter's final determination |
| temperature | float? | Temperature used |
| model | string | Model deployment name used |
| fraudLeaning | AgentResult | Fraud-biased agent's findings |
| nonFraudLeaning | AgentResult | Defense-biased agent's findings |
| arbiter | ArbiterResult? | Arbiter's structured analysis (null if arbiter failed) |

### AgentResult (inline shape for Debate)

| Field | Type | Notes |
|-------|------|-------|
| status | string | "Succeeded" / "Unavailable" |
| verdict | string? | "Likely" / "Unlikely" / "Inconclusive" |
| rationale | string? | Agent reasoning |
| keySignals | string[]? | Evidence items |
| recommendedAction | string? | Suggested action |
| unavailableReason | string? | Error context |
| toolTrace | ToolInvocation[]? | Tool calls made |

### ArbiterResult (shared by Consensus and Debate)

| Field | Type | Notes |
|-------|------|-------|
| finalVerdict | string | "Likely" / "Unlikely" / "Inconclusive" |
| summary | string | 2–3 sentence executive summary |
| agreements | string[] | Points both/all agents agreed on |
| disagreements | string[] | Key differences between agents |
| reasoning | string | Why this verdict, ≤1500 chars |

### JuniorSeniorResponse

Returned by `POST /api/runs/{runId}/cases/{caseId}/junior-senior`

| Field | Type | Notes |
|-------|------|-------|
| finalVerdict | string | Final determination (junior or senior) |
| escalated | bool | Whether case was escalated to senior |
| confidenceScore | float | Junior's self-reported confidence (0.0–1.0) |
| escalationThreshold | float | Threshold used (0.85) |
| temperature | float? | Temperature used |
| junior | JuniorResult | Junior agent's findings |
| senior | SeniorResult? | Senior agent's findings (null if not escalated) |

### JuniorResult

| Field | Type | Notes |
|-------|------|-------|
| model | string | Model used (gpt-5.4-mini) |
| status | string | "Succeeded" / "Unavailable" |
| verdict | string? | Preliminary verdict |
| rationale | string? | Junior reasoning |
| keySignals | string[]? | Evidence items |
| recommendedAction | string? | Suggested action |
| confidenceScore | float | Self-assessed confidence (0.0–1.0) |
| toolTrace | ToolInvocation[]? | Tool calls made |

### SeniorResult

| Field | Type | Notes |
|-------|------|-------|
| model | string | Model used (gpt-5.4) |
| status | string | "Succeeded" / "Unavailable" |
| verdict | string? | Final verdict |
| rationale | string? | Senior reasoning |
| keySignals | string[]? | Evidence items |
| recommendedAction | string? | Suggested action |
| toolTrace | ToolInvocation[]? | Tool calls made |

## State Transitions

### Debate Mode Flow

```
[Idle] → user clicks "Run Debate"
  → [Loading: both agents running in parallel]
    → Agent 1 (fraud-leaning) completes
    → Agent 2 (non-fraud-leaning) completes
  → [Loading: arbiter running]
    → Arbiter completes
  → [Complete: all results displayed]
```

### Junior → Senior Flow

```
[Idle] → user clicks "Run Investigation"
  → [Loading: junior agent running]
    → Junior completes with confidenceScore
    → IF confidenceScore > 0.85:
      → [Complete: junior result displayed, no escalation]
    → ELSE:
      → [Loading: senior agent running]
        → Senior completes
      → [Complete: both results displayed, escalation noted]
```

## Relationships

```
InvestigationMode (enum: SingleAgent | Consensus | Debate | JuniorSenior)
  └── determines endpoint and agent topology

DebateResponse
  ├── fraudLeaning: AgentResult (uses IAiInvestigator + bias prompt)
  ├── nonFraudLeaning: AgentResult (uses IAiInvestigator + bias prompt)
  └── arbiter: ArbiterResult (standalone LLM call)

JuniorSeniorResponse
  ├── junior: JuniorResult (uses IAiInvestigator + confidence prompt, gpt-5.4-mini)
  └── senior: SeniorResult? (uses IAiInvestigator + senior prompt, gpt-5.4, conditional)

All agents share:
  ├── Case input (same projection)
  ├── Tools (query_expense_data, code_interpreter)
  └── Base prompt structure (5-section payload)
```
