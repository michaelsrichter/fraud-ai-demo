# ML Scoring Models

This document describes the three ML scoring models available in the fraud detection demo. Each model implements the same `IAnomalyScorer` interface and produces confidence scores in the [0, 1] range, but they use fundamentally different approaches to identifying anomalous expense records.

## Randomized PCA

**Type**: Unsupervised anomaly detection
**ML.NET Trainer**: `AnomalyDetection.Trainers.RandomizedPca`

### How It Works

Randomized PCA (Principal Component Analysis) learns a low-dimensional representation of the "normal" data manifold by identifying the principal components — the directions of maximum variance in the feature space. Records that don't project well onto this learned subspace (i.e., have high reconstruction error) receive high anomaly scores.

The model does **not** use fraud labels during training. It treats all data as potentially normal and identifies records that deviate from the majority pattern.

### Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `rank` | 4 | 1–6 | Number of principal components to retain. Lower values create a tighter "normal" subspace, flagging more records as anomalous. Higher values capture more variance, producing fewer anomalies. |

### Calibration

Raw PCA reconstruction error is min-max normalized across the run, then passed through a logistic squash function: `1 / (1 + exp(-6 * (normalized - 0.5)))` to produce a confidence score in [0, 1].

### Strengths

- **No labels required** — works on any dataset without ground truth
- **Fast training** — linear algebra operations scale well
- **Interpretable** — anomalies are records that don't fit the normal pattern
- **Robust to label noise** — doesn't overfit to labeling errors

### Weaknesses

- **Linear model** — cannot capture non-linear relationships between features
- **Sensitive to rank** — choosing too few components flags too many records; too many misses subtle anomalies
- **Assumes Gaussian-like distribution** — may underperform on highly skewed feature distributions

### When to Use

Best as a **baseline detector** when you don't have reliable fraud labels, or when you want to identify records that are statistically unusual regardless of fraud patterns. Good for initial exploration of a new dataset.

---

## SDCA Logistic Regression

**Type**: Supervised binary classification
**ML.NET Trainer**: `BinaryClassification.Trainers.SdcaLogisticRegression`

### How It Works

Stochastic Dual Coordinate Ascent (SDCA) is an optimization algorithm that trains a logistic regression model — a linear classifier that learns a decision boundary between fraud and non-fraud records. It uses the `IsInjectedFraud` ground truth labels from the synthetic data to learn which feature combinations predict fraud.

The output is a Platt-calibrated probability representing the model's confidence that a record is fraudulent.

### Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `l1Regularization` | 0.1 | 0.0–10.0 | Controls sparsity of model weights. Higher values force the model to use fewer features, producing simpler (but potentially less accurate) models. At very high values, most feature weights become zero. |
| `l2Regularization` | 0.1 | 0.0–10.0 | Controls smoothness of model weights. Higher values prevent any single feature from dominating the prediction, reducing overfitting. |
| `maximumNumberOfIterations` | 100 | 10–1000 | Maximum training iterations. More iterations allow the model to converge more precisely, but with diminishing returns. |

### Calibration

Built-in Platt calibration produces probabilities directly in [0, 1]. No additional calibration is needed.

### Strengths

- **Calibrated probabilities** — output is a well-calibrated probability, not just a score
- **Fast convergence** — SDCA optimization is efficient even on larger datasets
- **Interpretable** — linear weights show which features matter most
- **Handles sparse features** — L1 regularization naturally performs feature selection

### Weaknesses

- **Requires labeled data** — needs ground truth fraud labels (available in synthetic data)
- **Linear decision boundary** — cannot model complex feature interactions
- **Risk of overfitting** — may memorize simple synthetic patterns; regularization helps
- **Sensitive to class imbalance** — with low fraud rates, may under-predict fraud

### When to Use

Best when you have **labeled data and want interpretable results**. The linear model makes it easy to understand which features drive predictions. Good for establishing a supervised baseline before trying more complex models.

---

## Fast Forest

**Type**: Supervised ensemble (random forest)
**ML.NET Trainer**: `BinaryClassification.Trainers.FastForest`

### How It Works

Fast Forest trains an ensemble of random decision trees. Each tree is built on a random subset of features and learns a series of if-then splits to separate fraud from non-fraud records. At prediction time, each tree votes on whether a record is fraud; the fraction of trees voting "fraud" becomes the confidence score.

This is a non-linear model that can capture complex feature interactions (e.g., "high amount AND weekend submission AND unknown vendor" together signal fraud more strongly than any individual feature).

### Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `numberOfTrees` | 50 | 10–500 | Number of trees in the forest. More trees generally improve accuracy and reduce variance, but increase training and scoring time. |
| `numberOfLeaves` | 20 | 2–128 | Maximum leaf nodes per tree. More leaves allow trees to capture finer-grained patterns but risk overfitting to noise. |
| `minimumExampleCountPerLeaf` | 10 | 1–100 | Minimum records in each leaf node. Higher values produce more conservative trees that generalize better. |

### Calibration

Fast Forest naturally outputs the fraction of trees predicting "fraud" as a probability in [0, 1]. No additional calibration is needed.

### Strengths

- **Non-linear decision boundaries** — captures feature interactions that linear models miss
- **Robust to outliers** — tree-based methods are naturally resistant to extreme values
- **No feature scaling required** — trees work on raw feature values
- **Feature importance** — can identify which features are most informative across the forest

### Weaknesses

- **Requires labeled data** — needs ground truth fraud labels
- **Less interpretable** — individual tree decisions are simple, but the ensemble as a whole is a black box
- **Slower training** — more computationally expensive than linear models, especially with many trees
- **Risk of overfitting** — with too many leaves and too few examples per leaf, trees memorize training data

### When to Use

Best when you suspect **non-linear fraud patterns** that a linear model would miss — for example, when fraud involves specific combinations of features rather than extreme values of individual features. The go-to choice for maximizing detection accuracy when you have labeled data.

---

## Comparing Models

| Aspect | Randomized PCA | SDCA Logistic | Fast Forest |
|--------|---------------|---------------|-------------|
| Supervision | Unsupervised | Supervised | Supervised |
| Decision boundary | Linear (subspace) | Linear (hyperplane) | Non-linear (tree ensemble) |
| Labels required? | No | Yes | Yes |
| Interpretability | Medium | High | Low |
| Training speed | Fast | Fast | Medium |
| Feature interactions | No | No | Yes |
| Best for | Baseline exploration | Interpretable classification | Maximum accuracy |

### Multi-Model Comparison

Running all three models on the same dataset reveals where they agree and disagree:

- **All three agree** → High confidence in the prediction (fraud or legitimate)
- **Supervised models agree, PCA disagrees** → The pattern may be fraud but doesn't look statistically unusual (e.g., fraud at normal amounts)
- **PCA flags it, supervised models don't** → The record is statistically unusual but matches legitimate patterns in the training data
- **Models disagree** → The record is ambiguous and a good candidate for AI agent investigation
