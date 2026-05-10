# Research: ML Scoring Models & Data Visualization

**Feature**: 005-ml-scoring-data-viz | **Date**: 2026-05-09

## R1: ML.NET Trainers for Anomaly/Fraud Scoring

### Decision: Use Randomized PCA (existing), SDCA Logistic Regression, and FastForest Binary Classification

**Rationale**: All three are GA ML.NET built-in trainers in the `Microsoft.ML` NuGet package (already referenced). They require no additional dependencies and each produces fundamentally different model behavior for the same feature set, satisfying SC-006 (detectably different score distributions).

**Alternatives considered**:
- **Custom Isolation Forest**: Would produce ideal anomaly detection behavior but requires a full custom implementation — violates Constitution Principle XII (Library-First Algorithms).
- **Custom Local Outlier Factor (LOF)**: K-nearest-neighbor density estimation; ideal for local anomaly detection but also requires custom implementation. Same Principle XII concern.
- **ML.NET K-Means + distance scoring**: K-Means is available in ML.NET but is a clustering algorithm, not directly suitable for anomaly scoring without significant custom glue code. Rejected as less educational for the fraud demo.

### Model Details

#### 1. Randomized PCA (existing — `MlNetAnomalyScorer`)
- **Trainer**: `ml.AnomalyDetection.Trainers.RandomizedPca`
- **Approach**: Unsupervised — learns principal components of the "normal" data manifold; records that project poorly onto the learned subspace receive high anomaly scores.
- **Key parameters**: `rank` (number of principal components), `ensureZeroMean`, `seed`
- **Strengths**: No labels required; excellent for high-dimensional anomaly detection; fast training.
- **Weaknesses**: Assumes anomalies deviate from the principal subspace; sensitive to rank selection; linear model — cannot capture non-linear relationships.
- **Calibration**: Existing logistic squash function maps raw PCA reconstruction error to [0,1].

#### 2. SDCA Logistic Regression (new — `SdcaAnomalyScorer`)
- **Trainer**: `ml.BinaryClassification.Trainers.SdcaLogisticRegression`
- **Approach**: Supervised binary classifier — uses the `IsFraud` ground truth label from synthetic data to learn a decision boundary. Outputs calibrated probability via Platt scaling.
- **Key parameters**: `l1Regularization` (sparsity), `l2Regularization` (smoothness), `maximumNumberOfIterations`
- **Strengths**: Produces calibrated probabilities directly; handles sparse features well; fast convergence via SDCA optimization; interpretable linear weights.
- **Weaknesses**: Requires labeled data (available from synthetic generation); linear decision boundary; may overfit if fraud patterns are too simple.
- **Calibration**: Built-in Platt calibrator produces [0,1] probability. Use `Probability` output column directly.

#### 3. FastForest Binary Classification (new — `FastForestAnomalyScorer`)
- **Trainer**: `ml.BinaryClassification.Trainers.FastForest`
- **Approach**: Supervised ensemble — random forest of decision trees. Each tree votes; the fraction of trees predicting "fraud" becomes the confidence score.
- **Key parameters**: `numberOfTrees`, `numberOfLeaves`, `minimumExampleCountPerLeaf`, `featureFraction`
- **Strengths**: Non-linear decision boundaries; handles feature interactions naturally; robust to outliers and scale; no calibration needed (direct probability from tree votes).
- **Weaknesses**: Requires labeled data; less interpretable than linear models; slower training than SDCA for large datasets; can overfit with too many leaves.
- **Calibration**: FastForest outputs fraction of positive-voting trees as probability. Map directly to confidence.

### Approach for Supervised Models (SDCA, FastForest)

The synthetic data includes `IsFraud` ground truth on every `ExpenseRecord`. For supervised models:
1. Feature matrix is built identically to PCA (same `FraudFeatureBuilder`).
2. Label column is populated from `ExpenseRecord.IsFraud`.
3. Model is fit on the full dataset (no train/test split — this is a demo, not production ML).
4. Predicted probability is used as the confidence score.
5. Banding applies the same `BandThresholds` logic.

This approach is valid for the demo because we want to show how different model architectures score the same data differently, not build production-quality models.

## R2: Log-Normal Distribution for Realistic Expense Generation

### Decision: Use log-normal distribution centered on employee baseline

**Rationale**: Real-world expense data follows a right-skewed distribution — most expenses are modest, with a long tail of large legitimate expenses (conferences, equipment). Log-normal is the standard distribution for modeling financial amounts and is available via `Math.Exp(mean + stddev * Normal())` using C#'s `Random`.

**Implementation**:
```
// Box-Muller transform for normal distribution from uniform Random
double u1 = 1.0 - rng.NextDouble(); // avoid log(0)
double u2 = rng.NextDouble();
double normal = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
// Log-normal: shift and scale to center on employee baseline
double logMean = Math.Log((double)baseline) - 0.5 * sigma * sigma;
double amount = Math.Exp(logMean + sigma * normal);
```

**Alternatives considered**:
- **Truncated normal**: Simpler but doesn't model the right skew of real expense data. Rejected.
- **Gamma distribution**: Good fit for expense data but harder to parameterize from employee baselines. Rejected for simplicity.
- **Uniform with noise (current)**: Too flat — doesn't create realistic clustering. Being replaced.

**Outlier injection (2-5%)**: After generating the base amount, with 2-5% probability, multiply by a factor of 3-8x to simulate legitimate large expenses (conferences, emergency travel). These are NOT marked as fraud.

## R3: Subtler Fraud Signal Generation

### Decision: Widen fraud signal variance to overlap with legitimate distributions

**Changes to FraudInjector**:

1. **ThresholdGaming**: Current jitter is -1 to +11 around $999. Widen to -50 to +50 and add occasional amounts well below threshold ($800-$950) to create a broader cluster that's harder to distinguish from legitimate near-threshold expenses.

2. **UnusualFrequency**: Currently always forces weekends + late-night. Change to 70% weekend / 30% weekday with unusual hours, and occasionally use typical categories (20% chance) so not every frequency anomaly has a category deviation.

3. **VendorAnomaly**: Currently uses shell-company vendors with high amounts. Overlap amounts with legitimate range (some $200-$500 vendor anomalies alongside the high-amount ones) and mix in a few known vendors to reduce the vendor-rarity signal.

## R4: Chart Visualizations with Recharts

### Decision: Four chart types via tabbed navigation using existing Recharts library

**Chart Types**:

1. **Anomaly Scatter Plot** (existing): Amount vs. Confidence, colored by band. No changes needed beyond accepting model selector.

2. **Band Distribution Bar Chart** (existing): High/Medium/Low counts. Add model selector support.

3. **Amount Distribution Histogram** (new): 
   - X-axis: expense amount bins (e.g., $0-100, $100-200, ..., $5000+)
   - Y-axis: record count per bin
   - Overlay: separate series for flagged (High/Medium) vs. clean (Low) records
   - Recharts component: `BarChart` with stacked bars for flagged/clean
   - Purpose: Shows the distribution shape (bell curve for legitimate, outlier tails) and where fraud clusters

4. **Feature Contribution Heatmap** (new):
   - X-axis: feature names (amountZ, thresholdGap, frequencyZ, vendorRarity, categoryDeviation, weekendSubmission)
   - Y-axis: grouped by band (High/Medium/Low) — aggregated mean Z-score per feature per band
   - Cell color: Z-score magnitude (red = high positive, blue = high negative, white = neutral)
   - Recharts component: Custom grid of `Rectangle` elements or a matrix using `ScatterChart` with sized/colored dots
   - Purpose: Shows which features drive each band's scoring — helps investigators understand model behavior

**Alternatives considered**:
- **Category/vendor breakdown**: Useful but less directly connected to model behavior. Could be added later.
- **Submission timeline**: Time-series chart; useful for temporal patterns but the current feature set doesn't emphasize time strongly enough. Deferred.

### Tabbed Navigation

- `ChartTabBar` component with tab labels: "Scatter", "Distribution", "Histogram", "Heatmap"
- Active tab state managed locally in `RunSummaryStats` or lifted to `RunDetailRoute`
- When multi-model run: `ModelSelector` dropdown appears above the chart area, filtering/switching the active model's results

## R5: Multi-Model Run Blob Schema

### Decision: Dictionary-keyed detection results in existing run blob

**Current schema** (simplified):
```json
{
  "runId": "...",
  "detectionResults": [ { "recordId": "...", "confidence": 0.7, ... }, ... ]
}
```

**New schema**:
```json
{
  "runId": "...",
  "modelResults": {
    "randomized-pca": {
      "modelId": "randomized-pca",
      "status": "success",
      "results": [ { "recordId": "...", "confidence": 0.7, ... }, ... ],
      "bandCounts": { "high": 100, "medium": 200, "low": 4700 }
    },
    "sdca-logistic": {
      "modelId": "sdca-logistic",
      "status": "success",
      "results": [ ... ],
      "bandCounts": { ... }
    }
  }
}
```

**Backward compatibility**: When deserializing, if `modelResults` is absent but `detectionResults` is an array (legacy), wrap it in a dictionary with key `"randomized-pca"` and status `"success"`. This allows old runs to be loaded without migration.

**Error case**: If a model fails, its entry has `status: "error"`, `errorMessage: "..."`, and `results: []`.
