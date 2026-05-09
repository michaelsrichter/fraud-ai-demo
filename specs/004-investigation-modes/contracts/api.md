# API Contracts: AI Investigation Modes

**Feature**: 004-investigation-modes | **Date**: 2026-05-08

## New Endpoints

### POST /api/runs/{runId}/cases/{caseId}/debate

Run a Debate investigation on the specified case.

**Request Body**:
```json
{
  "temperature": 0.7,
  "allowConfidenceScores": false,
  "model": "gpt-5.4"
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| temperature | float | no | null (model default) | 0.0–2.0 |
| allowConfidenceScores | bool | no | false | Show ML scores in tool results |
| model | string | no | null (default model) | Applies to both agents and arbiter |

**Response 200**:
```json
{
  "finalVerdict": "Likely",
  "temperature": 0.7,
  "model": "gpt-5.4",
  "fraudLeaning": {
    "status": "Succeeded",
    "verdict": "Likely",
    "rationale": "Multiple strong fraud signals...",
    "keySignals": ["Suspicious vendor name", "Threshold gaming"],
    "recommendedAction": "Flag for manual review",
    "unavailableReason": null,
    "toolTrace": [...]
  },
  "nonFraudLeaning": {
    "status": "Succeeded",
    "verdict": "Unlikely",
    "rationale": "Normal expense pattern when context is considered...",
    "keySignals": ["Common category for department", "Amount within normal range"],
    "recommendedAction": "Approve with standard audit",
    "unavailableReason": null,
    "toolTrace": [...]
  },
  "arbiter": {
    "finalVerdict": "Likely",
    "summary": "The fraud-leaning investigator presented stronger evidence...",
    "agreements": ["Both agreed the vendor is unusual"],
    "disagreements": ["Threshold proximity interpreted differently"],
    "reasoning": "The convergence of vendor rarity and threshold gaming..."
  }
}
```

**Response 404**: Run or case not found.

---

### POST /api/runs/{runId}/cases/{caseId}/junior-senior

Run a Junior → Senior investigation on the specified case.

**Request Body**:
```json
{
  "temperature": 0.7,
  "allowConfidenceScores": false
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| temperature | float | no | null (model default) | 0.0–2.0 |
| allowConfidenceScores | bool | no | false | Show ML scores in tool results |

Note: Models are internally configured (junior = gpt-5.4-mini, senior = gpt-5.4). Not user-selectable.

**Response 200 (not escalated)**:
```json
{
  "finalVerdict": "Likely",
  "escalated": false,
  "confidenceScore": 0.92,
  "escalationThreshold": 0.85,
  "temperature": 0.7,
  "junior": {
    "model": "gpt-5.4-mini",
    "status": "Succeeded",
    "verdict": "Likely",
    "rationale": "Clear threshold gaming pattern...",
    "keySignals": ["Amount $950 near $1000 threshold"],
    "recommendedAction": "Flag for review",
    "confidenceScore": 0.92,
    "toolTrace": [...]
  },
  "senior": null
}
```

**Response 200 (escalated)**:
```json
{
  "finalVerdict": "Unlikely",
  "escalated": true,
  "confidenceScore": 0.65,
  "escalationThreshold": 0.85,
  "temperature": 0.7,
  "junior": {
    "model": "gpt-5.4-mini",
    "status": "Succeeded",
    "verdict": "Likely",
    "rationale": "Some suspicious signals but inconclusive...",
    "keySignals": ["Unusual timing", "New vendor"],
    "recommendedAction": "Escalate for deeper review",
    "confidenceScore": 0.65,
    "toolTrace": [...]
  },
  "senior": {
    "model": "gpt-5.4",
    "status": "Succeeded",
    "verdict": "Unlikely",
    "rationale": "After deeper analysis, the vendor is legitimate...",
    "keySignals": ["Vendor used by 12 other employees", "Amount normal for category"],
    "recommendedAction": "Approve",
    "toolTrace": [...]
  }
}
```

**Response 404**: Run or case not found.

---

## Existing Endpoints (Unchanged)

### POST /api/runs/{runId}/cases/{caseId}/investigate/stream

Single Agent mode — unchanged.

### POST /api/runs/{runId}/cases/{caseId}/consensus

Consensus mode — unchanged.

### GET /api/runs/{runId}/cases/{caseId}/prompt

Prompt preview — unchanged. New modes construct prompt displays client-side from static prompt text.

---

## Frontend API Functions (New)

```typescript
// Debate investigation
export async function debateInvestigate(
  runId: string,
  caseId: string,
  model?: string,
  temperature?: number,
  allowConfidenceScores?: boolean
): Promise<DebateResult>

// Junior → Senior investigation
export async function juniorSeniorInvestigate(
  runId: string,
  caseId: string,
  temperature?: number,
  allowConfidenceScores?: boolean
): Promise<JuniorSeniorResult>
```
