# Implementation Plan: AI-Powered Internal Expense Fraud Demo

**Branch**: `001-expense-fraud-demo` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-expense-fraud-demo/spec.md`

## Summary

A single-presenter demo web application that (1) generates synthetic employee
expense activity with configurable fraud injection (overall intensity + per-pattern
weights for threshold-gaming, unusual frequency, and vendor anomaly), (2) runs a
deterministic multivariate anomaly-detection pipeline that classifies every record
into a high / medium / low confidence band, (3) lets the presenter invoke an AI
investigator on **any** case for structured verdict + rationale — including a
**consensus mode** that runs all 3 deployed models side-by-side and an **arbiter
model** that reasons over the results to produce a final decisive verdict
(FR-026/FR-027), and (4) persists each generation as a **Run** in Azure Storage
so prior runs remain inspectable.

The technical approach is a static React+Vite+TypeScript frontend (Azure Static
Web Apps) calling a .NET 9 isolated-worker Azure Functions backend organized into
domain / application / infrastructure layers. Anomaly scoring is delegated to
**ML.NET** (Microsoft's GA open-source ML library) per Constitution Principle
XII — the system performs feature engineering in domain code and hands the
feature matrix to ML.NET's `RandomizedPcaTrainer` for unsupervised anomaly
scoring. The AI investigator uses Microsoft Foundry (latest GA GPT model)
orchestrated through the GA Microsoft Agent Framework, with system prompts
that instruct models to be **bold and decisive** (FR-028) — favoring clear
"Likely" or "Unlikely" verdicts over "Inconclusive." Persistence is split
across Azure Blob Storage (Run payloads) and Azure Table Storage (Run index +
AI verdicts). All Azure-to-Azure auth is Managed Identity with RBAC granted
in Bicep; CI/CD is GitHub Actions with OIDC federated identity, deploying via
`azd`.

## Technical Context

**Language/Version**:
- Backend: C# / .NET 9.0 (Azure Functions isolated worker)
- Frontend: TypeScript 5.x on React 18 with Vite 5
- IaC: Bicep (latest, targeting `Microsoft.App` / `Microsoft.Storage` / `Microsoft.Web` / `Microsoft.CognitiveServices` providers)

**Primary Dependencies**:
- Backend: `Microsoft.Azure.Functions.Worker`, `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore`, `Microsoft.Extensions.DependencyInjection`, `Microsoft.Extensions.Hosting`, `Azure.Identity` (DefaultAzureCredential / ManagedIdentityCredential), `Azure.Storage.Blobs`, `Azure.Data.Tables`, **`Microsoft.ML`** (GA ML.NET, Principle XII — unsupervised anomaly scoring via `RandomizedPcaTrainer`), `Microsoft.Agents.AI` (Microsoft Agent Framework GA), `Microsoft.Agents.AI.OpenAI` (Foundry / Azure OpenAI integration), `System.Text.Json`
- Frontend: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zod` (response validation), `recharts` (scatter plot, charts), `vitest`, `@testing-library/react`
- Tests: `xunit`, `Moq`, `FluentAssertions`, `Microsoft.NET.Test.Sdk`

**Storage**:
- **Azure Blob Storage** — one container `runs/`; one blob per Run holding the full payload (employees, expense records, detection results, AI verdicts). JSON, gzip-compressed.
- **Azure Table Storage** — one table `RunIndex` for fast list/lookup (PartitionKey = tenant placeholder `"v1"`, RowKey = RunId, columns: createdUtc, config summary, recordCount, bandCounts).

**Testing**:
- Backend: `xunit` + `Moq` + `FluentAssertions`, run via `dotnet test`. Single solution-level command: `dotnet test fraud-ai-demo.sln`.
- Frontend: `vitest` + `@testing-library/react`, run via `npm test`.
- CI runs both as required gates (Principle VI).

**Target Platform**:
- Backend: Azure Functions Flex Consumption plan (Linux, .NET 9 isolated)
- Frontend: Azure Static Web Apps (Standard tier for managed-identity-backed APIs; or Free tier if linked to Functions via SWA-linked-API binding)
- AI: Microsoft Foundry AI Services resource (kind: AIServices — NOT Azure OpenAI) with multiple GA GPT models deployed (gpt-5.4, gpt-5.3-chat, gpt-5.4-mini); users select the model at investigation time per FR-020 / Principle IX

**Project Type**: Web application (frontend + backend) with infrastructure-as-code

**Performance Goals**:
- Generate + detect cycle ≤ 5 s perceived for the default 5,000-record dataset (SC-002)
- Non-AI UI interaction ≤ 1 s perceived (SC-003)
- AI investigation ≤ ~10 s typical, 30 s hard timeout → fallback (SC-004 / FR-014)
- Consensus (3 models parallel + arbiter) ≤ ~30 s total (parallel model calls + sequential arbiter)
- Story-1 narrative end-to-end ≤ 3 minutes (SC-001)

**Constraints**:
- No secrets in code or config — Managed Identity + RBAC only (Principle IV, FR-023)
- All infra via Bicep; CLI-signed-in user granted dev access through Bicep (Principle IV)
- AI failures must NOT crash the UI (FR-014 / SC-007 / Principle VIII)
- Detection layer must be deterministic given a Run config (Assumption)
- Hard cap 50,000 records per Run (FR-004)
- AI prompts must be bold and decisive, discouraging Inconclusive (FR-028)

**Scale/Scope**:
- Single concurrent presenter; v1 has no per-user scoping (FR-025) but data model carries an owner placeholder field for forward-compatibility
- Datasets: 1,000–50,000 expense records, 10–500 simulated employees
- Run history: unbounded retention in Azure Storage (no auto-purge in v1)
- Multi-lab architecture: this plan covers only the Expenses lab; shared shell and other labs have separate specs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Each row is evaluated against the project [Constitution v1.1.0](../../.specify/memory/constitution.md). Status: **PASS** = compliant; **PASS w/ note** = compliant with implementation guidance captured below; **VIOLATION** = requires Complexity Tracking justification.

| # | Principle | Status | How this plan satisfies it |
|---|---|---|---|
| I | Platform & Deployment (Azure, Bicep, static frontend, Functions isolated) | **PASS** | Frontend = Azure Static Web Apps; backend = Azure Functions .NET 9 isolated worker; all infra in `infra/*.bicep`. No portal/imperative provisioning. |
| II | Source Control & CI/CD (GitHub, Actions, OIDC, no secrets, automated on `main`) | **PASS** | GitHub Actions workflow on push to `main` builds backend + frontend, runs all tests, then runs `azd deploy`. Auth = OIDC federated identity to a deploy-time service principal; no PATs/keys. |
| III | AI & Agent Framework (Foundry + GA Agent Framework) | **PASS** | AI calls go through `Microsoft.Agents.AI` (GA) targeting a Microsoft Foundry AI Services deployment with multiple models. Consensus mode runs all 3 models via same framework. Arbiter uses same `ChatClientAgent` pattern. **No Azure OpenAI resources (kind: OpenAI)**. No preview SDKs on `main`. |
| IV | Security & Identity (Managed Identity, no secrets, RBAC in Bicep, CLI user granted dev access) | **PASS** | Functions app = system-assigned Managed Identity. RBAC role assignments (`Storage Blob Data Contributor`, `Storage Table Data Contributor`, `Cognitive Services User`) all created in Bicep. Bicep also assigns the same roles to the deploying user (`az ad signed-in-user`) so local dev works without portal clicks. No connection strings; SDKs use `DefaultAzureCredential`. |
| V | Code Quality & Architecture (SOLID, layered, DI, modular) | **PASS** | Backend organized into `Domain/`, `Application/`, `Infrastructure/`, `Functions/` projects. DI is the Functions isolated-worker default; all I/O is behind interfaces. Consensus/arbiter logic in the endpoint function, using `IAiInvestigator` for individual model calls. |
| VI | Testing Requirements (unit tests for all backend logic, mocked AI boundary, runnable locally + in CI) | **PASS** | `tests/unit/` xUnit project with coverage for domain (scoring, banding, fraud injection), application (orchestration, agent boundary mocked via `IAiInvestigator`), infrastructure (storage repository wrapped by integration-style tests using Azurite). |
| VII | Documentation (`/docs`, Markdown, architecture + setup + components + APIs, inline comments) | **PASS w/ note** | `/docs` will contain `architecture.md`, `setup.md`, `deployment.md`, `components.md`, plus the OpenAPI doc generated from `contracts/`. Inline comments mandatory on non-obvious logic (esp. scoring math, agent prompt construction, arbiter reasoning). |
| VIII | Observability & Reliability (logging, graceful AI degradation, no crash on AI outage) | **PASS** | All Functions log to Application Insights via `ILogger<T>`. Agent calls wrapped with try/catch + 30 s timeout (FR-014); failure path returns `AiInvestigationResult.Unavailable` and the UI renders the fallback state (FR-014, SC-007). Consensus degrades to majority-vote if arbiter fails (FR-027). |
| IX | Configuration & Flexibility (runtime config, no code change for tuning) | **PASS** | All tunable params live in `IOptions<DemoConfig>` bound from app settings + per-request overrides via the Generate endpoint body. Model deployment name + endpoint are app settings; thresholds, intensities, and pattern weights are request inputs. |
| X | Performance Expectations (thousands of records, seconds, responsive UI) | **PASS w/ note** | Detection is in-process C# numeric code over arrays — comfortably meets ≤ 5 s for 5,000 records. Blob writes are async + gzip. UI uses TanStack Query for cached reads. Consensus runs 3 models in parallel to stay within 30s budget. |
| XI | Development Experience (run locally, single test command, low-friction deploy) | **PASS** | `azurite` for local Storage, `func start` for Functions, `npm run dev` for frontend; `dotnet test` runs all backend tests; `azd up` is the single deploy command. All documented in `docs/setup.md` + `quickstart.md`. |
| XII | Library-First Algorithms (popular OSS over custom for standard algos) | **PASS** | Anomaly scoring uses **ML.NET** (`Microsoft.ML`, GA, OSS, MIT) via `RandomizedPcaTrainer`. Domain code performs feature engineering only; the trainer/transformer is invoked behind `IAnomalyScorer` (Principle V). research.md §R5 records the library evaluation (ML.NET vs. Accord.NET vs. custom). |

**Result**: PASS — no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-expense-fraud-demo/
├── plan.md              # This file
├── research.md          # Phase 0 output — technical decisions
├── data-model.md        # Phase 1 output — entity model
├── quickstart.md        # Phase 1 output — local dev guide
├── contracts/
│   └── api.openapi.yaml # Phase 1 output — HTTP API contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Directory.Build.props
├── Directory.Build.targets
├── fraud-ai-demo.slnx
├── src/
│   ├── Domain/          # Entities, enums, projections — no external deps
│   ├── Application/     # Abstractions, services, config, DTOs
│   ├── Infrastructure/  # AI (AgentInvestigator), Persistence, Detection
│   └── Functions/       # HTTP endpoints, DI, error handling
└── tests/
    └── unit/
        ├── Domain.Tests/
        ├── Application.Tests/
        └── Infrastructure.Tests/

frontend/
├── src/
│   ├── api/             # runsClient.ts, types.ts
│   ├── components/      # AiVerdictPanel, RunSummaryStats, BandChart, etc.
│   ├── routes/          # HomePage, RunDetailRoute, CaseDetailRoute, etc.
│   └── lib/             # queryClient, userProfile
└── tests/

infra/
├── main.bicep           # Orchestrator
└── modules/             # foundry, functions, storage, staticwebapp, etc.

docs/
├── architecture.md
├── setup.md
├── deployment.md
├── components.md
└── api.md
```

**Structure Decision**: Web application with `backend/` + `frontend/` + `infra/` split, matching the existing repository layout.

## Complexity Tracking

> No violations — no entries required.