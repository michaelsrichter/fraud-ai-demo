# Implementation Plan: ML Scoring Models & Data Visualization

**Branch**: `005-ml-scoring-data-viz` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-ml-scoring-data-viz/spec.md`

## Summary

Add two additional ML.NET-based anomaly scoring models (SDCA Anomaly Detection and FastForest-based binary classification) alongside the existing Randomized PCA scorer, enabling multi-model comparison on a single run. Improve synthetic data generation to use log-normal distributions with 2-5% legitimate outliers and subtler fraud signals. Introduce tabbed chart navigation on the run detail screen with four visualizations (scatter plot, band distribution, amount histogram, feature contribution heatmap). Each model exposes tunable parameters configurable via the UI. Results are stored as a dictionary keyed by model ID in the existing run blob. A new `docs/ml-models.md` documents all available scoring models.

## Technical Context

**Language/Version**: C# (.NET 10, isolated worker) for backend; TypeScript 5 + React 19 for frontend
**Primary Dependencies**: Microsoft.ML (ML.NET — RandomizedPca, SdcaLogisticRegression, FastForest already available), Azure Functions (isolated worker), Vite, React, Recharts, TanStack Query
**Storage**: Azure Blob Storage (existing run persistence via `IRunRepository`; detection results dictionary replaces flat list in the same blob)
**Testing**: xUnit + NSubstitute for backend; Vitest + Testing Library for frontend
**Target Platform**: Azure Functions (backend) + Azure Static Web Apps (frontend)
**Project Type**: Web application (serverless API + SPA)
**Performance Goals**: Sub-second tab switching; multi-model scoring completes within a few seconds for 5,000 records; chart rendering <500ms
**Constraints**: ML.NET built-in trainers only (no external ML frameworks); existing run blob format evolves (backward-compatible migration); no new infrastructure resources
**Scale/Scope**: 3 ML models, 4 chart types, ~8 new/modified backend files, ~8 new/modified frontend components, 1 new doc

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Platform & Deployment | ✅ PASS | No new infrastructure resources. Same Azure Functions + SWA topology. |
| II | Source Control & CI/CD | ✅ PASS | All code in repo; CI pipeline unchanged. No new secrets. |
| III | AI & Agent Framework | ✅ PASS | ML scoring is independent of the AI agent subsystem. No AI framework changes. |
| IV | Security & Identity | ✅ PASS | Same Managed Identity auth. No new secrets or keys. |
| V | Code Quality & Architecture | ✅ PASS | New scorers implement `IAnomalyScorer` interface. Model registry follows DI pattern. Configuration flows through Application layer. |
| VI | Testing Requirements | ✅ PASS | Unit tests for each new scorer, data generation changes, and frontend chart components. |
| VII | Documentation | ✅ PASS | New `docs/ml-models.md`. Inline comments on model parameterization and calibration. |
| VIII | Observability & Reliability | ✅ PASS | Per-model error handling with partial results on failure. Logging for each model's scoring pass. |
| IX | Configuration & Flexibility | ✅ PASS | Model parameters configurable per-run via API. Defaults require no configuration. |
| X | Performance Expectations | ✅ PASS | Models score independently; parallel execution possible. Chart rendering client-side only. |
| XI | Development Experience | ✅ PASS | Same local dev workflow. No new infrastructure dependencies. ML.NET runs in-process. |
| XII | Library-First Algorithms | ✅ PASS | All three models use ML.NET built-in trainers. No custom algorithm implementations. |

**Gate result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-ml-scoring-data-viz/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── Application/
│   │   ├── Abstractions/
│   │   │   └── IAnomalyScorer.cs          # existing — add ModelId property or extend interface
│   │   ├── Dtos/
│   │   │   └── SimulationConfigurationDto.cs  # existing — add selected models + parameter overrides
│   │   ├── Services/
│   │   │   ├── GenerateRunHandler.cs       # existing — iterate over selected models, aggregate results
│   │   │   ├── FraudInjector.cs            # existing — improve data distributions
│   │   │   └── FraudFeatureBuilder.cs      # existing — unchanged
│   │   └── Configuration/
│   │       └── SimulationConfigurationMapper.cs  # existing — map new DTO fields
│   ├── Domain/
│   │   ├── Entities/
│   │   │   ├── Run.cs                      # existing — DetectionResults → Dictionary<string, ModelDetectionResults>
│   │   │   ├── DetectionResult.cs          # existing — unchanged
│   │   │   └── ModelDetectionResults.cs    # NEW — wraps model ID + status + results list
│   │   ├── Configuration/
│   │   │   ├── SimulationConfiguration.cs  # existing — add selected scorers + parameter overrides
│   │   │   ├── ScorerSelection.cs          # NEW — model ID + parameter dictionary
│   │   │   └── ScorerRegistry.cs           # NEW — available models + defaults + parameter metadata
│   │   └── Enums/
│   │       └── ScorerModelId.cs            # NEW — string constants for available model IDs
│   ├── Functions/
│   │   ├── Endpoints/
│   │   │   ├── GenerateRunFunction.cs      # existing — unchanged (DTO changes flow through mapper)
│   │   │   └── ScorerModelsFunction.cs     # NEW — GET /api/scorers (returns available models + params)
│   │   └── Dtos/
│   │       └── SimulationConfigurationDto.cs  # existing — add scorer selection fields
│   └── Infrastructure/
│       └── Detection/
│           ├── MlNetAnomalyScorer.cs       # existing — refactor to support model ID + parameters
│           ├── SdcaAnomalyScorer.cs        # NEW — SDCA-based anomaly scorer
│           ├── FastForestAnomalyScorer.cs  # NEW — FastForest binary classifier as anomaly scorer
│           └── CompositeAnomalyScorer.cs   # NEW — runs multiple scorers, aggregates results
├── tests/
│   └── unit/
│       ├── Infrastructure.Tests/
│       │   ├── MlNetAnomalyScorerTests.cs      # existing — update for parameterization
│       │   ├── SdcaAnomalyScorerTests.cs       # NEW
│       │   └── FastForestAnomalyScorerTests.cs  # NEW
│       ├── Application.Tests/
│       │   ├── FraudInjectorTests.cs            # existing — add distribution/outlier tests
│       │   └── GenerateRunHandlerTests.cs       # existing — add multi-model tests
│       └── Domain.Tests/
│           └── RunTests.cs                      # existing — update for new DetectionResults shape

frontend/
├── src/
│   ├── api/
│   │   ├── runsClient.ts              # existing — add scorer selection types, multi-model result types, scorers API
│   │   └── types.ts                   # existing — unchanged
│   ├── components/
│   │   ├── RunSummaryStats.tsx         # existing — refactor to use tabbed chart layout
│   │   ├── BandChart.tsx              # existing — accept model selector prop
│   │   ├── ChartTabBar.tsx            # NEW — tab navigation for chart types
│   │   ├── AmountHistogram.tsx        # NEW — amount distribution histogram
│   │   ├── FeatureHeatmap.tsx         # NEW — feature contribution heatmap
│   │   ├── ModelSelector.tsx          # NEW — dropdown/toggle for active model in charts
│   │   ├── ConfigPanel.tsx            # existing — add model selection + parameter UI
│   │   └── ScorerConfigSection.tsx    # NEW — per-model parameter configuration UI
│   └── routes/
│       └── RunDetailRoute.tsx         # existing — pass model context to charts
├── tests/
│   └── components/
│       ├── ChartTabBar.test.tsx       # NEW
│       ├── AmountHistogram.test.tsx   # NEW
│       ├── FeatureHeatmap.test.tsx    # NEW
│       └── ScorerConfigSection.test.tsx  # NEW

docs/
└── ml-models.md                       # NEW — ML model documentation
```

**Structure Decision**: Extends the existing layered backend (Domain → Application → Infrastructure → Functions) with new scorer implementations in Infrastructure/Detection and a scorer registry in Domain/Configuration. Frontend extends existing component library with new chart components and a tab navigation wrapper.

## Complexity Tracking

> No constitution violations. All three models use ML.NET built-in trainers (Principle XII satisfied).
