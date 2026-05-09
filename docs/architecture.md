# Architecture

## System overview

```
┌─────────────────┐    https     ┌──────────────────────────┐
│ Static Web App  │ ───────────▶ │ Azure Functions          │
│ (React + Vite)  │              │ (.NET 9 isolated worker)  │
└─────────────────┘              │  • GenerateRunFunction   │
                                 │  • ListRunsFunction      │
                                 │  • GetRunFunction        │
                                 │  • GetCaseFunction       │
                                 │  • InvestigateCaseFunction│
                                 │  • ConsensusCaseFunction │
                                 │  • PreviewPromptFunction │
                                 │  • ExpenseDataQueryFn    │
                                 │  • DeleteRunFunction     │
                                 └──────┬───────────┬───────┘
                                        │ MI         │ MI
                                        ▼            ▼
                              ┌─────────────┐  ┌──────────────────┐
                              │ Storage     │  │ Microsoft Foundry│
                              │ (Blob+Table)│  │ (AI Services)    │
                              │  runs/*.gz  │  │  3 model deploys │
                              │  RunIndex   │  │  gpt-5.4         │
                              └─────────────┘  │  gpt-5.3-chat    │
                                               │  gpt-5.4-mini    │
                                               │  Toolbox (MCP)   │
                                               │   └ Code Interp. │
                                               └──────────────────┘
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
   **not** persist. System prompts instruct models to be bold and decisive
   (FR-028) — favoring "Likely" or "Unlikely" over "Inconclusive."

   **Tool-calling flow:** During investigation, the agent has access to two
   tools registered via `ChatOptions.Tools`:
   - `query_expense_data` — in-process data retrieval tool that queries the
     Run blob via `RunDataQueryService`. Supports filtering by employee, vendor,
     category, band, date range, amount range. Returns compact summaries
     (aggregates + top-10) or full detail records. The Run is loaded once and
     captured in closure — no repeated blob reads.
   - `code_interpreter` — Foundry Code Interpreter via MCP Toolbox. Connected
     using the C# `ModelContextProtocol` SDK to the consumer endpoint
     (`{project}/toolboxes/fraud-ai-tools/mcp`). Auth via bearer token with
     `DefaultAzureCredential`. Required header: `Foundry-Features: Toolboxes=V1Preview`.
     If the toolbox is unavailable, the agent proceeds with data retrieval only
     (graceful degradation).

   All tool invocations are captured in a `ToolTrace` attached to the
   `AiInvestigationResult`. The frontend renders these in a collapsible
   "Agent Reasoning Trace" panel. Max 10 tool calls per investigation.

   **SSE streaming flow (FR-017):** The browser can POST to
   `/api/runs/{id}/cases/{caseId}/investigate/stream` for real-time progress.
   `InvestigateCaseStreamFunction` sets `Content-Type: text/event-stream` and
   creates an `IProgress<ToolInvocation>` callback that writes `tool_call`
   SSE events to the response stream via `SseHelper` as each tool call
   completes. The result is persisted before the `complete` event is written.
   The frontend uses `fetch` + `ReadableStream` to parse SSE frames and
   renders tool trace entries progressively in `ToolTracePanel` (with a
   pulsing "Agent is reasoning…" indicator). Falls back to the non-streaming
   endpoint if the SSE connection fails.

4. **Consensus investigation.** Browser POSTs `/api/runs/{id}/cases/{caseId}/consensus`.
   `ConsensusCaseFunction` runs all 3 deployed models (GPT-5.4, GPT-5.3 Chat,
   GPT-5.4 Mini) in **parallel** via `Task.WhenAll`, collecting individual
   verdicts. Then invokes GPT-5.4 as an **arbiter** model that receives all
   3 responses and produces: a final verdict, executive summary, agreements,
   disagreements, and reasoning. If the arbiter call fails, falls back to
   majority-vote consensus. The frontend displays model results **side-by-side**
   in a 3-column grid with the arbiter analysis below (FR-026, FR-027).
   Consensus results are transient (not persisted).

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
