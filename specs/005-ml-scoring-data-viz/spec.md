# Feature Specification: ML Scoring Models & Data Visualization

**Feature Branch**: `005-ml-scoring-data-viz`  
**Created**: 2026-05-09  
**Status**: Draft  
**Input**: User description: "Enhanced synthetic data generation with more randomness/outliers, additional fraud-analysis visualizations with tabbed navigation, multiple configurable ML scoring models with comparison, and ML model documentation."

## Clarifications

### Session 2026-05-09

- Q: Which approach for the two additional ML models beyond Randomized PCA? → A: ML.NET built-in trainers only (SDCA Anomaly Detection, FastForest-based scoring) — no custom algorithm implementations.
- Q: How should multi-model results be persisted in the run blob? → A: Single run blob with results grouped by model ID (dictionary keyed by model identifier).
- Q: Which two additional chart types beyond the existing scatter plot and band bar chart? → A: Amount distribution histogram and feature contribution heatmap.
- Q: When a model in a multi-model run fails, how should that failure surface? → A: Return partial results — successful models show results, failed models show an error status with a message in the UI.
- Q: How frequently should extreme outliers appear in legitimate records? → A: 2-5% of legitimate records are extreme outliers (noticeable noise, realistic).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Multiple Scoring Models on a Single Run (Priority: P1)

A fraud investigator generates a run and selects two or more ML scoring models to apply simultaneously. After the run completes, each model's results appear side-by-side so the investigator can compare how different algorithms flag the same records. This lets the investigator understand where models agree (high-confidence signals) and where they disagree (areas requiring deeper investigation).

**Why this priority**: Multi-model comparison is the core differentiator — it directly teaches investigators how model choice affects fraud detection outcomes and is the feature with the greatest educational and analytical value.

**Independent Test**: Generate a run with at least two models selected, verify that each model produces independent scores for every record, and confirm the results are displayed together on the run detail screen.

**Acceptance Scenarios**:

1. **Given** the user is on the run configuration screen, **When** they select 2 or more scoring models from the available list, **Then** the system runs each model independently against the same dataset and returns separate scores per model.
2. **Given** a completed multi-model run, **When** the user views the run detail screen, **Then** they see each model's scores displayed with clear labels identifying which model produced which result.
3. **Given** a completed multi-model run, **When** the user looks at a single expense record, **Then** they can see each model's confidence score and band assignment for that record.
4. **Given** the user selects only one model, **When** the run completes, **Then** the experience is identical to the current single-model behavior (backward-compatible).

---

### User Story 2 - Browse Fraud Analysis Visualizations via Tabbed Navigation (Priority: P2)

A fraud investigator views a completed run and navigates between multiple chart types using tabs. Beyond the existing scatter plot and band distribution bar chart, additional visualizations show different aspects of the data distribution — helping investigators spot patterns that a single chart might miss. When multiple models are selected, each chart reflects the active model's scores or provides an overlay comparison.

**Why this priority**: Visualization variety is how real fraud analysts explore data. Different chart types reveal different fraud signals, and tabbed navigation keeps the interface clean while offering depth.

**Independent Test**: Complete a run, navigate to the run detail screen, switch between chart tabs, and verify each chart renders correctly with the run data and responds to model selection.

**Acceptance Scenarios**:

1. **Given** a completed run with detection results, **When** the user views the run detail screen, **Then** they see a tab bar with at least four chart types available.
2. **Given** the tab bar is visible, **When** the user clicks a different chart tab, **Then** the corresponding visualization renders without a full page reload.
3. **Given** a multi-model run, **When** the user switches models in the active chart, **Then** the chart updates to reflect the selected model's scores.
4. **Given** a completed run, **When** the user switches between all available chart tabs, **Then** each chart displays meaningful data derived from the run's expense records and detection results.

---

### User Story 3 - Configure ML Model Settings Before a Run (Priority: P2)

A fraud investigator reviews available ML scoring models, adjusts model-specific parameters (e.g., PCA rank, contamination ratio, number of estimators), and launches a run with those settings. The ability to tune models helps investigators understand how parameter choices impact detection sensitivity.

**Why this priority**: Tunable parameters make the demo educational — investigators learn that model behavior isn't fixed and that parameter choices affect outcomes.

**Independent Test**: Open the configuration panel, select a model, adjust at least one parameter, generate a run, and verify the adjusted parameter affected the model's output (e.g., different score distribution than default settings).

**Acceptance Scenarios**:

1. **Given** the user opens the run configuration panel, **When** they expand a model's settings, **Then** they see the model's tunable parameters with current/default values and brief descriptions.
2. **Given** the user changes a model parameter, **When** they generate a run, **Then** the model uses the adjusted parameter value during scoring.
3. **Given** the user does not change any model parameters, **When** they generate a run, **Then** the model uses its default parameter values.

---

### User Story 4 - Generate More Realistic Synthetic Data (Priority: P3)

A fraud investigator generates a run and the resulting expense data has a more realistic distribution: normal records follow a more consistent bell-curve shape around employee baselines, while fraudulent records appear as clearer outliers. The data is harder to classify at a glance because the legitimate-vs-fraudulent boundary is less obvious, creating a more challenging and realistic training scenario.

**Why this priority**: Better synthetic data makes the entire demo more realistic and educational, but the system already works with current data generation — this is a quality improvement.

**Independent Test**: Generate a run and verify that (a) legitimate expense amounts cluster more tightly around employee baselines with a recognizable distribution shape, (b) outliers are present at the extremes, and (c) the fraud/legitimate boundary is less obvious than the current generation.

**Acceptance Scenarios**:

1. **Given** the user generates a new run, **When** looking at the amount distribution of legitimate records, **Then** amounts cluster around employee baselines in a bell-curve-like shape rather than a uniform spread.
2. **Given** the user generates a new run, **When** looking at the full dataset, **Then** occasional extreme outliers appear in both legitimate and fraudulent records, making simple threshold-based classification insufficient.
3. **Given** the user generates multiple runs with the same seed, **When** comparing the data distributions, **Then** the distributions are identical (deterministic reproduction with seed).

---

### User Story 5 - Read ML Model Documentation (Priority: P3)

A fraud investigator or developer opens the ML model documentation to understand what each available scoring model does, how it differs from the others, its strengths and weaknesses, and when to prefer one over another. This documentation lives in the project docs alongside existing documentation.

**Why this priority**: Documentation is essential for educational value but does not affect runtime behavior — it supports all other stories without blocking them.

**Independent Test**: Open the documentation file and verify each model listed in the system has a corresponding entry with description, methodology, pros/cons, and guidance on when to use it.

**Acceptance Scenarios**:

1. **Given** the docs directory exists, **When** the user opens the ML model documentation, **Then** they find an entry for every scoring model available in the system.
2. **Given** a model documentation entry, **When** reading it, **Then** it includes: a plain-language description, how the model works, key parameters, strengths, weaknesses, and recommended use cases.

---

### Edge Cases

- What happens when a selected ML model fails to score (e.g., insufficient data for PCA)? The run completes with partial results — successful models’ results are returned normally, and the failed model shows an explicit error status with a descriptive message in the UI. The run is not failed entirely.
- What happens when all records score identically (zero variance)? Charts degrade gracefully — scatter plots show a flat line, histograms show a single bin, with a message indicating low-variance results.
- What happens when the user selects only one model? Behavior matches the current single-model experience; comparison-specific UI elements are hidden or disabled.
- What happens with very large runs (50,000 records) and multiple models? Each model scores independently; the UI paginates or virtualizes chart data to remain responsive.

## Requirements *(mandatory)*

### Functional Requirements

#### ML Scoring Models

- **FR-001**: System MUST support at least three distinct ML scoring models for anomaly detection: the existing Randomized PCA model plus two additional ML.NET built-in trainers (SDCA Anomaly Detection and a FastForest-based binary classification scorer repurposed for anomaly scoring). No custom algorithm implementations or external ML frameworks.
- **FR-002**: Each scoring model MUST implement a common scoring interface that accepts the same inputs (employees, expenses, thresholds, seed) and returns the same output structure (detection results with confidence scores, bands, and feature contributions).
- **FR-003**: Users MUST be able to select one or more scoring models when configuring a run.
- **FR-004**: When multiple models are selected, the system MUST run each model independently against the same dataset and return separate detection results per model.
- **FR-005**: Each model MUST expose tunable parameters that users can adjust before a run (e.g., PCA rank for Randomized PCA; L1/L2 regularization and max iterations for SDCA; number of trees, max leaves per tree, and minimum examples per leaf for FastForest).
- **FR-006**: Each model MUST have sensible default parameter values that produce reasonable results without user tuning.
- **FR-007**: Detection results MUST identify which model produced them.

#### Data Generation Improvements

- **FR-008**: Normal (legitimate) expense amounts MUST be generated using a distribution that clusters around employee baselines (e.g., log-normal or truncated normal) rather than a uniform spread.
- **FR-009**: The system MUST inject extreme outliers into 2-5% of legitimate records (e.g., unusually large conference expenses, equipment purchases) to create realistic noise that challenges simple threshold-based classification.
- **FR-010**: Fraudulent records MUST have subtler signals — threshold gaming amounts should vary more widely around the threshold, unusual frequency records should occasionally appear on weekdays, and vendor anomaly amounts should overlap with legitimate ranges.
- **FR-011**: Data generation MUST remain deterministic when a seed is provided.

#### Visualization & Tabbed Navigation

- **FR-012**: The run detail screen MUST display a tab bar for switching between multiple chart types.
- **FR-013**: The system MUST include at least four chart types: the existing anomaly scatter plot, the existing band distribution bar chart, plus at least two additional fraud-analysis visualizations.
- **FR-014**: The two additional chart types MUST be: (1) an amount distribution histogram showing the shape of legitimate vs. fraudulent expense amounts, and (2) a feature contribution heatmap showing which features drive each record's anomaly score across the dataset.
- **FR-015**: When a multi-model run is viewed, charts MUST allow the user to switch between models or overlay model results for comparison.
- **FR-016**: Tab switching MUST be instant (client-side rendering with no additional API calls).

#### Documentation

- **FR-017**: A new `ml-models.md` file MUST be added to the `docs/` directory documenting each available scoring model.
- **FR-018**: Each model entry MUST include: a plain-language description, the algorithm's methodology, key tunable parameters with descriptions, strengths, weaknesses, and recommended use cases for fraud detection.

### Key Entities

- **ScorerModelDefinition**: Represents an available ML scoring model — includes a unique identifier, display name, description, and a set of configurable parameters with defaults.
- **ModelParameterDef**: A tunable parameter for a scoring model — includes name, display name, description, data type, default value, and valid range/constraints.
- **ModelDetectionResults**: Detection results scoped to a specific model within a run — links the model identifier to the list of per-record detection results.
- **SimulationConfiguration** (extended): The existing simulation configuration extended to include the list of selected scoring models and their parameter overrides.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select and run at least 3 different scoring models on the same dataset in a single run.
- **SC-002**: Users can compare model results side-by-side — via the ModelSelector dropdown that toggles the active model's scores on all charts — and identify records where models disagree on fraud confidence by switching between models and observing score differences.
- **SC-003**: Users can navigate between at least 4 distinct chart types via tabs on the run detail screen within under 1 second per switch.
- **SC-004**: Synthetic data distributions for legitimate records visually approximate a bell curve when plotted in a histogram, rather than appearing uniformly distributed.
- **SC-005**: At least 90% of model documentation entries are rated as "clear and useful" by a reviewer reading them for the first time.
- **SC-006**: Each scoring model produces detectably different score distributions when run against the same dataset, demonstrating that model choice matters.
- **SC-007**: Users can adjust at least one parameter per model and observe a change in scoring behavior.

## Assumptions

- The existing `IAnomalyScorer` interface pattern will be extended to support model identification and parameterization; existing Randomized PCA functionality remains backward-compatible.
- Additional ML models will be implemented exclusively using ML.NET's built-in trainers — no custom algorithm implementations or external ML frameworks are introduced.
- Chart visualizations use the existing Recharts library already present in the frontend.
- Multi-model results are stored in the same run blob as a dictionary keyed by model identifier — no new storage blobs or infrastructure required. The existing single-model format is replaced by the dictionary structure (backward-compatible migration via a default key for legacy runs).
- The "comparison" view for multi-model runs is a UI-only feature — the backend simply returns results per model and the frontend handles presentation.
- Model parameter tuning is bounded to a small set of meaningful parameters per model (2-4 each) to keep the UI manageable.
- Documentation targets a technical audience familiar with data science concepts but not necessarily ML experts.
