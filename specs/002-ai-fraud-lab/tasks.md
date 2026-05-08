# Tasks: AI Fraud Lab — Multi-Scenario Platform

**Feature directory**: `specs/002-ai-fraud-lab/`
**Inputs**: [plan.md](./plan.md), [spec.md](./spec.md)

## Format: `- [ ] [TaskID] [P?] Description`

- **[P]**: Parallelizable — touches different files and has no incomplete dependencies

---

## Phase 1: Already Implemented ✅

These were completed during the initial implementation session.

- [X] T001 Create `frontend/src/components/TopNav.tsx` — sticky nav bar with Home, Expenses, Insurance, Payments, How It Works links + profile name display
- [X] T002 [P] Create `frontend/src/routes/HomePage.tsx` — 3 scenario cards (Expenses Active, Insurance Coming Soon, Payments Coming Soon) with descriptions + feature tags
- [X] T003 [P] Create `frontend/src/lib/userProfile.ts` — getProfile, saveProfile, createProfile with crypto.randomUUID() + localStorage persistence
- [X] T004 [P] Create `frontend/src/components/CreateProfileForm.tsx` — name (required), role, company, location fields with validation
- [X] T005 [P] Create `frontend/src/components/ComingSoonLab.tsx` — reusable placeholder for future labs
- [X] T006 Rewrite `frontend/src/App.tsx` — add TopNav, LabGuard (profile gate), new route structure at /labs/expenses/*, /labs/insurance, /labs/payments, /admin, backward compat /runs redirect
- [X] T007 [P] Update `frontend/src/routes/RunsRoute.tsx` — change all internal navigation from /runs/ to /labs/expenses/
- [X] T008 [P] Update `frontend/src/routes/RunDetailRoute.tsx` — change all internal navigation from /runs/ to /labs/expenses/
- [X] T009 [P] Update `frontend/src/routes/CaseDetailRoute.tsx` — change all internal navigation from /runs/ to /labs/expenses/
- [X] T010 Add X-User-Id header to all API calls in `frontend/src/api/runsClient.ts`
- [X] T011 Add `trackActivity()` helper to `frontend/src/api/runsClient.ts` — fires POST /api/profiles/activity
- [X] T012 Wire `trackActivity("expense-run")` in RunsRoute on successful run creation
- [X] T013 Wire `trackActivity("ai-investigation")` in CaseDetailRoute on successful investigation
- [X] T014 Create `backend/src/Functions/Endpoints/ProfileFunctions.cs` — POST /api/profiles (upsert), POST /api/profiles/activity (increment counter), GET /api/profiles (admin list)
- [X] T015 Add `UserProfiles` table to `infra/modules/storage.bicep`
- [X] T016 Create `frontend/src/routes/AdminRoute.tsx` — dashboard with user count, total runs, total investigations, profile table
- [X] T017 Create `frontend/staticwebapp.config.json` — navigationFallback + /admin route restricted to admin role + 401 redirect to GitHub login
- [X] T018 Copy staticwebapp.config.json to `frontend/public/` for Vite dist inclusion
- [X] T019 Add Microsoft Clarity script to `frontend/index.html` with configurable project ID
- [X] T020 Update `backend/src/Application/Services/GenerateRunHandler.cs` — accept ownerId parameter, store on Run
- [X] T021 Update `backend/src/Functions/Endpoints/GenerateRunFunction.cs` — read X-User-Id header, pass to handler
- [X] T022 Sync profile to server on creation in App.tsx handleProfileCreated
- [X] T023 [P] Create `specs/002-ai-fraud-lab/spec.md`
- [X] T024 [P] Create `specs/002-ai-fraud-lab/plan.md`

---

## Phase 2: Priority 1 — Server-Side Data Isolation (FR-005)

**Purpose**: Ensure users only see their own runs. Currently ownerId is stored but not filtered.

- [X] T025 Add `OwnerId` column to `RunIndexEntity` in `backend/src/Infrastructure/Persistence/BlobRunRepository.cs` — populate on upsert from `Run.OwnerId`
- [X] T026 Update `ListAsync` in `BlobRunRepository` to accept an optional `ownerId` filter parameter; when provided, add `OwnerId eq '{ownerId}'` to the table query filter
- [X] T027 Update `IRunRepository.ListAsync` signature to accept `string? ownerId`
- [X] T028 Update `ListRunsFunction` to read `X-User-Id` header and pass to `ListAsync`
- [ ] T029 Verify: user A's runs are not visible to user B (manual test)

---

## Phase 3: Priority 1 — Provision & Configuration

- [X] T030 Run `azd provision` to create `UserProfiles` table in Azure
- [ ] T031 Configure Microsoft Clarity project ID — replace `"demo"` in `frontend/index.html` and `frontend/public/staticwebapp.config.json` (awaiting project ID from user)
- [ ] T032 Configure admin role in Azure portal: Static Web App → Role management → Invite GitHub user with `admin` role

---

## Phase 4: Priority 2 — Frontend Observability

- [ ] T033 [P] Install `@microsoft/applicationinsights-web` in frontend — `npm install @microsoft/applicationinsights-web`
- [ ] T034 [P] Create `frontend/src/lib/appInsights.ts` — initialize with connection string from environment, track page views, custom events
- [ ] T035 Wire App Insights trackPageView in App.tsx on route change
- [ ] T036 Wire custom events: `trackEvent("GenerateRun")`, `trackEvent("AiInvestigation")`, `trackEvent("ConsensusInvestigation")`

---

## Phase 5: Priority 2 — Profile Management

- [ ] T037 [P] Create profile edit UI — add "Edit Profile" button to TopNav dropdown or sidebar; pre-populate form with current profile
- [ ] T038 [P] Add `DELETE /api/profiles/:id` endpoint in ProfileFunctions — admin-only, deletes profile row
- [ ] T039 Add delete button per row in AdminRoute table

---

## Phase 6: Priority 3 — Future Lab Specs (placeholder tasks)

- [ ] T040 Create `specs/003-insurance-fraud-lab/spec.md` — detailed spec for Insurance Claim Fraud lab
- [ ] T041 Create `specs/004-payment-fraud-lab/spec.md` — detailed spec for Payment Fraud lab

---

## Dependencies & Execution Order

- **Phase 1**: ✅ Complete
- **Phase 2**: No deps — start immediately. T025 → T026 → T027 → T028 sequential; T029 after all.
- **Phase 3**: T030 after Phase 2 (provisions table + tests filtering). T031, T032 independent (manual config steps).
- **Phase 4**: Independent of Phase 2/3. T033 + T034 parallel; T035 → T036 sequential.
- **Phase 5**: Independent. T037 + T038 parallel; T039 after T038.
- **Phase 6**: Independent. Can be started anytime.

## Task Counts

- **Total tasks**: 41
- **Completed**: 24 (Phase 1)
- **Remaining**: 17
  - Priority 1 (server-side filtering + provision): 8
  - Priority 2 (observability + profile mgmt): 7
  - Priority 3 (future specs): 2
