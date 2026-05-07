# Implementation Plan: AI-Powered Internal Expense Fraud Demo

**Branch**: `001-expense-fraud-demo` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-expense-fraud-demo/spec.md`

## Summary

A single-presenter demo web application that (1) generates synthetic employee
expense activity with configurable fraud injection (overall intensity + per-pattern
weights for threshold-gaming, unusual frequency, and vendor anomaly), (2) runs a
deterministic multivariate anomaly-detection pipeline that classifies every record
into a high / medium / low confidence band, (3) lets the presenter invoke an AI
investigator on **any** case for structured verdict + rationale, and (4) persists
each generation as a **Run** in Azure Storage so prior runs remain inspectable.

The technical approach is a static React+Vite+TypeScript frontend (Azure Static
Web Apps) calling a .NET 9 isolated-worker Azure Functions backend organized into
domain / application / infrastructure layers. Anomaly scoring is delegated to
**ML.NET** (Microsoft's GA open-source ML library) per Constitution Principle
XII — the system performs feature engineering in domain code and hands the
feature matrix to ML.NET's `RandomizedPcaTrainer` for unsupervised anomaly
scoring. The AI investigator uses Microsoft Foundry (latest GA GPT model)
orchestrated through the GA Microsoft Agent Framework. Persistence is split
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
- Frontend: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zod` (response validation), `recharts` or `visx` (band-distribution chart), `vitest`, `@testing-library/react`
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
- AI: Microsoft Foundry AI Services resource (kind: AIServices — NOT Azure OpenAI) with multiple GA GPT models deployed (gpt-4.1, o3, o4-mini); users select the model at investigation time per FR-020 / Principle IX

**Project Type**: Web application (frontend + backend) with infrastructure-as-code

**Performance Goals**:
- Generate + detect cycle ≤ 5 s perceived for the default 5,000-record dataset (SC-002)
- Non-AI UI interaction ≤ 1 s perceived (SC-003)
- AI investigation ≤ ~10 s typical, 30 s hard timeout → fallback (SC-004 / FR-014)
- Story-1 narrative end-to-end ≤ 3 minutes (SC-001)

**Constraints**:
- No secrets in code or config — Managed Identity + RBAC only (Principle IV, FR-023)
- All infra via Bicep; CLI-signed-in user granted dev access through Bicep (Principle IV)
- AI failures must NOT crash the UI (FR-014 / SC-007 / Principle VIII)
- Detection layer must be deterministic given a Run config (Assumption)
- Hard cap 50,000 records per Run (FR-004)

**Scale/Scope**:
- Single concurrent presenter; v1 has no per-user scoping (FR-025) but data model carries an owner placeholder field for forward-compatibility
- Datasets: 1,000–50,000 expense records, 10–500 simulated employees (lower
  bound 10 supports small unit-test fixtures and minimal smoke runs; demo
  scenarios typically use 50–200)
- Run history: unbounded retention in Azure Storage (no auto-purge in v1)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Each row is evaluated against the project [Constitution v1.0.0](../../.specify/memory/constitution.md). Status: **PASS** = compliant; **PASS w/ note** = compliant with implementation guidance captured below; **VIOLATION** = requires Complexity Tracking justification.

| # | Principle | Status | How this plan satisfies it |
|---|---|---|---|
| I | Platform & Deployment (Azure, Bicep, static frontend, Functions isolated) | **PASS** | Frontend = Azure Static Web Apps; backend = Azure Functions .NET 9 isolated worker; all infra in `infra/*.bicep`. No portal/imperative provisioning. |
| II | Source Control & CI/CD (GitHub, Actions, OIDC, no secrets, automated on `main`) | **PASS** | GitHub Actions workflow on push to `main` builds backend + frontend, runs all tests, then runs `azd deploy`. Auth = OIDC federated identity to a deploy-time service principal; no PATs/keys. |
| III | AI & Agent Framework (Foundry + GA Agent Framework) | **PASS** | AI calls go through `Microsoft.Agents.AI` (GA) targeting a Microsoft Foundry AI Services deployment with multiple models. **No Azure OpenAI resources (kind: OpenAI)**. No preview SDKs on `main`. |
| IV | Security & Identity (Managed Identity, no secrets, RBAC in Bicep, CLI user granted dev access) | **PASS** | Functions app = system-assigned Managed Identity. RBAC role assignments (`Storage Blob Data Contributor`, `Storage Table Data Contributor`, `Cognitive Services User`) all created in Bicep. Bicep also assigns the same roles to the deploying user (`az ad signed-in-user`) so local dev works without portal clicks. No connection strings; SDKs use `DefaultAzureCredential`. |
| V | Code Quality & Architecture (SOLID, layered, DI, modular) | **PASS** | Backend organized into `Domain/`, `Application/`, `Infrastructure/`, `Functions/` projects. DI is the Functions isolated-worker default; all I/O is behind interfaces. |
| VI | Testing Requirements (unit tests for all backend logic, mocked AI boundary, runnable locally + in CI) | **PASS** | `tests/unit/` xUnit project with coverage for domain (scoring, banding, fraud injection), application (orchestration, agent boundary mocked via `IAiInvestigator`), infrastructure (storage repository wrapped by integration-style tests using Azurite). |
| VII | Documentation (`/docs`, Markdown, architecture + setup + components + APIs, inline comments) | **PASS w/ note** | `/docs` will contain `architecture.md`, `setup.md`, `deployment.md`, `components.md`, plus the OpenAPI doc generated from `contracts/`. Inline comments mandatory on non-obvious logic (esp. scoring math, agent prompt construction). |
| VIII | Observability & Reliability (logging, graceful AI degradation, no crash on AI outage) | **PASS** | All Functions log to Application Insights via `ILogger<T>`. Agent calls wrapped with try/catch + 30 s timeout (FR-014); failure path returns `AiInvestigationResult.Unavailable` and the UI renders the fallback state (FR-014, SC-007). |
| IX | Configuration & Flexibility (runtime config, no code change for tuning) | **PASS** | All tunable params live in `IOptions<DemoConfig>` bound from app settings + per-request overrides via the Generate endpoint body. Model deployment name + endpoint are app settings; thresholds, intensities, and pattern weights are request inputs. |
| X | Performance Expectations (thousands of records, seconds, responsive UI) | **PASS w/ note** | Detection is in-process C# numeric code over arrays — comfortably meets ≤ 5 s for 5,000 records. Blob writes are async + gzip. UI uses TanStack Query for cached reads. |
| XI | Development Experience (run locally, single test command, low-friction deploy) | **PASS** | `azurite` for local Storage, `func start` for Functions, `npm run dev` for frontend; `dotnet test` runs all backend tests; `azd up` is the single deploy command. All documented in `docs/setup.md` + `quickstart.md`. |
| XII | Library-First Algorithms (popular OSS over custom for standard algos) | **PASS** | Anomaly scoring uses **ML.NET** (`Microsoft.ML`, GA, OSS, MIT) via `RandomizedPcaTrainer`. Domain code performs feature engineering only; the trainer/transformer is invoked behind `IAnomalyScorer` (Principle V). research.md §R5 records the library evaluation (ML.NET vs. Accord.NET vs. custom). |

**Result**: PASS — no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-expense-fraud-demo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI for HTTP endpoints)
│   └── api.openapi.yaml
├── checklists/
│   └── requirements.md  # Spec quality checklist (already passing)
└── tasks.md             # Created by /speckit.tasks (NOT this command)
```

### Source Code (repository root)

```text
fraud-ai-demo/
├── infra/                                # Bicep IaC (Principle I, IV)
│   ├── main.bicep                        # Subscription/RG-scope entry; orchestrates modules
│   ├── main.parameters.json              # Defaults; env-specific overrides via azd
│   ├── modules/
│   │   ├── storage.bicep                 # Storage account + blob container + table
│   │   ├── functions.bicep               # Flex Consumption plan + Function App + AI/AppInsights
│   │   ├── staticwebapp.bicep            # SWA + linked backend
│   │   ├── foundry.bicep                 # Foundry / Azure OpenAI resource + GA GPT model deployment
│   │   └── rbac.bicep                    # All role assignments (Functions MI + signed-in user)
│   └── abbreviations.json                # azd standard
├── backend/                              # .NET 9 solution (Principle V)
│   ├── fraud-ai-demo.sln
│   ├── src/
│   │   ├── Domain/                       # Pure business types — Employee, ExpenseRecord, Run, etc.
│   │   ├── Application/                  # Use cases — GenerateRun, RunDetection, InvestigateCase
│   │   │   ├── Abstractions/             # IFraudInjector, IAnomalyScorer, IAiInvestigator, IRunRepository
│   │   │   └── Services/
│   │   ├── Infrastructure/               # Concrete impls — BlobRunRepository, TableRunIndex, AgentInvestigator
│   │   └── Functions/                    # HTTP-triggered Functions hosting the API
│   │       ├── Program.cs                # DI composition root
│   │       ├── GenerateRunFunction.cs
│   │       ├── ListRunsFunction.cs
│   │       ├── GetRunFunction.cs
│   │       ├── GetCaseFunction.cs
│   │       └── InvestigateCaseFunction.cs
│   └── tests/
│       └── unit/                         # xUnit unit tests (Principle VI)
│           ├── Domain.Tests/
│           ├── Application.Tests/        # Mocks IAiInvestigator, IRunRepository
│           └── Infrastructure.Tests/     # Uses Azurite for storage tests
├── frontend/                             # React + Vite + TS (Principle I — static app)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/                       # /runs, /runs/:id, /runs/:id/cases/:caseId
│   │   ├── components/                   # CaseList, CaseDetail, BandChart, ConfigPanel
│   │   ├── api/                          # Typed client (zod-validated)
│   │   └── lib/                          # Helpers
│   └── tests/                            # Vitest + RTL
├── docs/                                 # Principle VII
│   ├── architecture.md
│   ├── setup.md
│   ├── deployment.md
│   ├── components.md
│   └── api.md                            # Generated/curated from contracts/api.openapi.yaml
├── .github/
│   └── workflows/
│       └── ci-cd.yml                     # Build, test, deploy on push to main (Principle II)
├── azure.yaml                            # azd configuration
├── .gitignore                            # Already present
└── README.md                             # Top-level orientation → docs/
```

**Structure Decision**: Web-application layout — separate `backend/` (.NET 9 isolated Functions, layered into Domain/Application/Infrastructure/Functions per Principle V) and `frontend/` (React + Vite + TypeScript static app per Principle I), with `infra/` Bicep modules per Principle I/IV and `docs/` per Principle VII. The single `fraud-ai-demo.sln` keeps the backend buildable + testable with one command (Principle XI).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Section intentionally empty.
