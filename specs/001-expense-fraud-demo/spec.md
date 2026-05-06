# Feature Specification: AI-Powered Internal Expense Fraud Demo

**Feature Branch**: `001-expense-fraud-demo`
**Created**: 2026-05-06
**Status**: Draft
**Input**: User description: "AI-Powered Internal Expense Fraud Demo — simulate employee expense activity, detect anomalous behavior with ML, and apply an AI investigation layer to analyze ambiguous cases."

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
   detail view shows: (a) a fraud-likelihood verdict, (b) a human-readable rationale
   paragraph, (c) an enumerated list of the top contributing signals, and (d) a
   recommended next action.
2. **Given** the AI service is unreachable or returns an unparseable response,
   **When** the presenter clicks "Investigate with AI", **Then** the case detail
   view shows a clear, non-crashing fallback state explaining the AI is
   unavailable, the rest of the application remains usable, and the deterministic
   detection output for that case is still visible.
3. **Given** an investigation has completed for a case, **When** the presenter
   reopens the same case in the same session, **Then** the previous AI verdict and
   rationale are still visible without needing a new AI call.

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
- **Re-running detection mid-investigation**: If the presenter regenerates the
  dataset while an AI investigation is in flight, the in-flight result MUST be
  discarded (or clearly marked as belonging to the prior dataset) and MUST NOT
  attach to a different case in the new dataset.
- **Very large dataset**: If the configured dataset size exceeds the system's
  performance envelope (see SC-002), the system MUST cap or warn rather than
  hanging the UI.
- **Concurrent presenters**: The demo is designed for a single interactive user at
  a time; behavior under concurrent multi-user load is out of scope (see
  Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

#### Data simulation

- **FR-001**: The system MUST generate a synthetic dataset of employee profiles
  and expense activity, with most activity reflecting normal behavior.
- **FR-002**: The system MUST inject configurable fraud patterns into the
  generated data, including at minimum: threshold-gaming (expenses just under a
  policy limit), unusual frequency (bursts of submissions), and vendor anomalies
  (expenses to atypical or rarely-used vendors).
- **FR-003**: The system MUST allow the fraud-injection intensity to be adjusted
  dynamically (without restarting or editing code) and regenerate data on demand.
- **FR-004**: The system MUST be able to produce datasets large enough to show
  meaningful patterns (target: at least several thousand expense records per
  simulation run).

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

- **FR-010**: The system MUST route medium-confidence cases (and only those, by
  default) to an AI agent for further investigation, on user request.
- **FR-011**: When invoking the AI agent, the system MUST supply structured
  context for the case, including the case's behavioral signals, relevant
  history (e.g., the employee's prior activity), and peer comparisons.
- **FR-012**: The AI agent MUST return, for each investigated case, a structured
  output containing: a fraud-likelihood assessment, supporting reasoning in
  human-readable prose, an enumerated list of key contributing signals, and a
  recommended action.
- **FR-013**: The system MUST persist the AI's verdict and rationale for the
  duration of the current session so that re-opening a previously investigated
  case does not require a new AI call.
- **FR-014**: The system MUST degrade gracefully when the AI service is
  unavailable, slow beyond a reasonable timeout, or returns malformed output:
  the application MUST stay responsive, the affected case MUST clearly indicate
  AI unavailability, and deterministic detection output for the case MUST remain
  visible.

#### Presentation & interaction

- **FR-015**: The system MUST provide a UI that visualizes the generated dataset
  and the detection results, including the distribution across the three
  confidence bands.
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

- **FR-020**: All tunable parameters (fraud intensity, fraud-pattern mix,
  dataset size, decision thresholds, and any AI-agent inputs such as model
  deployment name) MUST be configurable at runtime without source-code changes.
- **FR-021**: Invalid configuration values MUST be rejected with a clear,
  user-visible message; the system MUST retain the last known valid state.

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
  pattern mix, dataset size, thresholds, AI inputs) that governs a run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A presenter can run the full Story 1 narrative (low-fraud generate
  → detect → high-fraud generate → detect → see uplift) end-to-end in under
  three minutes during a live demo.
- **SC-002**: For datasets of at least several thousand expense records, the
  generate-and-detect cycle completes in a few seconds (target: ≤ 5 seconds
  perceived) so the demo flow does not stall.
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
  Multi-tenant or concurrent-presenter scenarios are out of scope.
- **No authentication / access control on the demo UI**: This is a demonstration
  application, not a production fraud system. The UI does not need login or RBAC
  for end users; backend service-to-service identity is governed separately by
  the project constitution (Managed Identity, RBAC in Bicep).
- **Synthetic data only**: All employee profiles and expense activity are
  generated by the application. No real personal or financial data is ingested.
- **Ephemeral data lifecycle**: A new "Generate dataset" action replaces the
  prior dataset. The system is not required to persist historical runs across
  sessions; AI investigation results persist only for the duration of the
  current session (FR-013).
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
