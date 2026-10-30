# RailSense — Task Master Document
**Single source of truth for all phases. A fresh AI session must be able to continue the project from this file alone.**

---

## 1. Project Objective & Architecture

### Objective
RailSense is an Indian Railways Delay Intelligence & Prediction Platform built as a portfolio project targeting fresher Data Science / ML roles. The core value is **genuine data work**: real data processing, thorough EDA, leakage-safe ML, explainability, and local NLP. The React frontend is a presentation layer only — it performs no data logic.

### Architecture Diagram
```
TiDB Cloud (MySQL-compatible, TLS required)
   │  Host: gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000
   │  railsense.train_records (2,805,574 rows, 17 columns)
   ▼
Python Backend (Flask)
   ├── db/        SQLAlchemy connection pool (TLS cert verification, read-only guard)
   ├── scripts/   check_connection.py, audit_data.py, future training/EDA scripts
   ├── ml/        Trained model loader + leakage-safe inference pipeline (Phase 4/5)
   ├── nlp/       TF-IDF intent classifier + RapidFuzz entity extractor (Phase 9)
   └── api/       Flask blueprints → REST JSON endpoints (Phase 5)
         │
         │  HTTPS / JSON
         ▼
React + Vite Frontend (Vercel) [Phase 6+]
   └── 6 tabs: Overview | Train Explorer | Delay Prediction |
               Model Lab | Delay Patterns | Smart Insights
```

**Data flow rule:** The frontend NEVER connects to TiDB. All database access is through the Flask API. Credentials exist only in backend environment variables (`backend/.env`, gitignored).

---

## 2. Fixed Stack & Design Rules

### Backend
| Component | Technology | Verified in Phase 2 |
|-----------|------------|---------------------|
| Language | Python 3.10.11 | Yes (`sys.version` verified) |
| Framework | Flask 3.1.3 + Flask-CORS 6.0.5 | Yes (installed & imported) |
| ORM / DB | SQLAlchemy 2.0.55 + PyMySQL 2.2.8 | Yes (TLS connected to TiDB) |
| Cryptography | cryptography 50.0.2 + certifi 2026.10.23 | Yes (TLS certificate verification ON) |
| Data Processing | Pandas 2.3.3, NumPy 2.2.6 | Yes (installed & imported) |
| Machine Learning | scikit-learn 1.7.2, LightGBM 4.7.0 | Yes (installed & imported cleanly) |
| Explainability | SHAP 0.49.1 | Yes (installed & imported cleanly) |
| NLP / Fuzzy Matching | RapidFuzz 3.14.5 | Yes (installed & imported) |
| Visualisation (server) | Matplotlib 3.10.9, Seaborn 0.13.2 | Yes (installed & imported) |
| Model Serialisation | joblib 1.6.0 | Yes (installed & imported) |
| Config | python-dotenv 1.2.4 | Yes (installed & imported) |
| Tests | pytest 9.2.0 | Yes (55 tests passing) |

### Frontend (built in Phase 6)
| Component | Technology |
|-----------|------------|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Routing | React Router |
| Language | **Plain JavaScript (JSX). TypeScript is NOT used. Final decision.** |

### Design System (recorded here, implemented in Phase 6)
- **Sidebar colour:** navy `#0B132B` (alt `#0D1B2A`)
- **Brand:** Lucide `TrainFront` icon in blue rounded badge + "RailSense" + pill `v2.0.4 Community ML Edition` (UI label only, not a release)
- **Active nav:** `bg-blue-600 text-white shadow-md`, rounded-lg. Inactive: gray text, slate hover.
- **Main canvas:** `#F8FAFC`. White cards, `border-slate-200`, `shadow-sm`.
- **Colours:** Primary `#2563EB` | Delay `#EF4444` | Warning `#F59E0B` | Success `#10B981`
- **Watermarks:** Subtle custom SVG silhouettes (locomotive bottom-right, diagonal track top-right, signal gantry bottom-left, vertical gauge lines in sidebar). 4–8% opacity, `pointer-events-none`, behind content.
- **Sidebar footer:** Truthful database status card + creator card (initials badge, "Creator & Maintainer", GitHub: https://github.com/Pranav3536, TiDB Cloud link). **Never fabricate quota, GitHub stats, or photo.**
- **Dataset badge:** "Observed Railway Dataset" (do not change unless provenance is independently verified).

---

## 3. Database Configuration Requirements

Credentials are passed ONLY via environment variables (`backend/.env`). They must never appear in source code, logs, frontend bundles, or documentation.

| Variable | Purpose | Verified Value / Status |
|----------|---------|-------------------------|
| `TIDB_HOST` | TiDB Cloud hostname | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `TIDB_PORT` | Port | `4000` |
| `TIDB_USER` | DB username | Masked as `3jL***` in logs; never printed in full |
| `TIDB_PASSWORD` | DB password | Protected; never printed, logged, or checked in |
| `TIDB_DATABASE` | Database name | `railsense` |
| `TIDB_CA_PATH` | Path to CA cert (optional) | blank = uses `certifi` bundle; TLS verified |
| `FLASK_ENV` | Flask environment | `development` / `production` |
| `FLASK_PORT` | Flask listen port | `5000` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `DB_QUERY_TIMEOUT_SECONDS` | Query timeout | `30` |
| `API_MAX_PAGE_SIZE` | Pagination cap | `100` |
| `VITE_API_BASE_URL` | Frontend → API base URL | `http://localhost:5000` |

> **Rule:** No TiDB credential may ever appear in a `VITE_` variable. The frontend communicates only with the Flask API.

---

## 4. Verified Table Schema Summary (Audited in Phase 2)

**Database:** `railsense` | **Table:** `train_records` | **Server Version:** `8.0.11-TiDB-v8.5.3-serverless`

| Column | Measured SQL Type | Nullable | Null Count | Null % | Notes / Findings |
|--------|-------------------|----------|------------|--------|------------------|
| `id` | `bigint(20)` | `NO` | 0 | 0.000% | Primary key, auto-increment |
| `train_number` | `varchar(20)` | `YES` | 0 | 0.000% | 10,743 distinct trains; 100% numeric |
| `train_name` | `varchar(150)` | `YES` | 0 | 0.000% | 6,816 distinct train names |
| `category` | `varchar(50)` | `YES` | 0 | 0.000% | Service category (MEX, SUB, MEMU, PAS, etc.) |
| `start_date` | `date` | `YES` | 0 | 0.000% | Journey start date (2026-10-07 to 2026-10-25) |
| `status` | `varchar(30)` | `YES` | 0 | 0.000% | Operational status indicator |
| `seq` | `smallint(6)` | `YES` | 0 | 0.000% | Station sequence index (1 to 194; median 17) |
| `station_code` | `varchar(20)` | `YES` | 0 | 0.000% | 8,584 distinct IRCTC station codes |
| `scheduled_arrival` | `datetime` | `YES` | 148,376 | 5.289% | Timetable arrival (IST); naturally NULL at origin |
| `scheduled_departure` | `datetime` | `YES` | 148,376 | 5.289% | Timetable departure (IST); naturally NULL at terminus |
| `actual_arrival` | `datetime` | `YES` | 1,031,688 | 36.773% | Observed arrival (IST); **never use as ML feature** |
| `actual_departure` | `datetime` | `YES` | 1,029,371 | 36.690% | Observed departure (IST); **never use as ML feature** |
| `arrival_reported` | `tinyint(1)` | `YES` | 22,070 | 0.787% | Reporting flag |
| `departure_reported` | `tinyint(1)` | `YES` | 22,070 | 0.787% | Reporting flag |
| `arrival_delay_min` | `int(11)` | `YES` | 1,031,967 | 36.783% | Minutes late on arrival (8.56% negative delays) |
| `departure_delay_min` | `int(11)` | `YES` | 1,029,645 | 36.700% | Minutes late on departure |
| `run_quality` | `float` | `YES` | 0 | 0.000% | Completeness/quality score (0.0 to 1.0) |

- **Total Rows Verified:** Exactly `2,805,574` rows.
- **Total Unique Runs `(train_number, start_date)`:** `147,367` runs.
- **Negative delays are valid:** 8.56% of arrival observations arrived early. **Never clip to zero.**
- **Existing Index:** `PRIMARY` on `id` column only.

---

## 5. Full 11-Phase Roadmap

| # | Phase | Status |
|---|-------|--------|
| 1 | Repository audit, architecture and project foundation | **DONE — tested** |
| 2 | TiDB connectivity layer and data audit | **DONE — tested** |
| 3 | EDA, validation, feature engineering and final prediction-task decision | NOT STARTED |
| 4 | ML experiments, leakage-safe evaluation, MODEL_CARD.md | NOT STARTED |
| 5 | Flask API with tests and API docs | NOT STARTED |
| 6 | React design system and app shell | NOT STARTED |
| 7 | Overview tab and Train Explorer tab | NOT STARTED |
| 8 | Delay Prediction tab and Model Lab tab | NOT STARTED |
| 9 | Delay Patterns tab and Smart Insights NLP | NOT STARTED |
| 10 | Integration, QA, security, accessibility | NOT STARTED |
| 11 | Deployment and final handover | NOT STARTED |

---

## 6. Current Phase & Overall Completion

**Current phase:** Phase 2 Complete (awaiting Phase 3 prompt)  
**Overall completion:** 2 / 11 phases complete (18.2%).  
- Database layer connected with TLS verification and read-only guard.
- 100% of data audited, measured, and verified against owner claims.
- 55 automated tests passing (51 unit, 4 integration).

---

## 7. Completed Tasks (with verification evidence)

| Task | Verification Evidence |
|------|-----------------------|
| Plain JavaScript JSX decision updated in docs | `README.md`, `PROJECT.md`, `task.md`, `DECISIONS.md` updated; TypeScript rejected |
| Python virtual environment created | `backend\.venv` with Python 3.10.11 |
| Core dependencies installed | flask, sqlalchemy, pymysql, cryptography, pandas, numpy, scikit-learn, matplotlib, seaborn, python-dotenv, pytest, rapidfuzz, joblib, certifi |
| LightGBM & SHAP installation attempted & verified | `lightgbm==4.7.0`, `shap==0.49.1` installed and imported without error |
| Dependencies pinned | `backend/requirements.txt` pinned to exact installed versions |
| Configuration module created | `backend/app/db/config.py` with validation, placeholder rejection, masked summaries |
| Engine module created with Read-Only Guard | `backend/app/db/engine.py` with TLS verification, strict query whitelist (`SELECT`/`SHOW`/`DESCRIBE`/`EXPLAIN`/`WITH`), DML/DDL rejection, comment stripping, row capping |
| Connection check script | `backend/scripts/check_connection.py` executed successfully: TiDB Serverless 8.0.11, TLS cipher `TLS_AES_128_GCM_SHA256` active |
| Comprehensive Data Audit executed | `backend/scripts/audit_data.py` executed: generated `docs/data_audit.json` and `docs/data_audit.md` |
| Data dictionary generated | `docs/data_dictionary.md` created with column-level types, null behaviour, and caveats |
| Unit tests implemented & run | 51 unit tests in `test_config.py` and `test_engine.py` passed |
| Integration tests implemented & run | 4 integration tests in `test_db_integration.py` passed live against TiDB |
| Zero secrets confirmed in git | No secrets in tracked files, `backend/.env` gitignored |

---

## 8. Pending Tasks (Phase 5+)

- **Phase 3 (COMPLETE):** Exploratory Data Analysis (EDA) scripts and plots in `docs/eda/`
- **Phase 3 (COMPLETE):** Deep dive into delay propagation across stops in sequence
- **Phase 3 (COMPLETE):** Finalise prediction target formulation (binary >15 min vs multi-class vs regression)
- **Phase 3 (COMPLETE):** Finalise feature set and temporal validation split strategy (Days 1-14 train, 15-16 val, 17-19 test)
- **Phase 4 (COMPLETE):** ML model training (Baseline → Logistic Regression → Random Forest → LightGBM)
- **Phase 4 (COMPLETE):** Model evaluation, SHAP explainability, probability calibration, and `MODEL_CARD.md`
- **Phase 5 (NEXT):** Flask REST API endpoints and swagger/OpenAPI docs
- **Phases 6–11:** React UI, QA, deployment

---

## 9. Blockers & Known Issues

| Issue | Status | Resolution / Notes |
|-------|--------|-------------------|
| Data window is only 19 calendar days | Manageable constraint | Limits multi-month seasonality. Evaluation uses temporal train/val/test splits within the 19 days. |
| Dates are in October 2026 | Documented caveat | Prospective/synthetic timestamps; dataset is an observed research benchmark. |
| Owner UI Claims mismatch real data | Resolved / Documented | Audit proved Delayed > 15m is **49.92%** (not 41.8%), and Avg Delay is **38.22 min** (not 26.4 min). Real numbers used. |
| Origin stops (`seq=1`) have NULL arrival delay | Resolved | Exactly 147,367 NULL arrivals correspond to `seq=1` origin stops (1-to-1 match with runs). Excluded from arrival delay tasks. |
| Intermediate timetable gaps | Resolved | 1,009 NULL scheduled arrival intermediate stops identified across 864 runs. |
| Extreme delay date-wrap outliers | Resolved | 61 rows < -1440m and 150 rows > 1440m masked out of label set (0.012%). |
| In-flight journey leakage trap | Resolved | 23.33% of stops occur after start_date; anti-leakage rule strictly requires `actual_arrival < cutoff_date`. |
| Circular routes visit same station twice | Expected domain behavior | 22,064 records have duplicate `(train, date, station)` but sequence `seq` is unique. Use `seq` for uniqueness. |

---

## 10. Architecture Decisions Summary

See `DECISIONS.md` for full rationale.
- **D-01:** React as UI-only presentation layer.
- **D-02:** Flask + Python for all data, ML, and NLP logic.
- **D-03:** TiDB Cloud as sole application data source.
- **D-04:** No dataset upload feature.
- **D-05:** Temporal / train-grouped evaluation instead of random row split.
- **D-06:** Local NLP with safe parameterised query templates.
- **D-07:** Target and features decided only after Phase 3 EDA.
- **D-08:** Phased delivery gated by verification.
- **D-09:** Honest UI — no fabricated statistics or unverified claims.
- **D-10:** Monorepo layout.
- **D-11:** Frontend uses plain JavaScript (JSX), NOT TypeScript (final decision).
- **D-12:** Read-only query guard for all application database access.
- **D-13:** TLS with certificate verification always ON (`certifi` CA bundle).
- **D-14:** Run defined as `(train_number, start_date)`.
- **D-15:** Deterministic 100k-row sampling (`ORDER BY id LIMIT 100000`) for consistency verification.
- **D-16:** Local Parquet Extraction Cache for EDA & ML Modeling (`backend/data_cache/`, gitignored).
- **D-17:** Schedule-Time Binary Classification Target at >15 Min Threshold (`arrival_delay_min > 15`).
- **D-18:** Temporal Split Protocol (Oct 07 warmup, Oct 08-20 train, Oct 21-22 val, Oct 23-24 test, Oct 25 censored) & Multi-Day In-Flight Anti-Leakage Rule.
- **D-19:** Explicit Validation & Label Eligibility Masking (No silent row deletion; 1.77M eligible stops).
- **D-20:** Empirical Bayesian Smoothing for Cold-Start Trains ($m=10$) and Stations ($m=20$).
- **D-21:** Final Model Architecture (LightGBM 63 leaves, max_depth 8, early stopping best iter 298, PR-AUC 0.8525 on Test).
- **D-22:** Decision Threshold Selection (0.420 on Validation for F1 maximization).
- **D-23:** Probability Calibration via Isotonic Regression on Validation (ECE improved 0.0338 -> 0.0035).
- **D-24:** Evaluation Model vs Deployment Model Refitting Policy (Train-only for evaluation; Train+Val for deployment).
- **D-25:** Formulation 2 En-Route Model Segregation (En-Route LightGBM PR-AUC 0.9293).
- **D-26:** Precomputed Read-Only SQLite Serving Store Architecture (`backend/serving/serving.sqlite`, 39.03 MB; zero runtime aggregate queries on TiDB Cloud).
- **D-27:** Average Precision (AP) Replaces Trapezoid PR-AUC for Constant Baselines (`average_precision_score` eliminates 0.7460 artifact down to true 0.4920 prevalence).
- **D-28:** Operational Decision Thresholds: Balanced F1 Threshold (0.410) and High-Recall Threshold (0.455).
- **D-29:** Strict Non-Causal Attribution Phrasing Across API & Documentation ("observed delay hotspot", "associated with", "what the model uses").

---

## 11. Files Created or Modified in Phase 5

```
c:\RailSense\
├── backend/
│   ├── app/
│   │   ├── __init__.py                [UPDATED — Flask app factory, security headers, in-memory rate limiter, uniform errors]
│   │   ├── serving_client.py          [CREATED — thread-safe read-only SQLite client & static JSON loader]
│   │   └── api/
│   │       ├── __init__.py            [CREATED — modular API blueprint package under /api]
│   │       ├── health.py              [CREATED — /api/health and /api/health/ready probes]
│   │       ├── overview.py            [CREATED — /api/overview macro statistics]
│   │       ├── trains.py              [CREATED — /api/trains and /api/trains/<train_number>]
│   │       ├── stations.py            [CREATED — /api/stations and /api/stations/<station_code>]
│   │       ├── patterns.py            [CREATED — /api/patterns/<kind> temporal & spatial distributions]
│   │       ├── model.py               [CREATED — /api/model/info and /api/model/metrics]
│   │       ├── predict.py             [CREATED — /api/predict pre-departure inference with risk bands & factors]
│   │       └── docs.py                [CREATED — /api/docs Swagger UI and /api/openapi.json]
│   ├── serving/
│   │   ├── serving.sqlite             [CREATED — 39.03 MB indexed read-only SQLite serving store]
│   │   ├── overview.json              [CREATED — macro dataset summary and category breakdown]
│   │   ├── patterns.json              [CREATED — precomputed delay patterns by hour, dow, position, hotspots]
│   │   └── model_lab.json             [CREATED — benchmark curves, feature importances, plain-English explanations]
│   ├── scripts/
│   │   ├── run_phase5_preflight.py    [CREATED — AP recomputation, threshold tuning, calibration audit]
│   │   ├── build_serving_data.py      [CREATED — offline builder for SQLite and analytics JSONs from 2.8M rows]
│   │   └── smoke_api.py               [CREATED — 21-endpoint latency profiler & status verifier]
│   ├── tests/
│   │   ├── test_api_routes.py         [CREATED — 31 unit tests covering all routes, pagination, errors, headers, rate limit]
│   │   └── test_api_integration.py    [CREATED — end-to-end integration and < 300MB process memory budget audit]
│   └── wsgi.py                        [CREATED — WSGI entrypoint for production and development servers]
├── docs/
│   ├── phase5_preflight.md            [CREATED — preflight audit of AP, threshold honesty, calibration ECE]
│   ├── phase5_preflight.json          [CREATED — programmatic recomputed metrics and threshold data]
│   ├── serving_design.md              [CREATED — SQLite schema, index rationale, performance benchmarks]
│   ├── openapi.yaml                   [CREATED — OpenAPI 3.0.3 specification in YAML]
│   ├── openapi.json                   [CREATED — OpenAPI 3.0.3 specification in JSON]
│   ├── API.md                         [CREATED — comprehensive REST API reference with PowerShell examples]
│   └── MODEL_CARD.md                  [UPDATED — recomputed honest AP metrics, operational thresholds, lifts]
```

---

## 11. Files Created or Modified in Phase 4

```
c:\RailSense\
├── backend/
│   ├── app/
│   │   └── ml/
│   │       ├── metrics.py             [CREATED — PR-AUC, ECE, Brier, F1, threshold finder]
│   │       └── predict.py             [CREATED — RailSensePredictor inference service]
│   ├── scripts/
│   │   ├── run_preflight.py           [CREATED — preflight validation & shuffled-label check]
│   │   └── run_experiments.py         [CREATED — full benchmark runner, calibration, SHAP]
│   ├── models/
│   │   ├── deployment_model.joblib    [CREATED — refitted LightGBM on Train+Val, gitignored]
│   │   ├── evaluation_model.joblib    [CREATED — test evaluation model on Train, gitignored]
│   │   ├── calibrator.joblib          [CREATED — Isotonic calibrator, gitignored]
│   │   ├── en_route_model.joblib      [CREATED — Formulation 2 model, gitignored]
│   │   ├── hist_transformer.joblib    [CREATED — Historical transformer, gitignored]
│   │   ├── historical_tables.json     [CREATED — precomputed lookup dictionaries]
│   │   └── model_metadata.json        [CREATED — tracked model schema and version info]
│   └── tests/
│       ├── test_metrics.py            [CREATED — unit tests for classification & ECE metrics]
│       ├── test_experiments_guards.py [CREATED — split guard, banned features guard, folds guard]
│       └── test_predict.py            [CREATED — predict smoke test & cold start verification]
├── docs/
│   ├── phase4_preflight.md            [CREATED — Task A split & leakage verification report]
│   ├── MODEL_CARD.md                  [CREATED — complete, publication-grade model card]
│   ├── model/
│   │   ├── pr_curve.png               [CREATED — 300 DPI PR curve on Test]
│   │   ├── roc_curve.png              [CREATED — 300 DPI ROC curve on Test]
│   │   ├── confusion_matrix.png       [CREATED — 300 DPI Confusion Matrix on Test]
│   │   ├── calibration_curve.png      [CREATED — 300 DPI Reliability diagram on Test]
│   │   ├── metrics_by_category.png    [CREATED — 300 DPI Category breakdown]
│   │   ├── metrics_by_position.png    [CREATED — 300 DPI Sequence position breakdown]
│   │   ├── shap_summary.png           [CREATED — 300 DPI SHAP summary plot]
│   │   ├── shap_feature_importance.png [CREATED — 300 DPI SHAP bar importance]
│   │   ├── feature_importance.csv     [CREATED — Gain & Split feature importances]
│   │   └── explanations_simple.md     [CREATED — Plain-English explanations for UI]
│   └── experiments/
│       ├── preflight_metrics.json     [CREATED — exact split and cold-start stats]
│       └── final_test_results.json    [CREATED — programmatic evaluation results]
```

---

## 11. Files Created or Modified in Phase 3

```
c:\RailSense\
├── backend/
│   ├── app/
│   │   └── ml/
│   │       ├── __init__.py            [CREATED]
│   │       ├── validation.py          [CREATED — validation rules and eligibility masks]
│   │       └── features.py            [CREATED — schedule-time & Bayesian prior transformers]
│   ├── scripts/
│   │   ├── extract_data.py            [CREATED — extracts 2.8M rows to 19 daily parquet files]
│   │   ├── run_validation.py          [CREATED — validation runner generating json & md reports]
│   │   ├── run_eda.py                 [CREATED — generates 8 publication plots & eda_report.md]
│   │   └── build_features.py          [CREATED — builds train/val/test matrices & feature summary]
│   └── tests/
│       ├── test_validation.py         [CREATED — 6 unit tests for validation & anomaly flags]
│       └── test_features.py           [CREATED — 3 unit tests for feature extraction & smoothing]
├── docs/
│   ├── validation_report.json         [CREATED — complete validation metrics]
│   ├── validation_report.md           [CREATED — detailed validation documentation]
│   ├── eda/
│   │   ├── 01_delay_distribution.png  [CREATED — 300 DPI distribution chart]
│   │   ├── 02_delay_by_hour_and_dow.png [CREATED — 300 DPI temporal trends]
│   │   ├── 03_delay_by_category.png   [CREATED — 300 DPI category disparity chart]
│   │   ├── 04_delay_by_sequence_position.png [CREATED — 300 DPI seq delay accumulation]
│   │   ├── 05_station_delay_hotspots.png [CREATED — 300 DPI station hotspot & punctual rankings]
│   │   ├── 06_train_persistence.png   [CREATED — 300 DPI day-to-day lag correlation]
│   │   ├── 07_within_run_propagation.png [CREATED — 300 DPI en-route propagation lift]
│   │   ├── 08_label_missingness.png   [CREATED — 300 DPI reporting missingness]
│   │   └── eda_stats.json             [CREATED — numerical backing statistics]
│   ├── eda_report.md                  [CREATED — full EDA report with numbers and caveats]
│   ├── task_definition.md             [CREATED — formal schedule-time prediction specification]
│   ├── split_design.md                [CREATED — chronological split and anti-leakage rules]
│   ├── feature_catalog.md             [CREATED — taxonomy of allowed and banned features]
│   ├── feature_summary.json           [CREATED — verified shapes, 0 nulls, correlations]
│   └── CLAUDE_HANDOFF.md              [CREATED — executive standing handoff summary of findings (gitignored)]
```

---

## 11. Files Created or Modified in Phase 2

```
c:\RailSense\
├── backend/
│   ├── .venv/                         [CREATED — Python 3.10 virtualenv]
│   ├── requirements.txt               [MODIFIED — pinned to installed versions]
│   ├── pytest.ini                     [CREATED — pytest configuration and markers]
│   ├── app/
│   │   └── db/
│   │       ├── config.py              [CREATED — env loader, validator, safe summaries]
│   │       └── engine.py              [CREATED — SQLAlchemy engine + read-only guard]
│   ├── scripts/
│   │   ├── check_connection.py        [CREATED — connection & TLS diagnostic script]
│   │   └── audit_data.py              [CREATED — comprehensive data audit script]
│   └── tests/
│       ├── test_config.py             [CREATED — unit tests for DB config]
│       ├── test_engine.py             [CREATED — unit tests for read-only guard]
│       └── test_db_integration.py     [CREATED — live TiDB integration tests]
├── docs/
│   ├── data_audit.json                [CREATED — machine-readable audit metrics]
│   ├── data_audit.md                  [CREATED — human-readable audit report]
│   └── data_dictionary.md            [CREATED — column-by-column specifications]
├── PROJECT.md                         [MODIFIED — sections 3, 4, 5 updated with audit findings]
├── README.md                          [MODIFIED — phase 2 status + verification steps]
├── DECISIONS.md                       [MODIFIED — decisions D-11 to D-15 added]
└── task.md                            [MODIFIED — this master tracking document]
```

---

## 12. Tests / Checks Executed & Actual Outcomes

| # | Check / Test | Command / Method | Actual Outcome |
|---|--------------|------------------|----------------|
| 1 | Package import verification | `python -c "import ..."` | **PASS** — All packages imported cleanly including LightGBM 4.7.0 and SHAP 0.49.1 |
| 2 | TiDB TLS Connection & Cipher Check | `python scripts/check_connection.py` | **PASS** — Connected to TiDB Serverless v8.5.3; Cipher: `TLS_AES_128_GCM_SHA256` |
| 3 | Read-only guard unit tests | `pytest tests/test_engine.py` | **PASS** — 42 test cases verifying permitted clauses and rejecting DML/DDL/injection |
| 4 | Config validation unit tests | `pytest tests/test_config.py` | **PASS** — 9 test cases verifying validation, placeholder rejection, and zero secret leakage |
| 5 | Validation & anomaly unit tests | `pytest tests/test_validation.py` | **PASS** — 6 unit tests verifying primary key, sequence flag, and label eligibility |
| 6 | Feature extraction & priors unit tests | `pytest tests/test_features.py` | **PASS** — 3 unit tests verifying schedule-time and Bayesian smoothed priors |
| 7 | Evaluation metrics & calibration tests | `pytest tests/test_metrics.py` | **PASS** — 5 unit tests for PR-AUC, ROC-AUC, ECE, Brier, and threshold finder |
| 8 | Experiment guards tests | `pytest tests/test_experiments_guards.py` | **PASS** — 3 unit tests for banned features, split guard, and rolling-origin chronological folds |
| 9 | Predict service smoke tests | `pytest tests/test_predict.py` | **PASS** — 2 unit tests verifying cold-start handling and explanation factors |
| 10 | Live database integration tests | `pytest tests/test_db_integration.py` | **PASS** — 4 integration tests (SELECT 1, TLS cipher, guard blocking DML, schema count) |
| 11 | Phase 5 REST API route unit tests | `pytest tests/test_api_routes.py` | **PASS** — 31 unit tests covering all routes, pagination, 400/404/405/422/429 errors, CORS, security headers |
| 12 | End-to-end API integration & memory | `pytest tests/test_api_integration.py` | **PASS** — Full query lifecycles verified; Traced memory peak 8.92 MB (well below 300 MB limit) |
| 13 | Full test suite execution | `pytest backend/tests -v -m "not db_live"` | **PASS — 103 passed, 4 skipped in 5.00s (0 failures)** |
| 14 | API Smoke test & latency profiler | `python backend/scripts/smoke_api.py` | **PASS** — 21 endpoints tested; Mean latency: 4.57 ms, Peak: 22.24 ms |
| 15 | Git ignore check for `.env` & `.sqlite` | `git check-ignore -v backend/.env backend/serving/serving.sqlite` | **PASS** — Ignored cleanly |
| 16 | Credential scan across repo | PowerShell scan | **PASS** — Zero real credentials found in any tracked file |

---

## 13. Commands to Run, Test, and Resume the Project

All commands run from `c:\RailSense\` with the virtual environment activated:

```powershell
# Activate Python environment
cd c:\RailSense
.\backend\.venv\Scripts\Activate.ps1

# Build or refresh the precomputed serving store (SQLite & JSONs from 2.8M rows)
python backend/scripts/build_serving_data.py

# Run API Smoke Test & Latency Profiler (all 21 endpoints)
python backend/scripts/smoke_api.py

# Start local Flask API development server
python backend/wsgi.py
# Server runs at: http://localhost:5000 (Interactive docs: http://localhost:5000/api/docs)

# Run full automated test suite (offline / sandbox safe)
pytest backend/tests -v -m "not db_live"

# Run integration tests specifically
pytest backend/tests/test_api_integration.py -v
```

---

## 14. Next Exact Action

**Phase 6 Status: COMPLETE (Verified)**
- React + Vite + Tailwind CSS + Lucide React + Recharts + React Router foundation established in `frontend/` using plain JavaScript (JSX) (D-11). Zero TypeScript.
- Design system tokens implemented: Sidebar Navy (`#0B132B`), Canvas (`#F8FAFC`), Cards (`#FFFFFF`), Primary (`#2563EB`), Danger (`#EF4444`), Warning (`#F59E0B`), Success (`#10B981`).
- App shell with desktop fixed sidebar, mobile topbar & responsive drawer, skip-to-content keyboard accessibility, and subtle inline railway SVG watermarks at 4-6% opacity.
- Truthful database status card polling `/api/health/ready` with 4 verified states (`checking`, `connected`, `db_unavailable`, `unreachable`).
- Resilient API client with in-flight Promise deduplication and GET TTL caching.
- 6 honest placeholder tabs clearly labeled "Planned in Phase N" listing verified backend API endpoint contracts.

**Phase 6.1 Status: COMPLETE (Verified UI Scale-Up)**
- Raised root font-size knob from 16px (100%) to 18px (112.5%) in `src/index.css` (106.25% / 17px under 400px width). Proportional +12.5% scale applied globally.
- Standardized typography scale: page title `text-3xl` (33.75px), section title `text-xl` (22.5px), card title `text-lg` (20.25px), body `text-base` (18px), caption/stat label `text-sm` (15.75px), stat value `text-4xl` (40.5px). Minimum text threshold: no meaningful text below `text-sm`.
- Widened desktop sidebar to `w-72` (288px) and `xl:w-80` (320px); nav items minimum 48px tall with 22px icons; brand and pills enlarged; footer pinned with zero clipping at 1280x720 and 1366x768.
- Minimum 44x44px touch targets enforced on all buttons, triggers, and icon controls.
- Recharts centralized theme constants (`src/components/charts/chartTheme.js`) established with 14px ticks/tooltips/legends and 360px standard container height.
- Frontend test suite (Vitest + Testing Library): **30 passed across 5 files (0 failures)**, ESLint: **0 errors, 0 warnings**, production bundle: 198 kB.
- Backend pytest suite intact: **103 passed, 4 skipped**.

**Phase 7 Status: COMPLETE (Verified)**
- Tab 1 Overview Dashboard ("Railway at a Glance") connected live to `/api/overview` via `adaptOverview`.
  - 5 Macro Volume StatCards: Total Stops (`2,805,574` / `28,05,574`), Runs (`147,367`), Trains (`10,743`), Stations (`8,584`), Span (`19 Days`).
  - 5 Delay Performance StatCards: Observed Delayed Rate (`49.9%`), Median Delay (`+15 min`), Mean Delay (`+38 min`), Early Arrivals (`8.6%`), Label Coverage (`63.2%`).
  - Daily Trendline Recharts LineChart with 49.9% fleet baseline, partial date styling, accessible text takeaways, and view-as-table toggle.
  - Delay Distribution Recharts BarChart with 8 tiers from `<-30` to `>180`, tier color coding, accessible takeaways, and table toggle.
  - Category Breakdown horizontal BarChart with low-support muting (< 30 stops) and table toggle.
  - Collapsible educational guide on label eligibility, early arrivals, partial dates, and non-causal language.
- Tab 2 Train Explorer ("Single Train Deep Dive") connected live to `/api/trains` and `/api/trains/<train_number>` with deep linking (`/explorer` & `/explorer/:trainNumber`).
  - Debounced (300ms) catalog search by train number/name, category dropdown, quick explore pills, pagination controls.
  - Selected Train Header with train number, name, category badge, route origin/terminus, runs, halts, overall delay rate bar, mean delay, and disabled Phase 8 prediction button.
  - Stop Timetable ordered strictly by sequence number `seq` (verified support for 200 circular/loop routes).
  - Stop delay progression line chart and per-date run performance chart with boundary indicators.
- Normalization adapters (`src/api/adapters.js`) enforcing percentage uniformity (0–100 scale), safe null handling, and low-support annotation.
- Zero causal terms ("bottleneck", "congestion", "fog", "caused by") and zero "probability" wording on overview/explorer tabs.
- Full verification: Vitest **43 passed across 8 test files**, ESLint **0 errors / 0 warnings**, Vite build: **199 kB clean bundle**, Backend pytest: **103 passed, 4 skipped**.

### Phase 8 — Delay Prediction & Model Evaluation Lab (COMPLETED)
- Tab 3 Delay Prediction ("ML Inference Engine") live at `/predict` and connected to `POST /api/predict` and `GET /api/trains/<train_number>`:
  - Supports deep links (`/predict?train=&seq=&date=`).
  - Interactive form with debounced accessible `TrainPicker`, dynamic stop selector dropdown by `seq` (origin stop seq=1 disabled with clear rationale), date picker defaulting to `2026-10-25`.
  - Explicit submit button (`Predict Delay`) guarded against double submission and rate limit (120 req/min) with countdown timer.
  - Live results panel featuring `ProbabilityGauge` (with threshold marker at 0.420), `RiskBadge` (Low/Medium/High), plain-words decision statement, `ColdStartNotice` for low-support runs (<5 historical runs), `FactorBars` showing model feature associations, `WarningList` with in-sample demonstration notice or out-of-window warning, and empirical stop-level baseline comparator.
  - "About this number" educational collapsible linking to Model Lab.
- Tab 4 Model Lab ("Model Evaluation & Transparency") live at `/model-lab` and connected to `GET /api/model/info` and `GET /api/model/metrics`:
  - Architecture and fact cards: LightGBM GBDT + Isotonic Regression, binary classification, strict temporal split boundaries, test prevalence (49.2%), latency (2.1 ms).
  - Multi-model benchmark comparison table with Test / Validation split toggle and `LiftBar` (+72.4% over Majority, +42.0% over Category Prior, +4.95% over Train History).
  - Recharts discrimination & calibration curves: Precision-Recall Curve (with 49.2% prevalence baseline line), Calibration Reliability Diagram (with ideal diagonal), and ROC Curve, each with data table toggle.
  - Test partition Confusion Matrix (71,289 TN, 27,248 FP, 17,037 FN, 78,391 TP) with plain-words precision/recall breakdown at operational threshold 0.420.
  - Calibration diagnostics: Brier score (0.1529), ECE (0.0183), and threshold rationales (0.420 balanced F1, 0.512 high recall, 0.500 default).
  - Feature importance rankings (gain metric) across 298 trees with plain-English labels from `featureLabels.js`.
  - Per-category and per-position subgroup performance breakdowns.
  - Anti-leakage protocol card detailing reasons for banning post-hoc columns (`departure_delay_min`, `actual_arrival`, `actual_departure`, `status`, `run_quality`, `arrival_reported`).
  - Formulation 2 (En-Route Model) research benchmark card clearly separated from pre-departure inference.
- Phase 7 cleanups completed:
  - Removed hardcoded `FEATURED_TRAINS` quick explore pills from `TrainExplorerPage.jsx`.
  - Updated `CategoryLabel.jsx` to only display plain-English name when documented in `docs/data_dictionary.md`; otherwise shows raw code with tooltip "code as in dataset".
  - Connected "Predict Delay" actions in `TrainExplorerPage.jsx` header and per-stop timetable.
- Full verification: Vitest **48 passed across 10 test files**, ESLint **0 errors / 0 warnings**, Vite build **200.27 kB clean bundle**, Backend pytest **103 passed, 4 skipped**.

**Next Milestone: Phase 9 — Historical Delay Patterns & Smart Insights**
In Phase 9, the session will:
1. Connect Tab 5 (Delay Patterns) to `/api/patterns/<kind>` (hourly, day-of-week, category, route position, hotspot stations).
2. Connect Tab 6 (Smart Insights) to local NLP engine (`/api/insights/query`).

---

## 15. Verified Assumptions & Status

| Assumption / Metric | Owner Pre-Report | Phase 2 Measured Real Value | Status |
|---------------------|------------------|-----------------------------|--------|
| Total table rows | 2,805,574 | **2,805,574** | **VERIFIED — EXACT MATCH** |
| Distinct train numbers | 10,743 | **10,743** | **VERIFIED — EXACT MATCH** |
| Distinct train names | 6,816 | **6,816** | **VERIFIED — EXACT MATCH** |
| Distinct station codes | 8,584 | **8,584** | **VERIFIED — EXACT MATCH** |
| Date range | Oct 7 to Oct 25, 2026 | **2026-10-07 to 2026-10-25** | **VERIFIED — EXACT MATCH (19 days)** |
| Primary key duplicates | 0 | **0** | **VERIFIED — UNIQUE** |
| `(train, date, seq)` duplicates | 0 | **0** | **VERIFIED — UNIQUE STOPS** |
| Negative delays exist | Yes | **8.56% of non-null arrivals** | **VERIFIED — EARLY ARRIVALS VALID** |
| Delayed > 15 min % | 41.8% | **49.92%** | **DISPROVEN / UPDATED TO REAL** |
| Average arrival delay | 26.4 min | **38.22 min** (median: 17.0 min) | **DISPROVEN / UPDATED TO REAL** |
| LightGBM compatibility | Unverified | **LightGBM 4.7.0 installed & verified** | **VERIFIED — COMPATIBLE** |
| SHAP compatibility | Unverified | **SHAP 0.49.1 installed & verified** | **VERIFIED — COMPATIBLE** |
| Frontend language | Unclear | **Plain JavaScript (JSX) — TS rejected** | **FINAL DECISION** |
