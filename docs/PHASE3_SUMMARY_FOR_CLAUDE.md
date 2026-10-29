# RailSense — Phase 3 Executive Summary for Claude

> **Generated:** Phase 3 Completion (2026-10-29)  
> **Status:** Phase 3 Complete & Fully Verified (60 pytest passed, 4 live integration skipped/passed).  
> **Hard Guardrails:** Do NOT start Phase 4 until prompted. Phase 4 will handle modeling. Zero secrets in repo.

---

## 1. Local Extraction & Caching
- **Source:** TiDB Cloud `railsense.train_records` (read-only, single source of truth).
- **Parquet Cache:** `backend/data_cache/train_records_{date}.parquet` (19 files, 2026-10-07 to 2026-10-25).
- **Total Cached Rows:** Exactly `2,805,574` rows across `147,367` train runs.
- **Cache Size on Disk:** `44.59 MB` (Snappy compressed, downcasted memory-efficient dtypes).
- **Git Status:** `backend/data_cache/` is strictly git-ignored and untracked.

---

## 2. Validation Findings & Resolved VERIFY Items

| Item | Prior Question / Hypothesis | Measured Ground Truth | Action Taken |
|------|-----------------------------|-----------------------|--------------|
| **Origin Discrepancy** | 148,376 NULL scheduled arrival vs 147,367 runs | Exactly 147,367 match `seq=1` (1-to-1 exact match with runs). Remaining 1,009 are timetable gaps at intermediate stops across 864 runs. | Identified and documented. |
| **`seq = 1071` Anomaly** | Is seq max 1071 plausible? | Train 13152 has 87 stops ending at KOAA, but has an anomalous duplicate/terminal row at station CBH with `seq=1071` and NaT timestamps. 348 rows have `seq > 200`. | Flagged by `flag_sequence_anomalies`. |
| **Owner UI Claims** | 41.8% delayed > 15m, 26.4m avg delay | **NOT REPRODUCED** on full dataset. Real overall: **49.92%** delayed > 15m, mean arrival delay **38.22m** (median **17.0m**). Non-suburban rate is **42.03%**. | Real measured stats must be used everywhere. No hardcoded claims. |
| **Delay Consistency** | Stored vs recomputed timestamp difference | Tested all 1,773,607 arrival rows across full 2.8M cache: **100.000% exact match** (`diff < 0.001 min`). Max difference: 0.000 min. Midnight rollover errors: 0. | Verified 100% reliable across entire dataset. |
| **In-Flight Journey Leakage Trap** | Multi-day runs spanning across midnight | **413,907 stops (23.33% of all arrivals)** occur on calendar days *after* `start_date` (up to day 4). | Historical aggregates must strictly enforce `actual_arrival < cutoff_date` to prevent future leakage. |
| **Edge-Day Censoring** | Truncation on edge days | `2026-10-07`: Left-truncated (1,034 runs started vs ~8,300 normal). `2026-10-25`: Right-censored (5,712 runs started; cut off at 23:08 IST). | Oct 07 used for historical warm-up only. Oct 25 excluded from test evaluations. |
| **Extreme Outliers** | Delay < -1440m or > +1440m | 61 rows < -1440m (date-wrap artifact off by 24h); 150 rows > 1440m (extreme delay > 24h). Total: 211 rows (0.012%). | Masked out of training/evaluation labels. Valid negative delays are preserved. |

---

## 3. Formal Prediction Task & Metrics (Locked for Phase 4)

- **Primary Task:** Schedule-Time (Pre-Run) Binary Delay Prediction:
  $$\text{is\_delayed} = \mathbb{I}(\text{arrival\_delay\_min} > 15)$$
- **Target Applicability:** Evaluated on eligible stops (`arrival_delay_min IS NOT NULL`, `arrival_reported == 1`, `seq > 1`, `|delay| <= 1440`). Eligible rows: **1,773,068 (63.2%)**.
- **Secondary Task:** En-Route Delay Propagation (using observed delay at stop $k$ to predict stop $k+1$).
- **Fixed Metrics for Phase 4:**
  - Area Under Precision-Recall Curve (**PR-AUC**) [Primary selection metric].
  - **ROC-AUC**, **F1-Score (Macro & Positive)**, **Precision @ Recall $\ge$ 0.80**.
  - **Brier Score** and **Calibration Error (ECE)** for probability calibration.
- **Hierarchical Baselines:** Global Majority (49.9%), Category-Prior Lookup, Train Historical Rolling Prior, Logistic Regression.

---

## 4. Chronological Split Boundaries

| Split | Date Range (start_date) | Run Count | Labelled Stops | Purpose |
|-------|--------------------------|-----------|----------------|---------|
| **Warm-Up** | `2026-10-07` | 1,034 | 18,792 | Historical prior warmup only (never evaluated). |
| **Train** | `2026-10-08` to `2026-10-20` | ~108,000 | ~1,300,000 | Model training & calibration. |
| **Val** | `2026-10-21` to `2026-10-22` | ~16,500 | 204,308 | Hyperparameter tuning & threshold selection. |
| **Test** | `2026-10-23` to `2026-10-24` | ~16,000 | 193,965 | Untouched benchmark evaluation. |
| **Excluded** | `2026-10-25` | 5,712 | 53,957 | Right-censored; excluded. |

---

## 5. Feature Engineering & Key Empirical Correlations

Constructed scikit-learn transformers in `backend/app/ml/features.py`:
- `ScheduleTimeFeatureExtractor`: Hour, DOW, cyclical $\sin/\cos$, `is_weekend`, `is_night`, `seq`, `log_seq`, `is_origin_adjacent`, `is_deep_journey`, category one-hot.
- `HistoricalPriorTransformer`: Bayesian smoothed train delay rate ($m=10$), station delay rate ($m=20$), category prior rate, and mean delays.

### Top Feature Correlations with `is_delayed` (on Train):
1. `train_hist_delay_rate`: **+0.5831**
2. `station_hist_delay_rate`: **+0.4973**
3. `station_hist_mean_delay`: **+0.3838**
4. `train_hist_mean_delay`: **+0.3574**
5. `category_prior_rate`: **+0.3148**
6. `cat_SUB` (Suburban): **-0.2997**
7. `log_seq`: **+0.2291**
8. `seq`: **+0.2051**
9. `is_origin_adjacent`: **-0.1623**

---

## 6. Generated EDA Artifacts & Verification

All 8 figures generated in `docs/eda/` at 300 DPI:
- `01_delay_distribution.png`: Bimodal early/on-time vs heavy positive tail (p90=96m, p99=372m).
- `02_delay_by_hour_and_dow.png`: Peak delay at 02:00 IST (62.2%), lowest at 05:00 IST (41.8%).
- `03_delay_by_category.png`: SUB 17.1% vs MEX 57.0%, TOD 76.1%.
- `04_delay_by_sequence_position.png`: Seq 2 = 24.3%, Seq 20 = 55.0%, Seq 50 = 70.8%.
- `05_station_delay_hotspots.png`: Top hotspot `RJN` (96.9%), top punctual `STMM` (0.0%).
- `06_train_persistence.png`: Day-to-day train delay correlation $r = 0.626$.
- `07_within_run_propagation.png`: Adjacent stop delay correlation $r = 0.895$ (5.78x lift).
- `08_label_missingness.png`: Reporting missingness by category and sequence.

---

## 7. Verification Status
- **Pytest:** 60 unit tests passed (100%), 4 live integration tests passed/skipped cleanly.
- **Null Check:** 0 null values in `X_train`, `X_val`, `X_test`.
- **Frontend Note:** Plain JavaScript (JSX) will be used in Phase 6. TypeScript is NOT used.
