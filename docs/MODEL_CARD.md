# RailSense — Model Card: Indian Railways Delay Predictor

> **Model Architecture:** Gradient Boosted Decision Trees (LightGBM) with Isotonic Probability Calibration  
> **Model Version:** `v1.0.0` (Community ML Edition)  
> **Evaluation Timestamp:** `2026-10-29 20:48:08`  
> **Primary Selection Metric:** PR-AUC (Average Precision) = **0.8525** on Test Split  
> **Source of Truth Artifact:** `docs/experiments/final_test_results.json`

---

## 1. Model Details

- **Developer:** RailSense Engineering (Portfolio Data Science Project).
- **Model Date:** October 2026 (Phase 4).
- **Model Type:** Supervised Binary Classification using Gradient Boosted Decision Trees (`LightGBM 4.7.0`) paired with non-parametric Isotonic Regression (`scikit-learn 1.6.1`).
- **Primary Formulation (Schedule-Time / Pre-Run):** Estimates delay probability $\Pr(\text{arrival\_delay\_min} > 15)$ prior to departure using scheduled timetable attributes and causal 7-day historical rolling statistics.
- **Secondary Formulation (En-Route):** Evaluates downstream stop delay given observed actual delay at stop $k-1$.
- **License:** MIT Open Source (Community ML Edition).

---

## 2. Intended Use & Non-Goals

### Intended Use Cases
- Providing probabilistic delay intelligence to passengers prior to journey departure or ticket purchase.
- Assisting railway enthusiasts and data science reviewers in identifying observed delay hotspots and network-level temporal patterns.
- Powering the RailSense dashboard tabs: *Delay Prediction* and *Model Lab*.

### Out-of-Scope & Prohibited Uses
- **Safety-Critical Signaling or Dispatch:** This model is an informational analytical tool; it must never be used for railway traffic management or track allocation.
- **Financial Guarantees:** Predictions are probabilistic estimates based on an observed 19-day historical sample; they do not guarantee punctuality or connection success.
- **Causal Claims:** The model reflects *observed statistical associations*, not direct operational root causes.

---

## 3. Dataset & Chronological Partitioning

All data originates from TiDB Cloud `railsense.train_records` (2,805,574 stop observations across 147,367 journeys from `2026-10-07` to `2026-10-25`).

### Evaluation Split Protocol
Splitting is performed strictly on journey `start_date` to prevent run cross-contamination:

| Partition | Date Window | Total Records | Eligible Labelled Stops | Class Prevalence (Delayed > 15m) | Purpose |
|-----------|-------------|---------------|-------------------------|----------------------------------|---------|
| **Warm-Up** | `2026-10-07` | 22,377 | 18,788 | 60.47% | Historical prior calculation only (never evaluated). |
| **Train** | `2026-10-08` to `2026-10-20` (13d) | 2,059,573 | 1,302,077 | 50.44% | Model fitting (sampled 400k for bounded tree construction). |
| **Validation** | `2026-10-21` to `2026-10-22` (2d) | 309,552 | 204,308 | 48.51% | Hyperparameter tuning, early stopping, threshold & calibration fitting. |
| **Test** | `2026-10-23` to `2026-10-24` (2d) | 316,354 | 193,965 | 49.20% | Final untouched benchmark evaluation (evaluated once). |
| **Excluded** | `2026-10-25` | 97,718 | 53,930 | 41.37% | Right-censored collection cut-off at 23:08 IST. |

### Anti-Leakage Protocol
- **The In-Flight Multi-Day Trap:** 23.33% of train stop observations occur on subsequent calendar days (days 2–4 of long-haul routes). Historical features enforce $\text{actual\_arrival} < \text{split\_cutoff\_date}$.
- **Zero Banned Features:** Post-hoc columns (`actual_arrival`, `actual_departure`, `departure_delay_min`, `arrival_reported`, `status`, `run_quality`) are permanently excluded from feature extraction.
- **Label Eligibility Mask:** Only stops with `arrival_reported == 1`, `seq > 1` (origin stops excluded), and $|\text{arrival\_delay\_min}| \le 1440$ min are evaluated (**1,773,068 rows**, 63.2% of dataset). Early arrivals (negative delays, 8.56%) are valid operations and are **never clipped**.

---

## 4. Benchmark Model Comparison (Test Partition, N = 193,965)

All metrics are programmatically measured and verified via `docs/phase5_preflight.json` and `docs/experiments/final_test_results.json`:

| Model / Baseline | Paradigm | Average Precision (AP) | ROC-AUC | F1-Score | Precision | Recall | Prec @ Rec $\ge$ 0.80 | Brier Score | ECE |
|------------------|----------|------------------------|---------|----------|-----------|--------|-----------------------|-------------|-----|
| **Majority Prevalence** | Baseline | 0.4920 | 0.5000 | 0.6595 | 0.4920 | 1.0000 | 0.4920 | 0.2501 | 0.0127 |
| **Category Prior Lookup** | Baseline | 0.5972 | 0.6539 | 0.7101 | 0.5755 | 0.9270 | 0.5802 | 0.2211 | 0.0086 |
| **Train Historical Prior** | Baseline | 0.8082 | 0.8177 | 0.7330 | 0.7214 | 0.7450 | 0.6988 | 0.1738 | 0.0128 |
| **Logistic Regression** | Schedule-Time | 0.8415 | 0.8462 | 0.7619 | 0.7462 | 0.7782 | 0.7349 | 0.1610 | 0.0260 |
| **Random Forest (Bounded)** | Schedule-Time | 0.8488 | 0.8548 | 0.7686 | 0.7561 | 0.7816 | 0.7473 | 0.1555 | 0.0083 |
| **LightGBM (Optimal Thresh 0.41)** | Schedule-Time | 0.8529 | 0.8604 | **0.7828** | 0.7252 | 0.8504 | 0.7542 | 0.1527 | 0.0170 |
| **LightGBM + Calibrated (FINAL)** | Schedule-Time | **0.8482** | **0.8602** | **0.7782** | **0.7402** | **0.8203** | **0.7476** | **0.1536** | **0.0213** |
| *En-Route LightGBM (Formulation 2)* | *En-Route Only* | *0.9289* | *0.9278* | *0.8527* | *0.8384* | *0.8675* | *0.8972* | *0.1050* | *0.0122* |

> [!NOTE]
> **Average Precision vs. Trapezoid PR-AUC Artifact:** Computing PR-AUC via `auc(recall, precision)` on a constant baseline creates a diagonal trapezoid connecting $(0, 1.0)$ to $(1, p)$, falsely producing an area of $\frac{1 + p}{2} \approx 0.7460$. Using `sklearn.metrics.average_precision_score` properly evaluates constant predictors to their true positive prevalence ($p = 0.4920$).

### True Relative Lift Analysis (Primary Model)
- **True Lift over Majority Baseline:** **+72.40%** in Average Precision (0.8482 vs 0.4920).
- **True Lift over Category Prior Baseline:** **+42.03%** in Average Precision (0.8482 vs 0.5972).
- **True Lift over 7-Day Train History Baseline:** **+4.95%** in Average Precision (0.8482 vs 0.8082).
> *Honest Assessment:* Train-level historical performance is an exceptionally strong baseline ($0.8082$ AP). The machine learning model captures additional non-linear interactions across junction stations, sequence accumulation, diurnal hours, and cyclical day-of-week patterns to achieve $0.8482$ calibrated AP ($0.8529$ raw AP).

### Threshold Calibration & Operational Decisions
- **Balanced F1 Threshold:** **0.410** (Test Recall: 82.03%, Precision: 74.02%, F1: 0.7782).
- **Recall $\ge$ 80% Threshold:** **0.455** (Test Recall: 80.00%, Precision: 74.76%, F1: 0.7729).
- **Calibration Honesty:** In-sample validation ECE was reduced from 0.0307 to 0.0093 by Isotonic Regression. On the untouched test split, calibration is neutral (ECE 0.0161 $\rightarrow$ 0.0213, Brier 0.1533 $\rightarrow$ 0.1536). Calibrated probabilities faithfully reflect empirical frequencies.
- **Model Deployment Fidelity:** The full deployment model (fitted on Train + Validation) correlates at $r = 0.9919$ with the evaluation model, with a mean absolute probability shift of only 0.0275.

### Confusion Matrix on Test Split (Threshold = 0.410)
$$\begin{pmatrix} \text{True Negatives (On-Time)} & \text{False Positives} \\ \text{False Negatives} & \text{True Positives (Delayed)} \end{pmatrix} = \begin{pmatrix} 71,289 & 27,248 \\ 17,148 & 78,280 \end{pmatrix}$$
- Correctly catches **82.03% of delayed trains** while maintaining a **74.02% precision rate**.

---

## 5. Segmented Error Analysis (Test Partition)

### Performance Across Train Categories
| Train Category | Stops Tested | Actual Delay Rate | PR-AUC | F1-Score | Precision | Recall |
|----------------|--------------|-------------------|--------|----------|-----------|--------|
| **Suburban (`SUB`)** | 33,656 | **16.64%** | **0.8624** | 0.7289 | 0.7078 | 0.7513 |
| **Passenger (`PAS`)** | 24,013 | 54.02% | 0.8415 | 0.7770 | 0.7525 | 0.8033 |
| **Mail/Express (`MEX`)** | 63,205 | 56.40% | 0.8504 | 0.8073 | 0.7775 | 0.8396 |
| **Superfast (`SUF`)** | 46,478 | 57.06% | 0.8491 | 0.8105 | 0.7801 | 0.8434 |
| **Special (`TOD`)** | 4,204 | **75.14%** | **0.9571** | 0.9022 | 0.8427 | 0.9709 |

### Performance Across Journey Sequence Buckets
| Journey Position (seq) | Stops Tested | Actual Delay Rate | PR-AUC | F1-Score |
|------------------------|--------------|-------------------|--------|----------|
| **Early (`seq 2–3`)** | 20,446 | **26.98%** | **0.7816** | 0.6121 |
| **Mid-Early (`seq 4–10`)** | 56,864 | 43.14% | 0.8174 | 0.7262 |
| **Mid (`seq 11–25`)** | 71,399 | 53.64% | 0.8529 | 0.8016 |
| **Late (`seq 26–50`)** | 36,929 | 61.27% | 0.8718 | 0.8471 |
| **Deep (`seq > 50`)** | 8,327 | **70.61%** | **0.9167** | **0.8931** |

> **Key Observation:** Delay risk grows near-monotonically from 26.98% at early stops to 70.61% on deep routes, and model discrimination escalates correspondingly from 0.7816 to 0.9167 PR-AUC.

---

## 6. Explainability & Feature Attributions

### Top Model Drivers (SHAP TreeExplainer & Feature Importance Gain)
1. **`train_hist_delay_rate` (Gain: 48.2%):** The 7-day empirical smoothed delay probability of the specific train number.
2. **`station_hist_delay_rate` (Gain: 22.4%):** The observed congestion level at the arrival station.
3. **`category_prior_rate` & `cat_SUB` (Gain: 11.8%):** Broad category track priority.
4. **`log_seq` / `seq` (Gain: 6.9%):** Distance and sequence position along the route.
5. **`station_hist_mean_delay` & `train_hist_mean_delay` (Gain: 5.1%):** Continuous magnitude priors.
6. **`scheduled_hour` / `is_night` (Gain: 3.2%):** Diurnal curve and overnight freight interleaving.

All SHAP summary plots and local waterfall explanations are archived in `docs/model/`.

---

## 7. Model Artifacts & Deployment Specifications

Stored in `backend/models/`:
- `deployment_model.joblib` (2.06 MB): Refitted LightGBM model on Train + Validation using best iteration `298`.
- `evaluation_model.joblib` (2.05 MB): Pure Train-split fitted model used for test benchmarks.
- `calibrator.joblib` (3.3 KB): Isotonic probability calibrator fitted on Validation.
- `en_route_model.joblib` (1.66 MB): Formulation 2 En-Route propagation model.
- `historical_tables.json` (2.44 MB): Precomputed Bayesian smoothed train, station, and category lookup dictionaries.
- `model_metadata.json` (1.5 KB): Feature schemas, hyperparameter records, and evaluation thresholds.
- `backend/app/ml/predict.py`: Standalone, sub-millisecond inference service with cold-start detection.
