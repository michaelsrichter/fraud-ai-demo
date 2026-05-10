# API Contracts: ML Scoring Models & Data Visualization

**Feature**: 005-ml-scoring-data-viz | **Date**: 2026-05-09

## New Endpoints

### GET /api/scorers

Returns the catalog of available scoring models and their parameter definitions.

**Response** `200 OK`:
```json
{
  "models": [
    {
      "modelId": "randomized-pca",
      "displayName": "Randomized PCA",
      "description": "Unsupervised anomaly detection using principal component analysis. Records that reconstruct poorly receive high anomaly scores.",
      "parameters": [
        {
          "name": "rank",
          "displayName": "PCA Rank",
          "description": "Number of principal components to retain. Lower values detect more anomalies.",
          "dataType": "Int",
          "defaultValue": 4,
          "min": 1,
          "max": 6
        }
      ]
    },
    {
      "modelId": "sdca-logistic",
      "displayName": "SDCA Logistic Regression",
      "description": "Supervised binary classifier using stochastic dual coordinate ascent. Uses ground-truth fraud labels to learn a linear decision boundary.",
      "parameters": [
        {
          "name": "l1Regularization",
          "displayName": "L1 Regularization",
          "description": "Controls sparsity of model weights. Higher values produce simpler models.",
          "dataType": "Float",
          "defaultValue": 0.1,
          "min": 0.0,
          "max": 10.0
        },
        {
          "name": "l2Regularization",
          "displayName": "L2 Regularization",
          "description": "Controls smoothness of model weights. Higher values reduce overfitting.",
          "dataType": "Float",
          "defaultValue": 0.1,
          "min": 0.0,
          "max": 10.0
        },
        {
          "name": "maximumNumberOfIterations",
          "displayName": "Max Iterations",
          "description": "Maximum training iterations. More iterations may improve accuracy.",
          "dataType": "Int",
          "defaultValue": 100,
          "min": 10,
          "max": 1000
        }
      ]
    },
    {
      "modelId": "fast-forest",
      "displayName": "Fast Forest",
      "description": "Supervised ensemble of random decision trees. Fraction of trees voting 'fraud' becomes the confidence score.",
      "parameters": [
        {
          "name": "numberOfTrees",
          "displayName": "Number of Trees",
          "description": "Trees in the forest. More trees improve accuracy but increase scoring time.",
          "dataType": "Int",
          "defaultValue": 50,
          "min": 10,
          "max": 500
        },
        {
          "name": "numberOfLeaves",
          "displayName": "Max Leaves per Tree",
          "description": "Maximum leaf nodes per tree. More leaves capture complex patterns but risk overfitting.",
          "dataType": "Int",
          "defaultValue": 20,
          "min": 2,
          "max": 128
        },
        {
          "name": "minimumExampleCountPerLeaf",
          "displayName": "Min Examples per Leaf",
          "description": "Minimum records per leaf node. Higher values produce more conservative trees.",
          "dataType": "Int",
          "defaultValue": 10,
          "min": 1,
          "max": 100
        }
      ]
    }
  ]
}
```

## Modified Endpoints

### POST /api/runs

**Request body** (extended — new fields are optional for backward compatibility):
```json
{
  "recordCount": 5000,
  "employeeCount": 100,
  "intensity": 0.1,
  "patternWeights": {
    "thresholdGaming": 0.34,
    "unusualFrequency": 0.33,
    "vendorAnomaly": 0.33
  },
  "thresholds": { "low": 0.55, "high": 0.85 },
  "seed": null,
  "scorers": [
    {
      "modelId": "randomized-pca",
      "parameters": {}
    },
    {
      "modelId": "sdca-logistic",
      "parameters": {
        "l1Regularization": 0.2
      }
    }
  ]
}
```

**New fields**:
- `scorers`: Array of `{ modelId: string, parameters: Record<string, number> }`. Optional — defaults to `[{ modelId: "randomized-pca", parameters: {} }]` if omitted.

**Validation**:
- Each `modelId` must exist in the scorer registry
- Each parameter key must be a valid parameter name for the specified model
- Each parameter value must be within the declared min/max range
- At least one scorer must be present (when field is provided)
- 400 Bad Request with problem details on validation failure

**Response** `201 Created` (extended):
```json
{
  "runId": "abc12345-...",
  "ownerId": "anonymous",
  "createdUtc": "2026-05-09T10:00:00Z",
  "configuration": { "..." },
  "employees": ["..."],
  "expenses": ["..."],
  "modelResults": {
    "randomized-pca": {
      "modelId": "randomized-pca",
      "status": "Success",
      "errorMessage": null,
      "results": [
        {
          "recordId": "...",
          "confidence": 0.72,
          "band": "Medium",
          "contributingFeatures": [
            { "name": "amountZ", "value": 1.23, "zScore": 2.1 }
          ]
        }
      ],
      "bandCounts": { "high": 50, "medium": 200, "low": 4750 }
    },
    "sdca-logistic": {
      "modelId": "sdca-logistic",
      "status": "Success",
      "errorMessage": null,
      "results": ["..."],
      "bandCounts": { "high": 80, "medium": 150, "low": 4770 }
    }
  },
  "investigations": {},
  "bandCounts": { "high": 50, "medium": 200, "low": 4750 }
}
```

**Key changes**:
- `detectionResults` (flat array) → `modelResults` (dictionary keyed by modelId)
- Top-level `bandCounts` uses the first (primary) model's counts
- Each model entry includes its own `bandCounts`
- Failed models have `status: "Error"`, `errorMessage`, and empty `results`

### GET /api/runs/{runId}

Response shape matches the `POST /api/runs` response above. Legacy runs with flat `detectionResults` are auto-migrated to the dictionary format on read.

### GET /api/runs

List response `items[].bandCounts` uses the primary model's counts (same as before — no schema change for list items).
