# Implementation Plan: AI Fraud Lab — Multi-Scenario Platform

**Feature directory**: `specs/002-ai-fraud-lab/`
**Spec**: [spec.md](./spec.md)
**Status**: Mostly implemented (see Implementation Status below)

---

## Technical Context

### Stack (same as 001)
- **Backend**: .NET 10 isolated Azure Functions, ML.NET 4.0, Microsoft.Agents.AI 1.0 GA, Azure Storage (Blob + Table), Managed Identity
- **Frontend**: React 18 + Vite + TypeScript + TanStack Query + Recharts + Zod
- **Infra**: Bicep (subscription-scoped), VNet + private endpoints, AI Services with 3 GPT models
- **Auth**: Azure SWA built-in auth (GitHub provider) for admin; localStorage profiles for lab users

### New Infrastructure
- `UserProfiles` Azure Table (added to `storage.bicep`)
- `staticwebapp.config.json` route rules for `/admin` auth

### Key Design Decisions
1. **Profile = localStorage UUID** — no server-side auth for lab users. Keeps onboarding frictionless.
2. **Server-side profile sync** — profiles POSTed to `/api/profiles` on creation. Enables admin dashboard without requiring lab users to authenticate.
3. **Activity tracking** — best-effort counters incremented via `POST /api/profiles/activity`. Not transactional.
4. **Admin auth** — SWA built-in GitHub auth with role-based access. No custom auth code.
5. **Data isolation** — ownerId stored on runs; server-side filtering deferred (frontend gate provides UX isolation).

---

## Constitution Check

| # | Principle | Status | Notes |
|---|---|---|---|
| I | Deployable to Azure, Bicep IaC | **PASS** | UserProfiles table added to storage.bicep |
| II | CI/CD, automated deploy | **PASS** | Same azd up pipeline |
| III | AI & Agent Framework (Foundry, GA) | **PASS** | Unchanged from 001 |
| IV | Security & Identity (MI, no secrets) | **PASS** | Profile sync uses anonymous endpoint; admin uses SWA auth |
| V | Layered architecture | **PASS** | ProfileFunctions is a thin endpoint; no domain coupling |
| VI | Unit tests | **PASS** | Existing tests unaffected; new endpoints are simple CRUD |
| VII | Documentation | **PASS** | Spec + plan + How It Works page |
| VIII | Observability | **PASS** | App Insights on backend; Clarity script on frontend; activity tracking |
| IX | Configuration-driven | **PASS** | Clarity ID configurable in index.html |
| X | Idempotent deploys | **PASS** | Table CreateIfNotExists; profile upsert |
| XI | Local dev experience | **PASS** | Azurite supports Table storage locally |
| XII | Library-first algorithms | **N/A** | No new algorithms in this feature |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Azure Static Web App                        │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ HomePage │ │ Labs/*   │ │ /admin       │ │
│  │   /      │ │ expenses │ │ (auth: admin)│ │
│  │          │ │ insurance│ │              │ │
│  │          │ │ payments │ │              │ │
│  └─────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────────────────────────────────┐   │
│  │ TopNav (all pages)                    │   │
│  │ Profile gate (/labs/* only)           │   │
│  └──────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │ /api/*
┌─────────────────▼───────────────────────────┐
│  Azure Functions (.NET 10)                   │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ │
│  │ Runs API │ │ Profiles  │ │ Admin List │ │
│  │ (existing)│ │ POST/GET  │ │ GET (auth) │ │
│  └──────────┘ └───────────┘ └────────────┘ │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Azure Storage                               │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ │
│  │ runs/*   │ │ RunIndex  │ │UserProfiles│ │
│  │ (blobs)  │ │ (table)   │ │ (table)    │ │
│  └──────────┘ └───────────┘ └────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Data Model: UserProfiles Table

| Column | Type | Description |
|---|---|---|
| PartitionKey | string | Always `"profiles"` |
| RowKey | string | User UUID from localStorage |
| Name | string | User's display name |
| Role | string | Optional role/title |
| Company | string | Optional company |
| Location | string | Optional location |
| CreatedAt | string | ISO 8601 timestamp |
| LastSeenUtc | string | ISO 8601, updated on each activity |
| ExpenseLabRuns | int | Counter: runs generated in Expense lab |
| InsuranceLabRuns | int | Counter: runs in Insurance lab (future) |
| PaymentLabRuns | int | Counter: runs in Payments lab (future) |
| AiInvestigations | int | Counter: AI investigations triggered |

---

## Routes

| Path | Component | Auth | Description |
|---|---|---|---|
| `/` | HomePage | None | Landing page with scenario cards |
| `/labs/expenses` | RunsRoute | Profile required | Expense fraud lab |
| `/labs/expenses/:runId` | RunDetailRoute | Profile required | Run detail + band chart |
| `/labs/expenses/:runId/cases/:caseId` | CaseDetailRoute | Profile required | Case detail + AI investigation |
| `/labs/insurance` | ComingSoonLab | Profile required | Placeholder |
| `/labs/payments` | ComingSoonLab | Profile required | Placeholder |
| `/how-it-works` | HowItWorksRoute | None | Documentation |
| `/admin` | AdminRoute | GitHub + admin role | User profiles + activity dashboard |
| `/runs` | Redirect → `/labs/expenses` | None | Backward compat |

---

## API Endpoints (new)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/profiles` | Anonymous | Create/update user profile |
| POST | `/api/profiles/activity` | Anonymous | Increment activity counter |
| GET | `/api/profiles` | admin role (SWA) | List all profiles (admin dashboard) |

---

## Implementation Status

| Component | Status | Notes |
|---|---|---|
| TopNav | ✅ Done | Sticky nav with all routes + profile name |
| HomePage | ✅ Done | 3 scenario cards with status badges |
| User profile (localStorage) | ✅ Done | UUID + name/role/company/location |
| Profile creation form | ✅ Done | Gate on /labs/* routes |
| Server-side profile sync | ✅ Done | POST /api/profiles on creation |
| Activity tracking | ✅ Done | expense-run + ai-investigation events |
| Admin dashboard | ✅ Done | User count, runs, investigations, profile table |
| SWA auth config | ✅ Done | /admin + GET /api/profiles restricted to admin role |
| Clarity script | ✅ Done | In index.html (needs real project ID) |
| Route restructure | ✅ Done | /labs/expenses with /runs redirect |
| Coming Soon placeholders | ✅ Done | Insurance + Payments |
| UserProfiles Bicep table | ✅ Done | In storage.bicep |
| Server-side run filtering (FR-005) | ⏳ Deferred | ownerId stored but ListRuns not filtered |
| Frontend App Insights SDK | ⏳ Optional | Backend already instrumented |

---

## Remaining Work

### Priority 1 (Should Do)
1. **Server-side run filtering** — Update `ListAsync` in `BlobRunRepository` to filter `RunIndex` by ownerId. Add ownerId column to `RunIndexEntity`.
2. **Clarity project ID** — Replace `"demo"` placeholder with real ID once project is created.
3. **Provision UserProfiles table** — Run `azd provision` to create the table in Azure (currently only in Bicep, not yet provisioned).

### Priority 2 (Nice to Have)
4. **Frontend App Insights** — Add `@microsoft/applicationinsights-web` for client-side telemetry.
5. **Profile edit** — Allow users to update their profile after creation.
6. **Admin: delete user** — Add DELETE /api/profiles/:id.

### Priority 3 (Future Specs)
7. **Insurance Claim Fraud lab** — Full implementation (separate spec).
8. **Payment Fraud lab** — Full implementation (separate spec).

---

## Deployment Notes

- `azd provision` needed to create `UserProfiles` table in Azure
- Admin role must be configured manually in Azure portal: Static Web App → Role management → Invite GitHub user with `admin` role
- Clarity project ID must be configured in `frontend/index.html` and `frontend/public/` copy
