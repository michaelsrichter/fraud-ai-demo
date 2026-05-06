<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Bump rationale: Initial ratification of the project constitution. All placeholder
tokens replaced with concrete principles supplied by the project owner.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Platform & Deployment
  - [PRINCIPLE_2_NAME] → II. Source Control & CI/CD
  - [PRINCIPLE_3_NAME] → III. AI & Agent Framework
  - [PRINCIPLE_4_NAME] → IV. Security & Identity
  - [PRINCIPLE_5_NAME] → V. Code Quality & Architecture

Added sections (beyond the 5-principle template):
  - VI. Testing Requirements
  - VII. Documentation
  - VIII. Observability & Reliability
  - IX. Configuration & Flexibility
  - X. Performance Expectations
  - XI. Development Experience
  - Governance

Removed sections: None (template placeholders consolidated into principles above).

Templates requiring updates:
  - .specify/templates/plan-template.md          ⚠ pending (Constitution Check
    section is generic; recommend tailoring gates to principles I, II, IV, V, VI
    before first feature plan)
  - .specify/templates/spec-template.md          ✅ no changes required
  - .specify/templates/tasks-template.md         ✅ no changes required
  - .specify/templates/checklist-template.md     ✅ no changes required
  - README.md                                    ⚠ pending (not yet present;
    create alongside /docs per Principle VII)

Follow-up TODOs: None. Ratification date set to today (initial adoption).
-->

# Fraud AI Demo Constitution

## Core Principles

### I. Platform & Deployment

The system MUST be deployable to Microsoft Azure. Infrastructure MUST be fully
defined as Infrastructure-as-Code using Bicep templates; no portal-only or
imperative provisioning is permitted for production-relevant resources. The
application MUST be structured as (a) a static web application frontend and
(b) backend services implemented as serverless Azure Functions on the .NET
isolated worker runtime.

**Rationale**: A single, declarative cloud target with a fixed topology keeps
the demo reproducible, reviewable, and tear-down-able from source alone.

### II. Source Control & CI/CD

All code MUST be stored in a GitHub repository. Continuous Integration and
Continuous Deployment MUST be implemented using GitHub Actions. The pipeline
MUST: trigger on changes to the `main` branch; build and validate both backend
and frontend components; run all unit tests; and automatically deploy the
latest Azure Functions code (and frontend assets) to Azure on a successful
build. End-to-end deployment MUST require no manual steps after a merge to
`main`. Authentication from GitHub Actions to Azure MUST use federated
identity (OIDC) or an equivalent modern, credential-less mechanism; long-lived
secrets and hardcoded credentials are PROHIBITED.

**Rationale**: A trustworthy demo requires a single, automated, auditable path
from commit to running system, with no shadow secrets.

### III. AI & Agent Framework

AI capabilities MUST use Microsoft Foundry with the latest available GPT
models. AI orchestration MUST use the GA (generally available) version of the
Microsoft Agent Framework — preview or experimental versions are NOT permitted
on `main`. The AI component MUST function as an agent responsible for:
evaluating ambiguous fraud cases; producing structured outputs (machine-
parseable schema); and providing human-readable reasoning alongside those
outputs.

**Rationale**: Pinning to GA Foundry + Agent Framework guarantees a stable,
demonstrable AI surface and avoids breaking changes between demo runs.

### IV. Security & Identity

All service-to-service communication MUST use Managed Identity. Secrets, API
keys, and connection strings MUST NOT be stored in source code or configuration
files. Role-Based Access Control (RBAC) MUST be enforced; all required role
assignments MUST be provisioned via Bicep templates as part of the same
deployment that creates the resources. The signed-in user (resolved via Azure
CLI / `az ad signed-in-user`) MUST be granted the access required for local
development through the same Bicep configuration — manual portal grants are
PROHIBITED.

**Rationale**: Identity-based access removes an entire class of credential-
leak failures and keeps least-privilege authorization codified and reviewable.

### V. Code Quality & Architecture

All backend code MUST follow SOLID design principles. The system MUST be
organized into clear logical layers (e.g., domain, application, infrastructure)
with dependencies flowing inward. Code MUST be modular, testable, and
maintainable. Dependency injection MUST be used wherever a component depends
on an external service, an I/O boundary, or a substitutable strategy.

**Rationale**: Layered architecture and DI are what make Principle VI
(testability) and Principle VIII (graceful degradation) achievable in practice.

### VI. Testing Requirements

Unit tests MUST be implemented for all backend logic. Tests MUST cover: core
business logic; data processing; fraud-detection logic; and AI orchestration
boundaries (with the AI service mocked where appropriate). Tests MUST be
runnable both locally (single command) and as part of the CI pipeline, and
the CI pipeline MUST fail if any test fails.

**Rationale**: Tests are the contract that lets the AI agent and detection
logic evolve without silently breaking the demo.

### VII. Documentation

The repository MUST include a `/docs` directory. All documentation MUST be
written in Markdown. Documentation MUST include: an architecture overview;
setup and deployment instructions; component-level explanations; and API
descriptions. Source code MUST include clear, detailed inline comments
explaining non-obvious logic, intent, and trade-offs (not restating syntax).

**Rationale**: A demo without docs is unreviewable; a demo without inline
intent comments is unmaintainable.

### VIII. Observability & Reliability

The system SHOULD include logging for: data generation, detection processing,
and AI agent interactions (prompts, structured outputs, latency). Failures in
the AI subsystem or any backend component MUST degrade gracefully — the system
MUST NOT crash, hang, or return uncontextualized 5xx responses when the AI
service is unavailable or returns an unparseable result.

**Rationale**: A live demo must survive a flaky network or model outage with
its dignity intact.

### IX. Configuration & Flexibility

Key parameters (e.g., fraud intensity, detection thresholds, dataset size,
model deployment names) MUST be configurable through environment variables or
configuration files consumed by the runtime. Changing these parameters MUST
NOT require code changes or rebuilds. The system SHOULD support rapid
reconfiguration between demo scenarios (seconds, not minutes).

**Rationale**: Demo agility — the ability to flip between scenarios live —
is a first-class feature, not an afterthought.

### X. Performance Expectations

The system SHOULD handle datasets large enough to demonstrate meaningful
fraud patterns (on the order of thousands of records). Processing time for
core demo flows SHOULD remain within a few seconds end-to-end. UI interactions
SHOULD feel responsive (sub-second perceived latency for non-AI actions) in a
live demo setting.

**Rationale**: Sets concrete-but-realistic targets so performance regressions
are detectable without over-engineering for production-scale traffic.

### XI. Development Experience

The system MUST support local development and testing of both the frontend
and the Azure Functions backend. Setup steps MUST be clearly documented in
`/docs`. Developers MUST be able to: run the full system locally (frontend +
functions + mocked or live AI); execute the full unit-test suite locally with
a single command; and deploy infrastructure and application to a personal
Azure subscription with minimal friction (a single `azd`-style or documented
script flow).

**Rationale**: Friction in the inner loop is paid back as drift between local
and deployed behavior — a fatal flaw for a demo project.

## Governance

This constitution supersedes ad-hoc practices and informal conventions in
this repository. All pull requests MUST be reviewed against the principles
above; reviewers MUST flag any deviation. Any unavoidable deviation MUST be
documented in the relevant `plan.md` "Complexity Tracking" section with a
justification and a rejected simpler alternative.

**Amendment procedure**: Amendments are proposed via pull request that edits
this file. The PR MUST include (a) the rationale, (b) the proposed version
bump, and (c) updates to any dependent templates under `.specify/templates/`
and to `/docs`.

**Versioning policy** (semantic):

- **MAJOR**: Backward-incompatible changes — removing a principle, redefining
  a MUST in a way that invalidates existing implementations, or changing
  governance rules.
- **MINOR**: Adding a new principle/section, or materially expanding guidance
  within an existing principle.
- **PATCH**: Clarifications, wording fixes, typo fixes, or non-semantic
  refinements that do not change what is required.

**Compliance review**: Compliance with this constitution MUST be checked at
the "Constitution Check" gate of every `plan.md` (before Phase 0 research and
again after Phase 1 design). Recurring violations of the same principle SHOULD
trigger an amendment proposal rather than repeated case-by-case justifications.

**Version**: 1.0.0 | **Ratified**: 2026-05-06 | **Last Amended**: 2026-05-06
