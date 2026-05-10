# Tasks: ML Scoring Models & Data Visualization

**Input**: Design documents from `/specs/005-ml-scoring-data-viz/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New domain types, enums, and scorer registry that all user stories depend on

- [X] T001 Create `ScorerModelId` constants class with model ID strings (`"randomized-pca"`, `"sdca-logistic"`, `"fast-forest"`) in `backend/src/Domain/Enums/ScorerModelId.cs`
- [X] T002 [P] Create `ParameterType` enum (`Int`, `Float`) in `backend/src/Domain/Enums/ParameterType.cs`
- [X] T003 [P] Create `ModelScoringStatus` enum (`Success`, `Error`) in `backend/src/Domain/Enums/ModelScoringStatus.cs`
- [X] T004 [P] Create `ModelParameterDef` value object (Name, DisplayName, Description, DataType, DefaultValue, Min, Max) in `backend/src/Domain/Configuration/ModelParameterDef.cs`
- [X] T005 Create `ScorerModelDefinition` value object (ModelId, DisplayName, Description, Parameters list) in `backend/src/Domain/Configuration/ScorerModelDefinition.cs`
- [X] T006 Create `ScorerSelection` value object (ModelId, Parameters dictionary) in `backend/src/Domain/Configuration/ScorerSelection.cs`
- [X] T007 Create `ScorerRegistry` singleton with all three model definitions and their parameter metadata in `backend/src/Domain/Configuration/ScorerRegistry.cs`
- [X] T008 Create `ModelDetectionResults` entity (ModelId, Status, ErrorMessage, Results list, BandCounts) in `backend/src/Domain/Entities/ModelDetectionResults.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modify existing core entities and interfaces to support multi-model results — BLOCKS all user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Extend `SimulationConfiguration` to add `Scorers: IReadOnlyList<ScorerSelection>` property with default single PCA scorer in `backend/src/Domain/Configuration/SimulationConfiguration.cs`
- [ ] T010 Modify `Run` entity: replace `DetectionResults: IReadOnlyList<DetectionResult>` with `ModelResults: IReadOnlyDictionary<string, ModelDetectionResults>` and update the `WithInvestigations` helper and validation in `backend/src/Domain/Entities/Run.cs`
- [ ] T011 Update `RunTests` for new `ModelResults` dictionary structure (replace flat list assertions) in `backend/tests/unit/Domain.Tests/RunTests.cs`
- [ ] T012 Extend `IAnomalyScorer` interface to add `string ModelId { get; }` property and add `Dictionary<string, double>? parameterOverrides` optional parameter to `Score` method in `backend/src/Application/Abstractions/IAnomalyScorer.cs`
- [ ] T013 Refactor existing `MlNetAnomalyScorer` to implement extended `IAnomalyScorer` with `ModelId = "randomized-pca"` and accept `parameterOverrides` for rank in `backend/src/Infrastructure/Detection/MlNetAnomalyScorer.cs`
- [ ] T014 Update `MlNetAnomalyScorerTests` to pass `parameterOverrides` and verify `ModelId` property in `backend/tests/unit/Infrastructure.Tests/MlNetAnomalyScorerTests.cs`
- [ ] T015 Extend `SimulationConfigurationDto` to add optional `scorers` array field in `backend/src/Functions/Dtos/SimulationConfigurationDto.cs`
- [ ] T016 Update `SimulationConfigurationMapper` to map scorer selection from DTO (default to single PCA if omitted) with validation against `ScorerRegistry` in `backend/src/Application/Configuration/SimulationConfigurationMapper.cs`
- [ ] T017 Modify `GenerateRunHandler` to iterate over selected scorers, run each `IAnomalyScorer` independently, catch per-model failures, and assemble `Dictionary<string, ModelDetectionResults>` in `backend/src/Application/Services/GenerateRunHandler.cs`
- [ ] T018 Update `GenerateRunHandlerTests` for multi-model orchestration (success, partial failure, single-model backward compat) in `backend/tests/unit/Application.Tests/GenerateRunHandlerTests.cs`
- [ ] T019 Update `BlobRunRepository` JSON serialization/deserialization for the new `ModelResults` dictionary schema with backward-compatible migration for legacy flat-array runs in `backend/src/Infrastructure/Persistence/BlobRunRepository.cs`
- [ ] T020 Register new scorer implementations in DI container (keyed services or factory pattern) in `backend/src/Functions/Program.cs`

**Checkpoint**: Foundation ready — existing PCA scorer works under the new multi-model architecture, single-model runs still work, all existing tests pass

---

## Phase 3: User Story 1 — Run Multiple Scoring Models on a Single Run (Priority: P1) 🎯 MVP

**Goal**: Users can select 2+ ML scoring models and get independent detection results per model in a single run

**Independent Test**: Generate a run with all three models selected via POST /api/runs, verify response contains three entries in `modelResults` with different score distributions

### Implementation for User Story 1

- [ ] T021 [P] [US1] Implement `SdcaAnomalyScorer` using `ml.BinaryClassification.Trainers.SdcaLogisticRegression` with label from `ExpenseRecord.IsFraud`, parameterOverrides for l1Regularization/l2Regularization/maxIterations, and logistic squash calibration in `backend/src/Infrastructure/Detection/SdcaAnomalyScorer.cs`
- [ ] T022 [P] [US1] Implement `FastForestAnomalyScorer` using `ml.BinaryClassification.Trainers.FastForest` with label from `ExpenseRecord.IsFraud`, parameterOverrides for numberOfTrees/numberOfLeaves/minimumExampleCountPerLeaf, and tree-vote probability mapping in `backend/src/Infrastructure/Detection/FastForestAnomalyScorer.cs`
- [ ] T023 [P] [US1] Create `CompositeAnomalyScorer` that accepts `IEnumerable<IAnomalyScorer>` via DI, resolves scorers by ModelId from `ScorerSelection`, and runs each independently in `backend/src/Infrastructure/Detection/CompositeAnomalyScorer.cs`
- [ ] T024 [P] [US1] Write unit tests for `SdcaAnomalyScorer` — verify scoring produces [0,1] confidence values, respects parameterOverrides, and returns correct ModelId in `backend/tests/unit/Infrastructure.Tests/SdcaAnomalyScorerTests.cs`
- [ ] T025 [P] [US1] Write unit tests for `FastForestAnomalyScorer` — verify scoring produces [0,1] confidence values, respects parameterOverrides, and returns correct ModelId in `backend/tests/unit/Infrastructure.Tests/FastForestAnomalyScorerTests.cs`
- [ ] T026 [US1] Create `ScorerModelsFunction` HTTP endpoint: GET /api/scorers returning model catalog from `ScorerRegistry` as JSON per contracts/api.md in `backend/src/Functions/Endpoints/ScorerModelsFunction.cs`
- [ ] T027 [US1] Update frontend `runsClient.ts` — add `ScorerSelection` type, `ModelDetectionResults` type, `modelResults` dictionary in run response schema, `scorers` field in `SimulationConfigurationSchema`, and `fetchScorers()` API call in `frontend/src/api/runsClient.ts`
- [ ] T028 [US1] Update `RunDetailRoute` to derive `bandCounts` and `detectionResults` from the primary model in `modelResults` (backward-compatible with new schema) in `frontend/src/routes/RunDetailRoute.tsx`
- [ ] T029 [US1] Update `CaseList` and case detail views to read detection results from `modelResults[primaryModel]` instead of flat `detectionResults`, and display all models' confidence scores and band assignments per record when a multi-model run is viewed, in `frontend/src/components/CaseList.tsx`

**Checkpoint**: Three models score independently on a single run. API returns multi-model results. Frontend displays primary model's results correctly.

---

## Phase 4: User Story 2 — Browse Fraud Analysis Visualizations via Tabbed Navigation (Priority: P2)

**Goal**: Users navigate between 4 chart types via tabs and switch between models when multiple models scored

**Independent Test**: Complete a run, verify tab bar shows 4 tabs, switching tabs renders different chart types, model selector changes chart data

### Implementation for User Story 2

- [ ] T030 [P] [US2] Create `ModelSelector` dropdown component that lists available models from `modelResults` keys and fires `onModelChange` callback in `frontend/src/components/ModelSelector.tsx`
- [ ] T031 [P] [US2] Create `ChartTabBar` component with tabs "Scatter", "Distribution", "Histogram", "Heatmap" and active tab state in `frontend/src/components/ChartTabBar.tsx`
- [ ] T032 [US2] Refactor `RunSummaryStats` to use `ChartTabBar` + `ModelSelector` layout — render active chart based on selected tab, pass selected model's results to each chart, and downsample data for large runs (>10k records) to maintain <500ms chart rendering in `frontend/src/components/RunSummaryStats.tsx`
- [ ] T033 [P] [US2] Update `BandChart` to accept `detectionResults` as a prop (from selected model) instead of computing from the full run in `frontend/src/components/BandChart.tsx`
- [ ] T034 [US2] Create `AmountHistogram` component — bin expense amounts into buckets, overlay flagged (High+Medium) vs. clean (Low) as stacked bars using Recharts `BarChart`; handle zero-variance edge case (single bin) with informational message in `frontend/src/components/AmountHistogram.tsx`
- [ ] T035 [US2] Create `FeatureHeatmap` component — compute mean Z-score per feature per band from `contributingFeatures`, render as a color-coded grid using Recharts or SVG rectangles; handle zero-variance edge case (all cells neutral) with informational message in `frontend/src/components/FeatureHeatmap.tsx`
- [ ] T036 [P] [US2] Write component test for `ChartTabBar` — verify tab rendering, active state, click callbacks in `frontend/tests/components/ChartTabBar.test.tsx`
- [ ] T037 [P] [US2] Write component test for `AmountHistogram` — verify bin calculation, stacked rendering, empty state in `frontend/tests/components/AmountHistogram.test.tsx`
- [ ] T038 [P] [US2] Write component test for `FeatureHeatmap` — verify aggregation, color mapping, band grouping in `frontend/tests/components/FeatureHeatmap.test.tsx`

**Checkpoint**: Run detail screen shows 4 chart tabs. Switching tabs is instant. Model selector changes which model's data the chart displays.

---

## Phase 5: User Story 3 — Configure ML Model Settings Before a Run (Priority: P2)

**Goal**: Users see available models with tunable parameters in the config panel and can adjust values before generating a run

**Independent Test**: Open config panel, expand a model, change a parameter, generate a run, verify the parameter override appears in the run's configuration

### Implementation for User Story 3

- [ ] T039 [US3] Create `ScorerConfigSection` component — fetch model catalog from `/api/scorers`, display checkboxes for model selection, expandable parameter editors per model with defaults and min/max validation in `frontend/src/components/ScorerConfigSection.tsx`
- [ ] T040 [US3] Integrate `ScorerConfigSection` into `ConfigPanel` — add scorer selection state, pass selected scorers + parameter overrides to the `onGenerate` callback as part of `SimulationConfiguration` in `frontend/src/components/ConfigPanel.tsx`
- [ ] T041 [P] [US3] Write component test for `ScorerConfigSection` — verify model listing, checkbox toggle, parameter editing, validation in `frontend/tests/components/ScorerConfigSection.test.tsx`

**Checkpoint**: Users can select models and tune parameters. The config panel sends scorer selections to the API. Generated runs use the selected models with overridden parameters.

---

## Phase 6: User Story 4 — Generate More Realistic Synthetic Data (Priority: P3)

**Goal**: Legitimate expenses follow a log-normal distribution with 2-5% outliers; fraud signals are subtler and overlap with legitimate ranges

**Independent Test**: Generate a run with seed, verify legitimate amount distribution clusters around baselines (not uniform), verify outliers exist at extremes, verify fraud records have wider variance

### Implementation for User Story 4

- [ ] T042 [US4] Refactor `FraudInjector.GenerateNormal` to use log-normal distribution (Box-Muller transform) centered on employee baseline instead of uniform spread, and inject 2-5% extreme outliers (3-8x multiplier) on legitimate records in `backend/src/Application/Services/FraudInjector.cs`
- [ ] T043 [US4] Update `FraudInjector.GenerateThresholdGaming` to widen jitter from (-1,+11) to (-50,+50) and add occasional sub-threshold amounts ($800-$950) in `backend/src/Application/Services/FraudInjector.cs`
- [ ] T044 [US4] Update `FraudInjector.GenerateUnusualFrequency` to allow 30% weekday submissions and 20% typical-category usage in `backend/src/Application/Services/FraudInjector.cs`
- [ ] T045 [US4] Update `FraudInjector.GenerateVendorAnomaly` to mix legitimate-range amounts ($200-$500) alongside high amounts and occasionally use known vendors in `backend/src/Application/Services/FraudInjector.cs`
- [ ] T046 [US4] Update `FraudInjectorTests` — add tests verifying log-normal distribution shape (mean near baseline, right skew), outlier frequency (2-5%), subtler fraud signal variance, and deterministic seeded output in `backend/tests/unit/Application.Tests/FraudInjectorTests.cs`

**Checkpoint**: Generated data has realistic bell-curve distribution for legitimate expenses, 2-5% legitimate outliers, and subtler fraud signals that overlap with normal ranges.

---

## Phase 7: User Story 5 — Read ML Model Documentation (Priority: P3)

**Goal**: A new `docs/ml-models.md` documents each scoring model with methodology, parameters, pros/cons, and use cases

**Independent Test**: Open the file and verify each of the three models has a complete entry

### Implementation for User Story 5

- [ ] T047 [P] [US5] Create `docs/ml-models.md` with entries for Randomized PCA, SDCA Logistic Regression, and FastForest: each entry includes plain-language description, algorithm methodology, tunable parameters with descriptions, strengths, weaknesses, and recommended use cases per FR-018 in `docs/ml-models.md`

**Checkpoint**: Documentation covers all three models and is accessible alongside existing docs.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, cleanup, and validation

- [ ] T048 Update `docs/api.md` with the new GET /api/scorers endpoint and the modified POST /api/runs request/response shapes in `docs/api.md`
- [ ] T049 [P] Update `docs/components.md` with the new frontend components (ChartTabBar, AmountHistogram, FeatureHeatmap, ModelSelector, ScorerConfigSection) in `docs/components.md`
- [ ] T050 [P] Run full backend test suite (`dotnet test`) and fix any regressions from multi-model changes
- [ ] T051 [P] Run full frontend test suite (`npm test`) and fix any regressions from chart/config changes
- [ ] T052 Run quickstart.md validation — execute the API commands from quickstart.md against local dev and verify responses match expected shapes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — delivers MVP multi-model scoring
- **User Story 2 (Phase 4)**: Depends on Foundational + benefits from US1 (multi-model data to visualize)
- **User Story 3 (Phase 5)**: Depends on Foundational + US1 (scorer endpoint needed for config UI)
- **User Story 4 (Phase 6)**: Depends on Foundational only — can run in parallel with US1-US3
- **User Story 5 (Phase 7)**: No code dependencies — can run in parallel with any phase
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational ← **MVP**
- **US2 (P2)**: Best after US1 (needs multi-model data); can start after Foundational with single-model data
- **US3 (P2)**: Best after US1 (needs /api/scorers endpoint); can start config UI in parallel
- **US4 (P3)**: Fully independent after Foundational — modifies data generation only
- **US5 (P3)**: Fully independent — documentation only

### Within Each User Story

- Models/entities before services
- Services before endpoints
- Backend before frontend (for API contracts)
- Core implementation before tests (tests validate implementation)

### Parallel Opportunities

**Phase 1** (all T001-T008 marked [P] where independent):
- T002, T003, T004 can run in parallel (independent enums + value objects)
- T005 depends on T004 (uses ModelParameterDef)
- T006 independent
- T007 depends on T004, T005 (uses definitions)
- T008 depends on T003 (uses ModelScoringStatus)

**Phase 3** (US1):
- T021, T022, T023 can run in parallel (independent scorer files)
- T024, T025 can run in parallel (independent test files)
- T027, T028, T029 sequential (frontend schema → route → components)

**Phase 4** (US2):
- T030, T031 can run in parallel (independent components)
- T036, T037, T038 can run in parallel (independent test files)
- T034 can run in parallel with T030, T031

**Cross-story parallelism**:
- US4 (data gen) and US5 (docs) can run entirely in parallel with US1-US3
- US2 and US3 frontend work can partially overlap

---

## Parallel Example: User Story 1

```bash
# Parallel batch 1 (independent scorer implementations)
T021: SdcaAnomalyScorer.cs          # Worker A
T022: FastForestAnomalyScorer.cs     # Worker B
T023: CompositeAnomalyScorer.cs      # Worker C

# Parallel batch 2 (independent tests)
T024: SdcaAnomalyScorerTests.cs      # Worker A
T025: FastForestAnomalyScorerTests.cs # Worker B

# Sequential (API endpoint + frontend)
T026: ScorerModelsFunction.cs        # depends on registry
T027: runsClient.ts                  # depends on API contract
T028: RunDetailRoute.tsx             # depends on T027
T029: CaseList.tsx                   # depends on T027
```

---

## Implementation Strategy

### MVP Scope

**User Story 1 (Phase 3)** is the MVP. After completing Setup → Foundational → US1, the system supports multi-model scoring with three ML.NET models. The existing UI works with the primary model's results. This alone delivers SC-001 (3 models) and SC-006 (different distributions).

### Incremental Delivery

1. **Phase 1-2**: Foundation (all existing functionality preserved)
2. **Phase 3 (US1)**: Multi-model scoring backend + frontend compatibility → **demo-ready**
3. **Phase 4 (US2)**: Chart tabs + model selector → **polished visualization**
4. **Phase 5 (US3)**: Config panel model tuning → **full configurability**
5. **Phase 6 (US4)**: Better data generation → **more realistic demo**
6. **Phase 7 (US5)**: Documentation → **educational completeness**
7. **Phase 8**: Polish → **production quality**
