---
description: "Task list for AI-Powered Internal Expense Fraud Demo"
---

# Tasks: AI-Powered Internal Expense Fraud Demo

**Feature directory**: `specs/001-expense-fraud-demo/`
**Inputs**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.openapi.yaml](./contracts/api.openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Included by default. Constitution Principle VI **mandates** unit tests for all backend logic; CI MUST run them and fail on any failure.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demoed independently.

## Format: `- [ ] [TaskID] [P?] [Story?] Description`

- **[P]**: Parallelizable — touches different files and has no incomplete dependencies
- **[Story]**: `[US1]` … `[US4]` — only on user-story-phase tasks; never on Setup, Foundational, or Polish
- Every implementation task names an exact file path

## Path conventions (from plan.md)

- Backend: `backend/src/{Domain,Application,Infrastructure,Functions}/`, tests in `backend/tests/unit/{Domain,Application,Infrastructure}.Tests/`
- Frontend: `frontend/src/`, tests in `frontend/tests/`
- IaC: `infra/main.bicep` + `infra/modules/*.bicep`
- Docs: `docs/`
- CI: `.github/workflows/ci-cd.yml`

---

## Phase 1: Setup (shared scaffolding)

**Purpose**: Create the empty repo skeleton, dependencies, and tooling. No business logic yet.

- [ ] T001 Create top-level structure per [plan.md](./plan.md): `backend/`, `frontend/`, `infra/`, `infra/modules/`, `docs/`, `.github/workflows/`
- [ ] T002 [P] Create `backend/fraud-ai-demo.sln` and empty C# projects: `backend/src/Domain/Domain.csproj`, `backend/src/Application/Application.csproj`, `backend/src/Infrastructure/Infrastructure.csproj`, `backend/src/Functions/Functions.csproj` (Functions = .NET 9 isolated worker, others = `net9.0`); add solution-wide `Directory.Build.props` enabling nullable + treat-warnings-as-errors
- [ ] T003 [P] Create empty xUnit test projects: `backend/tests/unit/Domain.Tests/Domain.Tests.csproj`, `backend/tests/unit/Application.Tests/Application.Tests.csproj`, `backend/tests/unit/Infrastructure.Tests/Infrastructure.Tests.csproj`; reference xUnit, Moq, FluentAssertions, Microsoft.NET.Test.Sdk; add to solution
- [ ] T004 [P] Add NuGet package references in `backend/src/Functions/Functions.csproj` (**all GA versions only — Constitution III**; pin minimum versions to the latest GA available at implementation time, e.g.): `Microsoft.Azure.Functions.Worker` (>= 2.0.0), `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore` (>= 2.0.0), `Microsoft.Extensions.Hosting` (>= 9.0.0), `Microsoft.Extensions.DependencyInjection` (>= 9.0.0), `Microsoft.ApplicationInsights.WorkerService` (>= 2.22.0). **No `-preview`, `-rc`, `-alpha`, or `-beta` suffixes permitted.** CI must `grep -E '\-(preview|rc|alpha|beta)' **/*.csproj` and fail if any match.
- [ ] T005 [P] Add NuGet package references in `backend/src/Infrastructure/Infrastructure.csproj` (**all GA versions only — Constitution III & XII**): `Azure.Identity` (>= 1.13.0), `Azure.Storage.Blobs` (>= 12.22.0), `Azure.Data.Tables` (>= 12.9.0), `Microsoft.ML` (>= 4.0.0, Principle XII), `Microsoft.Agents.AI` (>= 1.0.0 GA, Principle III), `Microsoft.Agents.AI.OpenAI` (>= 1.0.0 GA, Principle III). **No preview SDKs.** Treat the assumption "GA as of 2026-05-06" as the floor; bump floors only when a newer GA is published.
- [ ] T006 [P] Scaffold the React+Vite+TS app at `frontend/` with `npm create vite@latest -- --template react-ts`; commit generated files; add deps `react-router-dom`, `@tanstack/react-query`, `zod`, `recharts`; dev deps `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `openapi-typescript`; configure `vite.config.ts` proxy `'/api': 'http://localhost:7071'`
- [ ] T007 [P] Create `frontend/tests/setup.ts` (jest-dom imports), update `vite.config.ts` to register Vitest with `environment: 'jsdom'` and `setupFiles: './tests/setup.ts'`; add `npm test` script
- [ ] T008 [P] Create `azure.yaml` at repo root configured for `azd` with two services: `api` → `backend/src/Functions` (host: `function`, language: `dotnet-isolated`) and `web` → `frontend` (host: `staticwebapp`, dist: `dist`)
- [ ] T009 [P] Create `backend/src/Functions/local.settings.template.json` with non-secret defaults (`AzureWebJobsStorage=UseDevelopmentStorage=true`, `Foundry__Endpoint=`, `Foundry__ModelDeploymentName=gpt-fraud-investigator`, `Detection__DefaultLowThreshold=0.55`, `Detection__DefaultHighThreshold=0.85`); confirm `local.settings.json` is gitignored
- [ ] T010 [P] Create `.editorconfig` at repo root (4-space C#, 2-space TS/JSON/YAML, LF, final newline) and `frontend/.eslintrc.cjs` + `frontend/.prettierrc.json`
- [ ] T011 [P] Create initial `docs/README.md` placeholder linking to forthcoming `docs/architecture.md`, `docs/setup.md`, `docs/deployment.md`, `docs/components.md`, `docs/api.md` (Principle VII)

---

## Phase 2: Foundational (BLOCKING — must finish before any user story starts)

**Purpose**: Cross-cutting infrastructure every user story depends on — Bicep, RBAC, DI host, domain primitives, configuration binding, observability.

**⚠️ CRITICAL**: No `[US*]` task may start until Phase 2 is complete.

### IaC & deployment plumbing (Constitution I, II, IV)

- [ ] T012 Author `infra/abbreviations.json` (azd standard) and `infra/main.parameters.json` with parameters: `environmentName`, `location`, `principalId` (the deploying user's object ID), `gptModelName` (default `gpt-4.1`), `gptModelVersion`
- [ ] T013 Author `infra/modules/storage.bicep`: one Storage account (StorageV2, Standard_LRS, TLS 1.2, no shared-key access), one blob container `runs`, one table `RunIndex`; outputs `storageAccountName`, `blobEndpoint`, `tableEndpoint`
- [ ] T014 [P] Author `infra/modules/foundry.bicep`: `Microsoft.CognitiveServices/accounts` of kind `OpenAI` + a `deployments` child named `gpt-fraud-investigator` mapped to `gptModelName`/`gptModelVersion`; outputs `endpoint`, `deploymentName`
- [ ] T015 [P] Author `infra/modules/functions.bicep`: Application Insights + Log Analytics workspace; Flex Consumption plan (Linux); Function App (.NET 9 isolated, system-assigned Managed Identity); app settings wire `Storage__BlobEndpoint`, `Storage__TableEndpoint`, `Foundry__Endpoint`, `Foundry__ModelDeploymentName`, `APPLICATIONINSIGHTS_CONNECTION_STRING`; outputs `functionAppName`, `principalId` (the MI), `defaultHostName`
- [ ] T016 [P] Author `infra/modules/staticwebapp.bicep`: Azure Static Web App (Standard tier) linked to the Function App as backend; outputs `defaultHostname`
- [ ] T017 Author `infra/modules/rbac.bicep`: role assignments for `Storage Blob Data Contributor`, `Storage Table Data Contributor`, and `Cognitive Services OpenAI User` granted to **both** the Function App's MI (`functionsPrincipalId`) and the deploying user (`principalId`) — covers Principle IV's "signed-in user gets dev access via Bicep"
- [ ] T018 Author `infra/main.bicep` (subscription-scoped): create resource group, then call `storage.bicep`, `foundry.bicep`, `functions.bicep`, `staticwebapp.bicep`, `rbac.bicep` in dependency order; pipe outputs as `azd` env outputs (`SERVICE_API_NAME`, `SERVICE_WEB_NAME`, `STORAGE_ACCOUNT_NAME`, `FOUNDRY_ENDPOINT`, etc.)

### Backend host & DI (Constitution V)

- [ ] T019 Create `backend/src/Functions/Program.cs` — `HostBuilder` configured for Functions isolated worker with Application Insights, `ConfigureServices` registering `IOptions<DemoConfig>` bound from configuration, `DefaultAzureCredential` singleton, all repositories and services (initially as no-op stubs to be replaced by later tasks)
- [ ] T020 [P] Create `backend/src/Functions/host.json` (extension bundle, default function timeout, AppInsights sampling) and `backend/src/Functions/Properties/launchSettings.json`

### Domain primitives (Constitution V; data-model.md)

- [ ] T021 [P] Create `backend/src/Domain/Configuration/SimulationConfiguration.cs`, `BandThresholds.cs`, `PatternWeights.cs`, `BandCounts.cs` — immutable C# records with constructor-side validation matching data-model.md (incl. `PatternWeights` rejecting all-zero or negative; thresholds `0 < Low < High < 1`); cap `RecordCount` at 50 000 (FR-004)
- [ ] T022 [P] Create `backend/src/Domain/Enums/ConfidenceBand.cs`, `FraudPattern.cs`, `FraudLikelihood.cs`, `InvestigationStatus.cs`
- [ ] T023 [P] Create `backend/src/Domain/Entities/Employee.cs`, `ExpenseRecord.cs`, `DetectionResult.cs`, `FeatureContribution.cs`, `AiInvestigationResult.cs`, `Run.cs` — immutable records with invariants per data-model.md (`Run.DetectionResults.Count == Run.Expenses.Count`, etc.)
- [ ] T024 [P] Create `backend/src/Domain/Projections/Case.cs`, `RunSummary.cs` — read-only projection records
- [ ] T025 [P] Create `backend/tests/unit/Domain.Tests/SimulationConfigurationTests.cs` — xUnit theories covering all validation paths in T021 (FR-002, FR-003, FR-004, FR-008, FR-009, FR-021)
- [ ] T026 [P] Create `backend/tests/unit/Domain.Tests/RunInvariantTests.cs` — verify `Run` rejects mismatched detection-results / expenses count and dangling `Investigations` keys

### Application abstractions (Constitution V)

- [ ] T027 [P] Create `backend/src/Application/Abstractions/IFraudInjector.cs`, `IAnomalyScorer.cs`, `IAiInvestigator.cs`, `IRunRepository.cs`, `IClock.cs`, `IRandomSource.cs` — interfaces only; no implementations yet (these are the seams that Principle V + Principle VI require)

### Observability & error handling (Constitution VIII)

- [ ] T028 [P] Create `backend/src/Functions/ErrorHandling/ProblemDetailsResultExtensions.cs` — extension methods to produce RFC 7807 `application/problem+json` 400/404/500 responses (matches `ProblemDetails` schema in `contracts/api.openapi.yaml`); used by every Function in later phases

### Local-dev workflow (Constitution XI)

- [ ] T029 [P] Create `.vscode/tasks.json` with compound `dev: all` running Azurite + `func start` + `npm run dev`; `.vscode/launch.json` with attach configurations for the Functions host and Vite

### CI/CD (Constitution II)

- [ ] T030 Create `.github/workflows/ci-cd.yml`: jobs `build-test` (runs `dotnet test backend/fraud-ai-demo.sln` and `npm --prefix frontend ci && npm --prefix frontend test -- --run`), `deploy-infra` (`azd provision` via OIDC), `deploy-app` (`azd deploy`); triggered on push to `main`; uses `azure/login@v2` with `client-id`, `tenant-id`, `subscription-id` from repo secrets — **no client secrets**

**Checkpoint**: Foundation done. User-story phases may now start in parallel.

---

## Phase 3: User Story 1 — Baseline → Fraud-Uplift Narrative (Priority: P1) 🎯 MVP

**Goal**: A presenter can generate a synthetic dataset with configurable overall intensity + per-pattern weights, run deterministic detection, see records bucketed into High/Medium/Low bands on the visualization, then re-generate with higher intensity and observe a visibly larger suspicious share.

**Independent Test**: With Foundry **not** configured, the presenter can hit `POST /api/runs` twice (low then high intensity), `GET /api/runs/{id}` for each, and the band counts shift as expected. The frontend renders the cycle without ever needing AI.

**Maps to**: FR-001 → FR-009, FR-015 → FR-019, FR-022 → FR-025, SC-001, SC-002, SC-005, SC-006.

### Backend tests for User Story 1 (write FIRST, must FAIL before implementation)

- [ ] T031 [P] [US1] In `backend/tests/unit/Application.Tests/FraudInjectorTests.cs` — given a fixed seed, intensity, and weights, the injector marks the expected share of records and respects per-pattern weights (asserts FR-002, FR-003)
- [ ] T032 [P] [US1] In `backend/tests/unit/Application.Tests/AnomalyScorerTests.cs` — `IAnomalyScorer` produces deterministic `Confidence ∈ [0,1]` for the same seed; identical input twice returns equal scores (asserts FR-006, FR-007, deterministic-detection assumption)
- [ ] T033 [P] [US1] In `backend/tests/unit/Application.Tests/BandAssignmentTests.cs` — confidences map to bands per `BandThresholds`; boundary values land in the correct band (asserts FR-008, FR-009)
- [ ] T034 [P] [US1] In `backend/tests/unit/Application.Tests/GenerateRunHandlerTests.cs` — orchestrator wires injector → scorer → banding → repository.SaveAsync; uses Moq for all collaborators (asserts FR-022, FR-005)
- [ ] T035 [P] [US1] In `backend/tests/unit/Infrastructure.Tests/BlobRunRepositoryTests.cs` — using Azurite (Testcontainers or local emulator), `SaveAsync` writes a gzip blob and a `RunIndex` table row; `LoadAsync` round-trips equality; concurrent save with stale ETag throws (asserts FR-023, FR-024, research §R3, §R4)

### Backend implementation for User Story 1

- [ ] T036 [US1] Implement `backend/src/Application/Services/FraudInjector.cs` (`IFraudInjector`) — given employees + record count + intensity + weights, produces an `IReadOnlyList<ExpenseRecord>` with per-pattern injections; uses `IRandomSource` for determinism; threshold-gaming, unusual-frequency, vendor-anomaly logic implemented per data-model.md
- [ ] T037 [P] [US1] Implement `backend/src/Application/Services/EmployeeGenerator.cs` — synthetic profiles (name, dept, role, baseline spend, typical categories, typical vendors); seeded; sized by `SimulationConfiguration.EmployeeCount`
- [ ] T038 [US1] Implement `backend/src/Application/Services/FraudFeatureBuilder.cs` — pure feature-engineering producing `Features[][]` and feature names from `(Employees, Expenses, Thresholds)` per research §R5; emits the six features `amountZ`, `amountVsThresholdGap`, `frequencyZ`, `vendorRarity`, `categoryDeviation`, `weekendSubmission`; no ML library dependency at this layer
- [ ] T039 [US1] Implement `backend/src/Infrastructure/Detection/MlNetAnomalyScorer.cs` (`IAnomalyScorer`) — wraps ML.NET `MLContext` + `Trainers.Anomaly.RandomizedPca(rank: 4, ensureZeroMean: true, seed: ...)`; fits on the per-Run feature matrix; transforms; logistic-squashes raw scores into `Confidence ∈ [0,1]` calibrated against the run distribution; emits `DetectionResult` with top-N `ContributingFeatures` recomputed from standardized residuals (research §R5; Principle XII)
- [ ] T040 [US1] Implement `backend/src/Infrastructure/Persistence/BlobRunRepository.cs` (`IRunRepository`) — `SaveAsync(Run)` writes `runs/{runId}.json.gz` with `If-None-Match: *` (or `If-Match: <etag>` for updates) **and** upserts the matching `RunIndex` row; `LoadAsync(Guid)` reads blob; `ListAsync(take, continuationToken)` queries `RunIndex`; uses `DefaultAzureCredential` and `BlobServiceClient`/`TableServiceClient` constructed from `Storage__BlobEndpoint`/`Storage__TableEndpoint` (Principle IV — no connection strings)
- [ ] T041 [US1] Implement `backend/src/Application/Services/GenerateRunHandler.cs` — orchestrates: validate config → generate employees → inject expenses → build features → score → assign bands → compute `BandCounts` → persist; returns the saved `Run`
- [ ] T042 [US1] Implement `backend/src/Functions/Endpoints/GenerateRunFunction.cs` — `POST /api/runs`; deserializes `SimulationConfiguration`; normalizes `PatternWeights` to sum 1.0; returns 201 with `Run` body or 400 problem-details on validation failure (FR-021); per `contracts/api.openapi.yaml` `createRun`
- [ ] T043 [P] [US1] Implement `backend/src/Functions/Endpoints/GetRunFunction.cs` — `GET /api/runs/{runId}`; returns full `Run` or 404
- [ ] T044 [P] [US1] Implement `backend/src/Functions/Endpoints/ListRunsFunction.cs` — `GET /api/runs?take=&continuationToken=`; returns `RunSummaryPage`
- [ ] T045 [P] [US1] Implement `backend/src/Functions/Endpoints/GetCaseFunction.cs` — `GET /api/runs/{runId}/cases/{caseId}`; loads run, projects `Case` by `recordId`, returns 404 if not found
- [ ] T046 [US1] Wire concrete services into `backend/src/Functions/Program.cs` DI: `IRandomSource` (seeded `System.Random` wrapper), `IClock`, `IFraudInjector`, `IEmployeeGenerator`, `IAnomalyScorer` → `MlNetAnomalyScorer`, `IRunRepository` → `BlobRunRepository`; bind `DemoConfig` from `IConfiguration`
- [ ] T047 [US1] Add `ILogger<T>` calls in `GenerateRunHandler`, `MlNetAnomalyScorer`, `BlobRunRepository` for "data generation," "detection processing," and persistence (Constitution VIII / SC-007)

### Frontend tests for User Story 1 (write FIRST)

- [ ] T048 [P] [US1] In `frontend/tests/api/runsClient.test.ts` — Vitest tests for typed client wrappers around `POST /api/runs`, `GET /api/runs`, `GET /api/runs/{id}`, `GET /api/runs/{id}/cases/{caseId}` using MSW; asserts zod validation rejects malformed responses
- [ ] T049 [P] [US1] In `frontend/tests/components/BandChart.test.tsx` — renders a stable bar/donut for given `BandCounts`; renders an empty-state when all bands are 0 (FR-019)
- [ ] T050 [P] [US1] In `frontend/tests/components/CaseList.test.tsx` — given a `Run`, renders rows grouped or color-coded by band; clicking a row fires the navigation callback

### Frontend implementation for User Story 1

- [ ] T051 [US1] Generate `frontend/src/api/types.ts` from `specs/001-expense-fraud-demo/contracts/api.openapi.yaml` via `openapi-typescript`; add an `npm run gen:api` script; commit the generated file
- [ ] T052 [US1] Implement `frontend/src/api/runsClient.ts` — fetch wrappers using the generated types; runtime-validate responses with zod; centralized error → typed Result
- [ ] T053 [US1] Implement `frontend/src/lib/queryClient.ts` (TanStack Query) and wrap `App.tsx` in `QueryClientProvider`; configure stale time + retry
- [ ] T054 [P] [US1] Implement `frontend/src/components/ConfigPanel.tsx` — controls for overall `Intensity` slider + three `PatternWeights` sliders (auto-normalizing) + `RecordCount` numeric input (capped at 50 000) + `Thresholds` low/high sliders; emits `SimulationConfiguration` (FR-017, FR-020, FR-021)
- [ ] T055 [P] [US1] Implement `frontend/src/components/BandChart.tsx` using `recharts` — renders `BandCounts` as three colored bars (high = red, medium = amber, low = green); empty state per T049
- [ ] T056 [P] [US1] Implement `frontend/src/components/CaseList.tsx` — virtualized list of cases color-coded by band (FR-016)
- [ ] T057 [US1] Implement route `frontend/src/routes/RunsRoute.tsx` (`/runs`) — lists prior runs (FR-024), shows ConfigPanel, has "Generate" button that calls `POST /api/runs` and navigates to `/runs/:id`
- [ ] T058 [US1] Implement route `frontend/src/routes/RunDetailRoute.tsx` (`/runs/:id`) — fetches run, shows `BandChart` + `CaseList`; identifies "active run" badge for the most recent (FR-024)
- [ ] T059 [US1] Wire routes in `frontend/src/App.tsx` via `react-router-dom`; redirect `/` → `/runs`

**Checkpoint US1**: Run the full `low → high intensity` narrative end-to-end without any AI dependency. SC-001, SC-002, SC-005, SC-006 measurable.

---

## Phase 4: User Story 2 — AI Investigator Resolves Ambiguous Cases (Priority: P2)

**Goal**: From a case detail view, the presenter clicks "Investigate with AI" and within ~10 s sees a structured verdict + rationale + key signals + recommended action. AI is available on **all** bands (per clarification 1), with medium as the suggested default. Failures degrade gracefully (FR-014) within 30 s.

**Independent Test**: With a pre-loaded fixture run, clicking the action on one case returns a populated `AiInvestigationResult{ Status: Succeeded, ... }`; with the Foundry endpoint pointed at an unreachable host, the same click returns `Status: Unavailable` and the rest of the UI stays interactive.

**Maps to**: FR-010 → FR-014, SC-004, SC-007, SC-008, clarification 1 (all bands), clarification 3 (30 s timeout).

### Backend tests for User Story 2 (write FIRST)

- [ ] T060 [P] [US2] In `backend/tests/unit/Application.Tests/InvestigateCaseHandlerTests.cs` — given a mock `IAiInvestigator` returning a populated `AiInvestigationResult`, the handler attaches it to the originating run (ETag-conditioned) and persists; given a mock that throws `OperationCanceledException`, the handler returns `Unavailable` and does **not** persist (FR-013, FR-014, edge-case mid-investigation regeneration)
- [ ] T060a [P] [US2] In the same file, add an **ETag-mid-investigation** theory: simulate a concurrent regeneration of the originating Run while an investigation is in-flight by having the `IRunRepository` mock return a 412 (precondition-failed) on the first save and the up-to-date Run on reload; assert the handler retries once, persists the AI result onto the originating `runId` blob (not any newer Run), and never silently writes to a different Run id (FR-013, FR-022, [research.md §R4](./research.md#r4-storage-shape-azure-storage-blob--table) ETag concurrency, [data-model.md](./data-model.md) invariant on `AiInvestigationResult.RunId`)
- [ ] T061 [P] [US2] In `backend/tests/unit/Application.Tests/InvestigateCaseHandlerTests.cs` (same file, more theories) — investigation is allowed for all three bands (asserts clarification 1)
- [ ] T062 [P] [US2] In `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorTests.cs` — given a mocked `IChatClient` returning structured JSON conforming to `AiVerdictDto`, returns `AiInvestigationResult{Succeeded}`; given malformed JSON returns `AiInvestigationResult{Unavailable, Reason=\"malformed\"}`; given a `RequestFailedException` returns `Unavailable` (FR-014); cancellation after 30 s returns `Unavailable` (research §R6)
- [ ] T063 [P] [US2] In `backend/tests/unit/Infrastructure.Tests/AgentInvestigatorTests.cs` (more theories) — verify the `IsInjectedFraud` and `InjectedPattern` fields are **never** included in the prompt payload (data-model invariant 1)

### Backend implementation for User Story 2

- [ ] T064 [US2] Add `backend/src/Application/Dtos/AiVerdictDto.cs` — JSON DTO matching `AiInvestigationResult` (sans `Status`/`UnavailableReason`) used as the agent's structured-output schema
- [ ] T065 [US2] Implement `backend/src/Infrastructure/Ai/AgentInvestigator.cs` (`IAiInvestigator`) — constructs a stateless `ChatClientAgent` per call using `Microsoft.Agents.AI.OpenAI` with `AzureOpenAIClient(new Uri(endpoint), DefaultAzureCredential)` and `ChatClient(deploymentName)`; binds structured-output to `AiVerdictDto`; builds the user message per the **5-section prompt payload contract in [research.md §R6](./research.md#r6-ai-orchestration-microsoft-agent-framework-ga-pattern)** (case under review, employee profile, 90-day recent history, peer comparison within `(department, category)` cohort, run context) — all inputs read from the in-memory Run, no extra storage calls; strips `IsInjectedFraud` / `InjectedPattern` per T063; 30 s `CancellationTokenSource` (FR-014); maps success/failure to `AiInvestigationResult.Succeeded`/`AiInvestigationResult.Unavailable(reason)` (FR-011, FR-012, FR-014, Constitution III)
- [ ] T066 [US2] Implement `backend/src/Application/Services/InvestigateCaseHandler.cs` — loads run; verifies the case exists; calls `IAiInvestigator.InvestigateAsync(case)`; on `Succeeded`, attaches result to `run.Investigations[recordId]`, persists with ETag, retries once on 412; on `Unavailable`, returns the unavailable result without persisting (FR-014)
- [ ] T067 [US2] Implement `backend/src/Functions/Endpoints/InvestigateCaseFunction.cs` — `POST /api/runs/{runId}/cases/{caseId}/investigate`; returns 200 with `AiInvestigationResult` (success or unavailable), 404 if run/case missing
- [ ] T068 [US2] Wire `IAiInvestigator` → `AgentInvestigator` in `backend/src/Functions/Program.cs` DI; add app-settings binding for `Foundry__Endpoint` and `Foundry__ModelDeploymentName`
- [ ] T069 [US2] Add structured `ILogger` calls around the agent call: request submitted, latency, success vs unavailable + reason (Constitution VIII)

### Frontend tests for User Story 2 (write FIRST)

- [ ] T070 [P] [US2] In `frontend/tests/components/AiVerdictPanel.test.tsx` — given a `Succeeded` result, renders verdict + rationale + signals list + recommended action; given an `Unavailable` result, renders the fallback state with the unavailable reason and **no** crash (SC-007, SC-008)
- [ ] T071 [P] [US2] In `frontend/tests/api/runsClient.test.ts` (extend) — `investigateCase(runId, caseId)` posts to the right URL and validates the response with zod

### Frontend implementation for User Story 2

- [ ] T072 [US2] Extend `frontend/src/api/runsClient.ts` with `investigateCase(runId, caseId): Promise<AiInvestigationResult>`
- [ ] T073 [P] [US2] Implement `frontend/src/components/AiVerdictPanel.tsx` — renders both `Succeeded` and `Unavailable` states with clear visual distinction (FR-014)
- [ ] T074 [US2] Add an "Investigate with AI" button to the case-detail UI (introduced fully in US3) calling `investigateCase` via TanStack Query mutation; show inline spinner while pending; on success, invalidate the run query so the panel re-renders with the persisted result; **enabled on all bands** with a "(suggested)" hint on Medium (clarification 1)

**Checkpoint US2**: AI investigation returns structured results live; outage path returns the fallback state without crashing the UI.

---

## Phase 5: User Story 3 — Drill into a Case to Inspect Signals + Reasoning (Priority: P2)

**Goal**: From the case list, clicking any case opens a detail view showing the employee/expense context, the deterministic detection output (score, band, contributing features), and — if present — the AI rationale side-by-side with the signals.

**Independent Test**: Clicking any case in the list opens the detail panel with all sections rendered, even when no AI investigation has been run; clicking the AI button (US2) populates the panel.

**Maps to**: FR-018, story-3 acceptance scenarios.

### Frontend tests for User Story 3 (write FIRST)

- [ ] T075 [P] [US3] In `frontend/tests/routes/CaseDetailRoute.test.tsx` — renders Expense + Employee + Detection (score, band, contributing features) for a case with no investigation; renders Detection alongside `AiVerdictPanel` for a case with an investigation (FR-018)

### Frontend implementation for User Story 3

- [ ] T076 [US3] Implement `frontend/src/components/CaseDetail.tsx` — left column: expense + employee context; middle: numeric score, band badge, ContributingFeatures table sorted by `|zScore|`; right (collapsible): `AiVerdictPanel` from US2
- [ ] T077 [US3] Implement route `frontend/src/routes/CaseDetailRoute.tsx` (`/runs/:id/cases/:caseId`) — fetches the case via `GET /api/runs/{runId}/cases/{caseId}`, renders `CaseDetail`, hosts the "Investigate with AI" mutation from US2 task T074
- [ ] T078 [US3] Wire the route in `App.tsx` and make `CaseList` rows navigate to it

**Checkpoint US3**: Detail view works for any case independently of AI; integrates seamlessly with US2 when an investigation exists.

---

## Phase 6: User Story 4 — Tune the Simulation for Demo Scenarios (Priority: P3)

**Goal**: The presenter rapidly reconfigures the demo (intensity, per-pattern weights, dataset size, thresholds) without code or restarts, and bad values are rejected with a clear message.

**Independent Test**: Changing any single config control on the panel and re-running produces a corresponding observable change; setting a value outside its range surfaces a validation message and preserves the previous valid state.

**Maps to**: FR-020, FR-021, SC-009, story-4 acceptance scenarios.

### Tests for User Story 4 (write FIRST)

- [ ] T079 [P] [US4] In `backend/tests/unit/Domain.Tests/SimulationConfigurationTests.cs` (extend T025) — explicitly cover: negative weight rejected; all-zero weights rejected; `RecordCount > 50_000` rejected; `Low >= High` rejected; `Intensity` outside [0,1] rejected (FR-021)
- [ ] T080 [P] [US4] In `frontend/tests/components/ConfigPanel.test.tsx` — invalid input surfaces a per-field error; "Generate" is disabled while invalid; the previous valid config is retained when the user types invalid characters (FR-021)
- [ ] T081 [P] [US4] In `frontend/tests/components/ConfigPanel.test.tsx` (extend) — adjusting any one slider triggers a controlled re-render; weight sliders auto-normalize to sum 1.0

### Implementation for User Story 4

- [ ] T082 [US4] Harden `ConfigPanel.tsx` (T054) with explicit per-field validation matching the rules in T079; debounced onChange; "(saved)" indicator after a successful Generate
- [ ] T083 [US4] Add quick-preset buttons to `ConfigPanel` ("Low fraud," "High fraud — vendor heavy," "High fraud — frequency heavy") that load preset `SimulationConfiguration` values to support rapid scenario flipping (SC-009)
- [ ] T084 [US4] Ensure `GenerateRunFunction` returns RFC 7807 problem-details with field-level `errors` (per `ProblemDetails` schema in `contracts/api.openapi.yaml`) on every validation failure, and that `ConfigPanel` surfaces those errors (FR-021)

**Checkpoint US4**: Presenters can flip between scenarios in seconds without restarts (SC-009).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ship-quality concerns that affect every story.

- [ ] T085 [P] Author `docs/architecture.md` — system diagram (frontend / SWA / Functions / Storage / Foundry), data-flow (generate → detect → investigate), data model summary, identity & RBAC story (Constitution VII)
- [ ] T086 [P] Author `docs/setup.md` — productized version of [quickstart.md](./quickstart.md), including Azurite + `func start` + Vite walkthrough
- [ ] T087 [P] Author `docs/deployment.md` — `azd up` walkthrough, OIDC / `azd pipeline config`, teardown with `azd down --purge`
- [ ] T088 [P] Author `docs/components.md` — per-folder responsibilities (Domain / Application / Infrastructure / Functions / frontend / infra)
- [ ] T089 [P] Author `docs/api.md` — narrative description of the 5 endpoints with examples; cross-link to `contracts/api.openapi.yaml`
- [ ] T090 [P] Add inline XML doc comments on every public type/method in `Domain`, `Application/Abstractions`, and on the agent-prompt-construction code in `AgentInvestigator` (Constitution VII — non-obvious logic)
- [ ] T091 Add a `backend/tests/unit/Application.Tests/PerformanceSmokeTests.cs` `[Fact(Skip="manual")]` benchmark asserting generate+detect ≤ 5 s for 5 000 records on a local box (SC-002 sanity check)
- [ ] T092 Run `quickstart.md` end-to-end manually as the final acceptance gate; check every Constitution row in plan.md still PASSes (Principle XI)
- [ ] T093 [P] Update top-level `README.md` with a one-paragraph project description and links into `docs/`

---

## Dependencies & Execution Order

### Phase ordering

- **Setup (Phase 1)** — no deps; start immediately.
- **Foundational (Phase 2)** — depends on Setup; **blocks** every `[US*]` task.
- **User-story phases (3–6)** — all depend on Foundational only. Within a phase, tests precede implementation. Across phases, US1 is the MVP; US2 + US3 can proceed in parallel after US1's data path exists; US4 hardens controls already shipped in US1.
- **Polish (Phase 7)** — depends on US1–US4 being complete (or as much as you intend to ship).

### Story dependencies

| Story | Hard deps | Soft deps |
|---|---|---|
| US1 (P1) | Phase 2 only | — |
| US2 (P2) | Phase 2; uses `Run` shape from US1's data model (already in Domain by Phase 2) | US3 hosts the "Investigate" button, but US2's API is independently testable |
| US3 (P2) | Phase 2; consumes `GET /case` from US1 (T045) | Renders US2's `AiVerdictPanel` if present |
| US4 (P3) | Phase 2; tightens the `ConfigPanel` from US1 (T054) | — |

### Within-story ordering

1. Tests (`[P]`) — all parallel
2. Domain types / DTOs (`[P]`)
3. Service / handler implementations (sequential within a story)
4. Function endpoint wiring
5. DI registration
6. Frontend components (`[P]`) → routes → `App.tsx` wiring

### Parallel opportunities (high-value examples)

- **Phase 1**: T002–T011 are all `[P]` and touch different files. Run them in one shot.
- **Phase 2 IaC**: T013, T014, T015, T016 are independent module files (`[P]`); T017 + T018 must follow.
- **Phase 2 domain**: T021, T022, T023, T024 are all `[P]` (different files in `Domain/`).
- **Phase 3 tests**: T031–T035 + T048–T050 are all `[P]` — write seven test files in parallel before any production code.
- **Phase 4 tests**: T060, T061 (same file), T062, T063 (same file), T070, T071 — three parallel test files.
- **Polish docs**: T085–T089 + T093 are all `[P]`.

---

## Implementation strategy

**MVP first** (recommended): finish Phases 1, 2, and 3 only. At that point the demo's headline narrative (Story 1) works end-to-end on Azure with no AI configured. SC-001, SC-002, SC-005, SC-006 are all measurable. This is the safest live-demo fallback.

**Incremental delivery after MVP**:

1. **Layer in US2** (Phase 4) to introduce the AI investigator. Demo still works without it (FR-014 / SC-007).
2. **Layer in US3** (Phase 5) to add the case-detail drill-down — this is what makes the demo credible to a technical audience and integrates US2's panel.
3. **Layer in US4** (Phase 6) for scenario presets and validation polish.
4. **Polish** (Phase 7) — docs, inline comments, perf smoke, manual quickstart pass.

Stop the moment you've shipped a story that satisfies the audience you're chasing; every cut-line is a viable demo.

---

## Format validation

All tasks above use the strict checklist format `- [ ] [TaskID] [P?] [Story?] Description with file path`:

- ✅ Every task starts with `- [ ]`
- ✅ Every task has a sequential ID (T001 … T093)
- ✅ `[P]` only on tasks that touch independent files with no incomplete deps
- ✅ `[US1]`/`[US2]`/`[US3]`/`[US4]` only on user-story-phase tasks; never on Setup, Foundational, or Polish
- ✅ Every implementation task names an exact file path

## Task counts

- **Total tasks**: 93
- **Setup**: 11 (T001–T011)
- **Foundational**: 19 (T012–T030)
- **US1 (P1, MVP)**: 29 (T031–T059) — 5 backend tests, 12 backend impl, 3 frontend tests, 9 frontend impl
- **US2 (P2)**: 15 (T060–T074) — 4 backend tests, 6 backend impl, 2 frontend tests, 3 frontend impl
- **US3 (P2)**: 4 (T075–T078) — 1 frontend test, 3 frontend impl
- **US4 (P3)**: 6 (T079–T084) — 3 tests, 3 impl
- **Polish**: 9 (T085–T093)

## Independent test criteria — quick reference

- **US1**: `POST /api/runs` (low intensity) → small Medium/High counts; same with high intensity → visibly larger counts. No Foundry needed.
- **US2**: With a fixture run, `POST /api/runs/{id}/cases/{caseId}/investigate` returns `Status: Succeeded` populated; same call with Foundry unreachable returns `Status: Unavailable` and the rest of the app stays interactive.
- **US3**: Click any case in the list → `CaseDetail` renders Expense/Employee/Detection sections without requiring the AI button to have been used.
- **US4**: Adjust a config control in the UI and re-run → output reflects the change; bad inputs are rejected with field-level messages and the prior valid state is retained.

## Suggested MVP scope

**Phases 1 + 2 + 3 only** — ships User Story 1 (P1) end-to-end, satisfies the headline narrative, and is independently demoable without ever calling Foundry.
