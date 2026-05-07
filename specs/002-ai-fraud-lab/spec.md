# Spec: AI Fraud Lab — Multi-Scenario Platform

**Feature directory**: `specs/002-ai-fraud-lab/`
**Status**: Draft
**Priority**: P1

## Summary

Transform the single-scenario Expense Fraud Demo into a multi-scenario **AI Fraud Lab** platform with three fraud investigation labs, user profiles, and shared navigation. The platform showcases how AI + ML can be applied to different fraud domains using the same architectural patterns.

## Scenarios

### 1. Expense Fraud (existing — move to /labs/expenses)
Already implemented. Synthetic expense data with ML.NET anomaly detection + AI investigation via Microsoft Foundry.

### 2. Insurance Claim Fraud (/labs/insurance) — Future
Synthetic insurance claims with anomaly patterns: inflated damage estimates, suspicious claim timing (filed immediately after policy changes), phantom injuries, staged accidents. Uses the same ML + AI investigation pattern.

### 3. Payment Fraud (/labs/payments) — Future
Classic credit card fraud detection: unusual transaction amounts, geographic anomalies, velocity checks (many transactions in short time), merchant category deviations. Uses the same ML + AI investigation pattern.

## User Stories

### US1: Platform Navigation
As a user, I see a top navigation bar on every page with links to Home, Expenses Lab, Insurance Lab, and Payments Lab. The current lab is highlighted. The nav also shows my profile name if I'm logged in.

### US2: User Profiles
As a new user visiting any /labs/* route, I'm prompted to create a simple profile (name, role, company, location — only name is required). The profile is stored in browser localStorage with a random UUID. On subsequent visits, I'm recognized automatically. There is no sign-in, no password, no server-side auth.

### US3: Data Isolation
As a user, the runs I generate are associated with my profile ID and stored in Azure Storage scoped to my user. Other users cannot see my runs. The profile ID is sent as a header or query parameter with every API call.

### US4: Homepage
As a user visiting /, I see an overview of the AI Fraud Lab with descriptive cards for each of the three scenarios. Each card shows the scenario name, a brief description, the status (Active / Coming Soon), and a link to the lab.

### US5: Observability
The web app includes Microsoft Clarity for session recording and heatmaps. Azure Functions are instrumented with Application Insights (already partially done). The frontend sends custom events for key user actions (generate run, investigate case, consensus).

## Functional Requirements

- FR-001: Top navigation bar visible on all pages with Home, Expenses, Insurance, Payments links
- FR-002: User profile creation form with fields: name (required), role, company, location
- FR-003: Profile stored in localStorage with a generated UUID (crypto.randomUUID())
- FR-004: All API calls include the user's profile ID (e.g., X-User-Id header)
- FR-005: Backend filters runs by owner ID matching the profile ID
- FR-006: Homepage at / shows 3 scenario cards with status badges
- FR-007: Expenses lab moved to /labs/expenses (redirect from /runs for backward compat)
- FR-008: Insurance lab at /labs/insurance shows "Coming Soon" placeholder
- FR-009: Payments lab at /labs/payments shows "Coming Soon" placeholder
- FR-010: /labs/* routes require a valid profile in localStorage
- FR-011: Microsoft Clarity script tag in index.html
- FR-012: App Insights connection string wired to frontend (optional — track page views)

## Success Criteria

- SC-001: User can navigate between all pages without full page reloads
- SC-002: New user is prompted for profile before accessing any lab
- SC-003: Returning user sees their previous runs (and only their runs)
- SC-004: Homepage loads in under 2 seconds
- SC-005: Clarity dashboard shows session recordings after deployment

## Assumptions

- No server-side authentication for labs — profile is client-only, stored in localStorage
- Profile ID is trusted (no spoofing protection — acceptable for a demo)
- Insurance and Payments labs are placeholder pages only in this spec
- The existing Expense lab functionality is preserved exactly; only the routing and layout wrapper change

## Out of Scope

- Profile transfer between browsers/devices
- Insurance and Payments lab implementations (separate future specs)

## Clarifications

### Session 2026-05-07
- Q: Should /admin require authentication? → A: Yes. Azure SWA built-in auth with GitHub provider. Role "admin" required, configured via Azure portal invitations.
- Q: Should user profiles be tracked server-side? → A: Yes. UserProfiles Azure Table stores profiles + activity counters (expense runs, insurance runs, payment runs, AI investigations). Synced on profile creation and incremented on each activity.
- Q: Should the admin see activity metrics? → A: Yes. /admin dashboard shows user count, total runs, total AI investigations, and a table of all profiles with per-lab run counts and last-seen timestamps.
- Q: How is /admin auth configured? → A: staticwebapp.config.json routes config restricts /admin and GET /api/profiles to "admin" role. 401 redirects to /.auth/login/github. Admin role assigned via Azure portal Role management invitations.
- Q: Is server-side data isolation (FR-005) fully implemented? → A: Partially. X-User-Id header is sent with all API calls and stored as ownerId on Run creation. Server-side filtering on ListRuns (so users only see their own runs) is deferred — currently all runs are visible to all users. The profile gate on the frontend provides UX-level isolation.
