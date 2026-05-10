# Data Model: ML Scoring Models & Data Visualization

**Feature**: 005-ml-scoring-data-viz | **Date**: 2026-05-09

## Entity Diagram

```text
┌─────────────────────────┐
│     ScorerRegistry      │  (singleton — Domain/Configuration)
│─────────────────────────│
│ AvailableModels[]       │──┐
└─────────────────────────┘  │
                             │ 1..*
                             ▼
┌─────────────────────────┐
│   ScorerModelDefinition │  (value object — Domain/Configuration)
│─────────────────────────│
│ ModelId: string         │
│ DisplayName: string     │
│ Description: string     │
│ Parameters[]            │──┐
└─────────────────────────┘  │
                             │ 0..*
                             ▼
┌─────────────────────────┐
│    ModelParameterDef     │  (value object — Domain/Configuration)
│─────────────────────────│
│ Name: string            │
│ DisplayName: string     │
│ Description: string     │
│ DataType: ParameterType │
│ DefaultValue: object    │
│ Min: double?            │
│ Max: double?            │
└─────────────────────────┘

┌─────────────────────────┐
│   ScorerSelection       │  (value object — Domain/Configuration)
│─────────────────────────│
│ ModelId: string         │
│ Parameters: Dict<str,   │
│   object>               │
└─────────────────────────┘

┌─────────────────────────────────────┐
│  SimulationConfiguration (extended) │
│─────────────────────────────────────│
│ RecordCount: int                    │
│ EmployeeCount: int                  │
│ Intensity: decimal                  │
│ PatternWeights: PatternWeights      │
│ Thresholds: BandThresholds          │
│ Seed: int?                          │
│ ModelDeploymentName: string         │
│ Scorers: ScorerSelection[]          │  ← NEW
└─────────────────────────────────────┘

┌─────────────────────────────────┐
│      Run (modified)             │
│─────────────────────────────────│
│ RunId: Guid                     │
│ OwnerId: string                 │
│ CreatedUtc: DateTimeOffset      │
│ Configuration: SimConfig        │
│ Employees: Employee[]           │
│ Expenses: ExpenseRecord[]       │
│ ModelResults: Dict<string,      │  ← REPLACES DetectionResults
│   ModelDetectionResults>        │
│ Investigations: Dict<Guid, AI>  │
└─────────────────────────────────┘
         │
         │ keyed by modelId
         ▼
┌─────────────────────────────────┐
│    ModelDetectionResults        │  (new entity — Domain/Entities)
│─────────────────────────────────│
│ ModelId: string                 │
│ Status: ModelScoringStatus      │  (Success | Error)
│ ErrorMessage: string?           │
│ Results: DetectionResult[]      │
│ BandCounts: BandCounts          │
└─────────────────────────────────┘

┌─────────────────────────┐
│  DetectionResult        │  (unchanged)
│─────────────────────────│
│ RecordId: Guid          │
│ RawScore: double        │
│ Confidence: double      │
│ Band: ConfidenceBand    │
│ ContributingFeatures[]  │
└─────────────────────────┘
```

## New Entities

### ScorerModelDefinition

Represents the metadata for an available ML scoring model. Immutable value object.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| ModelId | string | Required, unique, lowercase kebab-case | Unique identifier (e.g., `"randomized-pca"`, `"sdca-logistic"`, `"fast-forest"`) |
| DisplayName | string | Required, non-empty | Human-friendly name (e.g., "Randomized PCA") |
| Description | string | Required | Brief description of the model's approach |
| Parameters | IReadOnlyList\<ModelParameterDef\> | Required, may be empty | Tunable parameters for this model |

### ModelParameterDef

Describes a single tunable parameter for a scoring model.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| Name | string | Required, unique per model | Parameter identifier (e.g., `"rank"`, `"numberOfTrees"`) |
| DisplayName | string | Required | Human label (e.g., "PCA Rank") |
| Description | string | Required | Tooltip/help text |
| DataType | ParameterType | Required | `Int` or `Float` |
| DefaultValue | double | Required | Default value used when not overridden |
| Min | double? | Optional | Minimum allowed value (inclusive) |
| Max | double? | Optional | Maximum allowed value (inclusive) |

### ScorerSelection

User's choice of a model + optional parameter overrides for a single run.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| ModelId | string | Required, must match a registered model | Which model to run |
| Parameters | IReadOnlyDictionary\<string, double\> | Required (may be empty) | Parameter overrides; keys must match model's parameter names |

### ModelDetectionResults

Wraps a single model's detection output within a run.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| ModelId | string | Required | Which model produced these results |
| Status | ModelScoringStatus | Required | `Success` or `Error` |
| ErrorMessage | string? | Required if Error | Human-readable error description |
| Results | IReadOnlyList\<DetectionResult\> | Required (empty if Error) | Per-record detection results (index-aligned with Run.Expenses) |
| BandCounts | BandCounts | Required | Aggregated band counts for this model's results |

### ScorerRegistry

Singleton providing the catalog of available models and their parameter definitions. Lives in Domain/Configuration.

| Field | Type | Description |
|-------|------|-------------|
| AvailableModels | IReadOnlyList\<ScorerModelDefinition\> | All registered scoring models |
| GetModel(modelId) | ScorerModelDefinition? | Lookup by ID |

## New Enums

### ModelScoringStatus

```
Success
Error
```

### ParameterType

```
Int
Float
```

## Modified Entities

### SimulationConfiguration

**Added field**: `Scorers: IReadOnlyList<ScorerSelection>` — the list of models to run. Defaults to a single-element list containing `"randomized-pca"` with no parameter overrides (backward-compatible).

**Validation**: At least one scorer must be selected. All scorer model IDs must exist in the registry. All parameter overrides must reference valid parameter names with values within declared ranges.

### Run

**Replaced field**: `DetectionResults: IReadOnlyList<DetectionResult>` → `ModelResults: IReadOnlyDictionary<string, ModelDetectionResults>`

**Backward compatibility**: JSON deserialization checks if `detectionResults` is an array (legacy) and wraps it in a dictionary with key `"randomized-pca"`.

**Validation change**: `detectionResults.Count == expenses.Count` invariant now applies per-model for successful models.

**WithInvestigations** helper: Updated signature to use `ModelResults`.

### BandCounts

**Unchanged** — but now exists per-model within `ModelDetectionResults` and the `Run` level `BandCounts` property represents the "primary" model (first in the scorers list).

## State Transitions

No new state machines. Model scoring is a single-pass operation per model during run generation.

## Relationships

- `SimulationConfiguration` 1 ──has── * `ScorerSelection`
- `Run` 1 ──has── * `ModelDetectionResults` (keyed by modelId)
- `ModelDetectionResults` 1 ──has── * `DetectionResult`
- `ScorerRegistry` 1 ──catalogs── * `ScorerModelDefinition`
- `ScorerModelDefinition` 1 ──has── * `ModelParameterDef`
- `ScorerSelection.ModelId` references `ScorerModelDefinition.ModelId`
