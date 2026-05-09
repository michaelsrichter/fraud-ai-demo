---
description: "Task list for AI Agent Tools for Fraud Investigation"
---

# Tasks: AI Agent Tools for Fraud Investigation

**Feature directory**: `specs/003-agent-tools/`
**Inputs**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [contracts/sse-events.md](./contracts/sse-events.md)

**Tests**: Included. Constitution Principle VI mandates unit tests for all backend logic.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Context**: The majority of tool infrastructure (data retrieval, Code Interpreter, tool registration, system prompts, ToolTracePanel UI, Foundry Bicep) was completed in prior iterations. All original Phase 1–8 tasks (T001–T048) are done. The remaining work centers on **SSE streaming** for real-time tool trace delivery (FR-017/FR-018 clarification) and the standalone data query HTTP endpoint (FR-003).

## Format: `- [ ] [TaskID] [P?] [Story?] Description`

- **[P]**: Parallelizable — touches different files, no incomplete dependencies
- **[Story]**: `[US1]` … `[US4]` — only on user-story-phase tasks
- Include exact file paths in descriptions

## Path conventions (from plan.md)

- Backend: `backend/src/{Domain,Application,Infrastructure,Functions}/`, tests in `backend/tests/unit/`
- Frontend: `frontend/src/`, tests in `frontend/tests/`

---

## Completed phases (T001–T048)

All prior tasks from Phases 1–8 are complete:
- ✅ Phase 1: Setup (T001–T004) — packages, config, DI
- ✅ Phase 2: Foundational (T005–T013) — entities, DTOs, interfaces, tests
- ✅ Phase 3: US1 Data Retrieval (T014–T023) — query service, tool registration, agent integration
- ✅ Phase 4: US4 System Prompts (T024–T027) — investigator prompts, arbiter clean
- ✅ Phase 5: US2 Code Interpreter (T028–T032) — Foundry Toolbox MCP, graceful degradation
- ✅ Phase 6: US3 UI Tool Trace (T033–T038) — ToolTracePanel, post-completion rendering
- ✅ Phase 7: Infrastructure (T039–T042) — Foundry Bicep, RBAC, docs
- ✅ Phase 8: Polish (T043–T048) — docs, logging, consensus timeout

---

## Phase 9: Foundational — SSE Streaming Infrastructure

**Purpose**: Add the `IProgress<ToolInvocation>` callback mechanism and SSE writing utility that all streaming tasks depend on.

**⚠️ CRITICAL**: No Phase 10/11 task may start until Phase 9 is complete.

- [X] T049 Add `IProgress<ToolInvocation>?` parameter to `IAiInvestigator.InvestigateAsync` in `backend/src/Application/Abstractions/IAiInvestigator.cs` — optional parameter (default null) for streaming tool events to callers; update method signature to: `Task<AiInvestigationResult> InvestigateAsync(Run run, Case caseUnderReview, string? modelDeploymentName, float? temperature, bool allowConfidenceScores, CancellationToken cancellationToken, IProgress<ToolInvocation>? progress = null)`
- [X] T050 Modify `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — update `InvestigateAsync` to accept and use `IProgress<ToolInvocation>? progress` parameter; inside each tool delegate (data retrieval and MCP tool wrappers), after adding to the `toolInvocations` list, call `progress?.Report(invocation)` to notify the caller of each tool event in real time (research R8)
- [X] T051 [P] Create `backend/src/Functions/Endpoints/SseHelper.cs` — static helper with: `WriteSseEventAsync(Stream stream, string eventType, object data, JsonSerializerOptions options, CancellationToken ct)` that writes `event: {type}\ndata: {json}\n\n` and flushes; used by the SSE streaming endpoint (research R6)
- [X] T052 [P] Create `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorProgressTests.cs` — verify that when `IProgress<ToolInvocation>` is provided, `Report()` is called for each tool invocation; verify that when `progress` is null, no error occurs (backward compat); use a mock investigator or test the delegate callback directly

**Checkpoint**: Streaming callback mechanism in place. SSE utility ready.

---

## Phase 10: User Story 3 (streaming) — SSE Streaming Endpoint (Priority: P2)

**Goal**: Add a new SSE endpoint that streams tool invocations in real time during a single-model investigation, then emits the final result. The frontend consumes this stream to show progressive tool trace updates.

**Independent Test**: Invoke the `/investigate/stream` endpoint; `curl -N` shows `tool_call` events arriving as the agent uses tools, followed by a `complete` event with the full result.

**Maps to**: FR-017 (streaming), FR-018 (progressive rendering), contracts/sse-events.md

### Backend implementation

- [X] T053 [US3] Create `backend/src/Functions/Endpoints/InvestigateCaseStreamFunction.cs` — new Azure Function with `POST /api/runs/{runId}/cases/{caseId}/investigate/stream` route; sets response headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`; loads Run from `IRunRepository`, resolves case, creates `Progress<ToolInvocation>` that writes `tool_call` SSE events to the response stream via `SseHelper`; calls `InvestigateCaseHandler.HandleAsync` (passing the progress callback through to the investigator); persists the result **before** writing the `complete` SSE event (so the Run is saved even if the stream drops); on completion writes `complete` or `error` SSE event; handles 404 for run/case not found as JSON (not SSE). **Depends on T054** (handler must accept progress param first).
- [X] T054 [US3] Modify `backend/src/Application/Services/InvestigateCaseHandler.cs` — add optional `IProgress<ToolInvocation>? progress = null` parameter to `HandleAsync`; pass it through to `_investigator.InvestigateAsync`
- [X] T055 [P] [US3] Add Vite proxy rule for `/api/runs/*/investigate/stream` in `frontend/vite.config.ts` — ensure SSE streaming requests proxy correctly to `localhost:7071` (may already work with existing `/api` proxy rule; verify and add if needed)

### Backend tests

- [X] T056 [P] [US3] Create `backend/tests/unit/Application.Tests/InvestigateCaseHandlerStreamTests.cs` — verify that `HandleAsync` passes the `IProgress<ToolInvocation>` through to the mocked `IAiInvestigator`; verify that when progress is null, behavior is unchanged
- [X] T057 [P] [US3] Create `backend/tests/unit/Application.Tests/SseHelperTests.cs` — verify `WriteSseEventAsync` produces correct SSE format: `event: {type}\ndata: {json}\n\n`; verify it flushes the stream; verify it handles special characters in JSON correctly

### Frontend implementation

- [X] T058 [US3] Add `streamInvestigation()` function in `frontend/src/api/runsClient.ts` — accepts `(runId, caseId, options, onToolCall, onComplete, onError)` callbacks plus an optional `AbortSignal` for cancellation; uses `fetch` with POST to `/api/runs/{runId}/cases/{caseId}/investigate/stream` passing the signal; reads response body via `getReader()` + `TextDecoder`; parses SSE frames by splitting on `\n\n` boundaries; dispatches `tool_call` events to `onToolCall(ToolInvocation)`, `complete` to `onComplete(AiInvestigationResult)`, `error` to `onError`; handles stream close without terminal event as timeout error; aborts cleanly when signal fires (research R7)
- [X] T059 [US3] Modify `frontend/src/components/AiVerdictPanel.tsx` — replace the single-model `investigateCase()` call with `streamInvestigation()`; during streaming: accumulate `ToolInvocation[]` in state via `onToolCall` callback, show the `ToolTracePanel` with the growing trace array, show "Investigating..." status; on `onComplete`: set the full investigation result and stop the loading indicator; on `onError`: show error state; keep the non-streaming `investigateCase()` as fallback if the stream fails to connect
- [X] T060 [US3] Modify `frontend/src/components/ToolTracePanel.tsx` — accept an optional `isStreaming` prop; when `isStreaming=true`, render a pulsing indicator at the bottom ("Agent is reasoning..."); auto-expand the trace section when streaming (don't require the user to click to open it during an active investigation)
- [X] T061 [US3] Modify `frontend/src/components/InvestigationProgress.tsx` — when streaming is active, show the count of tool calls received so far (e.g., "🔍 3 tool calls...") instead of a generic spinner

### Frontend tests

- [X] T062 [P] [US3] Create `frontend/tests/api/streamInvestigation.test.ts` — mock `fetch` returning a `ReadableStream` with SSE-formatted chunks; verify `onToolCall` fires for each `tool_call` event; verify `onComplete` fires with parsed `AiInvestigationResult` on `complete` event; verify `onError` fires on `error` event; verify stream close without terminal event triggers error
- [X] T063 [P] [US3] Update `frontend/tests/components/ToolTracePanel.test.tsx` — add tests for `isStreaming` prop: verify pulsing indicator shown when `isStreaming=true`; verify auto-expanded when streaming; verify indicator hidden when `isStreaming=false`
- [X] T064 [P] [US3] Update `frontend/tests/components/AiVerdictPanel.test.tsx` — add test verifying streaming flow: mock `streamInvestigation`, verify tool trace grows incrementally, verify final result replaces loading state

**Checkpoint**: SSE streaming endpoint works. Frontend shows progressive tool trace. Non-streaming path preserved as fallback.

---

## Phase 11: Polish & Cross-Cutting — Streaming

**Purpose**: Documentation, configuration, and final verification for the streaming feature.

- [X] T065 [P] Update `docs/api.md` — add documentation for `POST /api/runs/{runId}/cases/{caseId}/investigate/stream` SSE endpoint with event format examples and client usage notes
- [X] T066 [P] Update `docs/components.md` — document `SseHelper`, `InvestigateCaseStreamFunction`, and the updated `streamInvestigation()` frontend client
- [X] T067 [P] Update `docs/architecture.md` — add SSE streaming flow to the investigation sequence diagram: client → SSE endpoint → AgentInvestigator (with IProgress callback) → tool_call events → complete event
- [X] T068 Run `specs/003-agent-tools/quickstart.md` validation — verify the streaming `curl` command works against `func start` and produces SSE events; fix any endpoint URL or header issues

**Checkpoint**: All streaming work complete, documented, and verified.

---

## Dependencies & Execution Order

### Phase ordering

- **Phase 9 (Foundational — SSE)** — no deps on incomplete phases; start immediately
- **Phase 10 (US3 Streaming)** — depends on Phase 9 completion
- **Phase 11 (Polish)** — depends on Phase 10 completion

### Within Phase 10

| Task | Depends on |
|---|---|
| T053 (SSE endpoint) | T049, T050, T051, **T054** (Phase 9 + handler) |
| T054 (Handler update) | T049 (interface change) |
| T055 (Vite proxy) | None (can start immediately) |
| T056, T057 (backend tests) | T051, T054 |
| T058 (stream client) | T053 (needs endpoint to exist) |
| T059 (AiVerdictPanel) | T058 (needs stream client) |
| T060 (ToolTracePanel) | None (can start immediately) |
| T061 (InvestigationProgress) | None (can start immediately) |
| T062–T064 (frontend tests) | T058, T060 |

### Parallel opportunities

- **Phase 9**: T051, T052 are `[P]` — can run parallel with T049/T050
- **Phase 10 backend**: T055, T056, T057 are `[P]`
- **Phase 10 frontend**: T060, T061 can run parallel (different files, no deps)
- **Phase 10 frontend tests**: T062, T063, T064 are all `[P]`
- **Phase 11**: T065, T066, T067 are all `[P]`

---

## Implementation strategy

**Incremental delivery**:
1. Phase 9 first — backend plumbing (IProgress callback + SseHelper)
2. Phase 10 backend — SSE endpoint + handler wiring
3. Phase 10 frontend — stream client → AiVerdictPanel → ToolTracePanel
4. Phase 11 — docs and validation

**Fallback preserved**: The existing non-streaming `POST /api/runs/{runId}/cases/{caseId}/investigate` endpoint is untouched. If streaming fails in the frontend, it can fall back to the original request-response flow.

---

## Task counts

- **New tasks**: 20 (T049–T068)
- **Phase 9 (Foundational SSE)**: 4 (T049–T052)
- **Phase 10 (US3 Streaming)**: 12 (T053–T064)
- **Phase 11 (Polish)**: 4 (T065–T068)
- **Previously completed**: 48 (T001–T048)
- **Grand total**: 68

## Independent test criteria

- **Phase 9**: `IProgress<ToolInvocation>` callback fires during mock investigation; `SseHelper` produces valid SSE format
- **Phase 10 (backend)**: `curl -N` to `/investigate/stream` shows `tool_call` + `complete` SSE events
- **Phase 10 (frontend)**: Click "Investigate" in UI → tool trace panel updates progressively → final verdict appears
- **Phase 11**: `quickstart.md` streaming curl command works end-to-end

## Suggested MVP scope

Phase 9 + Phase 10 backend tasks (T049–T057) deliver a working SSE endpoint. Phase 10 frontend tasks (T058–T064) make it visible in the UI. Phase 11 is documentation only.
