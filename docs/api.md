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
