# Feature Specification: AI-Powered Internal Expense Fraud Demo

**Feature Branch**: `001-expense-fraud-demo`
**Created**: 2026-05-06
**Status**: Draft
**Input**: User description: "AI-Powered Internal Expense Fraud Demo — simulate employee expense activity, detect anomalous behavior with ML, and apply an AI investigation layer to analyze ambiguous cases."

## Clarifications

### Session 2026-05-06

- Q: Should the "Investigate with AI" action be available on all cases, or only medium-confidence ones? → A: Available on all bands (high / medium / low); medium remains the suggested default focus but nothing is hidden.
- Q: What is the default dataset size and the hard upper cap for a single simulation run? → A: Default 5,000 expense records; hard cap 50,000.
- Q: What is the timeout threshold after which an AI investigation request is treated as a failure and the graceful fallback is shown? → A: 30 seconds (3× the SC-004 typical-latency target).
- Q: How are datasets persisted across runs — single replaceable dataset, or session history? → A: Keep full session history of runs in a server-side data store (Azure Storage). Each "Generate dataset" creates a new Run; prior Runs remain inspectable. User authentication and per-user session scoping are deferred to a later phase — v1 stores Runs in a single shared scope.
- Q: How configurable is the fraud-pattern mix — single intensity dial, per-pattern weights, or toggles? → A: One overall fraud-intensity dial **plus** per-pattern weights (normalized to 1.0) for each required pattern (threshold-gaming, unusual frequency, vendor anomaly).

### Session 2026-05-08

- Q: How should the spec characterize the consensus/arbiter feature (3 models side-by-side + arbiter reasoning)? → A: Add FR-026 (consensus: run all 3 models simultaneously, display side-by-side) and FR-027 (arbiter: senior model reasons over results with final verdict) as new functional requirements with acceptance criteria.
- Q: Should FR-015 be updated to require the scatter plot and dataset summary stats, or keep it generic? → A: Update FR-015 to explicitly require scatter plot (amount vs. confidence, color-coded by band), dataset summary (date range, distinct counts, mean/median amounts), and per-category/per-vendor breakdowns.
- Q: How should the spec handle the multi-lab architecture (homepage, per-lab routing, embedded How It Works)? → A: Split into separate specs — one for the shared shell/homepage, one per lab. This spec covers only the Expenses lab; multi-lab shell noted in Assumptions.
- Q: Should the spec capture the footer with Terms of Use, Privacy Policy, and Disclaimer? → A: Defer to the shared shell spec — the footer belongs there, not in the Expenses lab spec.
- Q: Should acceptance criteria and How It Works be updated to reflect that Inconclusive is now a rare last-resort? → A: Yes, update Story 2 acceptance criteria and the embedded How It Works decision framework. Inconclusive is a last-resort edge case, not a normal expected outcome.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Demonstrate the baseline → fraud uplift narrative (Priority: P1)

A demo presenter (e.g., a solutions engineer pitching to a fraud-operations team) opens
the application, generates a baseline dataset of mostly normal expense activity, runs
the detection pipeline, and shows that very few anomalies surface. The presenter then
increases the synthetic fraud intensity, regenerates the data, re-runs detection, and
points to the suspicious patterns now appearing in the visualization. This is the
single end-to-end story that makes the demo land.

**Why this priority**: Without this loop the product has nothing to demonstrate. It is
also the smallest viable slice — the AI investigation layer (Story 2) is meaningful
only once detection is producing ambiguous output.

**Independent Test**: A presenter can launch the app, click "Generate" with low fraud
intensity, click "Run detection", visually confirm a low anomaly count, then change
the fraud-intensity control, click "Generate" + "Run detection" again, and visually
confirm a materially higher anomaly count and a populated case list. No AI, no
cloud-AI dependency, and no per-case drill-down is required for this story to deliver
value.

**Acceptance Scenarios**:

1. **Given** the app is loaded with default fraud-intensity = LOW, **When** the
   presenter triggers "Generate dataset" and then "Run detection", **Then** a
   dataset of at least several thousand expense records is produced and the
   detection output classifies at most a small minority (≤ ~5%) of records as
   suspicious.
2. **Given** the dataset has been generated and scored once, **When** the presenter
   raises fraud-intensity to HIGH and re-triggers "Generate dataset" + "Run
   detection", **Then** a visibly larger share of records is classified as
   suspicious and the visualization updates to reflect the new distribution.
3. **Given** the detection has produced scores, **When** the presenter views the
   case list, **Then** each case is grouped into one of three confidence bands
   (high-confidence fraud, medium / uncertain, low / normal) and the bands are
   visually distinguishable.

---

### User Story 2 - Resolve ambiguous cases with the AI investigator (Priority: P2)

After detection has produced a list of medium-confidence (uncertain) cases, the
presenter selects an individual case and triggers AI investigation. The system sends
structured context (the case's behavioral signals, relevant history, peer
comparisons) to an AI agent, which returns a structured assessment plus a
human-readable rationale. The presenter walks through the rationale on screen as
the differentiating "moment" of the demo.

**Why this priority**: This is the headline differentiator described in the brief
(combining detection with contextual reasoning), but it is dependent on Story 1
producing ambiguous cases. It is also the part most exposed to external AI service
availability, so it is sequenced after the deterministic baseline.

**Independent Test**: Given a pre-loaded fixture of medium-confidence cases (so this
story can be tested without first running Story 1 end-to-end), the presenter can
click "Investigate" on one case and see, within a few seconds, a structured response
containing a fraud-likelihood assessment, a human-readable explanation, the key
contributing signals the AI cited, and a recommended action.

**Acceptance Scenarios**:

1. **Given** a case is in the medium-confidence band, **When** the presenter clicks
   "Investigate with AI" on that case, **Then** within a few seconds the case
   detail view shows: (a) a fraud-likelihood verdict (predominantly "Likely" or
   "Unlikely" — "Inconclusive" should be rare per FR-028), (b) a human-readable
   rationale paragraph, (c) an enumerated list of the top contributing signals,
   and (d) a recommended next action.
2. **Given** the AI service is unreachable or returns an unparseable response,
   **When** the presenter clicks "Investigate with AI", **Then** the case detail
   view shows a clear, non-crashing fallback state explaining the AI is
   unavailable, the rest of the application remains usable, and the deterministic
   detection output for that case is still visible.
3. **Given** an investigation has completed for a case, **When** the presenter
   reopens the same case in the same session, **Then** the previous AI verdict and
   rationale are still visible without needing a new AI call.
4. **Given** a case in any confidence band, **When** the presenter clicks
   "Consensus (all 3 models)", **Then** all 3 deployed models are queried
   simultaneously and their individual verdicts, rationales, and key signals
   are displayed **side-by-side** in the UI (FR-026). Each model's result is
   independently visible even if one or more models fail — failed models show
   an "Unavailable" badge with the failure reason.
5. **Given** a consensus investigation has returned results from at least 2
   models, **When** the arbiter model completes its analysis, **Then** the UI
   displays below the side-by-side results: (a) the arbiter's final decisive
   verdict, (b) an executive summary, (c) the points all models agreed on,
   (d) the key differences between models, and (e) the arbiter's reasoning
   for its final call (FR-027). If the arbiter call fails, a majority-vote
   fallback verdict is shown with a note that arbiter reasoning is unavailable.

---

### User Story 3 - Drill into a single case to inspect signals and reasoning (Priority: P2)

The presenter clicks any individual case (high, medium, or low confidence) and is
shown a detail view that combines the underlying behavioral signals (the features
that drove the score), the deterministic detection output (score and band), and —
where applicable — the AI-generated reasoning from Story 2. This is the "open the
hood" moment that lets a technical audience verify the demo is more than a black
box.

**Why this priority**: Co-equal with Story 2; both are required to make the demo
credible to a technical audience, but the system is still demonstrable without
either of them (Story 1 alone). Splitting this from Story 2 keeps the AI call
optional inside the case-drill experience.

**Independent Test**: A presenter can click any single case in the list and see a
detail panel with the case's signals, score, and band, even if the AI investigator
has never been invoked.

**Acceptance Scenarios**:

1. **Given** a list of detected cases, **When** the presenter selects a case,
   **Then** the detail view shows the relevant employee/expense context, the
   behavioral signals that contributed to the score, the numeric score, and the
   confidence band.
2. **Given** the detail view of a case that has been AI-investigated, **When** the
   presenter views it, **Then** the AI rationale and the deterministic signals
   appear side-by-side so they can be compared.

---

### User Story 4 - Tune the simulation for a specific demo scenario (Priority: P3)

The presenter adjusts configurable parameters — fraud intensity, detection
thresholds, dataset size, the mix of fraud patterns — and re-runs the simulation
without restarting the application or editing code. This supports rehearsing
different audience-specific narratives back-to-back.

**Why this priority**: A nice-to-have polish layer once Stories 1–3 work. The core
demo lands without per-knob tuning if sensible defaults exist.

**Independent Test**: A presenter can change at least one configurable parameter
through the UI, re-run generation + detection, and observe a corresponding change
in the output, without restarting the app or modifying source files.

**Acceptance Scenarios**:

1. **Given** the simulation has been run once, **When** the presenter changes
   fraud intensity (or any other documented parameter) and re-runs, **Then** the
   results reflect the new parameter value within seconds.
2. **Given** a parameter is set outside its allowed range, **When** the presenter
   attempts to apply it, **Then** the system rejects the value with a clear
   message and retains the prior valid configuration.

---

### Edge Cases

- **Empty / degenerate dataset**: Generation produces zero suspicious cases (e.g.,
  fraud intensity = 0). The UI MUST still render a non-empty case list view (with
  an empty-state message) and the AI-investigation feature MUST be safely
  unavailable rather than failing.
- **AI service outage or quota exhaustion**: Investigations on medium-confidence
  cases MUST fail gracefully per Story 2 acceptance scenario 2; the rest of the
  app MUST stay interactive.
- **AI returns malformed or off-schema output**: The system MUST treat this as an
  AI failure (graceful fallback), not as data to display.
- **Re-running detection mid-investigation**: If the presenter triggers a new
  Generate while an AI investigation is in flight, the in-flight result MUST
  remain attached to its **originating Run** (the prior Run, which is retained
  in history per FR-022) and MUST NOT be attached to any case in the new Run.
  The UI MUST clearly indicate which Run a displayed result belongs to.
- **Very large dataset**: If the configured dataset size exceeds the hard cap
  (50,000 records, FR-004), the system MUST clamp the value to the cap or
  reject it with a clear user-visible message; the UI MUST NOT hang. Sizes
  within the cap but beyond the SC-002 performance envelope MAY display a
  warning before running.
- **Concurrent presenters**: The demo is designed for a single interactive user at
  a time; behavior under concurrent multi-user load is out of scope (see
  Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

#### Data simulation

- **FR-001**: The system MUST generate a synthetic dataset of employee profiles
  and expense activity, with most activity reflecting normal behavior.
- **FR-002**: The system MUST inject configurable fraud patterns into the
  generated data, including at minimum these three pattern types:
  threshold-gaming (expenses just under a policy limit), unusual frequency
  (bursts of submissions), and vendor anomalies (expenses to atypical or
  rarely-used vendors). Each of these three patterns MUST be independently
  weight-controllable (see FR-003).
- **FR-003**: The system MUST expose two layers of fraud configurability that
  can both be adjusted dynamically (without restarting or editing code):
  (a) a single overall **fraud-intensity** control that scales the total
  share of injected fraud, and (b) **per-pattern weights** for the three
  required patterns, normalized to sum to 1.0 (the system MUST normalize
  user-entered weights and reject negative values per FR-021). Regenerating
  data MUST honor the current values of both controls.
- **FR-004**: The system MUST produce datasets large enough to show meaningful
  patterns. The default dataset size MUST be **5,000 expense records** per
  simulation run, and the configured size MUST be capped at **50,000 records**
  (hard upper limit). Requests above the cap MUST be rejected per FR-021 or
  clamped with a clear user-visible warning per the Edge Cases section.

#### Detection

- **FR-005**: The system MUST derive behavioral features from the raw expense
  activity (e.g., per-employee aggregates, peer comparisons, temporal patterns)
  prior to scoring.
- **FR-006**: The system MUST perform multivariate anomaly scoring on those
  features and assign a numeric anomaly/fraud score to every expense record.
- **FR-007**: The system MUST normalize scores into a confidence measure suitable
  for thresholding and comparison.

#### Decision layer

- **FR-008**: The system MUST classify each scored record into exactly one of
  three confidence bands: high-confidence fraud, medium/uncertain, or low-
  confidence (normal).
- **FR-009**: The thresholds that separate the three bands MUST be configurable
  without code changes.

#### AI investigation

- **FR-010**: The system MUST allow the user to invoke the AI agent on **any**
  case regardless of confidence band (high, medium, or low). The UI SHOULD
  surface medium-confidence cases as the suggested default focus for AI
  investigation, but MUST NOT hide or disable the action on other bands.
- **FR-011**: When invoking the AI agent, the system MUST supply structured
  context for the case, including the case's behavioral signals, relevant
  history (e.g., the employee's prior activity), and peer comparisons.
- **FR-012**: The AI agent MUST return, for each investigated case, a structured
  output containing: a fraud-likelihood assessment, supporting reasoning in
  human-readable prose, an enumerated list of key contributing signals, and a
  recommended action.
- **FR-013**: The system MUST persist every AI verdict and rationale alongside
  the Run it belongs to (see FR-022) so that re-opening a previously
  investigated case — in the current session or a later one — does not
  require a new AI call.
- **FR-014**: The system MUST degrade gracefully when the AI service is
  unavailable, when an AI request exceeds **30 seconds** without returning a
  parseable response, or when the response is malformed: the application MUST
  stay responsive, the affected case MUST clearly indicate AI unavailability,
  and deterministic detection output for the case MUST remain visible.

#### Consensus & arbiter investigation

- **FR-026**: The system MUST provide a **consensus investigation** mode that
  runs all deployed AI models (currently 3: GPT-5.4, GPT-5.3 Chat, GPT-5.4
  Mini) simultaneously on the same case and displays their individual verdicts,
  rationales, and key signals **side-by-side** in the UI. Each model's result
  MUST be independently visible even if one or more models fail.
- **FR-027**: After consensus model results are collected, the system MUST
  invoke a senior **arbiter model** (the most capable deployed model) that
  receives all model responses and produces: (a) a final decisive verdict,
  (b) an executive summary, (c) a list of points the models agreed on,
  (d) a list of key differences between models, and (e) reasoning for the
  final verdict. If the arbiter call fails, the system MUST fall back to a
  majority-vote consensus verdict.
- **FR-028**: The AI agent system prompts MUST instruct models to be **bold
  and decisive** — favoring a clear "Likely" or "Unlikely" verdict over
  "Inconclusive" — because the AI investigator is specifically consulted on
  cases where the ML model was ambiguous. "Inconclusive" SHOULD only be used
  when signals are truly balanced.

#### Presentation & interaction

- **FR-015**: The system MUST provide a Run detail view that includes:
  (a) a **dataset summary** showing date range, distinct employee count,
  distinct vendor count, distinct category count, average transactions per
  employee, and mean/median expense amounts; (b) an **anomaly scatter plot**
  plotting expense amount (x-axis) vs. ML anomaly confidence score (y-axis),
  color-coded by confidence band (High / Medium / Low); and (c) **per-category
  and per-vendor breakdowns** showing count, mean, and median expense amounts.
  Band distribution counts (High / Medium / Low) MUST remain visible as an
  inline summary.
- **FR-016**: The UI MUST visually distinguish anomalous cases from normal cases
  and indicate the confidence band.
- **FR-017**: The UI MUST allow the user to (a) trigger data generation, (b)
  trigger detection, (c) adjust documented configuration parameters, and (d)
  trigger AI investigation on an individual case.
- **FR-018**: The UI MUST provide an individual case detail view showing
  behavioral signals, deterministic detection output (score and band), and —
  when present — the AI-generated reasoning.
- **FR-019**: The UI MUST surface a clear empty/normal state when detection
  produces no suspicious cases.

#### Configuration

- **FR-020**: All tunable parameters (overall fraud intensity, per-pattern
  weights, dataset size, decision thresholds, and any AI-agent inputs such as
  model deployment name) MUST be configurable at runtime without source-code
  changes.
- **FR-021**: Invalid configuration values MUST be rejected with a clear,
  user-visible message; the system MUST retain the last known valid state.

#### Persistence & history

- **FR-022**: Each "Generate dataset" action MUST create a new **Run** record
  in a server-side data store, and that Run MUST persist across application
  restarts. A Run MUST capture: the Simulation Configuration used, the
  generated Expense Records, the Detection Results, and any AI Investigation
  Results subsequently attached to it.
- **FR-023**: The server-side data store MUST be Azure Storage (concrete
  service — e.g., Blob, Table, or a combination — chosen at planning time).
  No per-user authentication or per-user scoping is required for v1; all Runs
  share a single tenant/scope.
- **FR-024**: The UI MUST allow the presenter to list prior Runs, open any
  prior Run for inspection (case list, detail view, AI verdicts), and identify
  which Run is currently active. Generating a new Run MUST NOT delete prior
  Runs.
- **FR-025**: User authentication and per-user session scoping of Runs are
  **explicitly deferred** to a later phase and are out of scope for v1. The
  v1 design MUST NOT preclude adding them later (e.g., the data model SHOULD
  carry an owner/session identifier even if it is a constant in v1).

### Key Entities

- **Employee**: A simulated person with a stable profile (e.g., role, department,
  typical spending pattern). Drives the "normal" baseline against which anomalies
  are measured.
- **Expense Record**: A single simulated expense submission tied to an employee,
  with attributes such as amount, vendor, category, timestamp, and an optional
  injected-fraud marker (used only by the simulator, not by the detector).
- **Behavioral Feature Set**: The derived per-record (and per-employee) feature
  vector consumed by the anomaly detector.
- **Detection Result**: The output of the detection layer for a given expense
  record — score, normalized confidence, and assigned band (high / medium / low).
- **Case**: A user-facing aggregation of an Expense Record + its Detection Result
  + (optionally) an AI Investigation Result. The unit of inspection in the UI.
- **AI Investigation Result**: The structured output returned by the AI agent
  for a single Case — verdict, rationale, contributing signals, recommended
  action, plus a marker for whether the investigation succeeded or fell back.
- **Simulation Configuration**: The tunable parameter set (fraud intensity,
  pattern mix, dataset size, thresholds, AI inputs) that governs a Run.
- **Run**: A persisted record of one "Generate dataset" execution. Bundles a
  Simulation Configuration + the generated Expense Records + their Detection
  Results + any AI Investigation Results attached to cases in that Run, plus
  metadata (timestamp, identifier, owner placeholder for future per-user
  scoping). Runs are stored server-side in Azure Storage (FR-022, FR-023) and
  survive across application restarts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A presenter can run the full Story 1 narrative (low-fraud generate
  → detect → high-fraud generate → detect → see uplift) end-to-end in under
  three minutes during a live demo.
- **SC-002**: For datasets at the **default size of 5,000 records**, the
  generate-and-detect cycle completes in ≤ 5 seconds perceived on a typical
  presenter laptop, so the demo flow does not stall. At the hard cap (50,000
  records) the cycle SHOULD remain interactive (no UI freeze), even if total
  duration grows.
- **SC-003**: Non-AI UI interactions (selecting a case, adjusting a parameter,
  viewing a detail panel) feel responsive in a live setting (target: under one
  second perceived latency).
- **SC-004**: An AI investigation on a single medium-confidence case returns a
  structured verdict and rationale in a small number of seconds suitable for
  live narration (target: ≤ ~10 seconds typical).
- **SC-005**: When fraud intensity is raised from LOW to HIGH (with all other
  parameters held), the share of records classified as suspicious increases by
  a clearly visible margin in the visualization, with no presenter-side tuning
  required.
- **SC-006**: At least three distinct fraud-pattern types (threshold gaming,
  unusual frequency, vendor anomaly) are individually demonstrable from the
  generated data and detectable by the scoring layer.
- **SC-007**: When the AI service is forced offline, every UI affordance
  unrelated to AI investigation continues to work, and AI-dependent affordances
  show a clear unavailable state with no crashes.
- **SC-008**: Every AI Investigation Result rendered in the UI contains all four
  required components (verdict, rationale, contributing signals, recommended
  action) — i.e., zero results are missing a component when the call succeeds.
- **SC-009**: Reconfiguring the simulation between two demo scenarios (changing
  parameters and producing a new run) takes seconds, not minutes, and requires
  no code edit or app restart.

## Assumptions

- **Single interactive user**: The demo is operated by one presenter at a time.
  Multi-tenant or concurrent-presenter scenarios are out of scope. The data
  model SHOULD nonetheless carry an owner/session identifier (FR-025) so
  per-user scoping can be added later without a migration.
- **No authentication / access control on the demo UI**: This is a demonstration
  application, not a production fraud system. The UI does not need login or RBAC
  for end users; backend service-to-service identity is governed separately by
  the project constitution (Managed Identity, RBAC in Bicep).
- **Synthetic data only**: All employee profiles and expense activity are
  generated by the application. No real personal or financial data is ingested.
- **Persistent run history (server-side)**: Each "Generate dataset" creates a
  new **Run** that is stored in Azure Storage and survives application
  restarts (FR-022–FR-024). All Runs share a single tenant in v1; per-user
  scoping is deferred (FR-025). AI investigation results are retained as part
  of their originating Run.
- **AI investigation is on-demand, not bulk**: The AI agent is invoked on
  individual medium-confidence cases selected by the presenter, not on every
  case in a run. This keeps the demo within typical AI latency and quota
  envelopes.
- **Deterministic detection layer**: Detection scoring is reproducible for a
  given dataset + configuration; the only intentionally non-deterministic
  component is the AI investigator.
- **Out of scope for v1**: mobile-specific UI, real ERP/HR integration,
  long-term audit trails, multi-language UI, exporting results to external
  systems.
- **Multi-lab architecture**: The application is structured as a multi-lab
  shell with a homepage and per-lab routing (`/labs/expenses`, `/labs/insurance`,
  `/labs/payments`). This spec covers **only the Expenses lab**. The shared
  shell (homepage, nav, footer, profile creation, theme toggle) and each
  additional lab (Insurance, Payments) are covered by separate specs. Each
  lab embeds its own collapsible "How It Works" panel rather than linking to
  a standalone page.
