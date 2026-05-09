# Implementation Plan: AI Agent Tools for Fraud Investigation

**Branch**: `003-agent-tools` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-agent-tools/spec.md`

## Summary

Give AI investigator agents two tools — (1) an in-process data retrieval tool
that queries filtered slices of the Run from Azure Storage, and (2) Microsoft
Foundry's Python Code Interpreter via MCP Toolbox — then update system prompts
to explain and encourage tool use, and stream tool invocations to the frontend
in real time via Server-Sent Events (SSE) so the UI can render the agent's
reasoning process progressively during a tool-augmented investigation.

The majority of the tool infrastructure (data retrieval tool, Code Interpreter
via `FoundryToolboxClient`, tool registration, `ToolInvocation` entity,
`ToolTracePanel` UI component) was built incrementally during spec 001
implementation. This plan focuses on the **remaining gap**: real-time streaming
of tool trace entries to the frontend during an investigation (FR-017/FR-018
clarification), plus any hardening, configuration, and documentation required
to satisfy the full spec.

## Technical Context

**Language/Version**:
- Backend: C# / .NET 10.0 (Azure Functions v4, isolated worker)
- Frontend: TypeScript 5.x on React 18 with Vite 5
- IaC: Bicep (Microsoft.CognitiveServices, Microsoft.Network, Microsoft.Web, Microsoft.Storage providers)

**Primary Dependencies**:
- Backend (existing): `Microsoft.Azure.Functions.Worker`, `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore`, `Microsoft.Agents.AI` (GA Agent Framework), `Azure.Identity`, `Azure.Storage.Blobs`, `Azure.Data.Tables`, `Microsoft.ML`, `ModelContextProtocol` (MCP client for Foundry Toolbox), `System.Text.Json`
- Backend (new for SSE): No new packages — Azure Functions HTTP response streaming uses built-in `HttpResponseData` with chunked transfer encoding
- Frontend (existing): `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zod`, `recharts`
- Frontend (new for SSE): `fetch` + `ReadableStream` for SSE consumption — no new packages required

**Storage**: Azure Blob Storage (`runs/` container, gzip JSON) + Azure Table Storage (`RunIndex`). No new storage resources needed — the data retrieval tool reads from the existing Run blob.

**Testing**:
- Backend: `xunit` + `Moq` + `FluentAssertions` via `dotnet test`
- Frontend: `vitest` + `@testing-library/react` via `npm test`

**Target Platform**: Azure Functions Flex Consumption (Linux, .NET 10) + Azure Static Web Apps + Microsoft Foundry AI Services

**Project Type**: Web application (frontend + backend) — incremental feature on existing codebase

**Performance Goals**:
- Data retrieval tool: < 2s for filters matching up to 500 records from a 5,000-record Run (SC-003)
- Individual tool call: target < 5s, hard cap 15s (FR-021)
- Full tool-augmented investigation: < 60s (FR-021, SC-004)
- SSE first-byte: < 500ms after investigation request — the stream opens immediately and tool trace events arrive as they occur

**Constraints**:
- Max 10 tool calls per investigation (FR-013, configurable via `Agent__MaxToolCalls`)
- Individual tool timeout 15s hard cap (FR-021)
- Overall investigation timeout 60s for tool-augmented mode (FR-021)
- Never expose `IsInjectedFraud` or `InjectedPattern` in tool responses (FR-005)
- Arbiter agent MUST NOT have tools (FR-011, FR-016)
- Code Interpreter unavailability must not block investigations (FR-009)

**Scale/Scope**: Single concurrent presenter; existing Run sizes (1,000–50,000 records); tool calls add 2–8 additional HTTP round-trips per investigation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Each row is evaluated against the project [Constitution v1.1.0](../../.specify/memory/constitution.md).

| # | Principle | Status | How this plan satisfies it |
|---|---|---|---|
| I | Platform & Deployment | **PASS** | No new Azure resource types. SSE streaming uses existing Functions HTTP binding. Foundry Toolbox infrastructure already in `foundry.bicep`. |
| II | Source Control & CI/CD | **PASS** | No CI/CD changes needed — existing GitHub Actions workflow builds and tests all projects. |
| III | AI & Agent Framework | **PASS** | Uses `Microsoft.Agents.AI` (GA) with `ChatClientAgent` + `AIFunctionFactory`. Code Interpreter accessed via MCP Toolbox (GA). No preview SDKs. No Azure OpenAI resources. |
| IV | Security & Identity | **PASS** | Data retrieval tool runs in-process with same Managed Identity as the Functions app. Foundry Toolbox auth uses `DefaultAzureCredential` with bearer token. No new secrets. |
| V | Code Quality & Architecture | **PASS** | Tool services behind `IRunDataQueryService` and `IFoundryToolboxClient` interfaces. SSE streaming endpoint follows same layered pattern (Functions → Application → Infrastructure). |
| VI | Testing Requirements | **PASS** | Existing unit tests cover `RunDataQueryService`, `ToolInvocation` entity, `AgentInvestigator` (mocked). New SSE endpoint tests will verify streaming behavior with mocked investigator. |
| VII | Documentation | **PASS** | Tool usage documented in system prompts. SSE streaming contract in `contracts/`. Setup docs updated for any Foundry Toolbox provisioning steps. |
| VIII | Observability & Reliability | **PASS** | Every tool invocation already logged with name, latency, success/failure. SSE endpoint degrades gracefully — if streaming fails, client falls back to polling the final result. Code Interpreter unavailability handled per FR-009. |
| IX | Configuration & Flexibility | **PASS** | `Agent__MaxToolCalls`, `Agent__ToolTimeoutSeconds`, `Detection__DefaultLowThreshold`, `Detection__DefaultHighThreshold` already configurable via app settings. |
| X | Performance Expectations | **PASS** | Data retrieval tool operates on in-memory Run data — sub-second for typical queries. SSE adds negligible overhead (chunked HTTP). 60s timeout accommodates multiple tool calls. |
| XI | Development Experience | **PASS** | Local dev unchanged — `func start` + `npm run dev` + Azurite. SSE works with Vite proxy. |
| XII | Library-First Algorithms | **PASS** | No new algorithmic work — data retrieval is filter/aggregate over in-memory collections. |

**Result**: PASS — no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/003-agent-tools/
├── plan.md              # This file
├── research.md          # Phase 0 output — streaming & tool integration decisions
├── data-model.md        # Phase 1 output — SSE event schema, updated entities
├── quickstart.md        # Phase 1 output — local dev guide for tool-augmented investigations
├── contracts/
│   └── sse-events.md    # Phase 1 output — SSE event contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── Domain/
│   │   └── Entities/
│   │       ├── ToolInvocation.cs          # (existing) Tool call record
│   │       └── AiInvestigationResult.cs   # (existing) Has ToolTrace property
│   ├── Application/
│   │   ├── Abstractions/
│   │   │   ├── IRunDataQueryService.cs    # (existing) Query service interface
│   │   │   ├── IAiInvestigator.cs         # (existing) Investigation interface
│   │   │   └── IFoundryToolboxClient.cs   # (existing) MCP toolbox interface
│   │   ├── Dtos/
│   │   │   └── RunDataQueryDto.cs         # (existing) Query + result DTOs
│   │   └── Services/
│   │       ├── RunDataQueryService.cs     # (existing) Filter/aggregate implementation
│   │       └── InvestigateCaseHandler.cs  # (existing) Investigation orchestrator
│   ├── Infrastructure/
│   │   └── Ai/
│   │       ├── AgentInvestigator.cs       # (modify) Add streaming callback for tool events
│   │       └── FoundryToolboxClient.cs    # (existing) MCP client for Code Interpreter
│   └── Functions/
│       └── Endpoints/
│           ├── InvestigateCaseFunction.cs  # (modify) Add SSE streaming variant
│           └── ConsensusCaseFunction.cs    # (existing) Arbiter has no tools
└── tests/
    └── unit/
        ├── Application.Tests/             # (extend) SSE streaming tests
        └── Infrastructure.Tests/          # (existing) AgentInvestigator tests

frontend/
├── src/
│   ├── api/
│   │   └── runsClient.ts                 # (modify) Add SSE investigation client
│   ├── components/
│   │   ├── ToolTracePanel.tsx             # (modify) Accept streaming updates
│   │   ├── AiVerdictPanel.tsx             # (modify) Wire streaming investigation
│   │   └── InvestigationProgress.tsx      # (modify) Show live tool trace during investigation
│   └── routes/
│       └── CaseDetailRoute.tsx            # (existing) Uses AiVerdictPanel
└── tests/
    └── components/                        # (extend) Streaming tool trace tests
```

**Structure Decision**: Extends the existing layered web application structure
from spec 001. No new projects or directories — all changes are modifications
to existing files or new files within existing directories.

## Complexity Tracking

> No violations — no entries required.
