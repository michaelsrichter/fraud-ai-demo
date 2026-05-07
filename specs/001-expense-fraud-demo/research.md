# Phase 0 — Research

**Feature**: AI-Powered Internal Expense Fraud Demo
**Date**: 2026-05-06
**Inputs**: [spec.md](./spec.md), [plan.md](./plan.md), [Constitution v1.0.0](../../.specify/memory/constitution.md)

This document resolves the open technical questions surfaced while filling
[plan.md](./plan.md) — both `NEEDS CLARIFICATION`-style unknowns and
best-practice / pattern questions for each major dependency. Each section
follows: **Decision → Rationale → Alternatives considered**.

---

## R1. Frontend hosting: Static Web Apps vs. App Service for the SPA

**Decision**: Use **Azure Static Web Apps (SWA), Standard tier**, with the
backend Function App linked via "Bring your own Functions".

**Rationale**:
- Constitution Principle I requires a "static web application frontend" —
  SWA is the canonical Azure target for a built React+Vite bundle.
- Standard tier supports linked Functions backends with managed-identity-aware
  auth flow (and is required if we later add user auth, FR-025) and lifts the
  Free-tier route/size limits.
- SWA's GitHub-Actions deploy token model is replaced in our setup by the
  unified `azd deploy` flow (Principle II) — SWA Standard supports `azd`-driven
  deploys natively.

**Alternatives considered**:
- **Blob static website + Front Door**: cheaper, but no native API linking,
  no managed deploy story aligned with `azd`, and adds CDN config that the
  demo doesn't need.
- **App Service serving static files + the API**: violates Principle I's
  "static frontend" + "serverless backend" split.

---

## R2. Backend hosting plan: Flex Consumption vs. Consumption vs. Premium

**Decision**: **Flex Consumption** plan, .NET 9 isolated worker.

**Rationale**:
- Flex Consumption is GA, supports .NET 9 isolated worker, Managed Identity,
  VNet integration (future-proofing), and avoids the legacy Consumption SKU
  cold-start tax that would jeopardize SC-002 (≤ 5 s) and SC-004 (≤ 10 s
  typical AI call).
- Per-instance memory configurability lets us guarantee enough headroom for
  the 50,000-record cap (FR-004) without paying for an always-on Premium plan.

**Alternatives considered**:
- **Legacy Consumption (Y1)**: cold starts can blow SC-002/SC-004 in a live
  demo; not worth saving the marginal cost.
- **Premium (EP1)**: always-on; meets perf comfortably but is overkill for a
  demo and adds standing cost.
- **Container Apps**: adds container build complexity for no demo payoff;
  Functions isolated worker on Flex is the simpler match for the constitution's
  explicit "Azure Functions using .NET isolated runtime" requirement.

---

## R3. Persistence layout: which Azure Storage services and how to split data

**Decision**: **Two services in a single Storage account**:
- **Blob** container `runs/` — one blob per Run (`runs/{runId}.json.gz`),
  containing the full Run payload (config, employees, expense records,
  detection results, AI verdicts). Gzip-compressed JSON.
- **Table** `RunIndex` — list/lookup index. `PartitionKey = "v1"` (the v1
  shared tenant placeholder per FR-025), `RowKey = runId`. Columns:
  `createdUtc`, `recordCount`, `bandHigh`, `bandMedium`, `bandLow`,
  `intensity`, `weights` (JSON string), `aiInvestigationCount`.

**Rationale**:
- A Run is a single self-contained document with a "load all or load none"
  access pattern — Blob is the right shape and lets us keep payloads up to
  the 50,000-record cap (~10–20 MB JSON, smaller gzipped) without table-row
  fragmentation.
- The list-runs UX (FR-024) needs only summary metadata. Table queries on
  `PartitionKey = "v1"` give fast O(N) scans bounded by the run count, with
  zero blob reads.
- AI verdicts live inside the Run blob (rewritten on each new investigation
  for that Run). Concurrent investigations on the same Run are serialized via
  ETag/If-Match optimistic concurrency on the blob.
- One Storage account simplifies Bicep + RBAC (one resource, two role
  assignments).

**Alternatives considered**:
- **Cosmos DB**: overkill cost + complexity for a demo; nothing about the
  workload requires multi-region or rich querying.
- **Single blob, no index**: every list-runs request would have to enumerate
  the container and parse each blob — fine at 10 runs, painful at 1,000.
- **Table-only (no blob)**: hits Table's 1 MB row + 252-property limits at
  the 50,000-record cap; would force fan-out across rows and complicate reads.

---

## R4. Optimistic concurrency for in-flight AI investigations

**Decision**: Use **Blob ETag + If-Match** on the Run blob. The
`InvestigateCase` function reads the Run, appends/updates its
`AiInvestigationResult`, and writes back conditionally. On 412 Precondition
Failed, retry once after re-reading.

**Rationale**:
- Solves the FR-013 + Edge-Case "re-running detection mid-investigation"
  problem deterministically: if the user generated a new Run mid-flight, the
  in-flight result writes to its **originating** Run blob (its ETag still
  matches there), exactly as the clarification mandated.
- Blob ETag concurrency is built-in and free; no extra service needed.

**Alternatives considered**:
- **Per-Run lock blob / lease**: more code, weaker semantics under retries.
- **Append-only verdict blobs per case**: cleaner write path but read path
  has to reassemble — not worth it for the demo's modest investigation count.

---

## R5. Anomaly detection algorithm and library

**Decision**: Delegate scoring to **ML.NET** (`Microsoft.ML`, GA, MIT-licensed,
maintained by Microsoft) using the **`RandomizedPcaTrainer`** for unsupervised
anomaly detection. Domain code is responsible only for feature engineering;
all numerical fitting and scoring goes through the library, behind an
`IAnomalyScorer` interface (Principle V). This satisfies Constitution
Principle XII (Library-First Algorithms).

**Pipeline**:

1. **Feature engineering** (domain code, `FraudFeatureBuilder`) — for each
   `ExpenseRecord`, compute the following numeric features against the
   employee's own history *and* the employee's department peer group:
   - `amountZ` — z-score of amount vs. employee history
   - `amountVsThresholdGap` — distance to nearest policy threshold (catches
     threshold-gaming, FR-002)
   - `frequencyZ` — z-score of submissions/day in a 7-day window (catches
     unusual frequency, FR-002)
   - `vendorRarity` — `1 - p(vendor | employee, dept)` (catches vendor
     anomaly, FR-002)
   - `categoryDeviation` — z-score of amount within the same expense category
   - `weekendSubmission` — 0/1 binary

2. **Library scoring** (`IAnomalyScorer` → ML.NET impl):
   - Build an `MLContext` per Run (cheap, deterministic when seeded).
   - Fit `Trainers.Anomaly.RandomizedPca(featureColumnName: "Features",
     rank: 4, ensureZeroMean: true, seed: config.Seed ?? fixedDefault)` on the
     full feature matrix for the Run. (Per-Run fit is acceptable at the
     50 000-record cap — ML.NET's PCA trainer is O(N·d²) and finishes in
     well under a second on the planned dataset sizes; this comfortably fits
     SC-002's ≤ 5 s budget.)
   - Transform every record; ML.NET emits a `Score` and a `PredictedLabel`
     per row. We use `Score` as the raw anomaly score.

3. **Normalization & banding** (domain code):
   - Map raw scores to `confidence ∈ [0,1]` via a logistic squash calibrated
     against the Run's score distribution (FR-007).
   - Apply `Run.Configuration.Thresholds` (defaults `tLow = 0.55`,
     `tHigh = 0.85`) to assign `High` / `Medium` / `Low` (FR-008/9).
   - Pull the **top 5** feature *contributions* via per-feature standardized
     residuals; ML.NET PCA does not expose per-feature attribution natively,
     so we recompute z-scores on the engineered features for the
     `ContributingFeatures` list. This is engineering-only post-processing,
     not a custom algorithm. (Five strikes a balance between informativeness
     for the case-detail panel and AI prompt budget; pinned in
     [data-model.md](./data-model.md) under `DetectionResult`.)

**Library evaluation** (required by Principle XII):

| Candidate | License | Last release | Verdict |
|---|---|---|---|
| **ML.NET (`Microsoft.ML`)** | MIT | active, multiple GA releases in last 12 months | **Selected** — first-party .NET, GA, well-documented, native NuGet packaging, free runtime, no Python sidecar required. `RandomizedPcaTrainer` is purpose-built for unsupervised anomaly detection. |
| Accord.NET | LGPL-2.1 | last release > 5 years ago; effectively unmaintained | Rejected — fails Principle XII's "actively released within the last 12 months" bar. |
| Custom C# (Mahalanobis-style score) | n/a | n/a | Rejected — Principle XII prohibits custom implementations of standard algorithms when a suitable library exists. ML.NET clears that bar. |

**Rationale**:
- ML.NET is the canonical .NET-native, Microsoft-backed OSS choice; selecting
  it directly honors Principle XII without introducing a non-.NET runtime.
- Per-Run fit is correct: the model is unsupervised and tiny, so retraining
  per Run avoids stale-baseline issues without measurable cost.
- Determinism is preserved by passing `config.Seed` through to the trainer
  (Assumption: deterministic detection layer).
- The interface boundary (`IAnomalyScorer`) keeps the rest of the system
  swappable if we later want to A/B against another library or a hosted
  model.

**Alternatives considered**:
- **Python ML sidecar (scikit-learn IsolationForest)**: rejected — would
  introduce a non-.NET runtime, violate the simplicity of the Functions
  isolated-worker hosting choice, and add an extra cold-start budget that
  threatens SC-002/SC-004.
- **ML.NET `KMeansTrainer` with distance-to-centroid as anomaly score**:
  workable, but `RandomizedPcaTrainer` is the trainer ML.NET explicitly
  documents *for anomaly detection*, so we use the typed-for-purpose API.

---

## R6. AI orchestration: Microsoft Agent Framework GA pattern

**Decision**: A single **stateless agent** (`ChatClientAgent`) constructed
per request, with:
- **Structured output** via the agent's response-format binding to a
  `AiVerdict` record (FR-012's four required fields).
- **Tools NOT registered** for v1 — the agent receives all needed context in
  the user message; no function-calling round trips. This keeps the call to a
  single LLM hop and well inside SC-004's ≤ 10 s typical.
- **Auth** via `DefaultAzureCredential` → `AzureOpenAIClient` → wrapped in
  `Microsoft.Agents.AI.OpenAI`'s `IChatClient`.
- **Cancellation token** wired to a 30-second `CancellationTokenSource`
  (FR-014). On `OperationCanceledException` or any `RequestFailedException`,
  the function returns `AiInvestigationResult.Unavailable(reason)` and the
  caller persists nothing.

**Prompt payload (FR-011 operationalization)**: The agent receives a single
user message built deterministically from the Run, with these sections (this
schema is the contract for task **T065**):

1. **Case under review** — the target `ExpenseRecord` (date, amount, vendor,
   category, submitted-by employee id) plus the matching `DetectionResult`
   (anomaly score, confidence band, top-5 `ContributingFeatures` with their
   z-scores).
2. **Employee profile** — id, department, role/title, tenure bucket
   (< 1 yr / 1–3 yr / 3+ yr), historical mean & stddev of expense amount.
3. **Recent history (90-day window ending at the case's submission date)** —
   count of submissions, total amount, count above the employee's
   per-category historical mean + 2σ, count of distinct vendors, and the
   three highest-scored prior records with date/amount/score.
4. **Peer comparison** — for the same `(department, category)` cohort within
   the Run: cohort size, median amount, 75th/95th percentile amount, the
   case's percentile rank within that cohort.
5. **Run context** — `runId`, applied `SimulationConfiguration` (intensity
   and per-pattern weights), and band thresholds. The agent is told this is
   a synthetic dataset and that ground-truth fraud labels exist but are not
   provided.

`FraudLikelihood` semantics for the structured output:
- `Likely` — agent has converged on a probable-fraud judgment with at least
  one corroborating signal beyond the anomaly score.
- `Unlikely` — explicit benign explanation found (e.g., recurring legitimate
  vendor for the role, amount within peer 75th percentile).
- `Inconclusive` — neither corroborated nor refuted; this is the **default
  on weak signals** and is preferred over a low-confidence `Likely`.

This payload is built from the Run already loaded in memory (no extra
storage round trips), keeping SC-004 (≤ 10 s) achievable.

**Rationale**:
- The Microsoft Agent Framework GA's stateless agent + structured output is
  the simplest path to FR-012's contract; tools/MCP are unnecessary for v1.
- Stateless construction per request avoids any cross-request leakage and
  lets us evolve the system prompt without restarting the host.
- Single LLM hop = predictable latency budget for SC-004.

**Alternatives considered**:
- **Multi-agent / orchestrator agent**: gold-plating; nothing in the spec
  needs more than one specialist.
- **Tool-using agent (function calling for "fetch peer history")**: we
  already have the peer history in process when we build the prompt; an extra
  round trip would add latency for no information gain.
- **Raw `AzureOpenAIClient` without Agent Framework**: violates Principle III
  ("AI orchestration MUST use the GA Microsoft Agent Framework").

---

## R7. Foundry / Azure OpenAI model selection and deployment

**Decision**: Provision a **Foundry / Azure OpenAI** resource via Bicep with
a single model deployment named `gpt-fraud-investigator`, mapped to **the
latest GA GPT model available at deploy time** (target `gpt-4.1`; the actual
`model` and `version` are Bicep parameters with defaults so the deploy can
track newer GA models without code change — Principle III + IX).

**Rationale**:
- Decouples the deployment *name* (used by the Functions app config) from
  the model *version* (a Bicep param), so swapping models is a config change,
  not a code change.
- Using a single named deployment avoids cold-start cost on the model side.

**Alternatives considered**:
- **Public OpenAI / non-Azure model**: violates Principle III (Foundry).
- **Hardcode model version**: violates Principle IX (config without code).

---

## R8. Frontend ↔ backend API style

**Decision**: **REST over JSON**, schema-described by an **OpenAPI 3.1**
document under [contracts/api.openapi.yaml](./contracts/api.openapi.yaml).
The frontend uses `@tanstack/react-query` for caching + an auto-generated TS
type set (via `openapi-typescript`) to keep types aligned without runtime
coupling.

**Endpoints** (full schemas in `contracts/`):
- `POST /api/runs` — create a Run (body = SimulationConfiguration)
- `GET /api/runs` — list Runs (summary view)
- `GET /api/runs/{runId}` — fetch full Run
- `GET /api/runs/{runId}/cases/{caseId}` — fetch a single case
- `POST /api/runs/{runId}/cases/{caseId}/investigate` — invoke AI agent

**Rationale**:
- REST + OpenAPI is the simplest contract that lets the Functions HTTP
  triggers, the typed React client, and the published `/docs/api.md` all
  derive from one source — directly satisfying Principle VII's API doc clause.
- `@tanstack/react-query` gives us cached reads, optimistic updates, and a
  loading/error state machine for free, helping SC-003.

**Alternatives considered**:
- **gRPC / GraphQL**: overkill for 5 endpoints with mostly-static schemas.
- **SignalR push for AI results**: nice but unnecessary — SC-004's ≤ 10 s
  budget is fine for a polling-free single HTTP call with a spinner.

---

## R9. CI/CD: GitHub Actions + OIDC federated identity

**Decision**: One workflow `.github/workflows/ci-cd.yml` triggered on push to
`main`, with three sequential jobs:
1. **build-test** — `dotnet test` (backend) and `npm test` (frontend); fails the run on any test failure.
2. **deploy-infra** — `azd provision` using OIDC federation against a
   pre-provisioned Azure AD app registration / federated credential.
3. **deploy-app** — `azd deploy` to push Functions + SWA artifacts.

The federated-credential setup (one-time, manual or via `azd pipeline
config`) creates a service principal with **Contributor on the resource group
only** — no subscription-level grants.

**Rationale**:
- Satisfies Principle II (automated, OIDC, no hardcoded credentials, no
  manual steps after merge).
- `azd pipeline config` is the canonical path and emits the OIDC trust + SP
  + GitHub repo secrets in one shot.

**Alternatives considered**:
- **Service principal + client secret in GitHub Secrets**: forbidden by
  Principle II.
- **Workload identity federation w/o `azd`**: viable but reinvents wheels;
  `azd` already supports OIDC end-to-end.

---

## R10. Local development: storage emulator and Functions host

**Decision**: **Azurite** for Storage emulation, **Azure Functions Core Tools
v4** (`func start`) for the Functions host, **Vite dev server** for the
frontend. A top-level `npm run dev` script (or `tasks.json` task) starts all
three concurrently. Local AI calls go to the **real Foundry resource** in the
developer's subscription via `DefaultAzureCredential` (`az login`); no AI
mock needed for the inner loop — but `IAiInvestigator` is mockable in unit
tests (Principle VI).

**Rationale**:
- Principle XI requires a low-friction local loop. Azurite + Core Tools +
  Vite is the standard combo and has no extra infra cost.
- Using the real Foundry resource locally avoids divergence between dev and
  deployed behavior; the CLI signed-in user already has `Cognitive Services
  OpenAI User` granted via the Bicep `rbac.bicep` module.

**Alternatives considered**:
- **Mock AI locally**: would mask integration bugs that cost time on stage.
- **Containerize everything (docker-compose)**: extra moving parts for no
  demo-time benefit.

---

## R11. Secret-free configuration

**Decision**: All Functions app settings are **non-secret** (storage account
name, table name, blob container, Foundry endpoint, model deployment name,
default thresholds). Authentication is done via Managed Identity / OIDC. The
**only** runtime "credential" is the system-assigned Managed Identity, and it
is referenced by RBAC role assignments in Bicep, not by any setting value.

**Rationale**:
- Principle IV forbids secrets in code or config. Endpoint/account *names*
  are not secrets.
- This means there is no Key Vault required for v1 — a deliberate
  simplification (we add it the moment a real secret is needed).

**Alternatives considered**:
- **Provision Key Vault upfront**: speculative complexity; YAGNI for v1.

---

## Outstanding NEEDS CLARIFICATION

None. All Technical Context items are resolved.
