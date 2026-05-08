---
description: "Task list for AI Agent Tools for Fraud Investigation"
---

# Tasks: AI Agent Tools for Fraud Investigation

**Feature directory**: `specs/003-agent-tools/`
**Inputs**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Included. Constitution Principle VI mandates unit tests for all backend logic.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `- [ ] [TaskID] [P?] [Story?] Description`

- **[P]**: Parallelizable — touches different files, no incomplete dependencies
- **[Story]**: `[US1]` … `[US4]` — only on user-story-phase tasks
- Every implementation task names an exact file path

## Path conventions (from plan.md)

- Backend: `backend/src/{Domain,Application,Infrastructure,Functions}/`, tests in `backend/tests/unit/`
- Frontend: `frontend/src/`, tests in `frontend/tests/`
- IaC: `infra/modules/`

---

## Phase 1: Setup (new dependencies + configuration)

**Purpose**: Add new NuGet packages, app settings, and configuration classes needed for tools.

- [X] T001 Add NuGet package `ModelContextProtocol` (C# MCP SDK, GA) to `backend/src/Infrastructure/Infrastructure.csproj`
- [X] T002 [P] Add new app settings to `backend/src/Functions/local.settings.json` and `local.settings.template.json`: `Foundry__ProjectEndpoint`, `Foundry__ToolboxName` (default `fraud-ai-tools`), `Foundry__ToolboxVersion` (default `1`), `Agent__MaxToolCalls` (default `10`), `Agent__ToolTimeoutSeconds` (default `60`)
- [X] T003 [P] Extend `backend/src/Application/Configuration/Options.cs` — add `FoundryToolboxOptions` class with `ProjectEndpoint`, `ToolboxName`, `ToolboxVersion` properties; add `AgentToolOptions` class with `MaxToolCalls`, `ToolTimeoutSeconds` properties
- [X] T004 [P] Register `IOptions<FoundryToolboxOptions>` and `IOptions<AgentToolOptions>` in `backend/src/Functions/Program.cs` DI, bound from configuration sections `Foundry` and `Agent`

---

## Phase 2: Foundational (domain + DTO types)

**Purpose**: Create the new domain entities and DTOs that all user stories depend on.

**⚠️ CRITICAL**: No `[US*]` task may start until Phase 2 is complete.

- [X] T005 [P] Create `backend/src/Domain/Entities/ToolInvocation.cs` — immutable record with fields: `ToolName` (string), `Parameters` (string), `ResponseSummary` (string), `ResponseData` (string?), `Reasoning` (string?), `LatencyMs` (long), `Succeeded` (bool); constructor validation per data-model.md
- [X] T006 Modify `backend/src/Domain/Entities/AiInvestigationResult.cs` — add `IReadOnlyList<ToolInvocation>? ToolTrace` property; update constructor + factory methods `Succeeded()` / `Unavailable()` to accept optional `toolTrace` parameter (default null for backward compat)
- [X] T007 [P] Create `backend/src/Application/Dtos/RunDataQueryDto.cs` — record with filter fields: `EmployeeId` (Guid?), `Vendor` (string?), `Category` (string?), `Band` (ConfidenceBand?), `DateRangeStart` (DateTimeOffset?), `DateRangeEnd` (DateTimeOffset?), `MinAmount` (decimal?), `MaxAmount` (decimal?), `Limit` (int, default 100), `Detail` (bool, default false); validation logic per data-model.md
- [X] T008 [P] Create `backend/src/Application/Dtos/RunDataQueryResultDto.cs` — records for `RunDataQueryResult`, `QueryMetadata`, `QueryAggregates`, and `ExpenseQueryRecord` per data-model.md; `ExpenseQueryRecord` MUST NOT include `IsInjectedFraud` or `InjectedPattern` (FR-005)
- [X] T009 [P] Create `backend/src/Application/Dtos/ToolInvocationDto.cs` — serialization DTO matching `ToolInvocation` for JSON responses to the frontend
- [X] T010 [P] Create `backend/src/Application/Abstractions/IRunDataQueryService.cs` — interface: `RunDataQueryResult Query(Run run, RunDataQuery query)`
- [X] T011 [P] Create `backend/src/Application/Abstractions/IFoundryToolboxClient.cs` — interface: `Task<IReadOnlyList<AITool>?> GetToolsAsync(CancellationToken ct)` + `Task CloseAsync()`
- [X] T012 [P] Create `backend/tests/unit/Domain.Tests/ToolInvocationTests.cs` — validate constructor rejects empty ToolName, empty Parameters, negative LatencyMs
- [X] T013 [P] Create `backend/tests/unit/Domain.Tests/AiInvestigationResultToolTraceTests.cs` — verify `Succeeded()` with ToolTrace serializes correctly; verify `Unavailable()` has null ToolTrace; verify backward compat with null ToolTrace

**Checkpoint**: All types exist. User-story implementation can begin.

---

## Phase 3: User Story 1 — Agent Retrieves Run Data (Priority: P1) 🎯

**Goal**: The investigator agent can call `query_expense_data` to filter and retrieve data from the Run blob. The tool is registered with the Agent Framework and the agent uses it autonomously.

**Independent Test**: Invoke investigate on a case; the tool trace shows data retrieval calls; the rationale references data from those calls.

**Maps to**: FR-001 → FR-006, SC-003.

### Backend tests for US1

- [X] T014 [P] [US1] In `backend/tests/unit/Application.Tests/RunDataQueryServiceTests.cs` — given a fixture Run with 100 expenses, verify: (a) filter by vendor returns only matching records; (b) filter by employeeId returns correct subset; (c) filter by band returns correct band; (d) filter by date range works; (e) filter by amount range works; (f) compact mode returns aggregates + top-10 by score; (g) detail mode returns full records up to limit; (h) limit=500 max enforced; (i) empty filter matches all records; (j) `IsInjectedFraud` and `InjectedPattern` NEVER appear in output (FR-005)
- [X] T015 [P] [US1] In `backend/tests/unit/Application.Tests/RunDataQueryServiceTests.cs` (extend) — verify compact mode aggregates: mean, median, min, max amounts are correct; distinct vendor/category/employee counts are correct
- [X] T016 [P] [US1] In `backend/tests/unit/Application.Tests/RunDataQueryServiceTests.cs` (extend) — verify empty result set returns zero-count metadata and null aggregates/records gracefully

### Backend implementation for US1

- [X] T017 [US1] Implement `backend/src/Application/Services/RunDataQueryService.cs` (`IRunDataQueryService`) — pure filter + aggregation logic: accepts `(Run, RunDataQuery)`, applies all filters (AND logic), computes compact aggregates or returns detail records, strips `IsInjectedFraud`/`InjectedPattern`, respects `limit` cap at 500, sorts by confidence descending
- [X] T018 [US1] Implement `backend/src/Functions/Endpoints/ExpenseDataQueryFunction.cs` — `POST /api/runs/{runId}/tools/expenses/query`; loads Run from `IRunRepository`, deserializes `RunDataQuery` from body, delegates to `IRunDataQueryService`, returns `RunDataQueryResult` JSON; returns 404 if run not found
- [X] T019 [US1] Wire `IRunDataQueryService` → `RunDataQueryService` in `backend/src/Functions/Program.cs` DI

### Agent integration for US1

- [X] T020 [US1] In `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — create a private method `CreateDataRetrievalTool(Run run)` that returns an `AIFunction` wrapping `RunDataQueryService.Query()` with the Run captured in closure; the function accepts filter parameters as a JSON string, parses to `RunDataQuery`, calls the service, serializes the result, and includes a call counter enforcing `MaxToolCalls` (FR-013)
- [X] T021 [US1] In `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — modify `InvestigateAsync` to: (a) create the data retrieval tool via `CreateDataRetrievalTool(run)`, (b) pass it in `ChatOptions.Tools`, (c) set `ChatOptions.ToolMode = ChatToolMode.Auto`, (d) extend timeout to 60s when tools are present (FR-021)
- [X] T022 [US1] In `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — after `agent.RunAsync()`, iterate `response.Messages` to build `IReadOnlyList<ToolInvocation>` capturing each tool call (name, parameters, response summary, latency, success), plus any intermediate assistant reasoning messages (FR-017); pass to `AiInvestigationResult.Succeeded()`; add `ILogger` structured logging for each tool invocation: tool name, parameters summary, latency, success/failure (FR-012)
- [X] T023 [P] [US1] Add unit test in `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorToolTests.cs` — verify `CreateDataRetrievalTool` returns correctly filtered results when called with test parameters; verify it strips ground-truth labels; verify call counter returns "max reached" message after configured limit

**Checkpoint US1**: Data retrieval tool works in-process. Agent can query run data and tool trace is captured.

---

## Phase 4: User Story 4 — System Prompts Updated (Priority: P1)

**Goal**: System prompts describe and encourage tool use for investigators; arbiter prompt has NO tool references.

**Maps to**: FR-014 → FR-016.

- [X] T024 [US4] Update the system prompt in `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — append the "AVAILABLE TOOLS" and "TOOL USAGE GUIDANCE" sections from plan.md §R4 after the FEATURE MEANINGS section and before the JSON output format
- [X] T025 [US4] Verify the arbiter system prompt in `backend/src/Functions/Endpoints/ConsensusCaseFunction.cs` does NOT contain any tool descriptions or tool-usage encouragement (FR-016)
- [X] T026 [P] [US4] Add unit test in `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorTests.cs` — verify system prompt contains "query_expense_data" and "code_interpreter" tool descriptions, "TOOL USAGE GUIDANCE" section, and "ALWAYS use" encouragement language (FR-014, FR-015)
- [X] T027 [P] [US4] Add unit test verifying arbiter prompt does NOT contain "query_expense_data", "code_interpreter", or "TOOL USAGE" (FR-016)

**Checkpoint US4**: Prompts guide tool use. Arbiter is clean.

---

## Phase 5: User Story 2 — Code Interpreter via Foundry Toolbox (Priority: P2)

**Goal**: The agent can invoke the Foundry Code Interpreter to execute Python code during an investigation. Connected via MCP.

**Independent Test**: Investigation on an ambiguous case shows Code Interpreter usage in the tool trace with Python code + output.

**Maps to**: FR-007 → FR-009, FR-010.

### Backend implementation for US2

- [X] T028 [US2] Implement `backend/src/Infrastructure/Ai/FoundryToolboxClient.cs` (`IFoundryToolboxClient`) — connects to the Foundry Toolbox MCP endpoint using `ModelContextProtocol` SDK; auth via `DefaultAzureCredential` with scope `https://ai.azure.com/.default` using a custom `DelegatingHandler` (bearer token injection); `GetToolsAsync()` returns MCP tools as `AITool[]`; `CloseAsync()` disconnects; graceful degradation: returns null on connection failure (FR-009) with warning log
- [X] T029 [US2] Wire `IFoundryToolboxClient` → `FoundryToolboxClient` in `backend/src/Functions/Program.cs` DI as a singleton (connection reuse across investigations)
- [X] T030 [US2] In `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — modify `InvestigateAsync` to: (a) call `IFoundryToolboxClient.GetToolsAsync()` to get MCP tools, (b) add them to `ChatOptions.Tools` alongside the data retrieval tool, (c) if toolbox returns null, proceed with data retrieval only and log warning
- [X] T031 [P] [US2] Add unit test in `backend/tests/unit/Infrastructure.Tests/FoundryToolboxClientTests.cs` — mock the MCP SDK to verify: (a) correct toolbox URL construction from config, (b) bearer token injection with correct scope, (c) graceful null return on connection failure, (d) tools are returned on success
- [X] T032 [P] [US2] Add unit test in `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorToolTests.cs` (extend) — verify that when toolbox returns null, agent still has data retrieval tool and investigation succeeds; verify that when toolbox returns tools, they appear in ChatOptions.Tools

**Checkpoint US2**: Code Interpreter available via MCP. Graceful degradation if unavailable.

---

## Phase 6: User Story 3 — UI Tool Trace Display (Priority: P2)

**Goal**: The frontend displays tool invocations in a collapsible trace panel within the AI verdict. Each tool call shows name, parameters, response, and reasoning.

**Independent Test**: After a tool-augmented investigation, the case detail shows the trace with expandable tool call cards.

**Maps to**: FR-017 → FR-020, SC-005.

### Frontend types & API

- [X] T033 [US3] Update `frontend/src/api/runsClient.ts` — add `ToolInvocation` type with fields `toolName`, `parameters`, `responseSummary`, `responseData`, `reasoning`, `latencyMs`, `succeeded`; extend `AiInvestigationResult` type with optional `toolTrace: ToolInvocation[]`; extend `ConsensusModelResult` with optional `toolTrace: ToolInvocation[]`

### Frontend implementation

- [X] T034 [US3] Create `frontend/src/components/ToolTracePanel.tsx` — collapsible "Agent Reasoning Trace" section; renders each `ToolInvocation` as a card with: tool icon + name, collapsible parameters (JSON formatted), response summary (always visible), reasoning text (if present); for Code Interpreter: render submitted Python code in a `<pre>` code block, execution output with "show more" truncation at 500 chars (FR-020)
- [X] T035 [US3] Modify `frontend/src/components/AiVerdictPanel.tsx` — render `ToolTracePanel` inside the single-model result section after the rationale (when `toolTrace` is non-null/non-empty); show "No tools invoked" when trace is null/empty
- [X] T036 [US3] Modify `frontend/src/components/AiVerdictPanel.tsx` — in the consensus side-by-side grid, render `ToolTracePanel` inside each model's column panel (FR-019)

### Frontend tests

- [X] T037 [P] [US3] Create `frontend/tests/components/ToolTracePanel.test.tsx` — given a ToolInvocation with `query_expense_data`, renders tool name, parameters, response summary; given a Code Interpreter invocation, renders Python code block and output; given empty trace, renders "No tools invoked" or is absent
- [X] T038 [P] [US3] Update `frontend/tests/components/AiVerdictPanel.test.tsx` — add test verifying ToolTracePanel renders when investigation has toolTrace; verify it does NOT render when toolTrace is null

**Checkpoint US3**: Tool trace visible in the UI for both single-model and consensus investigations.

---

## Phase 7: Infrastructure — Foundry Project + Toolbox

**Purpose**: Provision the Foundry infrastructure for the Code Interpreter toolbox.

- [X] T039 Modify `infra/modules/foundry.bicep` — add Foundry AI Hub (`Microsoft.MachineLearningServices/workspaces` kind `Hub`) linked to the existing AI Services account; add Foundry Project linked to the Hub; output `projectEndpoint`
- [X] T040 [P] Document toolbox creation steps in `docs/setup.md` — if the Foundry Toolbox cannot be provisioned in Bicep (requires portal), document the manual steps: create toolbox named `fraud-ai-tools` with Code Interpreter tool in the Foundry Project
- [X] T041 Modify `infra/modules/functions.bicep` — add app settings `Foundry__ProjectEndpoint`, `Foundry__ToolboxName`, `Foundry__ToolboxVersion` wired from foundry module outputs
- [X] T042 [P] Modify `infra/modules/rbac.bicep` — if the Foundry Hub/Project requires additional RBAC for the Function App MI or deploying user, add the necessary role assignments

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Documentation, logging, and final verification.

- [X] T043 [P] Update `docs/api.md` — add documentation for `POST /api/runs/{runId}/tools/expenses/query` endpoint with request/response examples for both compact and detail modes
- [X] T044 [P] Update `docs/components.md` — document `RunDataQueryService`, `FoundryToolboxClient`, `ToolTracePanel`, and the updated `AgentInvestigator` tool registration
- [X] T045 [P] Update `docs/architecture.md` — add tool-calling flow to the data flow diagram: agent → data retrieval (in-process) → Code Interpreter (MCP → Foundry Toolbox)
- [X] T046 [P] Verify `ILogger` structured logging in `AgentInvestigator` covers each tool invocation: tool name, parameters summary, latency, success/failure (FR-012) — logging is implemented in T022 but this task verifies completeness and adds any missing fields
- [X] T047 Modify `backend/src/Functions/Endpoints/ConsensusCaseFunction.cs` — update timeout to 60s (FR-021); ensure per-model tool traces are included in the consensus response `models[].toolTrace`
- [X] T048 Update `backend/src/Functions/Endpoints/PreviewPromptFunction.cs` — ensure the preview shows the updated system prompt with tool descriptions so presenters can see the AVAILABLE TOOLS section

**Checkpoint**: All tools working, UI displaying traces, docs updated, logging in place.

---

## Dependencies & Execution Order

### Phase ordering

- **Setup (Phase 1)** — no deps; start immediately
- **Foundational (Phase 2)** — depends on Setup; blocks all `[US*]` tasks
- **US1 (Phase 3)** — depends on Phase 2; data retrieval tool + agent integration
- **US4 (Phase 4)** — depends on Phase 2; can run in parallel with US1
- **US2 (Phase 5)** — depends on Phase 2 + US1 (needs tool registration pattern from T021); Code Interpreter
- **US3 (Phase 6)** — depends on US1 (needs ToolTrace types); frontend trace display
- **Infra (Phase 7)** — independent of backend; can run in parallel with any phase
- **Polish (Phase 8)** — depends on US1–US4 being complete

### Story dependencies

| Story | Hard deps | Soft deps |
|---|---|---|
| US1 (P1) | Phase 2 only | — |
| US4 (P1) | Phase 2 only | US1 for testing prompt effectiveness |
| US2 (P2) | Phase 2, US1 (tool registration pattern) | Infra (Phase 7) for deployed toolbox |
| US3 (P2) | Phase 2, US1 (ToolTrace types in API) | US2 for Code Interpreter trace examples |

### Parallel opportunities

- **Phase 1**: T001–T004 are all `[P]`
- **Phase 2**: T005, T007–T013 are all `[P]` (T006 depends on T005 for ToolInvocation type)
- **Phase 3 tests**: T014–T016, T023 are all `[P]`
- **Phase 4**: T024–T027 — T026 and T027 are `[P]`
- **Phase 5 tests**: T031, T032 are `[P]`
- **Phase 6 tests**: T037, T038 are `[P]`
- **Phase 7**: T039–T042 — T040, T042 are `[P]`
- **Phase 8**: T043–T046 are all `[P]`

---

## Implementation strategy

**MVP first**: Finish Phases 1, 2, 3, and 4. At that point:
- The data retrieval tool works in-process
- System prompts guide tool use
- Agents autonomously query run data during investigations
- Tool trace is captured and returned in the API response

**Incremental delivery after MVP**:
1. **Phase 6 (US3)** — frontend tool trace display (makes tools visible)
2. **Phase 5 (US2)** — Code Interpreter via Foundry Toolbox (requires infra)
3. **Phase 7** — infrastructure provisioning
4. **Phase 8** — docs + polish

---

## Task counts

- **Total tasks**: 48
- **Setup (Phase 1)**: 4 (T001–T004)
- **Foundational (Phase 2)**: 9 (T005–T013)
- **US1 — Data Retrieval (Phase 3)**: 10 (T014–T023)
- **US4 — System Prompts (Phase 4)**: 4 (T024–T027)
- **US2 — Code Interpreter (Phase 5)**: 5 (T028–T032)
- **US3 — UI Tool Trace (Phase 6)**: 6 (T033–T038)
- **Infra (Phase 7)**: 4 (T039–T042)
- **Polish (Phase 8)**: 6 (T043–T048)

## Independent test criteria

- **US1**: Invoke investigate → tool trace shows `query_expense_data` calls → rationale references retrieved data
- **US4**: Preview AI prompt → contains AVAILABLE TOOLS section; arbiter prompt → no tool references
- **US2**: Invoke investigate → tool trace shows `code_interpreter` call with Python code + output
- **US3**: Case detail UI → collapsible "Agent Reasoning Trace" with tool call cards
