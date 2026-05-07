# Quickstart

**Feature**: AI-Powered Internal Expense Fraud Demo
**Audience**: A developer who has just cloned the repo and wants to (a) run the
full system locally and (b) deploy it to their own Azure subscription.

This is a **Phase 1 design artifact**, not the final user-facing setup doc.
The detailed runbook will live in `docs/setup.md` and `docs/deployment.md`
(per Constitution Principle VII) once the implementation lands. The intent
here is to lock in the developer-experience contract from
[Constitution Principle XI](../../.specify/memory/constitution.md).

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| .NET SDK | 9.0+ | Backend (Functions isolated worker) |
| Node.js | 20 LTS+ | Frontend (Vite + React 18) |
| Azure Functions Core Tools | v4 | `func start` for local backend |
| Azurite | 3.x+ (npm `azurite` or VS Code extension) | Local Azure Storage emulator |
| Azure CLI | 2.65+ | `az login` to grant local dev access via Bicep |
| Azure Developer CLI (`azd`) | 1.10+ | Single-command provision + deploy |
| Git | any recent | Source control |

A Microsoft Foundry / Azure OpenAI resource is **not** required for
generation/detection (Stories 1, 3, 4 work fully offline). It **is** required
to exercise the AI investigation path (Story 2).

---

## 1. Clone & install

```bash
git clone <repo-url> fraud-ai-demo
cd fraud-ai-demo

# Backend
cd backend && dotnet restore && cd ..

# Frontend
cd frontend && npm ci && cd ..
```

---

## 2. Run all tests locally (Constitution VI + XI)

A single command per layer must run every unit test.

```bash
# All backend unit tests (Domain, Application, Infrastructure)
dotnet test backend/fraud-ai-demo.sln

# All frontend tests
cd frontend && npm test -- --run && cd ..
```

The CI pipeline runs the same two commands; if they pass locally they pass in
CI (Principle II).

---

## 3. Run the full system locally

Open three terminals (or use the `tasks.json` "dev: all" compound task):

**Terminal A — Azurite (storage emulator)**
```bash
azurite --silent --location ./.azurite
```

**Terminal B — Functions backend**
```bash
cd backend/src/Functions
func start
# → http://localhost:7071/api/...
```

`local.settings.json` is gitignored (per Principle IV). A starter is checked
in as `local.settings.template.json` with non-secret values:

- `AzureWebJobsStorage = "UseDevelopmentStorage=true"` (Azurite)
- `Foundry__Endpoint = "<your-foundry-endpoint>"` (only needed for Story 2)
- `Foundry__ModelDeploymentName = "gpt-fraud-investigator"`
- `Detection__DefaultLowThreshold = "0.55"` etc.

Auth to Foundry uses `DefaultAzureCredential`, which picks up your `az login`
session — no client secret needed.

**Terminal C — Frontend dev server**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

Vite proxies `/api/*` → `http://localhost:7071/api/*` (configured in
`vite.config.ts`), so the SWA-linkage URL shape works in dev too.

---

## 4. Walk the demo

Once all three are running, follow Story 1 from [spec.md](./spec.md):

1. Open `http://localhost:5173`.
2. **Generate** with default config (intensity 0.05, default weights, 5,000
   records). Confirm a small case count in the Medium/High bands.
3. Increase intensity to ~0.30 and click **Generate** again.
4. Observe the band-distribution chart shift.
5. Open a Medium-confidence case and click **Investigate with AI**.
6. The structured verdict, rationale, contributing signals, and recommended
   action should appear within ~10 seconds (SC-004).

If the Foundry resource is offline, step 6 should show the graceful fallback
state (FR-014 / SC-007); the rest of the UI must remain interactive.

---

## 5. Deploy to your Azure subscription (Constitution I, IV, XI)

Single-command path:

```bash
az login                  # Bicep grants the signed-in user dev access (Principle IV)
azd auth login
azd up                    # provision infra (Bicep) + deploy code (SWA + Functions)
```

`azd up` will:

1. Provision a resource group + Storage account + Functions Flex plan +
   Function App + Static Web App + Application Insights + Foundry resource +
   GPT model deployment, all from `infra/main.bicep`.
2. Assign the **Functions app's system-assigned Managed Identity** the roles
   `Storage Blob Data Contributor`, `Storage Table Data Contributor`, and
   `Cognitive Services OpenAI User`.
3. Assign the **`az ad signed-in-user`** the same roles so local dev works
   against the deployed Foundry resource without portal clicks.
4. Build & deploy the .NET 9 Functions app and the Vite-built static
   frontend.

End state: a public SWA URL and a working demo, with **zero secrets**
created or stored.

To set up GitHub Actions CI/CD (OIDC federated identity, no PAT):

```bash
azd pipeline config
```

This creates the federated credential, the GitHub repo secrets, and the
`.github/workflows/ci-cd.yml` references in one shot (Principle II).

---

## 6. Tear down

```bash
azd down --purge
```

`--purge` is required because Foundry / Azure OpenAI resources have a
soft-delete that would otherwise block re-deployment under the same name.

---

## 7. Acceptance — does this quickstart honor the constitution?

| Principle | Check |
|---|---|
| I — Bicep + static frontend + Functions isolated | `azd up` provisions exactly this; `infra/main.bicep` is the single source of truth |
| II — GitHub Actions + OIDC + no manual steps | `azd pipeline config` produces the workflow; merge-to-main = full deploy |
| IV — Managed Identity, no secrets, RBAC in Bicep, CLI user granted | Step 5 above; `local.settings.json` is gitignored and contains no secrets |
| VI — Tests runnable locally + in CI | Step 2 — single `dotnet test` and `npm test` commands |
| VII — `/docs` exists | `docs/setup.md` (the productized version of this file) is part of the implementation tasks |
| XI — One-command local dev, one-command deploy | Steps 3–5 |

If any of these checks fail at implementation time, that is a constitution
violation and must be fixed (or justified in `plan.md` Complexity Tracking)
before the feature ships.
