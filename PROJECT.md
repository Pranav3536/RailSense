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

## 6. Target Definition

**Candidate target:** `arrival_delay_min > 15` → binary label `is_significantly_delayed` (1 = late by more than 15 min, 0 = on time or less than 15 min late).

> **TBD pending Phase 3 EDA.** The threshold (15 minutes) and the choice of `arrival_delay_min` vs `departure_delay_min` will be confirmed only after examining:
> - The delay distribution (percentiles, skew, class balance at different thresholds).
> - NULL rate in the target column (rows with NULL target must be excluded or imputed deliberately).
> - Whether the problem is better framed as regression or classification.

---

## 7. Feature Engineering (TBD — Phase 3)

> All features below are CANDIDATES. Final set determined after EDA and leakage review.

### Leakage-Prevention Rules (non-negotiable)
- **NEVER use `actual_arrival`, `actual_departure` as features** — they are the result of the event being predicted.
- **NEVER use `arrival_delay_min` or `departure_delay_min` directly as features** — they are or derive from the label.
- **NEVER use `run_quality`** as a feature if it is computed from the same journey's outcomes.
- Historical aggregates (e.g., average delay for this train over prior dates) must be computed using only data from **earlier** dates, not the current row's date.
- Preprocessing (scalers, encoders) must be fitted on training data only and applied to validation/test data.

### Candidate Feature Groups
| Group | Candidate Features | Leakage Risk |
|-------|--------------------|--------------|
| Schedule | `scheduled_arrival` hour, `scheduled_departure` hour, day of week, weekend flag | None |
| Journey position | `seq` (station sequence number), is_first_stop, is_last_stop | None |
| Train identity | `train_number` (encoded), `category` (encoded) | None |
| Route | `station_code` (encoded or embedded) | None |
| Historical aggregates | Mean/median delay for this `train_number` on prior dates | Must use prior-date-only data |
| Historical aggregates | Mean delay at this `station_code` on prior dates | Must use prior-date-only data |
| Lag features | Delay at previous station in this run (TBD — careful with ordering) | Moderate — assess carefully |

---

## 8. ML Experiment Plan

### Evaluation Strategy
- **Do NOT use random row splits.** Rows within the same train run are correlated.
- **Preferred: temporal split** — Train on earlier dates, validate/test on later dates.
- **Alternative: train-grouped split** — Hold out entire train numbers.
- The final strategy will be decided in Phase 3 based on data distribution.

### Experiment Progression
| Step | Model | Purpose |
|------|-------|---------|
| 1 | Majority-class / prior probability baseline | Sanity check; all metrics must beat this |
| 2 | Logistic Regression | Interpretable linear baseline |
| 3 | Random Forest | Non-linear; built-in feature importance |
| 4 | LightGBM | High-performance; target for production if compatible |

### Metrics
- **Primary:** F1-score (macro or positive-class, TBD based on class balance)
- **Secondary:** Precision, Recall, PR-AUC (average precision), Confusion Matrix
- **Why not just Accuracy:** Class imbalance expected; accuracy is misleading.
- **SHAP:** Feature attribution for the best model (Phase 4).

### Model Artefacts
- Model binaries (`.joblib`) → gitignored; stored in `backend/models/`
- Model metadata (thresholds, feature names, eval metrics) → small JSON → git-tracked
- `MODEL_CARD.md` → created in Phase 4

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

## 10. Planned API Endpoints (Phase 5)

> All URLs are tentative — to be confirmed in Phase 5.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/overview/stats` | Fleet-level KPIs |
| GET | `/api/trains` | Paginated train list |
| GET | `/api/trains/<train_number>` | Single train detail + delay history |
| GET | `/api/stations` | Paginated station list |
| GET | `/api/stations/<station_code>` | Single station delay stats |
| POST | `/api/predict` | Delay prediction for a given train+station+schedule |
| GET | `/api/model/info` | Model card metadata |
| GET | `/api/patterns/delay-by-category` | Delay stats grouped by category |
| GET | `/api/patterns/delay-by-hour` | Delay stats grouped by scheduled hour |
| POST | `/api/insights/query` | NLP query → structured result |

---

## 11. Frontend Architecture & Folder Plan (Phase 6)

```
frontend/
├── src/
│   ├── components/         ← Shared UI components (cards, charts, badges)
│   ├── pages/              ← One folder per tab
│   │   ├── Overview/
│   │   ├── TrainExplorer/
│   │   ├── DelayPrediction/
│   │   ├── ModelLab/
│   │   ├── DelayPatterns/
│   │   └── SmartInsights/
│   ├── hooks/              ← Custom React hooks (data fetching, etc.)
│   ├── lib/                ← API client, utilities
│   └── styles/             ← Tailwind config overrides
├── public/                 ← Static assets (SVG watermarks)
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### Design System (implement Phase 6)
See `task.md` Section 2 for the full colour palette, watermark spec, sidebar layout, and brand identity rules.

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
