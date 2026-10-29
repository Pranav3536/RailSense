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

## 8. Pending Tasks (Phase 3+)

- **Phase 3:** Exploratory Data Analysis (EDA) scripts and plots in `docs/eda/`
- **Phase 3:** Deep dive into delay propagation across stops in sequence
- **Phase 3:** Finalise prediction target formulation (binary >15 min vs multi-class vs regression)
- **Phase 3:** Finalise feature set and temporal validation split strategy (Days 1-14 train, 15-16 val, 17-19 test)
- **Phase 4:** ML model training (Baseline → Logistic Regression → Random Forest → LightGBM)
- **Phase 4:** Model evaluation, SHAP explainability, and `MODEL_CARD.md`
- **Phase 5:** Flask REST API endpoints and swagger/OpenAPI docs
- **Phases 6–11:** React UI, QA, deployment

---

## 9. Blockers & Known Issues

| Issue | Status | Resolution / Notes |
|-------|--------|-------------------|
| Data window is only 19 calendar days | Manageable constraint | Limits multi-month seasonality. Evaluation must use temporal train/val/test splits within the 19 days. |
| Dates are in October 2026 | Documented caveat | Prospective/synthetic timestamps; dataset is an observed research benchmark. |
| Owner UI Claims mismatch real data | Resolved / Documented | Audit proved Delayed > 15m is **49.92%** (not 41.8%), and Avg Delay is **38.22 min** (not 26.4 min). Real numbers must be shown in UI. |
| Origin stops (`seq=1`) have NULL arrival delay | Expected domain behavior | Trains depart from origin; they do not arrive. Exclude origin stops from arrival delay ML tasks. |
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
| 1 | Package import verification | `python -c "import ..."` | **PASS** — All 17 packages imported cleanly including LightGBM 4.7.0 and SHAP 0.49.1 |
| 2 | TiDB TLS Connection & Cipher Check | `python scripts/check_connection.py` | **PASS** — Connected to TiDB Serverless v8.5.3; Cipher: `TLS_AES_128_GCM_SHA256` |
| 3 | Read-only guard unit tests | `pytest tests/test_engine.py` | **PASS** — 42 test cases verifying permitted clauses and rejecting DML/DDL/injection |
| 4 | Config validation unit tests | `pytest tests/test_config.py` | **PASS** — 9 test cases verifying validation, placeholder rejection, and zero secret leakage |
| 5 | Live database integration tests | `pytest tests/test_db_integration.py` | **PASS** — 4 integration tests (SELECT 1, TLS cipher, guard blocking DML, schema count) |
| 6 | Full test suite execution | `pytest -v` | **PASS — 55 passed in 2.65s (0 failed, 0 skipped)** |
| 7 | Data Audit Execution | `python scripts/audit_data.py` | **PASS** — Successfully generated `data_audit.json` and `data_audit.md` |
| 8 | Git ignore check for `.env` | `git check-ignore -v backend/.env` | **PASS** — `.gitignore:6:.env` (ignored) |
| 9 | Credential scan across repo | PowerShell regex scan | **PASS** — Zero real credentials found in any tracked file |

---

## 13. Commands to Run, Test, and Resume the Project

All commands run from `c:\RailSense\backend\` with the virtual environment activated:

```powershell
# Activate Python environment
cd c:\RailSense\backend
.\.venv\Scripts\Activate.ps1

# Run live connection check
python scripts/check_connection.py

# Run comprehensive data audit
python scripts/audit_data.py

# Run all unit and integration tests
pytest -v

# Run unit tests only (offline, sandbox safe)
pytest -v -m "not integration"

# Run live integration tests only
pytest -v -m "integration"
```

---

## 14. Next Exact Action

**Phase 3 — EDA, Validation, Feature Engineering & Final Prediction-Task Decision**

In Phase 3, the session will:
1. Conduct deep exploratory data analysis on delay patterns across time of day, day of week, train category, and sequence progress.
2. Produce server-side visualisations saved to `docs/eda/`.
3. Design leakage-safe feature transformers (schedule features, expanding historical delays by train/station using past dates only).
4. Decide the final target definition (e.g. binary `arrival_delay_min > 15`) and formalise temporal train/val/test splits.

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
