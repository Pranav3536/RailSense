# RailSense — Technical Blueprint (PROJECT.md)

> This document is the canonical technical specification. Every unfilled item is marked `TBD (Phase N)`.

---

## 1. Problem Statement

Indian Railways operates thousands of trains per day across a vast network. Delays propagate through the network and affect passengers significantly. Publicly available delay data exists but is rarely analysed in a reproducible, ML-grounded way. RailSense aims to:

1. Perform honest, rigorous EDA on a real delay dataset.
2. Build a leakage-safe delay-classification model that can be explained to an interviewer.
3. Serve predictions and analytics through a clean API.
4. Present findings through an informative React dashboard.

---

## 2. Objectives & Scope

### In Scope
- Data audit and quality characterisation of the `train_records` table.
- Exploratory data analysis (distributions, correlations, missing-data patterns).
- Feature engineering from schedule and sequence information.
- Leakage-safe binary classification of significant delay.
- Model evaluation with correct metrics (precision, recall, F1, PR-AUC).
- Flask REST API exposing analytics and inference.
- React dashboard with 6 informational tabs.
- Local NLP query interface (TF-IDF + RapidFuzz, safe parameterised queries).
- SHAP-based explainability (if compatible).

### Out of Scope (explicitly excluded)
- Dataset upload feature (data already loaded in TiDB; no re-upload mechanism).
- Live tracking or real-time data ingestion.
- Causal claims ("this feature *causes* delays").
- Paid APIs or hosted LLMs at runtime.
- Multi-year predictive modelling (data window is ~19 days).
- Any financial or safety-critical application.

---

## 3. Dataset Description & Verified Findings (Phase 2)

**Source:** https://huggingface.co/datasets/pjay-in/indian-railways-delays  
**Badge label:** "Observed Railway Dataset"  
**Loaded into:** TiDB Cloud, database `railsense`, table `train_records`

### Verified Statistics (Audited in Phase 2)
- Total Rows: **2,805,574** (exact match with owner report)
- Distinct `train_number`: **10,743** (exact match)
- Distinct `train_name`: **6,816** (exact match)
- Distinct `station_code`: **8,584** (exact match)
- Total Runs `(train_number, start_date)`: **147,367**
- `start_date` range: **2026-10-07 to 2026-10-25** (exactly 19 calendar days)
- Duplicate IDs: **0** (Primary key unique)
- Duplicate `(train_number, start_date, seq)`: **0** (Strict sequence integrity)
- Duplicate `(train_number, start_date, station_code)`: **22,064** (Valid circular/loop routes visiting same station twice)
- Negative arrival delays: **8.56%** of non-null observations (Early arrivals; valid, never clipped)
- Overall Arrival Delay Mean: **38.22 min**, Median: **17.0 min**
- Candidate Target (`arrival_delay_min > 15`): **49.92%** positive class balance

### Important Caveats & Provenance
1. **Not multi-year historical data** — The narrow 19-day window severely limits temporal ML evaluation.
2. **Dates are in 2026** — Prospective/synthetic calendar dates. Data serves as an observed benchmark.
3. **Not a live feed** — Data is static; the platform is analytical and predictive, not operational tracking.
4. **Missing values in actuals** — `actual_arrival` (36.77%), `actual_departure` (36.69%), and delay columns contain NULLs.
5. **Negative delays are valid** — Early arrivals/departures; they must never be clipped to zero.
6. **One row = one train+station observation**, not a full journey.

---

## 4. Database Schema (Verified via INFORMATION_SCHEMA in Phase 2)

**Table:** `railsense.train_records` (Engine: InnoDB / TiDB Serverless, Primary Index on `id`)

| Column | Measured SQL Type | Nullable | Null % | Notes / Semantics |
|--------|-------------------|----------|--------|-------------------|
| `id` | `bigint(20)` | `NO` | 0.00% | Primary key, auto-increment |
| `train_number` | `varchar(20)` | `YES` | 0.00% | Train number (100% numeric format, length 4–5) |
| `train_name` | `varchar(150)` | `YES` | 0.00% | Commercial train name |
| `category` | `varchar(50)` | `YES` | 0.00% | Service class (MEX, SUB, MEMU, PAS, SUF, etc.) |
| `start_date` | `date` | `YES` | 0.00% | Origin start date (2026-10-07 to 2026-10-25) |
| `status` | `varchar(30)` | `YES` | 0.00% | Run operational status |
| `seq` | `smallint(6)` | `YES` | 0.00% | Stop sequence index in journey (1 to 194) |
| `station_code` | `varchar(20)` | `YES` | 0.00% | IRCTC station code (length 2–6 alphanumeric) |
| `scheduled_arrival` | `datetime` | `YES` | 5.29% | Scheduled arrival (IST); naturally NULL at origin (`seq=1`) |
| `scheduled_departure` | `datetime` | `YES` | 5.29% | Scheduled departure (IST); naturally NULL at terminus |
| `actual_arrival` | `datetime` | `YES` | 36.77% | Observed arrival (IST); NULL when unobserved |
| `actual_departure` | `datetime` | `YES` | 36.69% | Observed departure (IST); NULL when unobserved |
| `arrival_reported` | `tinyint(1)` | `YES` | 0.79% | Arrival reporting flag (1=reported, 0=not) |
| `departure_reported` | `tinyint(1)` | `YES` | 0.79% | Departure reporting flag (1=reported, 0=not) |
| `arrival_delay_min` | `int(11)` | `YES` | 36.78% | Arrival delay in minutes (negatives valid, range -2850 to 3690) |
| `departure_delay_min` | `int(11)` | `YES` | 36.70% | Departure delay in minutes (negatives valid) |
| `run_quality` | `float` | `YES` | 0.00% | Quality metric (0.0 to 1.0) |

---

## 5. Phase 2 Data Audit Outcomes & Quality Verification

Full execution artifacts are recorded in `docs/data_audit.json` and `docs/data_audit.md`.

1. **Schema & Indexes:** Verified 17 columns and 1 existing primary key index (`id`).
2. **Volume Match:** 100% exact match on total rows (2,805,574), distinct trains (10,743), names (6,816), stations (8,584), and 19-day date window.
3. **Delay Consistency:** 100,000-row deterministic sample (`ORDER BY id LIMIT 100000`) confirmed a 100.0% exact match between stored `arrival_delay_min` and `(actual_arrival - scheduled_arrival)`.
4. **UI Claims Comparison:**
   - Owner UI Claim "41.8% delayed > 15 min": **MISMATCH**. Real measured percentage is **49.92%** on all non-null rows (and 49.91% on reported-only rows). The classification problem is nearly 50/50 balanced!
   - Owner UI Claim "26.4 min average delay": **MISMATCH**. Real measured mean delay is **38.22 min** (median: 17.0 min).
5. **Validity & Integrity:**
   - Sequence uniqueness: 0 duplicate `(train_number, start_date, seq)` records.
   - Timetable integrity: 0 occurrences of `scheduled_departure < scheduled_arrival`.
   - Formats: 0 non-numeric train numbers, 0 non-alphanumeric station codes.
6. **Label Availability:** Origin stops (`seq=1`) naturally lack arrival delay (trains depart, not arrive); terminus stops naturally lack departure delay. Origin stops must be treated carefully in Phase 3.

---

## 6. Target Definition (Finalized in Phase 3)

**Formulation:** Schedule-Time (Pre-Run) Binary Delay Prediction:
$$\text{is\_delayed} = \mathbb{I}(\text{arrival\_delay\_min} > 15)$$

- **Primary Target:** Binary indicator where `is_delayed = 1` if `arrival_delay_min > 15`, else `0`.
- **Target Eligibility Masking:** Evaluated on rows where `arrival_delay_min IS NOT NULL`, `arrival_reported == 1`, `seq > 1` (origin stops excluded from arrival), and $|\text{arrival\_delay\_min}| \le 1440$ min (filters 211 date-wrap anomalies).
- **Class Balance:** Exactly **49.92%** delayed > 15 min on eligible records.
- **Negative Delay Handling:** Valid operational early arrivals are preserved and assigned to class `0` (never clipped).

---

## 7. Feature Engineering & Anti-Leakage Protocol (Finalized in Phase 3)

Implemented in `backend/app/ml/features.py` using scikit-learn transformers:
- **Schedule-Time Features:** `scheduled_hour`, `sin_hour`, `cos_hour`, `day_of_week`, `sin_dow`, `cos_dow`, `is_weekend`, `is_night`, `seq`, `log_seq`, `is_origin_adjacent`, `is_deep_journey`, and one-hot train categories.
- **Historical Rolling Priors:** Trailing historical aggregates smoothed with empirical Bayesian shrinkage: `train_hist_delay_rate`, `train_hist_mean_delay`, `station_hist_delay_rate`, `station_hist_mean_delay`, `category_prior_rate`, `category_prior_mean`.
- **Anti-Leakage Rule:** To eliminate multi-day journey lookahead (23.33% of stops occur on subsequent days), historical aggregates strictly enforce $\text{actual\_arrival} < \text{split\_cutoff\_date}$.
- **Banned Columns:** `actual_arrival`, `actual_departure`, `departure_delay_min`, `arrival_reported`, `departure_reported`, `status`, `run_quality`.

---

## 8. ML Experiment Plan & Split Strategy (Finalized in Phase 3)

### Evaluation Strategy
- **Strict Temporal Split by `start_date`:**
  - **Warm-Up:** `2026-10-07` (1,034 runs, 18k stops) — used strictly for rolling lag calculation.
  - **Train Split:** `2026-10-08` to `2026-10-20` (13 days, ~1.3M labelled stops).
  - **Validation Split:** `2026-10-21` to `2026-10-22` (2 days, 204,308 stops).
  - **Test Split:** `2026-10-23` to `2026-10-24` (2 days, 193,965 stops).
  - **Excluded / Censored:** `2026-10-25` (right-censored collection cut-off).
- Zero run overlap across splits.
- Cross-validation: Expanding-window rolling-origin temporal CV across train splits.

### Experiment Progression & Verified Test Outcomes (Phase 4 Verified)
| Model / Baseline | Paradigm | PR-AUC (Primary) | ROC-AUC | F1-Score | Precision | Recall | Brier Score | ECE |
|------------------|----------|------------------|---------|----------|-----------|--------|-------------|-----|
| Majority Prevalence | Baseline | 0.7460 | 0.5000 | 0.6595 | 0.4920 | 1.0000 | 0.2501 | 0.0127 |
| Category Prior | Baseline | 0.6168 | 0.6539 | 0.7101 | 0.5755 | 0.9270 | 0.2211 | 0.0086 |
| Train History Prior | Baseline | 0.8029 | 0.8177 | 0.7330 | 0.7214 | 0.7450 | 0.1738 | 0.0128 |
| Logistic Regression | Schedule-Time | 0.8372 | 0.8462 | 0.7619 | 0.7462 | 0.7782 | 0.1610 | 0.0260 |
| Random Forest (Bounded) | Schedule-Time | 0.8477 | 0.8548 | 0.7686 | 0.7561 | 0.7816 | 0.1555 | 0.0083 |
| LightGBM (Calibrated, Thresh 0.42) | Schedule-Time | **0.8525** | **0.8602** | **0.7798** | **0.7421** | **0.8215** | **0.1529** | **0.0183** |
| *En-Route LightGBM* | *En-Route Only* | *0.9293* | *0.9278* | *0.8527* | *0.8384* | *0.8675* | *0.1050* | *0.0122* |

### Final Model Selection
- **Selected Architecture:** LightGBM + Isotonic Calibration.
- **Decision Threshold:** `0.420` (optimized on validation to maximize F1).
- **Lift over 7-Day History Baseline:** **+6.18%** PR-AUC.

### Model Artefacts (backend/models/)
- `evaluation_model.joblib` (2.05 MB) & `deployment_model.joblib` (2.06 MB) → gitignored.
- `calibrator.joblib` (3.3 KB) & `en_route_model.joblib` (1.66 MB) → gitignored.
- `historical_tables.json` (2.44 MB) & `model_metadata.json` (1.5 KB) → git-tracked.
- `docs/MODEL_CARD.md` → verified and complete.

---

## 9. NLP Design (Phase 9)

**Approach:** Local, offline, no paid APIs, no hosted LLMs.

### Pipeline
1. **Intent classification** — TF-IDF vectoriser + trained classifier (e.g. Logistic Regression or SVM on a small hand-labelled set of ~50–100 query templates). Outputs: `query_delay_stats`, `query_train_info`, `query_station_info`, `query_comparison`, `unsupported`.
2. **Entity extraction** — RapidFuzz fuzzy matching against known train numbers, train names, station codes from the DB.
3. **Query construction** — Each recognised intent maps to a **pre-written parameterised SQL template**. Entities fill the parameters. No arbitrary SQL is ever constructed from user text.
4. **Fallback** — Ambiguous intent → ask for clarification. Unsupported intent → honest refusal message.

### Safety Constraints
- Only read-only `SELECT` queries are ever executed.
- All parameters are bound (not string-formatted) to prevent injection.
- The NLP module never constructs SQL from free-form text — only fills pre-defined templates.

---

## 10. Implemented REST API Endpoints (Phase 5 Complete)

All endpoints implemented, verified, and documented via OpenAPI 3.0 (`docs/openapi.yaml`, `docs/openapi.json`) and Swagger UI (`/api/docs`):

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/` | Service landing and documentation links | Verified |
| GET | `/api/health` | Lightweight liveness check | Verified |
| GET | `/api/health/ready` | Readiness probe (serving store, models, TiDB ping) | Verified |
| GET | `/api/overview` | Macro fleet-level KPIs and category distributions | Verified |
| GET | `/api/trains` | Paginated train catalog search (`q`, `category`, `page`) | Verified |
| GET | `/api/trains/<train_number>` | Route profile, stop-level observed delay stats, run history | Verified |
| GET | `/api/stations` | Paginated station catalog with Wilson confidence bounds | Verified |
| GET | `/api/stations/<station_code>` | Station delay metrics, category mix, calling trains sample | Verified |
| GET | `/api/patterns/<kind>` | Temporal & spatial distributions (`hour`, `dow`, `category`, `position`, `hotspots`) | Verified |
| GET | `/api/model/info` | Deployment model architecture, split boundaries, features | Verified |
| GET | `/api/model/metrics` | Model lab benchmark, AP/ROC metrics, PR curves, importance | Verified |
| POST | `/api/predict` | Pre-departure delay prediction with calibrated risk band | Verified |
| GET | `/api/openapi.json` | OpenAPI 3.0 specification | Verified |
| GET | `/api/docs` | Interactive Swagger UI documentation | Verified |
| POST | `/api/insights/query` | Local NLP query engine (Reserved for Phase 9) | Phase 9 |

---

## 11. Frontend Architecture & Folder Plan (Implemented in Phase 6)

```
frontend/
├── src/
│   ├── api/                ← HTTP client, endpoints, error parsing
│   ├── components/
│   │   ├── layout/         ← Sidebar, AppShell, PageHeader
│   │   ├── ui/             ← Card, StatCard, Badge, Skeleton, Spinner, ErrorState, EmptyState, DefinitionNote, ChartCard
│   │   └── watermarks/     ← Subtle railway SVG vector watermarks (4-6% opacity)
│   ├── config/             ← Application & creator attribution single sources of truth
│   ├── hooks/              ← useApi, useReadiness (resilient polling & visibility awareness)
│   ├── pages/              ← Overview, TrainExplorer, DelayPrediction, ModelLab, DelayPatterns, SmartInsights, DesignSystem, NotFound, ErrorBoundary
│   ├── test/               ← Vitest unit & integration test suites
│   ├── utils/              ← Indian localized formatters (formatNumber, formatPercent, formatMinutes, formatDate)
│   ├── App.jsx             ← React Router v6 shell with lazy routing & suspense
│   ├── main.jsx            ← React 18 root mount
│   └── index.css           ← Tailwind CSS directives & accessibility resets
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### Design System (Implemented in Phase 6, Scaled in Phase 6.1)
Documented fully in `docs/UI_DESIGN_SYSTEM.md`. Follows the fixed design tokens: Sidebar Navy (`#0B132B`), Main Canvas (`#F8FAFC`), Card Surface (`#FFFFFF`), Primary (`#2563EB`), Danger (`#EF4444`), Warning (`#F59E0B`), and Success (`#10B981`). Uses plain JavaScript (JSX) exclusively (Decision D-11) with an 18px base scale (112.5%).

### Phase 7 Implementation Status: COMPLETE
- **Tab 1: Overview Dashboard ("Railway at a Glance")**: Connected live to `/api/overview`. Features 5 macro volume StatCards, 5 delay performance StatCards, daily delayed rate trendline with 49.9% fleet baseline, 8-tier delay distribution histogram, category comparison chart with low-support annotations (< 30 stops), view-as-table toggles, and educational boundary principles collapsible.
- **Tab 2: Train Explorer ("Single Train Deep Dive")**: Connected live to `/api/trains` and `/api/trains/<train_number>` with deep linking (`/explorer` & `/explorer/:trainNumber`). Features debounced search, category filter, paginated catalog, train summary header, timetable table keyed strictly by `seq` (handling 200 circular routes), stop delay progression line chart, and per-date run history chart with boundary markers.
- **Frontend Test Suite**: 43 tests passing across 8 files in Vitest; ESLint 0 errors, 0 warnings; Vite production build passes cleanly.

---

## 12. Deployment Architecture (Phase 11)

| Component | Platform | Notes |
|-----------|----------|-------|
| React frontend | Vercel (free tier) | Static build, `VITE_API_BASE_URL` set in Vercel env |
| Flask API | Render (free tier) or Railway | Python runtime; env vars set in Render dashboard |
| Database | TiDB Cloud (existing) | No migration needed; data already loaded |

---

## 13. Known Limitations

1. **Narrow data window (~19 days)** — Limits generalisability and temporal ML evaluation depth.
2. **No live data** — Platform is retrospective/analytical only.
3. **Potential synthetic data** — 2026 dates are unusual; provenance unconfirmed.
4. **Missing actuals** — High NULL rates in delay columns may reduce usable training rows significantly.
5. **Free-tier deployment limits** — Render free tier spins down after inactivity; first request may be slow.
6. **No causal inference** — Model is correlational; delay causes are not established.

---

## 14. Future Improvements (Post-Phase 11)

- Integration with a live NTES/PNR API for real-time delay updates.
- Multi-year dataset for more robust temporal modelling.
- Regression model for delay magnitude (not just binary classification).
- spaCy NER for richer entity extraction.
- User-facing export (CSV/PDF of analytics).
- ~~TypeScript migration~~ — Frontend uses plain JavaScript (JSX); TypeScript is NOT used (final decision, Phase 2).
