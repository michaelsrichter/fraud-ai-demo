# Quickstart: ML Scoring Models & Data Visualization

**Feature**: 005-ml-scoring-data-viz | **Date**: 2026-05-09

## Prerequisites

- .NET 10 SDK
- Node.js 20+
- Azure Functions Core Tools v4
- Running Azurite (local storage emulator)

## Local Development

```bash
# Start all services (Azurite + Functions + Vite)
# Use the VS Code task "🚀 Dev: All" or manually:

# Terminal 1: Azurite
npx -y azurite --silent --location .azurite --debug .azurite/debug.log

# Terminal 2: Backend
cd backend/src/Functions && func start

# Terminal 3: Frontend
cd frontend && npm run dev
```

## Try It

### 1. Multi-Model Run

Open the frontend at `http://localhost:5173/labs/expenses`.

In the sidebar configuration panel, select two or more scoring models (checkboxes). Adjust parameters if desired. Click **⚡ Generate New Run**.

### 2. Compare Model Results

After the run completes, the run detail screen shows the chart area. Use the **model selector** dropdown above the charts to switch between models. Notice how different models assign different confidence scores to the same records.

### 3. Explore Chart Tabs

Switch between the four chart tabs:
- **Scatter** — Amount vs. confidence, colored by band
- **Distribution** — High/Medium/Low band counts per model
- **Histogram** — Amount distribution showing the bell-curve shape of legitimate expenses vs. fraud outliers
- **Heatmap** — Feature contribution heatmap showing which features drive anomaly scores per band

### 4. View Model Documentation

Read `docs/ml-models.md` for detailed explanations of each scoring model, including methodology, parameters, strengths, and weaknesses.

## API Quick Reference

```bash
# List available scoring models
curl http://localhost:7071/api/scorers | jq

# Create a multi-model run
curl -X POST http://localhost:7071/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "recordCount": 5000,
    "intensity": 0.1,
    "patternWeights": { "thresholdGaming": 0.34, "unusualFrequency": 0.33, "vendorAnomaly": 0.33 },
    "scorers": [
      { "modelId": "randomized-pca", "parameters": {} },
      { "modelId": "sdca-logistic", "parameters": { "l1Regularization": 0.2 } },
      { "modelId": "fast-forest", "parameters": { "numberOfTrees": 100 } }
    ]
  }' | jq '.modelResults | keys'

# Get a run with multi-model results
curl http://localhost:7071/api/runs/{runId} | jq '.modelResults | to_entries[] | { model: .key, status: .value.status, high: .value.bandCounts.high }'
```

## Running Tests

```bash
# Backend unit tests
cd backend && dotnet test

# Frontend tests
cd frontend && npm test
```
