# API

The authoritative contract is
[`specs/001-expense-fraud-demo/contracts/api.openapi.yaml`](../specs/001-expense-fraud-demo/contracts/api.openapi.yaml).
This page summarizes the five endpoints. All paths are relative to `/api`.

## `POST /runs` — `createRun`

Creates a new simulation Run.

**Request** (`SimulationConfiguration`):

```json
{
  "recordCount": 5000,
  "intensity": 0.15,
  "patternWeights": { "thresholdGaming": 0.34, "unusualFrequency": 0.33, "vendorAnomaly": 0.33 },
  "thresholds": { "low": 0.55, "high": 0.85 },
  "seed": 42
}
```

`patternWeights` must sum to a positive number (the server normalizes to 1.0).
`recordCount` is clamped at **50,000**. `Intensity ∈ [0, 1]`. `0 < low < high < 1`.

**Response**: `201 Created`, body = full `Run`, `Location: /api/runs/{runId}`.
On validation failure: `400` with `application/problem+json` body whose
`errors` map names the offending field(s).

## `GET /runs?take=&continuationToken=` — `listRuns`

Returns the paged most-recent runs as `RunSummary[]`.

```json
{
  "items": [{ "runId": "…", "createdUtc": "…", "recordCount": 5000, "bandCounts": {…}, "intensity": 0.15, "patternWeights": {…}, "investigationCount": 3 }],
  "continuationToken": null
}
```

`take` is clamped to `[1, 200]` (default 50).

## `GET /runs/{runId}` — `getRun`

Returns the full `Run` (employees, expenses, detection results, investigations).
Response includes an `ETag` header used internally for conditional update.
`404` with problem-details if no Run exists.

## `GET /runs/{runId}/cases/{caseId}` — `getCase`

Returns a `Case` projection: `{ expense, employee, detection, investigation? }`.
`404` if the run or the record is missing.

## `POST /runs/{runId}/cases/{caseId}/investigate` — `investigateCase`

Triggers the AI investigator. Returns `200` with an `AiInvestigationResult`
either:

- `Status: "Succeeded"` — `verdict`, `rationale`, `keySignals`, `recommendedAction` populated.
- `Status: "Unavailable"` — `unavailableReason ∈ {"endpoint-not-configured", "timeout", "service-error:NNN", "malformed", "unexpected"}`.

The endpoint always responds **within ~30 s**; AI failures degrade to
`Unavailable` rather than `5xx` so the UI can surface a graceful fallback
(FR-014). Successful investigations are persisted onto the **originating**
Run blob with ETag concurrency (one retry on 412).

## `POST /runs/{runId}/cases/{caseId}/consensus` — `consensusInvestigate`

Runs all 3 deployed AI models (GPT-5.4, GPT-5.3 Chat, GPT-5.4 Mini)
simultaneously on the same case, then invokes GPT-5.4 as an arbiter to
reason over the combined results (FR-026, FR-027).

**Request** (optional):

```json
{ "temperature": 0.7 }
```

**Response**: `200 OK`

```json
{
  "consensusVerdict": "Likely",
  "modelCount": 3,
  "succeededCount": 3,
  "temperature": 0.7,
  "models": [
    {
      "model": "gpt-5.4",
      "status": "Succeeded",
      "verdict": "Likely",
      "rationale": "Multiple suspicious indicators...",
      "keySignals": ["Shell company vendor", "Amount near threshold"],
      "recommendedAction": "Escalate to compliance",
      "unavailableReason": null
    },
    { "model": "gpt-5.3-chat", "status": "Succeeded", "verdict": "Likely", "..." : "..." },
    { "model": "gpt-5.4-mini", "status": "Succeeded", "verdict": "Unlikely", "..." : "..." }
  ],
  "arbiter": {
    "finalVerdict": "Likely",
    "summary": "Two of three models flagged this as likely fraud. The vendor anomaly signal is the strongest indicator.",
    "agreements": ["Vendor is a known shell company pattern", "Amount is near policy threshold"],
    "disagreements": ["GPT-5.4 Mini did not weight the vendor signal as heavily"],
    "reasoning": "The convergence of two flagship models on vendor anomaly, combined with threshold gaming, outweighs the mini model's dissent."
  }
}
```

If one or more models fail, their entry shows `"status": "Unavailable"` with
an `unavailableReason`. Successful models still display normally (FR-026).

If the arbiter call fails, `arbiter` is `null` and `consensusVerdict` falls
back to a majority vote across the succeeded models (FR-027).

## `GET /runs/{runId}/cases/{caseId}/prompt` — `getPromptPreview`

Returns the system prompt and user prompt that would be sent to the AI agent
for this case, without invoking the model. Useful for demo transparency.

## `POST /runs/{runId}/tools/expenses/query` — `queryExpenseData`

Filters and aggregates expense data from a Run for the AI agent's data
retrieval tool (FR-001–FR-006).

**Request** (`RunDataQuery`):

```json
{
  "employeeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "vendor": "AcmeAir",
  "category": "Travel",
  "band": "High",
  "dateRangeStart": "2026-01-01T00:00:00Z",
  "dateRangeEnd": "2026-03-31T23:59:59Z",
  "minAmount": 100.00,
  "maxAmount": 1000.00,
  "limit": 100,
  "detail": false
}
```

All fields are optional. Filters combine with AND logic.

**Response — compact mode** (`detail=false`, default):

```json
{
  "metadata": { "totalMatches": 47, "returnedCount": 10, "truncated": true, "mode": "compact" },
  "aggregates": {
    "meanAmount": 542.30,
    "medianAmount": 423.15,
    "minAmount": 12.50,
    "maxAmount": 2150.00,
    "distinctVendors": 8,
    "distinctCategories": 4,
    "distinctEmployees": 12
  },
  "topRecords": [ { "recordId": "...", "employeeName": "...", "amount": 950.00, "vendor": "...", "confidence": 0.92, "band": "High", "topFeatures": [...] } ]
}
```

**Response — detail mode** (`detail=true`):

```json
{
  "metadata": { "totalMatches": 47, "returnedCount": 47, "truncated": false, "mode": "detail" },
  "records": [ { "recordId": "...", "employeeName": "...", "amount": 950.00, ... } ]
}
```

`limit` is clamped to `[1, 500]`. Ground-truth labels (`isInjectedFraud`,
`injectedPattern`) are never included in the response (FR-005).
`404` if the run is not found.

**Response**: `200 OK`

```json
{
  "systemPrompt": "You are an expert internal expense fraud investigator...",
  "userPrompt": "=== 1. CASE UNDER REVIEW ===\n..."
}
```

`404` if the run or case is missing.

## `DELETE /runs/{runId}` — `deleteRun`

Deletes a Run and its associated blob and table index entry.

**Response**: `204 No Content` on success, `404` if not found.
