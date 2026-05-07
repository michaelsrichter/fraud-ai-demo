# Architecture

## System overview

```
┌─────────────────┐    https     ┌──────────────────────────┐
│ Static Web App  │ ───────────▶ │ Azure Functions          │
│ (React + Vite)  │              │ (.NET 8 isolated worker) │
└─────────────────┘              │  • GenerateRunFunction   │
                                 │  • ListRunsFunction      │
                                 │  • GetRunFunction        │
                                 │  • GetCaseFunction       │
                                 │  • InvestigateCaseFunction│
                                 └──────┬───────────┬───────┘
                                        │ MI         │ MI
                                        ▼            ▼
                              ┌─────────────┐  ┌──────────────────┐
                              │ Storage     │  │ Microsoft Foundry│
                              │ (Blob+Table)│  │ (Azure OpenAI)   │
                              │  runs/*.gz  │  │  ChatClientAgent │
                              │  RunIndex   │  └──────────────────┘
                              └─────────────┘
```

## Data flow

1. **Generate run.** Browser POSTs `SimulationConfiguration` to `/api/runs`.
   `GenerateRunHandler` validates → seeds `EmployeeGenerator` → injects fraud
   patterns via `FraudInjector` → builds the 6-feature matrix in
   `FraudFeatureBuilder` → scores with `MlNetAnomalyScorer` (RandomizedPca, rank
   ≤ 4) → assigns `BandThresholds` (default 0.55 / 0.85) → persists Run as a
   gzip JSON blob plus a `RunIndex` table row (ETag-conditioned).
2. **Inspect cases.** Browser fetches `Run` via `/api/runs/{id}`; `CaseList`
   shows top-N by confidence, color-coded by band. Case detail loads a
   projection via `/api/runs/{id}/cases/{caseId}`.
3. **AI investigation.** Browser POSTs `/api/runs/{id}/cases/{caseId}/investigate`.
   `InvestigateCaseHandler` loads the originating Run, calls
   `AgentInvestigator.InvestigateAsync(case)` which constructs a stateless
   `Microsoft.Agents.AI.ChatClientAgent` per request backed by Foundry, sends
   the 5-section prompt (case, employee, 90-day history, peer cohort, run
   context — never the ground-truth labels), and on success persists the
   `AiInvestigationResult` onto the **originating** run blob (ETag-conditioned;
   one retry on 412). On any failure, returns `Status: Unavailable` and does
   **not** persist.

## Identity & RBAC (Constitution IV)

- Every storage/Foundry call uses `DefaultAzureCredential`. **No connection strings.**
- `infra/modules/rbac.bicep` grants `Storage Blob Data Contributor`,
  `Storage Table Data Contributor`, and `Cognitive Services OpenAI User`
  to **both** the Function App's system-assigned Managed Identity *and*
  the deploying user (the `principalId` parameter resolved by `azd`).

## Storage shape

- Blob container `runs/`: one gzip JSON per Run, key `{runId}.json.gz`.
- Table `RunIndex`: one row per Run with PK=`v1`, RK=`{runId}`. Holds a
  `SummaryJson` projection plus indexed columns for paged listing.
- Concurrency: blob writes use `If-None-Match: *` on insert and `If-Match:
  <etag>` on update. AI investigation persistence retries once on 412
  (`PreconditionFailed`) by reloading the run.

## Layering

| Project          | Role                                                         |
|------------------|--------------------------------------------------------------|
| `Domain`         | Records / enums / invariants. No external deps.              |
| `Application`    | Abstractions + handlers (orchestration only). DI seams.      |
| `Infrastructure` | ML.NET scorer, Storage repo, Foundry agent investigator.     |
| `Functions`      | HTTP endpoints + DI host + DTOs.                             |
