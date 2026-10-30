# Phase 9 Preflight & Task A Verification Report

**Date:** 2026-10-30  
**Phase:** 9 of 11 — Delay Patterns & Smart Insights  
**Status:** Completed  

---

## 1. True Worker RSS Measurement & Memory Headroom

### Measurement Methodology
In Phase 8.5, an RSS of 4.20 MB was recorded. Investigation revealed that the launcher process (`python -m waitress backend.wsgi:app`) was measured rather than the child worker process hosting the application code.

In Phase 9, memory was measured directly on the active Python process hosting the Flask application, Waitress WSGI server, loaded LightGBM models, SQLite database connections, and RapidFuzz train catalogs (`psutil.Process().memory_info().rss`):

| State | Process Role | Measured RSS (MB) | Headroom to 512 MB Render Limit |
|---|---|---|---|
| Pre-Initialization | Python Launcher | 16.63 MB | 495.37 MB (96.8%) |
| Idle (Post-Init) | Flask + Waitress Worker | 165.10 MB | 346.90 MB (67.8%) |
| Active Load (25 Predict + Patterns Calls) | Flask + Waitress Worker | 167.29 MB | 344.71 MB (67.3%) |
| Settled Post-Load | Flask + Waitress Worker | 167.29 MB | 344.71 MB (67.3%) |

**Conclusion:** Peak memory usage is **167.29 MB**, leaving **344.71 MB (67.3%) headroom** under Render's 512 MB free-tier limit. The deployment is completely safe from Out-Of-Memory (OOM) termination.

---

## 2. Train Explorer Timeout Re-Measurement

With TiDB permanently removed from the runtime path in Phase 8.5, all requests read from the local precomputed SQLite store (`backend/serving/serving.sqlite`, 40.89 MB) and in-memory catalogs (`backend/serving/trains_catalog.json`).

| Request Scenario | Re-measured Latency (ms) | Timeout Risk |
|---|---|---|
| `GET /api/trains?page=1&page_size=15` (Initial Catalog) | 0.72 – 6.38 ms | Zero (< 0.1% of 10s budget) |
| `GET /api/trains?q=12951` (Train Number Search) | 1.36 – 2.79 ms | Zero |
| `GET /api/trains?q=rajdhani` (Train Name Fuzzy Search) | 1.75 – 2.00 ms | Zero |
| `GET /api/trains?category=MEX` (Category Filter) | 0.33 – 0.39 ms | Zero |
| 5 Parallel Requests (Mixed Search / Pagination) | 0.45 – 4.61 ms | Zero |

**Conclusion:** Query times are consistently sub-10 milliseconds. The timeout bug is permanently resolved.

---

## 3. LightGBM Model Hyperparameters & Architecture

The deployed binary classification model (`backend/models/deployment_model.joblib`) was inspected directly via LightGBM `Booster` parameters:

| Hyperparameter / Attribute | Verified Value |
|---|---|
| Model Architecture | LightGBM Gradient Boosted Decision Trees + Isotonic Regression |
| Objective | `binary` (logloss) |
| Best Iteration (`num_iterations`) | 298 trees |
| Maximum Depth (`max_depth`) | 8 |
| Number of Leaves (`num_leaves`) | 63 |
| Learning Rate (`learning_rate`) | 0.08 |
| Features Count | 28 features (strictly pre-departure, schedule-time only) |
| Formulation | Pre-departure schedule-time forecasting (Formulation 1) |

---

## 4. Decision Threshold & Evaluation Metrics Reconciliation

### The Reconciliation Problem
Prior documentation contained conflicting test metrics recorded at two different thresholds:
- Historical training artifacts referenced threshold `0.418` (AP 0.8525, ROC-AUC 0.8602, F1 0.7798).
- The canonical binary decision threshold selected strictly on the **validation partition** to maximize F1-score on calibrated probabilities is **0.410** (Val F1: 0.7867).

### Reconciliation Results
In Phase 9 Task A, the canonical validation-selected threshold **0.410** was applied to generate the definitive, verified evaluation numbers on the untouched test partition (Oct 23–24, 193,965 stops):

| Metric | Validation Split (Tuned) | Test Split (Untouched Evaluation) | Lift vs Majority Baseline |
|---|---|---|---|
| **Average Precision (AP / PR-AUC)** | 0.8464 | **0.8482** | **+72.40%** |
| **ROC-AUC Score** | 0.8576 | **0.8592** | — |
| **F1-Score (Positive Class)** | 0.7867 | **0.7782** | — |
| **Precision** | 0.7495 | **0.7402** | — |
| **Recall** | 0.8276 | **0.8203** | — |
| **Brier Score (Calibrated)** | 0.1541 | **0.1536** | — |
| **Expected Calibration Error (ECE)** | 0.0220 | **0.0213** | — |
| **Decision Threshold** | **0.410** | **0.410** | — |
| **Recall >= 0.80 Threshold** | 0.455 | 0.455 | — |

### Confusion Matrix on Test Split (N = 193,965)
- **True Negatives (TN):** 71,067
- **False Positives (FP):** 27,470
- **False Negatives (FN):** 17,152
- **True Positives (TP):** 78,276

### Baseline Comparison (Test PR-AUC)
1. **Majority Baseline (Constant fleet delay rate 49.20%):** 0.4920 (+72.40% model lift)
2. **Category Prior Baseline:** 0.5972 (+42.03% model lift)
3. **Train Historical Prior Baseline:** 0.8082 (+4.95% model lift)
4. **LightGBM Calibrated Model:** **0.8482**

All precomputed artifacts (`backend/models/model_metadata.json`, `docs/experiments/final_test_results.json`, `backend/serving/model_lab.json`, and frontend test fixtures) have been completely synchronized to these verified values.
