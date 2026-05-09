# Implementation Plan: AI Investigation Modes

**Branch**: `004-investigation-modes` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-investigation-modes/spec.md`

## Summary

Add two new AI investigation modes (Debate and Junior → Senior) to the existing fraud investigation demo framework, alongside the existing Single Agent and Consensus modes. The UI is refactored to a tabbed mode selector with per-mode configuration panels and prompt viewers. All four modes share the same case input format, tools, base prompt, and output schema. New backend endpoints handle orchestration for each new mode (parallel adversarial agents + arbiter for Debate; sequential escalation pipeline for Junior → Senior). Results for the new modes are transient (not persisted), consistent with the Consensus pattern.

## Technical Context

**Language/Version**: C# (.NET 10, isolated worker) for backend; TypeScript 5 + React 19 for frontend
**Primary Dependencies**: Microsoft.Agents.AI (GA), Microsoft.Extensions.AI, Azure.AI.OpenAI, Azure Functions (isolated worker), Vite, React, TanStack Query
**Storage**: Azure Blob Storage (existing run persistence via `IRunRepository`; new modes are transient — no storage changes)
**Testing**: xUnit + NSubstitute for backend; Vitest + Testing Library for frontend
**Target Platform**: Azure Functions (backend) + Azure Static Web Apps (frontend)
**Project Type**: Web application (serverless API + SPA)
**Performance Goals**: Sub-second mode switching; AI investigation latency bounded by model response time (~30-180s)
**Constraints**: Transient new-mode results (no persistence); existing endpoints unchanged; GA-only agent framework
**Scale/Scope**: 4 investigation modes, 2 new backend endpoints, ~5 new/modified frontend components, ~4 new backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Platform & Deployment | ✅ PASS | New endpoints are Azure Functions; frontend remains SWA. No new infra resources. |
| II | Source Control & CI/CD | ✅ PASS | All code in repo; CI pipeline unchanged. No new secrets needed. |
| III | AI & Agent Framework | ✅ PASS | Uses existing Microsoft Foundry (AI Services) + GA Agent Framework. New modes reuse `IAiInvestigator` interface. No preview APIs. |
| IV | Security & Identity | ✅ PASS | New endpoints use same Managed Identity auth. No new secrets/keys. |
| V | Code Quality & Architecture | ✅ PASS | New endpoints follow existing layered pattern. Debate/JuniorSenior functions match ConsensusCaseFunction style (Infrastructure layer for AI calls, Function layer for HTTP). |
| VI | Testing Requirements | ✅ PASS | Unit tests required for all new backend logic. Frontend component tests for mode switching. |
| VII | Documentation | ✅ PASS | API docs updated. Inline comments on prompt design and escalation logic. |
| VIII | Observability & Reliability | ✅ PASS | Graceful degradation on model failure (return Unavailable status). Logging on all AI calls. |
| IX | Configuration & Flexibility | ✅ PASS | Models/thresholds configured via code constants (demo scope). Temperature exposed via API. |
| X | Performance Expectations | ✅ PASS | No new performance bottlenecks; parallel execution for Debate minimizes latency. |
| XI | Development Experience | ✅ PASS | Same local dev workflow (func start + vite dev). No new infrastructure dependencies. |
| XII | Library-First Algorithms | ✅ PASS | No new algorithmic work — uses existing AI/ML infrastructure. |

**Gate result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/004-investigation-modes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── Application/
│   │   ├── Abstractions/
│   │   │   └── IAiInvestigator.cs          # existing — extended (backward-compatible optional systemPromptOverride parameter)
│   │   └── Services/
│   │       └── InvestigateCaseHandler.cs    # existing — unchanged
│   ├── Domain/
│   │   ├── Entities/
│   │   │   ├── AiInvestigationResult.cs     # existing — unchanged
│   │   │   └── ToolInvocation.cs            # existing — unchanged
│   │   └── Projections/
│   │       └── Case.cs                      # existing — unchanged
│   ├── Functions/
│   │   └── Endpoints/
│   │       ├── ConsensusCaseFunction.cs     # existing — unchanged
│   │       ├── InvestigateCaseStreamFunction.cs  # existing — unchanged
│   │       ├── PreviewPromptFunction.cs     # existing — unchanged
│   │       ├── DebateCaseFunction.cs        # NEW — Debate mode endpoint
│   │       └── JuniorSeniorCaseFunction.cs  # NEW — Junior → Senior endpoint
│   └── Infrastructure/
│       └── Ai/
│           └── AgentInvestigator.cs         # existing — add BiasedSystemPrompt + expose prompts API
├── tests/
│   └── unit/
│       ├── Infrastructure.Tests/
│       │   └── AgentInvestigatorTests.cs    # existing — add bias prompt tests
│       └── Functions.Tests/                 # NEW or extend — endpoint tests for new modes
│           ├── DebateCaseFunctionTests.cs
│           └── JuniorSeniorCaseFunctionTests.cs

frontend/
├── src/
│   ├── api/
│   │   ├── runsClient.ts                   # extend — add debateInvestigate, juniorSeniorInvestigate, DebateResult, JuniorSeniorResult types, InvestigationMode union
│   │   └── types.ts                        # existing — unchanged
│   ├── components/
│   │   ├── AiVerdictPanel.tsx              # REFACTOR — extract mode tabs, delegate to per-mode panels
│   │   ├── ModeTabBar.tsx                  # NEW — horizontal tab bar component
│   │   ├── SingleAgentPanel.tsx            # NEW — extracted from AiVerdictPanel
│   │   ├── ConsensusPanel.tsx              # NEW — extracted from AiVerdictPanel
│   │   ├── DebatePanel.tsx                 # NEW — Debate mode UI
│   │   ├── JuniorSeniorPanel.tsx           # NEW — Junior → Senior mode UI
│   │   ├── PromptViewer.tsx                # NEW — reusable prompt/instruction viewer
│   │   ├── InvestigationProgress.tsx       # extend — add "debate" and "junior-senior" modes
│   │   └── ToolTracePanel.tsx              # existing — unchanged
│   └── routes/
│       └── CaseDetailRoute.tsx             # may need minor prop adjustments
├── tests/
│   └── components/
│       ├── ModeTabBar.test.tsx             # NEW
│       ├── DebatePanel.test.tsx            # NEW
│       └── JuniorSeniorPanel.test.tsx      # NEW
```

**Structure Decision**: Follows existing web application structure (Option 2). New endpoints added to `Functions/Endpoints/`, new components to `frontend/src/components/`. The large `AiVerdictPanel` is decomposed into per-mode panels orchestrated by a tab bar, keeping each mode self-contained.

## Complexity Tracking

> No constitution violations to justify. All changes follow existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                   |
