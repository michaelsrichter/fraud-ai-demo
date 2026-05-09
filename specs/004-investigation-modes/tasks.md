# Tasks: AI Investigation Modes

**Input**: Design documents from `/specs/004-investigation-modes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Extend the backend interface to support system prompt overrides needed by new modes

- [X] T001 Add optional `systemPromptOverride` parameter to `IAiInvestigator.InvestigateAsync` in `backend/src/Application/Abstractions/IAiInvestigator.cs` — backward-compatible (default null)
- [X] T002 Update `AgentInvestigator.InvestigateAsync` in `backend/src/Infrastructure/Ai/AgentInvestigator.cs` to use `systemPromptOverride` when non-null instead of the hardcoded `SystemPrompt`
- [X] T003 Expose debate bias prompts and junior/senior prompt extensions as `public static string` fields on `AgentInvestigator` in `backend/src/Infrastructure/Ai/AgentInvestigator.cs` — fraud-leaning bias, non-fraud-leaning bias, debate arbiter prompt, junior confidence prompt extension, senior preamble template
- [X] T003a [P] Unit tests for bias prompt fields and `systemPromptOverride` in `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorTests.cs` — verify override replaces default prompt; verify null override uses default; verify all new prompt constants are non-empty (Constitution VI)

**Checkpoint**: Backend interface ready for new modes. All existing callers unaffected (pass null).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Frontend types and API client functions needed before any UI work can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Add `DebateResult` and `JuniorSeniorResult` TypeScript interfaces in `frontend/src/api/runsClient.ts` per data-model.md response DTOs
- [X] T005 [P] Add `debateInvestigate` API client function in `frontend/src/api/runsClient.ts` — POST to `/api/runs/{runId}/cases/{caseId}/debate` with model, temperature, allowConfidenceScores
- [X] T006 [P] Add `juniorSeniorInvestigate` API client function in `frontend/src/api/runsClient.ts` — POST to `/api/runs/{runId}/cases/{caseId}/junior-senior` with temperature, allowConfidenceScores
- [X] T007 [P] Add `InvestigationMode` type union (`"single" | "consensus" | "debate" | "junior-senior"`) and mode metadata (label, description, icon) in `frontend/src/api/runsClient.ts`

**Checkpoint**: Frontend foundation ready — all types and API functions available for UI components.

---

## Phase 3: User Story 1 — Mode Selection & Switching (Priority: P1) 🎯 MVP

**Goal**: Horizontal tab bar for switching between 4 investigation modes, with only the active mode panel visible

**Independent Test**: Navigate to any case detail, click each tab, verify only the active panel renders with its strategy description

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `ModeTabBar` component in `frontend/src/components/ModeTabBar.tsx` — horizontal tab bar rendering 4 modes with icons, labels, and brief descriptions; accepts `activeMode` and `onModeChange` props; visually highlights active tab (FR-030, FR-034)
- [X] T009 [P] [US1] Extract Single Agent logic from `AiVerdictPanel` into `frontend/src/components/SingleAgentPanel.tsx` — move model selection, temperature, confidence toggle, streaming state, investigate/re-investigate buttons, and single-model result display; accept same props as current AiVerdictPanel
- [X] T010 [US1] Extract Consensus logic from `AiVerdictPanel` into `frontend/src/components/ConsensusPanel.tsx` — move consensus button, loading state, 3-model grid, and arbiter display; accept runId, caseId, temperature, allowConfidenceScores props
- [X] T011 [US1] Refactor `AiVerdictPanel` in `frontend/src/components/AiVerdictPanel.tsx` — replace inline mode logic with `ModeTabBar` + conditional rendering of `SingleAgentPanel`, `ConsensusPanel`, and placeholder divs for Debate/JuniorSenior; manage `activeMode` state (FR-030, FR-031)
- [X] T012 [US1] Update `InvestigationProgress` component in `frontend/src/components/InvestigationProgress.tsx` — add `"debate"` and `"junior-senior"` to the `mode` prop type union with appropriate progress labels

### Tests for User Story 1

- [X] T012a [P] [US1] Create `ModeTabBar.test.tsx` in `frontend/tests/components/ModeTabBar.test.tsx` — render all 4 tabs; verify click fires `onModeChange`; verify active tab has highlighted styling

**Checkpoint**: Mode switching works. Single Agent and Consensus panels render correctly from their new component files. Debate and Junior → Senior show placeholder content.

---

## Phase 4: User Story 2 — Debate Mode Investigation (Priority: P1)

**Goal**: Two opposing AI agents (fraud-leaning vs non-fraud-leaning) independently review a case, then an arbiter produces the final verdict

**Independent Test**: Select Debate tab, configure model/temperature, run investigation, see both agent findings and arbiter verdict

### Backend for User Story 2

- [X] T013a [P] [US2] Unit tests for `DebateCaseFunction` in `backend/tests/unit/Infrastructure.Tests/DebateCaseFunctionTests.cs` — mock `IAiInvestigator` to return canned results; verify both agents called in parallel with correct `systemPromptOverride`; verify arbiter receives both findings; verify partial failure path (one agent unavailable, arbiter still runs); verify full failure returns Unavailable status (Constitution VI)
- [X] T013 [P] [US2] Create `DebateCaseFunction` in `backend/src/Functions/Endpoints/DebateCaseFunction.cs` — POST `/api/runs/{runId}/cases/{caseId}/debate`; parse model/temperature/allowConfidenceScores from body; load case from `IRunRepository`; run fraud-leaning and non-fraud-leaning agents in parallel via `IAiInvestigator.InvestigateAsync` with `systemPromptOverride`; run arbiter LLM (following `ConsensusCaseFunction.RunArbiterAsync` pattern); return `DebateResponse` JSON per contracts/api.md (FR-010 through FR-015)

### Frontend for User Story 2

- [X] T014 [US2] Create `DebatePanel` component in `frontend/src/components/DebatePanel.tsx` — model selector, temperature slider, confidence toggle, "Run Debate Investigation" button; call `debateInvestigate`; display fraud-leaning and non-fraud-leaning agent results side by side with role labels ("🔴 Fraud Advocate" / "🟢 Defense Advocate"); display arbiter final verdict with agreements/disagreements (FR-010, FR-015, FR-034)
- [X] T015 [US2] Wire `DebatePanel` into `AiVerdictPanel` in `frontend/src/components/AiVerdictPanel.tsx` — replace Debate placeholder with `DebatePanel` component, pass runId, caseId props

### Tests for User Story 2

- [X] T015a [P] [US2] Create `DebatePanel.test.tsx` in `frontend/tests/components/DebatePanel.test.tsx` — render panel; verify model selector and temperature controls present; mock `debateInvestigate`; verify loading state; verify fraud-leaning and non-fraud-leaning results displayed with role labels; verify arbiter verdict rendered

**Checkpoint**: Full Debate mode works end-to-end — two opposing agents + arbiter verdict displayed.

---

## Phase 5: User Story 3 — Junior → Senior Escalation (Priority: P2)

**Goal**: Junior agent (cheap model) reviews case first; if confidence ≤ 0.85, escalates to senior agent (premium model)

**Independent Test**: Run Junior → Senior on multiple cases; verify high-confidence cases show junior-only result, low-confidence cases show escalation + senior result

### Backend for User Story 3

- [X] T016a [P] [US3] Unit tests for `JuniorSeniorCaseFunction` in `backend/tests/unit/Infrastructure.Tests/JuniorSeniorCaseFunctionTests.cs` — mock `IAiInvestigator`; verify junior called with gpt-5.4-mini and confidence prompt; verify confidence > 0.85 returns without senior call; verify confidence ≤ 0.85 triggers senior with gpt-5.4 and junior findings; verify senior unavailable falls back to junior result (Constitution VI)
- [X] T016 [P] [US3] Create `JuniorSeniorCaseFunction` in `backend/src/Functions/Endpoints/JuniorSeniorCaseFunction.cs` — POST `/api/runs/{runId}/cases/{caseId}/junior-senior`; parse temperature/allowConfidenceScores from body; load case; run junior agent (gpt-5.4-mini) with confidence-score-extended system prompt override; parse `confidenceScore` from response JSON; if > 0.85 return with `escalated: false`; otherwise run senior agent (gpt-5.4) with senior preamble + junior findings; return `JuniorSeniorResponse` per contracts/api.md (FR-020 through FR-026)

### Frontend for User Story 3

- [X] T017 [US3] Create `JuniorSeniorPanel` component in `frontend/src/components/JuniorSeniorPanel.tsx` — temperature slider, confidence toggle, "Run Investigation" button; call `juniorSeniorInvestigate`; display junior result with confidence score and progress bar; if escalated show escalation indicator + senior result; if not escalated show "✅ High confidence — no escalation needed" badge; display escalation threshold (FR-020, FR-026, FR-034)
- [X] T018 [US3] Wire `JuniorSeniorPanel` into `AiVerdictPanel` in `frontend/src/components/AiVerdictPanel.tsx` — replace Junior → Senior placeholder with `JuniorSeniorPanel` component, pass runId, caseId props

### Tests for User Story 3

- [X] T018a [P] [US3] Create `JuniorSeniorPanel.test.tsx` in `frontend/tests/components/JuniorSeniorPanel.test.tsx` — render panel; verify temperature control present and model selector absent; mock `juniorSeniorInvestigate`; verify non-escalated result shows confidence badge; verify escalated result shows junior + senior sections

**Checkpoint**: Full Junior → Senior mode works end-to-end — escalation and non-escalation paths both render correctly.

---

## Phase 6: User Story 4 — Prompt & Instruction Visibility (Priority: P2)

**Goal**: Each mode panel shows its active prompts/instructions in a collapsible, scrollable code-style container with labeled sections

**Independent Test**: Open prompt viewer in each mode; verify all relevant prompts are displayed with clear type labels

### Implementation for User Story 4

- [X] T019 [P] [US4] Create `PromptViewer` component in `frontend/src/components/PromptViewer.tsx` — collapsible panel with toggle button; accepts array of `{ label: string, content: string }` prompt sections; renders each in a labeled, scrollable `<pre>` container with monospace font; distinguishes system instructions, bias instructions, arbiter prompts via label styling (FR-033)
- [X] T020 [P] [US4] Add prompts endpoint `GET /api/prompts` in `backend/src/Functions/Endpoints/PromptsFunction.cs` — returns all static prompt constants from `AgentInvestigator`: base system prompt, fraud-leaning bias, non-fraud-leaning bias, debate arbiter prompt, junior confidence extension, senior preamble template; also return the consensus arbiter prompt from `ConsensusCaseFunction.ArbiterSystemPrompt` (expose as internal static or pass via DI)
- [X] T021 [US4] Integrate `PromptViewer` into `SingleAgentPanel` in `frontend/src/components/SingleAgentPanel.tsx` — show base system prompt section
- [X] T022 [US4] Integrate `PromptViewer` into `ConsensusPanel` in `frontend/src/components/ConsensusPanel.tsx` — show base system prompt + consensus arbiter prompt sections
- [X] T023 [US4] Integrate `PromptViewer` into `DebatePanel` in `frontend/src/components/DebatePanel.tsx` — show base system prompt, fraud-leaning bias, non-fraud-leaning bias, and debate arbiter prompt sections
- [X] T024 [US4] Integrate `PromptViewer` into `JuniorSeniorPanel` in `frontend/src/components/JuniorSeniorPanel.tsx` — show base system prompt, junior confidence extension, and senior preamble sections

**Checkpoint**: All four mode panels display their full prompt stack with clear labels. PromptViewer is reusable across all modes.

---

## Phase 7: User Story 5 — Existing Modes Regression Verification (Priority: P1)

**Goal**: Confirm Single Agent and Consensus modes function identically to pre-refactor behavior

**Independent Test**: Run Single Agent and Consensus investigations on existing cases; verify streaming, tool traces, results, and UI behavior match current implementation

### Implementation for User Story 5

- [X] T025 [P] [US5] Run existing backend unit tests via `dotnet test backend/tests/unit/` — confirm all pass with no regressions after `IAiInvestigator` interface change
- [X] T026 [P] [US5] Run existing frontend tests via `npx vitest run` in `frontend/` — confirm all pass after AiVerdictPanel refactor
- [X] T027 [US5] Manual smoke test: Single Agent mode — navigate to case detail, select Single Agent tab, select model, set temperature, run investigation, verify streaming tool traces and result display match pre-refactor behavior (FR-040)
- [X] T028 [US5] Manual smoke test: Consensus mode — navigate to case detail, select Consensus tab, run consensus, verify 3-model grid and arbiter verdict display match pre-refactor behavior (FR-041)

**Checkpoint**: No regressions. Existing functionality preserved through refactoring.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, edge case handling, and final cleanup

- [X] T029 Update API documentation in `docs/api.md` — add Debate and Junior → Senior endpoint sections with request/response examples per contracts/api.md
- [X] T030 Add graceful error handling for partial agent failure in `DebateCaseFunction` — if one debate agent fails, arbiter still runs on available findings with a note about the missing perspective (edge case from spec.md)
- [X] T031 Add graceful error handling for senior unavailability in `JuniorSeniorCaseFunction` — if senior agent fails during escalation, return junior result with escalation attempted note (edge case from spec.md)
- [X] T032 Add mode-switch state cleanup in `AiVerdictPanel` — when user switches modes, clear previous mode's results to prevent showing stale data from a different mode (edge case from spec.md)

---

## Dependencies

```
Phase 1 (T001-T003): Setup — no dependencies
Phase 2 (T004-T007): Foundational — no dependencies (parallel with Phase 1)
  │
  ├── Phase 3 (T008-T012): US1 Mode Selection — depends on Phase 2
  │     │
  │     ├── Phase 4 (T013-T015): US2 Debate — depends on Phase 1 + Phase 3
  │     │
  │     ├── Phase 5 (T016-T018): US3 Junior→Senior — depends on Phase 1 + Phase 3
  │     │
  │     └── Phase 6 (T019-T024): US4 Prompts — depends on Phase 3 + Phase 4 + Phase 5
  │
  └── Phase 7 (T025-T028): US5 Regression — depends on Phase 3
      │
      └── Phase 8 (T029-T032): Polish — depends on Phase 4 + Phase 5 + Phase 7
```

## Parallel Execution Opportunities

**Phase 1 + Phase 2**: Can execute simultaneously (backend interface + frontend types)

**Within Phase 3**: T008 (ModeTabBar) can run in parallel with T009 (SingleAgentPanel extraction) and T010 (ConsensusPanel extraction)

**Phase 4 + Phase 5**: Once Phase 3 is complete, Debate backend (T013) and Junior→Senior backend (T016) can run in parallel

**Within Phase 6**: T019 (PromptViewer) and T020 (prompts endpoint) can run in parallel; T021-T024 (per-mode integration) can run in parallel after T019

**Phase 7**: T025 and T026 can run in parallel

## Implementation Strategy

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (US1) — delivers the mode switching UI with existing modes extracted into clean components. Debate/Junior→Senior show placeholders. This is the minimum viable demo-ready increment.

**Incremental delivery**:
1. **Increment 1** (MVP): Phases 1-3 — Mode tab bar + extracted panels
2. **Increment 2**: Phase 4 — Debate mode (highest demo impact)
3. **Increment 3**: Phase 5 — Junior → Senior mode
4. **Increment 4**: Phase 6 — Prompt visibility across all modes
5. **Increment 5**: Phases 7-8 — Regression verification + polish
