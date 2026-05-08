# Phase 1 — Data Model

**Feature**: AI Agent Tools for Fraud Investigation
**Date**: 2026-05-08
**Source**: [spec.md](./spec.md) §Key Entities, [plan.md](./plan.md) §R5

This document describes the new and modified entities for tool-augmented
AI investigations. All types are C# `record` in the Domain or Application
layer.

---

## ToolInvocation (new value object)

A single tool call made by an agent during an investigation.

| Field | Type | Notes |
|---|---|---|
| `ToolName` | `string` | e.g., `query_expense_data` or `code_interpreter` |
| `Parameters` | `string` | JSON string of the call parameters |
| `ResponseSummary` | `string` | e.g., "12 records returned" or "Output: 42 lines" |
| `ResponseData` | `string?` | Truncated response (first 1000 chars); null if empty |
| `Reasoning` | `string?` | Agent's intermediate reasoning before/after this call |
| `LatencyMs` | `long` | Wall-clock time for this tool call |
| `Succeeded` | `bool` | Whether the tool call completed without error |

**Validation**: `ToolName` non-empty; `Parameters` non-empty valid JSON;
`ResponseSummary` non-empty; `LatencyMs >= 0`.

---

## ToolTrace (new — list wrapper, semantically distinct)

An ordered list of `ToolInvocation` entries for a single investigation.

```csharp
// Represented as IReadOnlyList<ToolInvocation> on AiInvestigationResult.
// No separate wrapper type needed — the list IS the trace.
```

---

## AiInvestigationResult (MODIFIED)

**Added field**:

| Field | Type | Notes |
|---|---|---|
| `ToolTrace` | `IReadOnlyList<ToolInvocation>?` | Ordered list of tool calls; null if no tools were used or for pre-tool investigations |

This is backward-compatible — existing serialized results have `ToolTrace = null`.

---

## RunDataQuery (new DTO — Application layer)

Filter parameters for the Expenses lab data retrieval tool.

| Field | Type | Notes |
|---|---|---|
| `EmployeeId` | `Guid?` | Filter by employee |
| `Vendor` | `string?` | Filter by vendor name (case-insensitive contains) |
| `Category` | `string?` | Filter by expense category |
| `Band` | `ConfidenceBand?` | Filter by detection confidence band |
| `DateRangeStart` | `DateTimeOffset?` | Inclusive start date |
| `DateRangeEnd` | `DateTimeOffset?` | Inclusive end date |
| `MinAmount` | `decimal?` | Minimum expense amount |
| `MaxAmount` | `decimal?` | Maximum expense amount |
| `Limit` | `int` | Max records to return (default 100, max 500) |
| `Detail` | `bool` | false = compact summary, true = full records |

**Validation**: `Limit` clamped to [1, 500]; `MinAmount <= MaxAmount` if
both present; `DateRangeStart <= DateRangeEnd` if both present.

---

## RunDataQueryResult (new DTO — Application layer)

Tool response returned to the agent.

| Field | Type | Notes |
|---|---|---|
| `Metadata` | `QueryMetadata` | Match counts + mode indicator |
| `Aggregates` | `QueryAggregates?` | Only in compact mode |
| `TopRecords` | `IReadOnlyList<ExpenseQueryRecord>?` | Top N by score (compact mode) |
| `Records` | `IReadOnlyList<ExpenseQueryRecord>?` | Full filtered records (detail mode) |

### QueryMetadata

| Field | Type |
|---|---|
| `TotalMatches` | `int` |
| `ReturnedCount` | `int` |
| `Truncated` | `bool` |
| `Mode` | `string` — `"compact"` or `"detail"` |

### QueryAggregates

| Field | Type |
|---|---|
| `MeanAmount` | `double` |
| `MedianAmount` | `double` |
| `MinAmount` | `double` |
| `MaxAmount` | `double` |
| `DistinctVendors` | `int` |
| `DistinctCategories` | `int` |
| `DistinctEmployees` | `int` |

### ExpenseQueryRecord

| Field | Type | Notes |
|---|---|---|
| `RecordId` | `Guid` | |
| `EmployeeId` | `Guid` | |
| `EmployeeName` | `string` | Joined from Employee |
| `Department` | `string` | |
| `SubmittedUtc` | `DateTimeOffset` | |
| `Amount` | `decimal` | |
| `Category` | `string` | |
| `Vendor` | `string` | |
| `Confidence` | `double` | Detection confidence score |
| `Band` | `ConfidenceBand` | |
| `TopFeatures` | `IReadOnlyList<FeatureContribution>` | Top 3 features by |z| |

**Note**: `IsInjectedFraud` and `InjectedPattern` are NEVER included (FR-005).

---

## ConsensusResult (MODIFIED — transient API response)

Each `ConsensusModelResult` in the consensus response now includes an
optional `ToolTrace` field matching the per-model tool invocations.

| Field (added) | Type | Notes |
|---|---|---|
| `toolTrace` | `ToolInvocation[]?` | Per-model tool trace |

---

## Persistence impact

- `AiInvestigationResult.ToolTrace` is serialized into the Run blob (same
  gzip JSON format). Existing blobs without `ToolTrace` deserialize with
  `null` — backward compatible.
- `ConsensusResult` is NOT persisted (transient) — no storage impact.
- `RunDataQueryResult` is NOT persisted — returned directly to the agent
  during the tool-calling loop.
