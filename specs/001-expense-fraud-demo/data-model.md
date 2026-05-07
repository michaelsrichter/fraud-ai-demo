# Phase 1 — Data Model

**Feature**: AI-Powered Internal Expense Fraud Demo
**Date**: 2026-05-06
**Source**: derived from [spec.md](./spec.md) §"Key Entities" + functional
requirements, with persistence decisions from [research.md](./research.md) §R3.

This document describes the conceptual data model used by the backend domain
and persisted in Azure Storage. All types are C# `record` (immutable) in the
`Domain/` project unless noted.

---

## Entity overview

```text
Run (root aggregate)
├── SimulationConfiguration       (value object, embedded)
├── Employee[]                    (value objects, embedded)
├── ExpenseRecord[]               (value objects, embedded)
├── DetectionResult[]             (one per ExpenseRecord, embedded)
└── AiInvestigationResult[]       (zero-or-one per Case, embedded; appended over time)
```

A **Case** is a *view-model projection* (Expense + DetectionResult +
optional AiInvestigationResult), not a persisted entity.

---

## Run (aggregate root)

| Field | Type | Notes |
|---|---|---|
| `RunId` | `Guid` | Primary identifier; URL-safe |
| `OwnerId` | `string` | Tenant placeholder for FR-025; constant `"v1"` in v1 |
| `CreatedUtc` | `DateTimeOffset` | Set at generation time |
| `Configuration` | `SimulationConfiguration` | Frozen at generation; never mutated |
| `Employees` | `IReadOnlyList<Employee>` | Generated synthetic profiles |
| `Expenses` | `IReadOnlyList<ExpenseRecord>` | All generated records, fraud + normal |
| `DetectionResults` | `IReadOnlyList<DetectionResult>` | Index-aligned with `Expenses` |
| `Investigations` | `IReadOnlyDictionary<Guid, AiInvestigationResult>` | Keyed by `ExpenseRecord.RecordId`; appended on each `/investigate` call |
| `BandCounts` | `BandCounts` | Cached summary `{ high, medium, low }` |

**Validation**:
- `Employees.Count` ≥ 10 and ≤ 500 (matches `SimulationConfiguration.EmployeeCount` bounds in [contracts/api.openapi.yaml](./contracts/api.openapi.yaml); lower bound 10 supports small test fixtures, demo scenarios typically use 50–200)
- `Expenses.Count` ≥ 1 and ≤ 50 000 (FR-004)
- `DetectionResults.Count == Expenses.Count` (invariant)
- Every `AiInvestigationResult.RecordId` ∈ `Expenses` (referential integrity)

**State transitions**:
1. `Created` — atomic at `POST /api/runs`; configuration + employees +
   expenses + detection results all materialized in one shot. The Run is
   immutable in this dimension afterwards.
2. `Investigated` — partial; `Investigations` grows over time as the
   presenter clicks "Investigate" on individual cases. Every write is
   ETag-conditioned (research.md §R4).

There is no "delete" or "edit" state in v1.

---

## SimulationConfiguration (value object)

| Field | Type | Validation | Source |
|---|---|---|---|
| `RecordCount` | `int` | 1 ≤ x ≤ 50 000 (FR-004) | request |
| `EmployeeCount` | `int` | 10 ≤ x ≤ 500; default 100 | request, optional |
| `Intensity` | `decimal` | 0.0 ≤ x ≤ 1.0 | request — overall fraud rate (FR-003) |
| `PatternWeights` | `PatternWeights` | sum to 1.0 ± 1e-6 after normalization (FR-003); none negative | request |
| `Thresholds` | `BandThresholds` | 0 < `low` < `high` < 1 (FR-008/9) | request, optional (defaults 0.55/0.85) |
| `Seed` | `int?` | optional; if set, generation is reproducible | request, optional |
| `ModelDeploymentName` | `string` | non-empty; from app settings, not request | infra |

`PatternWeights` = `{ ThresholdGaming, UnusualFrequency, VendorAnomaly }`,
each `decimal` ∈ [0,1]. Server normalizes before persisting; rejects with
HTTP 400 if all three are zero (per FR-021).

`BandThresholds` = `{ Low, High }`, both `decimal` ∈ (0,1), with `Low < High`.

---

## Employee (value object)

| Field | Type | Notes |
|---|---|---|
| `EmployeeId` | `Guid` | Stable within a Run |
| `Name` | `string` | Synthetic — first/last from a name list |
| `Department` | `string` | One of a small fixed set (e.g. Sales, Eng, Ops, Mktg, Finance) |
| `Role` | `string` | e.g. IC, Manager, Director |
| `BaselineMonthlyExpense` | `decimal` | Per-employee normal-spend anchor |
| `TypicalCategories` | `IReadOnlyList<string>` | Categories the employee normally uses |
| `TypicalVendors` | `IReadOnlyList<string>` | Vendors the employee normally uses |

**Validation**: all string fields non-empty, `BaselineMonthlyExpense` > 0.

---

## ExpenseRecord (value object)

| Field | Type | Notes |
|---|---|---|
| `RecordId` | `Guid` | Stable within a Run |
| `EmployeeId` | `Guid` | FK into `Run.Employees` |
| `SubmittedUtc` | `DateTimeOffset` | Within last 90 days from `Run.CreatedUtc` |
| `Amount` | `decimal` | > 0 |
| `Category` | `string` | non-empty |
| `Vendor` | `string` | non-empty |
| `IsInjectedFraud` | `bool` | **Simulator-only**; MUST NOT be supplied to the detector or the AI |
| `InjectedPattern` | `FraudPattern?` | Same — for ground-truth introspection only |

`FraudPattern` = `enum { ThresholdGaming, UnusualFrequency, VendorAnomaly }`.

**Validation**: `EmployeeId` exists in `Run.Employees`; `Amount > 0`;
`SubmittedUtc <= Run.CreatedUtc`.

---

## DetectionResult (value object)

| Field | Type | Notes |
|---|---|---|
| `RecordId` | `Guid` | FK; index-aligned with `ExpenseRecord` |
| `RawScore` | `double` | Pre-normalization composite score |
| `Confidence` | `double` | ∈ [0,1], normalized (FR-007) |
| `Band` | `ConfidenceBand` | `High` \| `Medium` \| `Low` (FR-008) |
| `ContributingFeatures` | `IReadOnlyList<FeatureContribution>` | **Top 5** features sorted by absolute z-score, descending. The list MUST be non-empty for any record (FR-007 / SC-008 alignment); if fewer than 5 features were engineered, all are returned. |

`FeatureContribution` = `{ Name: string, Value: double, ZScore: double }`.

**Validation**: `0.0 ≤ Confidence ≤ 1.0`; `Band` consistent with `Confidence`
under `Run.Configuration.Thresholds`.

---

## AiInvestigationResult (value object)

| Field | Type | Notes |
|---|---|---|
| `RecordId` | `Guid` | The Case this result belongs to |
| `RunId` | `Guid` | The Run this Case lives in (Edge Case: re-running mid-investigation) |
| `RequestedUtc` | `DateTimeOffset` |  |
| `CompletedUtc` | `DateTimeOffset?` | null if `Status == Unavailable` |
| `Status` | `InvestigationStatus` | `Succeeded` \| `Unavailable` |
| `Verdict` | `FraudLikelihood?` | `Likely` \| `Unlikely` \| `Inconclusive` (null if `Unavailable`) |
| `Rationale` | `string?` | Human-readable reasoning paragraph (null if `Unavailable`) |
| `KeySignals` | `IReadOnlyList<string>?` | The signals the AI cited (null if `Unavailable`) |
| `RecommendedAction` | `string?` | e.g. "Escalate to manager review" (null if `Unavailable`) |
| `UnavailableReason` | `string?` | e.g. "timeout", "service error", "malformed response" (set only if `Unavailable`) |

**Validation when `Status == Succeeded`** (FR-012, SC-008):
- `Verdict`, `Rationale`, `KeySignals`, `RecommendedAction` all non-null/non-empty
- `Rationale.Length` ≤ 2 000 chars
- `KeySignals.Count` ∈ [1,10]

**Validation when `Status == Unavailable`** (FR-014):
- `UnavailableReason` non-empty
- All other optional fields null

---

## Case (view-model projection — NOT persisted)

```csharp
public sealed record Case(
    ExpenseRecord Expense,
    Employee Employee,                       // joined from Run.Employees
    DetectionResult Detection,
    AiInvestigationResult? Investigation     // null until investigated
);
```

Returned by `GET /api/runs/{runId}/cases/{caseId}` and embedded in the case
list view.

---

## RunSummary (view-model projection — NOT persisted alongside Run)

Used by `GET /api/runs` and stored in the **Table** index for fast listing
(research.md §R3).

| Field | Type | Source |
|---|---|---|
| `RunId` | `Guid` | from Run |
| `CreatedUtc` | `DateTimeOffset` | from Run |
| `RecordCount` | `int` | `Run.Expenses.Count` |
| `BandCounts` | `BandCounts` | from Run |
| `Intensity` | `decimal` | from Run.Configuration |
| `PatternWeights` | `PatternWeights` | from Run.Configuration |
| `InvestigationCount` | `int` | `Run.Investigations.Count` |

---

## Persistence mapping

| Domain entity | Storage location | Format |
|---|---|---|
| `Run` (full aggregate) | Blob: `runs/{runId}.json.gz` | JSON, gzip-compressed; ETag for concurrency |
| `RunSummary` | Table `RunIndex`: `(PK="v1", RK={runId})` | One row per Run; updated on every Run write |
| `AiInvestigationResult` | Embedded in the Run blob (under `Investigations`) | Re-written via ETag-conditioned blob write |

The `IRunRepository` (Application/Abstractions) hides this split — callers
deal in `Run` aggregates only. The `BlobRunRepository` implementation owns
the dual write (blob first, then table summary; table is best-effort and
rebuilt from blobs on listing if a row is missing).

---

## Invariants worth re-stating

1. `IsInjectedFraud` and `InjectedPattern` are **never** sent to the detector
   or the AI agent — only the simulator and analytics use them.
2. The detector is a pure function of `(Run.Employees, Run.Expenses,
   Run.Configuration.Thresholds, Run.Configuration.Seed)` — no implicit
   randomness (Assumption: deterministic detection layer). Scoring is
   delegated to ML.NET behind `IAnomalyScorer` (research.md §R5; Constitution
   Principle XII), with the trainer seeded from `Configuration.Seed` to
   preserve determinism.
3. AI investigation is the **only** non-deterministic component.
4. The `OwnerId` field is a literal `"v1"` everywhere in v1; FR-025 forbids
   removing it from the data model.
