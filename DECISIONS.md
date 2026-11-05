# RailSense — Architecture Decision Log (DECISIONS.md)

Each entry records a decision, its rationale, and trade-offs considered. New decisions should be appended here with a sequential ID and date.

---

## Decision Index

| ID | Decision | Phase Decided |
|----|----------|--------------|
| D-01 | React as UI-only presentation layer | Phase 1 |
| D-02 | Flask + Python for all data, ML and NLP logic | Phase 1 |
| D-03 | TiDB Cloud as sole application data source | Phase 1 |
| D-04 | No dataset upload feature | Phase 1 |
| D-05 | Temporal / train-grouped evaluation instead of random row split | Phase 1 |
| D-06 | Local NLP with safe parameterised query templates | Phase 1 |
| D-07 | Target and features decided only after Phase 3 EDA | Phase 1 |
| D-08 | Phased delivery gated by verification | Phase 1 |
| D-09 | Honest UI — no fabricated statistics or unverified claims | Phase 1 |
| D-10 | Monorepo layout (backend + frontend + docs + notebooks) | Phase 1 |
| D-11 | Frontend uses plain JavaScript (JSX), NOT TypeScript | Phase 2 |
| D-12 | Read-only query guard for all DB access | Phase 2 |
| D-13 | TLS With Certificate Verification Always ON | Phase 2 |
| D-14 | Run defined as (train_number, start_date) | Phase 2 |
| D-15 | Deterministic 100k-Row Sampling for Delay Consistency Check | Phase 2 |
| D-16 | Local Parquet Extraction Cache for EDA & ML Modeling | Phase 3 |
| D-17 | Schedule-Time Binary Classification Target at >15 Min Threshold | Phase 3 |
| D-18 | Temporal Split Protocol & Multi-Day In-Flight Anti-Leakage Rule | Phase 3 |
| D-19 | Explicit Validation & Label Eligibility Masking (No Silent Row Deletion) | Phase 3 |
| D-20 | Empirical Bayesian Smoothing for Cold-Start Trains and Stations | Phase 3 |
| D-21 | Final Model Choice: LightGBM Gradient Boosted Decision Trees | Phase 4 |
| D-22 | Decision Threshold Selection Policy: 0.420 on Validation | Phase 4 |
| D-23 | Probability Calibration via Isotonic Regression on Validation | Phase 4 |
| D-24 | Evaluation Model vs Deployment Model Refitting Policy | Phase 4 |
| D-25 | Formulation 2 En-Route Model Segregation | Phase 4 |
| D-26 | Precomputed Read-Only SQLite Serving Store Architecture | Phase 5 |
| D-27 | Average Precision (AP) Replaces Trapezoid PR-AUC for Constant Baselines | Phase 5 |
| D-28 | Operational Threshold Policy: Balanced F1 (0.410) & High-Recall (0.455) | Phase 5 |
| D-29 | Strict Non-Causal Attribution Phrasing Across API & Documentation | Phase 5 |
| D-30 | Fixed UI Design System Palette & Surface Architecture | Phase 6 |
| D-31 | Phase 6 Honest Placeholder Architecture & Zero Synthetic Claims | Phase 6 |
| D-32 | Client-Side In-Flight Request Deduplication & TTL Caching | Phase 6 |
| D-33 | Global UI Scale-Up (112.5% Root, Typography Tokens & Chart Theme) | Phase 6.1 |
| D-34 | Overview & Train Explorer Real API Ingestion with Normalization Adapters | Phase 7 |
| D-35 | Sequence Number (seq) Primary Keying for Stop Progression | Phase 7 |
| D-36 | Boundary Days Temporal Marking (Left-Truncated & Right-Censored) | Phase 7 |
| D-59 | Model Lab Polish, Measured Inference Latency, LaTeX Removal & Feature Ordering | Phase 11.5 |

---

## D-01 — React as UI-Only Presentation Layer

**Decision:** The React frontend contains no data logic, no ML code, and no direct database access. It only calls the Flask API and renders the results.

**Rationale:**
- Keeps all sensitive logic (credentials, query construction, model inference) server-side.
- Allows the DS/ML work to be demonstrated independently of the UI.
- Simpler security model: the frontend can be fully public without leaking any capability.
- The portfolio value is in the Python backend; React is the delivery mechanism.

**Trade-offs:**
- Every analytics view requires a round-trip to the API (acceptable for this project scale).
- Cannot run the app purely client-side (e.g., on GitHub Pages without a backend).

---

## D-02 — Flask + Python for All Data, ML and NLP Logic

**Decision:** The backend is Python + Flask. All EDA, feature engineering, model training, inference, and NLP run in Python. No JS data libraries are used server-side.

**Rationale:**
- Python has the deepest ecosystem for DS/ML (Pandas, scikit-learn, LightGBM, SHAP, etc.).
- Flask is lightweight, easy to understand, and well-suited to a solo portfolio project.
- Keeps the stack coherent: the same language used for analysis is used to serve results.
- Demonstrates genuine Python backend engineering, not just "glue" code.

**Trade-offs:**
- Flask is not async by default; for high concurrency a different framework (FastAPI) would be better. Acceptable for portfolio scale.
- More boilerplate than FastAPI for typed schemas; may switch in a future phase if needed.

**Alternative considered:** FastAPI — rejected because Flask is simpler and sufficient for this scale. May revisit in Phase 11.

---

## D-03 — TiDB Cloud as Sole Application Data Source

**Decision:** All application data comes from the existing TiDB Cloud `railsense.train_records` table. No other databases, CSVs, or APIs are used at runtime.

**Rationale:**
- Demonstrates real-world database engineering (cloud-hosted, TLS, connection pooling, parameterised queries).
- Prevents data inconsistency from multiple sources.
- Data is already loaded; no re-ingestion pipeline is needed.
- TiDB is MySQL-compatible, so standard SQLAlchemy / PyMySQL tooling applies.

**Trade-offs:**
- All features that require data must go through the DB; no cached flat file fallback.
- Query performance depends on TiDB indexing (to be verified in Phase 2).
- Free-tier TiDB has connection and row limits (to be checked in Phase 2).

---

## D-04 — No Dataset Upload Feature

**Decision:** RailSense has no endpoint or UI to upload new data. The dataset is fixed at what is already in TiDB.

**Rationale:**
- Prevents the security risks of accepting arbitrary file uploads.
- Prevents data corruption from inconsistently formatted uploads.
- Keeps the scope focused on analysis and ML rather than ETL pipeline engineering.
- Consistent with the project brief.

**Trade-offs:**
- The platform cannot be updated with newer data without direct DB operations.
- A future improvement (Phase 11+) could add a secure admin-only ingestion script.

---

## D-05 — Temporal / Train-Grouped Evaluation Instead of Random Row Split

**Decision:** ML evaluation uses a temporal split (train on earlier dates, test on later dates) or a train-number-grouped split. Random shuffling of rows is NOT used as the primary evaluation strategy.

**Rationale:**
- Rows within the same train run (same `train_number` + `start_date`) are strongly correlated (a delayed train stays delayed station-to-station). A random split would leak this correlation into the test set, producing over-optimistic metrics.
- Temporal splitting better simulates the real deployment scenario: the model is trained on past data and predicts future delays.
- The 19-day window is narrow, so the evaluation strategy must be stated honestly in the model card.

**Trade-offs:**
- Smaller effective test set (cannot use cross-validation easily with temporal data).
- May have fewer positive examples in a pure time-based split depending on delay distribution across dates.
- If dates are synthetic, the "temporal" ordering may not reflect genuine time evolution — this will be noted in the model card.

**Alternative considered:** K-fold cross-validation on rows — rejected due to leakage risk from correlated runs.

---

## D-06 — Local NLP with Safe Parameterised Query Templates

**Decision:** The Smart Insights tab uses TF-IDF intent classification + RapidFuzz entity matching + pre-written parameterised SQL templates. No paid API (e.g. OpenAI) is used. No arbitrary SQL is constructed from user text.

**Rationale:**
- Free-tier deployment constraint: no budget for a paid LLM API at runtime.
- Security: LLM-generated SQL is prone to injection or scope-creep queries; pre-written templates are auditable.
- Demonstrates practical NLP skills (text classification, fuzzy matching) that are relevant to DS roles.
- Honest capability: the system clearly states when it cannot answer a query rather than hallucinating.

**Trade-offs:**
- Cannot answer arbitrary or novel questions outside the template set.
- Requires maintaining a list of query templates and intent training examples.
- Fuzzy entity matching may fail on very unusual train names/codes.

**Alternative considered:** OpenAI/Gemini API for NL-to-SQL — rejected (paid, runtime dependency, security risk).

---

## D-07 — Target and Features Decided Only After Phase 3 EDA

**Decision:** The ML target variable and feature set are formally specified only in Phase 3, after running EDA on the actual data.

**Rationale:**
- Committing to a target before seeing the data risks choosing an unusable label (e.g., if `arrival_delay_min` is 80% NULL, a different target may be needed).
- Class balance, NULL rates, and value distributions all affect what is learnable.
- Demonstrates good data science practice: design follows data, not the other way around.

**Candidate target (not yet final):** `arrival_delay_min > 15` → binary label `is_significantly_delayed`.

**Trade-offs:**
- Delays a full ML pipeline specification until Phase 3.
- Documents a clear candidate to frame the work without over-committing.

---

## D-08 — Phased Delivery Gated by Verification

**Decision:** The project is divided into 11 explicit phases. Each phase ends with documented verification checks. Phase N+1 does not begin until Phase N is verified.

**Rationale:**
- Prevents building on unverified foundations (e.g., assuming schema is correct before connecting to the DB).
- Produces a `task.md` that any AI session or human collaborator can use to resume work.
- Mirrors real engineering practice (milestones, gates, documented handover).
- Allows early discovery of blockers (e.g., TiDB connectivity, LightGBM compatibility).

**Trade-offs:**
- Slower initial progress; no "quick demo" possible until Phase 6+.
- Requires discipline not to skip ahead.

---

## D-09 — Honest UI — No Fabricated Statistics or Unverified Claims

**Decision:** Every number, metric, and statistic shown in the UI must come from the actual database or trained model. No hardcoded "demo" values are ever shown as if real. Unimplemented features are clearly labelled "not yet implemented" or hidden.

**Rationale:**
- Integrity: showing fabricated accuracy scores or fake row counts would be dishonest to interviewers.
- A portfolio project is most impressive when it is transparent about what is real and what is planned.
- Fabricated numbers are trivially exposed in a technical interview.

**Specific rules:**
- Dataset badge: "Observed Railway Dataset" (not "Real-time" or "Live").
- Sidebar footer: truthful DB status; creator card with real GitHub link only.
- No fake photo, fabricated GitHub stats, or invented quota usage.

**Trade-offs:**
- The UI may look sparse early in development (empty charts vs. fake placeholder data).
- Loading states and "no data yet" placeholders must be built carefully.

---

## D-10 — Monorepo Layout

**Decision:** Backend, frontend, docs, and notebooks all live in a single git repository under `c:\RailSense\`.

**Rationale:**
- Easier to cross-reference code, docs, and notebooks in a solo project.
- Single commit history shows the full project evolution.
- Simpler for a portfolio reviewer to clone and understand the whole project.
- No need for complex multi-repo tooling at this scale.

**Trade-offs:**
- As the project grows, `git clone` includes all assets (notebooks, EDA plots). Acceptable for portfolio scale.
- Frontend and backend have separate dependency trees (`requirements.txt` vs `package.json`) — managed by being in separate subdirectories.

**Alternative considered:** Separate frontend and backend repos — rejected as unnecessary complexity for a solo portfolio project.


---

## D-11 — Frontend Uses Plain JavaScript (JSX), NOT TypeScript

**Date decided:** 2026-10-29 (Phase 2)

**Decision:** The React frontend is written entirely in plain JavaScript with JSX. TypeScript is explicitly NOT used and will not be added.

**Rationale:**
- RailSense is an end-to-end Data Science / ML / NLP project. Python, Flask, scikit-learn, and local NLP are the core technical contributions. React is the presentation layer only.
- TypeScript adds non-trivial setup overhead (tsconfig, type definitions for every library, type errors during rapid iteration) with limited benefit for a solo DS portfolio project where the frontend is display-only.
- Plain JSX is idiomatic React, fully supported by Vite, and easier to understand for a reviewer who is evaluating DS/ML skills rather than frontend engineering depth.
- Keeps the project scope focused on the data science deliverables.

**Trade-offs:**
- No compile-time type safety in the frontend. Acceptable because: (a) React is not the core value of the project; (b) prop-types or JSDoc comments can partially substitute; (c) the frontend makes simple API calls and renders data — type errors are unlikely to be the failure mode.
- A TypeScript migration is removed from the "future improvements" list.

**Alternative considered:** TypeScript (previously planned, marked "decided in Phase 6") — REJECTED. This is a final decision; do not re-open in later phases.

---

## D-12 — Read-Only Query Guard for All DB Access

**Date decided:** 2026-10-29 (Phase 2)

**Decision:** All database queries in the application go through a read-only guard function that whitelists only `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, and `WITH … SELECT` statements. It rejects multi-statement inputs (semicolons), DDL/DML, comment-based bypass attempts, and empty queries.

**Rationale:**
- The TiDB database contains production-like data that must never be modified by application code.
- Even without a separate read-only DB user, a software guard provides defence-in-depth.
- Prevents accidental writes during development or testing.
- Demonstrates secure query handling practice relevant to DS engineering roles.

**Trade-offs:**
- Regex-based guards are not a substitute for a dedicated read-only DB user (which should be set up if possible). The guard is a defence-in-depth layer, not the only control.
- The guard adds a small overhead per query (negligible).

---

## D-13 — TLS With Certificate Verification Always ON

**Date decided:** 2026-10-29 (Phase 2)

**Decision:** All connections to TiDB Cloud use TLS with certificate verification enabled. `verify_mode=CERT_REQUIRED` is always set. Certificate verification is NEVER disabled, not even in development.

**Rationale:**
- TiDB Cloud is a remote hosted database; all traffic crosses the public internet.
- Disabling certificate verification (`ssl_verify_cert=False`) exposes the connection to man-in-the-middle attacks.
- Disabling verification is a common but dangerous shortcut — demonstrating it is always ON is a positive signal in a portfolio project.
- Uses the system trust store or `certifi` bundle by default; `TIDB_CA_PATH` can override for a specific CA cert.

**Trade-offs:**
- If the CA cert is not trusted by the system, the connection will fail (intentionally). The resolution is to configure `TIDB_CA_PATH`, not to disable verification.

---

## D-14 — Run Defined as (train_number, start_date)

**Date decided:** 2026-10-29 (Phase 2)

**Decision:** A "run" (one complete train journey) is defined as the combination of `(train_number, start_date)`. This is the unit for grouping station-level rows into journey-level analyses.

**Rationale:**
- The data has one row per (train, station) observation within a journey.
- `(train_number, start_date)` is the natural primary grouping: the same physical train makes the same route every day; `start_date` distinguishes journeys across days.
- This definition is used for: run-level statistics, leakage-safe train-grouped splits, and sequential analysis of delay propagation along a route.

**Trade-offs:**
- If a train has multiple runs per day (unlikely for Indian Railways mainline trains but possible for short-haul services), this definition would conflate them. Will be checked in Phase 3 by examining whether any (train_number, start_date, station_code) has multiple rows.

---

## D-15 — Deterministic 100k-Row Sampling for Delay Consistency Check

**Date decided:** 2026-10-29 (Phase 2)

**Decision:** The audit check that compares stored `arrival_delay_min`/`departure_delay_min` to the value recomputed from timestamps uses a deterministic sample of 100,000 rows, selected by `ORDER BY id LIMIT 100000` (the first 100k by primary key).

**Rationale:**
- A full-table computation on ~2.8M rows with DATEDIFF arithmetic is expensive on a free-tier TiDB cluster and would risk timeouts or excessive usage.
- 100k rows is large enough to detect systematic mismatches (midnight rollover, timezone offset, rounding) while being query-safe.
- Using `ORDER BY id` makes the sample deterministic and reproducible across audit runs.
- The sampling method and size are documented in the audit output so readers know the scope.

**Trade-offs:**
- The sample covers only ~3.6% of rows; edge cases in the tail may be missed. This is acceptable for an audit / EDA purpose; a full check can be done in Phase 3 if needed.
- Using the first 100k by id may not be representative of the full distribution if data was loaded in non-random order. The limitation is noted in the audit output.

---

## D-16 — Local Parquet Extraction Cache for EDA & ML Modeling

**Date decided:** 2026-10-29 (Phase 3)

**Decision:** Read-only full extraction of all 2,805,574 rows from TiDB Cloud partitioned into 19 daily parquet files (`backend/data_cache/train_records_{date}.parquet`, Snappy-compressed, ~44.6 MB total) strictly git-ignored. All downstream EDA, feature computation, and model training iterate over local parquet files without burdening TiDB Cloud.

**Rationale:**
- Repeated full-table scans across 2.8M rows risk hitting TiDB Cloud free-tier query/RU quota limits and incurring latency.
- Columnar parquet reads are orders of magnitude faster (seconds vs minutes) and memory-bounded.
- TiDB remains the authoritative primary database of record.

---

## D-17 — Schedule-Time Binary Classification Target at >15 Min Threshold

**Date decided:** 2026-10-29 (Phase 3)

**Decision:** The primary machine learning target is binary delay classification: $\text{is\_delayed} = 1$ if $\text{arrival\_delay\_min} > 15$, else $0$. Models operate in a **Schedule-Time (Pre-Run)** setting, using only scheduled timetable attributes and strictly historical rolling priors.

**Rationale:**
- 15 minutes aligns with Indian Railways punctuality tolerance thresholds.
- Pre-run prediction offers maximum utility for passengers planning trips prior to departure.
- En-route prediction is strictly segregated as an optional secondary task.

---

## D-18 — Temporal Split Protocol & Multi-Day In-Flight Anti-Leakage Rule

**Date decided:** 2026-10-29 (Phase 3)

**Decision:** Splitting is performed chronologically on journey `start_date`:
- Warm-up: `2026-10-07` (1 day, 18k labelled rows; historical warm-up only)
- Train: `2026-10-08` to `2026-10-20` (13 days, ~1.3M labelled rows)
- Validation: `2026-10-21` to `2026-10-22` (2 days, ~204k labelled rows)
- Test: `2026-10-23` to `2026-10-24` (2 days, ~194k labelled rows)
- Excluded: `2026-10-25` (right-censored collection cut-off).
To prevent multi-day journey leakage (where 23.3% of stops occur on subsequent calendar days), historical feature aggregations strictly enforce $\text{actual\_arrival} < \text{cutoff\_date}$.

---

## D-19 — Explicit Validation & Label Eligibility Masking (No Silent Row Deletion)

**Date decided:** 2026-10-29 (Phase 3)

**Decision:** Data validation rules mask rows for evaluation without deleting them from the database:
- Eligible label mask: `arrival_delay_min IS NOT NULL`, `arrival_reported == 1`, `seq > 1` (origin stops cannot have arrival), and $|\text{arrival\_delay\_min}| \le 1440$ min (filters 211 corrupt date-wrap / 24h+ anomalies).
- Negative delays are valid operational early arrivals and are never clipped.
- Duplicate stop keys `(train_number, start_date, seq)` are 0; circular repeated stations `(train_number, start_date, station_code)` (22,064 rows) are preserved.

---

## D-20 — Empirical Bayesian Smoothing for Cold-Start Trains and Stations

**Date decided:** 2026-10-29 (Phase 3)

**Decision:** Unseen or low-support trains in validation/test splits are smoothed via Laplace/Bayesian shrinkage: train priors shrink toward category priors with weight $m=10$; station priors shrink toward global priors with weight $m=20$. Zero test rows are dropped due to missing prior history.

---

## D-21 — Final Model Choice: LightGBM Gradient Boosted Decision Trees

**Date decided:** 2026-10-29 (Phase 4)

**Decision:** The primary machine learning engine for RailSense delay prediction is LightGBM (`num_leaves=63`, `learning_rate=0.08`, `max_depth=8`, `min_child_samples=50`, early stopping best iteration `298`).

**Rationale:**
- Outperformed Logistic Regression (0.8525 vs 0.8372 PR-AUC on test) and Random Forest (0.8525 vs 0.8477).
- Trains in seconds on hundreds of thousands of rows while maintaining sub-millisecond inference latency.
- Seamless integration with SHAP `TreeExplainer` for localized and global explanations.

---

## D-22 — Decision Threshold Selection Policy: 0.420 on Validation

**Date decided:** 2026-10-29 (Phase 4)

**Decision:** The default binary decision threshold is set to `0.420`, tuned strictly on the Validation split to maximize F1-score (`0.7798` on Test).

**Rationale:**
- The default 0.50 threshold yields 79.1% recall. Lowering threshold to 0.420 increases recall to 82.2% with 74.2% precision.
- In passenger trip planning, missing a delay (false negative) causes missed trains and connections; a slight threshold tilt toward recall provides higher practical user utility.

---

## D-23 — Probability Calibration via Isotonic Regression on Validation

**Date decided:** 2026-10-29 (Phase 4)

**Decision:** Output probabilities from LightGBM are calibrated using Isotonic Regression fitted strictly on Validation split probabilities.

**Rationale:**
- Raw tree probabilities can be overconfident near decision boundaries.
- Isotonic regression reduced Expected Calibration Error (ECE) from 0.0338 down to 0.0035 on Validation without degrading PR-AUC ranking ($0.8525$).
- Calibrated probabilities ensure the UI dashboard accurately presents statements like "70% probability of delay".

---

## D-24 — Evaluation Model vs Deployment Model Refitting Policy

**Date decided:** 2026-10-29 (Phase 4)

**Decision:** We maintain two strictly separated models:
1. `evaluation_model.joblib`: Fitted strictly on Train (`2026-10-08` to `2026-10-20`). Used for all reported test benchmark metrics in `MODEL_CARD.md`.
2. `deployment_model.joblib`: Refitted with the exact same hyperparameters and best iteration (`298`) on Train + Validation (`2026-10-08` to `2026-10-22`). Used strictly for real-time serving in Phase 5+.
No test metrics are ever reported for the deployment model.

---

## D-25 — Formulation 2 En-Route Model Segregation

**Date decided:** 2026-10-29 (Phase 4)

**Decision:** An en-route model incorporating adjacent stop observed lag (`prev_stop_arrival_delay_min`) is trained and evaluated as a distinct secondary model (`en_route_model.joblib`, PR-AUC `0.9293`). It is never conflated with the pre-run schedule-time model.

---

## D-26 — Precomputed Read-Only SQLite Serving Store Architecture

**Date decided:** 2026-10-29 (Phase 5)

**Decision:** All request-time application queries (catalogs, routes, schedules, stop-level observed statistics, station metrics, empirical patterns) are served strictly from a precomputed local SQLite database (`backend/serving/serving.sqlite`, 39.03 MB) and static JSON analytics documents (`overview.json`, `patterns.json`, `model_lab.json`) built offline by `backend/scripts/build_serving_data.py`. Live TiDB Cloud is accessed at runtime exclusively for a bounded 3-second `SELECT 1` readiness health probe.

**Rationale:**
- TiDB Cloud table `train_records` has only a `PRIMARY KEY (id)` index; creating composite indexes or executing full-table aggregations at runtime is forbidden and would quickly exhaust connection pools and trigger slow query timeouts.
- Precomputed SQLite indexed B-trees deliver sub-5ms response times (measured p50: 2.1ms) while keeping RAM consumption under 10 MB, well within Render's 512 MB free-tier limit.

---

## D-27 — Average Precision (AP) Replaces Trapezoid PR-AUC for Constant Baselines

**Date decided:** 2026-10-29 (Phase 5)

**Decision:** The primary precision-recall ranking metric is evaluated using `sklearn.metrics.average_precision_score` rather than composite trapezoidal `auc(recall, precision)` integration over interpolated curves.

**Rationale:**
- Calculating trapezoidal area over `precision_recall_curve` on a constant majority baseline connects $(0, 1.0)$ to $(1.0, p)$, producing an artificial diagonal triangle of area $\frac{1 + p}{2} \approx 0.7460$.
- `average_precision_score` correctly evaluates constant predictors to exactly their positive prevalence ($p = 0.4920$), accurately demonstrating the machine learning model's true +72.40% relative lift over random/majority baseline and +4.95% over the strong train historical prior ($0.8082$).

---

## D-28 — Operational Threshold Policy: Balanced F1 (0.410) & High-Recall (0.455)

**Date decided:** 2026-10-29 (Phase 5)

**Decision:** In the REST API `/api/predict` endpoint and model metadata, the calibrated model operational threshold is formally set to `0.410` (maximizing F1 score at 0.7782, Recall 82.03%, Precision 74.02% on untouched Test partition), with an alternative threshold `0.455` for applications requiring $\ge 80\%$ recall. Calibrated probabilities reflect true historical empirical frequencies.

---

## D-29 — Strict Non-Causal Attribution Phrasing Across API & Documentation

**Date decided:** 2026-10-29 (Phase 5)

**Decision:** All API responses, factor explanations, documentation, and error messages strictly enforce non-causal language. Terms like "bottleneck", "congestion causes", "delayed because of weather" are banned. Valid phrasing: "observed delay hotspot", "associated with elevated delay", "what the model uses".

---

## D-30 — Fixed UI Design System Palette & Surface Architecture

**Date decided:** 2026-10-30 (Phase 6)

**Decision:** The frontend adheres strictly to the fixed design system: Sidebar Navy (`#0B132B`), Main Canvas (`#F8FAFC`), Card Surface (`#FFFFFF`, `border-slate-200`, `shadow-sm`, `rounded-xl`), Primary Accent (`#2563EB`), Danger / Delayed (`#EF4444`), Warning / Moderate (`#F59E0B`), and Success / On-Time (`#10B981`). The dark palette proposal (`#0A192F` / `#112240` / `#CCD6F6`) is explicitly rejected. Decorative elements include subtle inline railway SVG watermarks at 4–6% opacity that never impair text readability.

---

## D-31 — Phase 6 Honest Placeholder Architecture & Zero Synthetic Claims

**Date decided:** 2026-10-30 (Phase 6)

**Decision:** Scope for Phase 6 is strictly limited to the design system, app shell, API client, and truthful status card. The 6 tab pages are implemented as honest placeholders clearly labeled "Planned in Phase N" with bulleted lists of planned analytical capabilities and preflight-verified API endpoints. Under no circumstances are mock numbers, unverified owner claims (e.g. 41.8%, 26.4 min), or synthetic placeholder charts rendered.

---

## D-32 — Client-Side In-Flight Request Deduplication & TTL Caching

**Date decided:** 2026-10-30 (Phase 6)

**Decision:** The frontend API fetch wrapper (`src/api/client.js`) implements an in-flight Promise map (`inFlightRequests`) to deduplicate simultaneous identical GET requests (mitigating React 18 StrictMode double-invocations), combined with configurable in-memory TTL caching. This protects the backend from superfluous requests and strictly respects the 120 req/min rate limit.

---

## D-33 — Global UI Scale-Up (112.5% Root, Typography Tokens & Recharts Theme)

**Date decided:** 2026-10-30 (Phase 6.1)

**Decision:** In response to owner feedback that UI text and controls appeared too small, the application is scaled up by +12.5% across all components:
1. Root font-size is raised to `112.5%` (18px base) in `src/index.css` (with 106.25% / 17px fallback on phones under 400px width).
2. The typography scale is standardized with strict minimum text thresholds: no meaningful text renders below `text-sm` (15.75px effective size); `text-xs` (13.5px) is restricted to decorative chips/mono tags.
3. Desktop navigation sidebar is widened to `w-72` (288px) on desktop and `w-80` (320px) on xl screens; nav items are minimum 48px tall with 22px icons.
4. All interactive buttons, triggers, and links enforce a minimum 44×44px hit area.
5. Recharts default constants (`CHART_THEME`) are established in `src/components/charts/chartTheme.js` enforcing 14px axis ticks, tooltips, and legends with a 360px standard container height.

---

## D-34 — Overview & Train Explorer Real API Ingestion with Normalization Adapters

**Date decided:** 2026-10-30 (Phase 7)

**Decision:** The frontend connects directly to live precomputed serving endpoints (`/api/overview`, `/api/trains`, `/api/trains/<train_number>`) through an adapter layer (`src/api/adapters.js`). All percentages from the backend are standardized to the 0–100 scale, null rates are gracefully handled without fabrication, and statistical low-support subsets (< 30 observations) are tagged and visually muted. Non-causal language ("observed delay hotspot", "associated with") is strictly enforced across all dashboard copy.

---

## D-35 — Sequence Number (seq) Primary Keying for Stop Progression

**Date decided:** 2026-10-30 (Phase 7)

**Decision:** Timetables and stop progression charts MUST use sequence index `seq` as their primary React key (`key={stop.seq}`), never `station_code`. An audit of the serving store revealed 200 circular and loop train routes in Indian Railways where trains call at the same station code multiple times in a single service run.

---

## D-36 — Boundary Days Temporal Marking (Left-Truncated & Right-Censored)

**Date decided:** 2026-10-30 (Phase 7)

**Decision:** All per-date charts and tables explicitly differentiate collection boundary days (October 7 left-truncated start, October 25 right-censored end) from complete middle observation days. These edge dates are styled with distinct visual markers, legend entries, and explanatory tooltips referencing `docs/validation_report.md` to prevent users from misinterpreting partial-day artifacts as operational delay trends.

---

## D-37 — Pre-Departure Schedule-Time Inference with Zero En-Route Leakage

**Date decided:** 2026-10-30 (Phase 8)

**Decision:** Tab 3 (`DelayPredictionPage.jsx`) connects to `POST /api/predict` taking schedule-time parameters only: train service, arrival stop by `seq`, and journey start date. Origin stop (`seq=1`) is permanently disabled because arrival delay is physically undefined at journey departure. Real-time en-route inputs (actual departure, actual arrival at earlier stops) are strictly banned from production request payloads.

---

## D-38 — Calibrated Probability Space & Operational Threshold Decoupling

**Date decided:** 2026-10-30 (Phase 8)

**Decision:** Raw LightGBM decision tree leaf scores are mapped through isotonic regression calibrators trained on held-out validation data so that output probabilities reflect true historical empirical frequencies. The operational decision threshold (0.420) is determined by maximizing the F1-score on the validation partition, catching 82.2% of all late arrivals on the untouched test split. The term "probability" is strictly confined to Delay Prediction and Model Lab documentation; all customer-facing communications make no causal guarantees.

---

## D-39 — Segregation of Formulation 2 (En-Route Telemetry) as Research Benchmark

**Date decided:** 2026-10-30 (Phase 8)

**Decision:** Formulation 2 (which observes delay at stop $k-1$ to predict stop $k$, achieving AP 0.9289 vs 0.8482) is completely excluded from the interactive pre-departure prediction form and presented solely in Tab 4 Model Lab as a clearly demarcated research benchmark. It is accompanied by explicit operational limitations stating that real-time IoT tracking telemetry is required en-route and unavailable at pre-booking time.

---

## D-40 — Truthful Model Transparency & Reconciled AP Metric Standards

**Date decided:** 2026-10-30 (Phase 8)

**Decision:** The Model Lab (`ModelLabPage.jsx`) displays zero hardcoded numbers. All model metrics, lifts (+72.4% over Majority, +42.0% over Category Prior, +4.95% over Train History), Recharts curves (PR curve, Calibration reliability diagram, ROC curve), and test partition confusion matrix (71,289 TN, 27,248 FP, 17,037 FN, 78,391 TP) are loaded dynamically from `/api/model/info` and `/api/model/metrics`. Average Precision (AP) is standardized to `sklearn.metrics.average_precision_score`.








---

## D-41 — Permanent Removal of TiDB Cloud as a Runtime Dependency

**Date decided:** 2026-10-30 (Phase 8.5)

**Decision:** The full historical dataset (2,805,574 rows across 147,367 runs) was already extracted into `backend/data_cache/` in Phase 3. TiDB Cloud is permanently removed from the application runtime path. The deployed Flask API, WSGI server, and React frontend require zero database credentials (`TIDB_*`), open zero database connections, and import no database drivers at runtime. TiDB Cloud remains strictly an optional, isolated offline data refresh source.

---

## D-42 — Local Component Readiness Contract with In-Memory Caching

**Date decided:** 2026-10-30 (Phase 8.5)

**Decision:** The `/api/health/ready` probe is redefined as an honest, local-only component health monitor. It inspects: (1) precomputed SQLite store read access, (2) LightGBM model artifact readiness, and (3) static JSON analytics document availability. It returns `data_source: "precomputed_local"`, removes all `tidb_cloud` keys, and caches the check for 5 seconds to prevent polling from slowing active user requests.

---

## D-43 — Split Requirements Architecture

**Date decided:** 2026-10-30 (Phase 8.5)

**Decision:** Backend dependencies are split into three mutually exclusive, pinned tiers:
1. `backend/requirements.txt`: Minimal runtime dependencies for the deployed Flask API (`flask`, `flask-cors`, `waitress`, `pandas`, `numpy`, `scikit-learn`, `lightgbm`, `joblib`, `rapidfuzz`, `python-dotenv`). Zero database or visualization packages.
2. `backend/requirements-dev.txt`: Development, evaluation, testing, and EDA (`pytest`, `pyarrow`, `shap`, `matplotlib`, `seaborn`, `psutil`).
3. `backend/requirements-refresh.txt`: Offline TiDB refresh tooling only (`sqlalchemy`, `pymysql`, `cryptography`, `certifi`).

---

## D-44 — Refresh Tooling Package Isolation (`backend/tools/refresh/`)

**Date decided:** 2026-10-30 (Phase 8.5)

**Decision:** The read-only SQLAlchemy engine, TLS configuration loader, and `ReadOnlyQueryGuard` are moved out of `backend/app/db/` and relocated to `backend/tools/refresh/`. The `backend/app/` package contains zero database drivers, imports no refresh tools, and reads no `TIDB_*` environment variables.

---

## D-45 — In-Memory Train Catalog Caching & Search Acceleration (Bugfix)

**Date decided:** 2026-10-30 (Phase 8.5)

**Decision:** The open Train Explorer 15-second timeout bug was caused by a combination of single-threaded dev server queuing behind blocking remote database probes and unindexed SQL `LIKE '%q%'` queries. Resolved by: (1) caching the 10,743 train catalog in memory at startup inside `ServingClient` (~2 MB RAM), (2) slicing empty queries in < 1ms, (3) matching numbers via prefix scan in < 2ms, (4) employing RapidFuzz partial ratio scoring only for text queries $\ge 2$ characters, and (5) serving local requests via multithreaded Waitress WSGI (`threads=4`).

---

## D-46 — Known Risk: Offline Data Refresh Changes Prediction Windows

**Date decided:** 2026-10-30 (Phase 8.5)

**Decision:** The offline refresh tool (`backend/tools/refresh/`) can extract new data from TiDB Cloud when credentials are provided. However, running a data refresh shifts the historical observation window, modifies feature distributions, and may invalidate calibrated decision thresholds (0.420) and model artifacts. A refresh must be treated as a full retraining milestone, not a routine runtime task.

---

## D-47 — Canonical Binary Decision Threshold Reconciliation (0.410)

**Date decided:** 2026-10-30 (Phase 9)

**Decision:** The canonical operational decision threshold for the schedule-time calibrated LightGBM model is formally established at **0.410** across all documentation, metadata, test suites, and frontend components.

**Rationale:**
- In Phase 4, the optimal decision threshold was selected strictly on the **validation partition** using calibrated probabilities to maximize F1-score (Val F1: 0.7867 at threshold 0.410; recall >= 0.80 threshold: 0.455).
- Historical evaluation records had partially referenced 0.418 (an uncalibrated trial). In Phase 9 Task A, all test metrics were uniformly re-evaluated at the canonical 0.410 threshold on the untouched test partition (Oct 23–24, 193,965 stops):
  - Average Precision (AP): **0.8482**
  - ROC-AUC: **0.8592**
  - F1-Score: **0.7782**
  - Precision: **0.7402**
  - Recall: **0.8203**
  - Confusion Matrix: **TN: 71,067, FP: 27,470, FN: 17,152, TP: 78,276**
- All precomputed artifacts (`model_metadata.json`, `model_lab.json`, `final_test_results.json`) and frontend test assertions are synchronized to these exact reconciled values.

---

## D-48 — True Worker Process Memory Measurement Protocol

**Date decided:** 2026-10-30 (Phase 9)

**Decision:** Server RSS memory benchmarking must be measured directly on the active child worker process executing application code and serving incoming requests (`Waitress` worker), rather than parent launcher or supervisor scripts.

**Rationale:**
- In Phase 8.5, an RSS of 4.20 MB was recorded because the launcher process was queried.
- Measuring the real serving worker with all models, SQLite database connections, and RapidFuzz catalog caches loaded reveals:
  - Baseline pre-init: 16.63 MB
  - Idle worker: 165.10 MB
  - Active peak load (25 predict calls + patterns): 167.29 MB
  - Settled post-load: 167.29 MB
- Peak usage provides **344.71 MB (67.3%) headroom** under Render's 512 MB free-tier limit, proving the deployment is stable and free from OOM risk.

---

## D-49 — Free Local NLP Architecture (TF-IDF + Logistic Regression + RapidFuzz)

**Date decided:** 2026-10-30 (Phase 9)

**Decision:** Tab 6 Smart Insights natural language processing is built exclusively using existing local runtime dependencies (`scikit-learn`, `rapidfuzz`, and Python standard library). Zero external API calls (no OpenAI, Anthropic, Gemini, or embeddings endpoints), zero GPU dependencies, and zero heavy NLP libraries (no spaCy, no PyYAML).

**Rationale:**
- TF-IDF feature extraction (word n-grams 1-2 + character n-grams 3-5) combined with Logistic Regression ($C=5.0$) achieves **93.89% Accuracy** and **0.9410 Macro-F1** on held-out test questions.
- RapidFuzz token matching resolves train names at $\ge 82$ similarity, with an interactive clarification flow for ambiguous queries (e.g. 'Rajdhani').
- Inference completes in **sub-1.5 ms** per query with zero marginal cost and 100% user data privacy.

---

## D-50 — Deterministic Parameterised Templates & Zero Free-Form SQL Generation

**Date decided:** 2026-10-30 (Phase 9)

**Decision:** Smart Insights answers are constructed entirely through deterministic parameterised templates (`backend/app/nlp/templates.py`). User text is **never concatenated into SQL** or parsed into arbitrary SQLite queries.

**Rationale:**
- Prevents SQL injection and hallucinated statistics completely.
- Templates read strictly from verified precomputed store metrics via `ServingClient`.
- Forward delay prediction is prohibited in conversational analytics and immediately redirects to Tab 3 (`/predict`).
- Inquiries about physical delay causes trigger `causal_refusal` explaining that observational records cannot isolate physical causation (such as atmospheric events, signaling, or dispatch conflicts).

---

## D-51 — Empirical Delay Pattern Definitions & Methodological Constraints

**Date decided:** 2026-10-30 (Phase 9)

**Decision:** Historical analytics in Tab 5 (`DelayPatternsPage.jsx`) are calculated strictly from empirical frequencies across the 1,773,068 label-eligible stop arrivals recorded between 2026-10-07 and 2026-10-25:
1. **Hour:** Scheduled arrival hour in Indian Standard Time (IST, 00:00 to 23:00).
2. **Day of Week:** Weekday of scheduled arrival date, accompanied by an explicit warning note stating that weekdays reflect only 2-3 calendar days in the 19-day dataset.
3. **Category:** Service classifications mapped to category codes documented in docs/data_dictionary.md.
4. **Journey Position:** Stop sequence progression buckets (`Early (2-3)`, `Mid-Early (4-10)`, `Mid (11-25)`, `Late (26-50)`, `Deep (>50)`).
5. **Hotspots:** Filtered stations ($N \ge 100$) and trains ($N \ge 50$) ranked with Wilson 95% binomial confidence intervals.
6. The word "probability" is strictly prohibited across all Patterns and Insights views.


---

## D-52 — Phase 10 Integration QA, Security Hardening, and Production Deployment-Readiness

**Date decided:** 2026-10-30 (Phase 10)

**Decision:** The platform undergoes exhaustive multi-layer QA before deployment:
1. **Accessibility Standards (WCAG 2.1 AA):** Automated `@axe-core/playwright` audits across all 6 tabs must pass with zero critical or serious violations. Heading hierarchies must enforce strictly one `<h1>` per view. Scrollable tables must be focusable regions (`tabIndex={0} role="region"`). Minimum touch target size >= 44px.
2. **Reverse Proxy Hardening & Anti-Spoofing:** Wrap Flask with `werkzeug.middleware.proxy_fix.ProxyFix` configured via `TRUSTED_PROXY_COUNT` (default `0`). When `0`, untrusted `X-Forwarded-For` headers sent directly by clients are ignored, binding rate limiting and logging strictly to socket `remote_addr`.
3. **HTTP Header & Payload Defense:** Cap request body size at 1MB (`MAX_CONTENT_LENGTH = 1 * 1024 * 1024`, HTTP 413). Enforce `Content-Type: application/json` on all POST endpoints (`/api/predict`, `/api/insights/query`, HTTP 415). Apply `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and CSP.
4. **Artifact Delivery & Offline Self-Containment:** Total serving payload is audited at **45.90 MB** across 9 files with cryptographic SHA-256 manifest (`backend/serving/manifest.json`). Given that all files are < 50 MB, Direct Git storage is selected over Git LFS or external S3 buckets, enabling seamless zero-token builds on Render and Vercel.
5. **No Retraining or Threshold Changes:** Primary LightGBM threshold remains fixed at `0.410`. Test AP remains `0.8482`. NLP intent classification thresholds remain fixed at `confidence >= 0.40`, `margin >= 0.08`. Zero causal claims allowed in analytical UI.


## D-53 - Phase 11 WCAG AA Contrast Tokens, Metric Reconciliations, and Deployment Architecture

**Date decided:** 2026-10-31 (Phase 11)

**Decision:** 
1. **WCAG AA Contrast Tokens (> 4.5:1):** While vibrant brand fills (#2563EB blue-600, #10B981 emerald-500, #F59E0B amber-500, #EF4444 red-500) provide clear visibility for solid cards and chart fills, text and badges rendered over white/slate light backgrounds (#FFFFFF, #F8FAFC) strictly use high-contrast variants (#1D4ED8 blue-700, #059669 emerald-600, #D97706 amber-600, #DC2626 red-600) ensuring contrast ratios >= 4.5:1 meeting WCAG 2.1 AA requirements.
2. **Metric Transparency & Clarification:**
   - NLP held-out test evaluation reports both raw classifier argmax accuracy (93.89%) and end-to-end answered rate after conservative confidence (>= 0.40) and margin (>= 0.08) thresholds, distinguishing false fallbacks on in-domain queries from out-of-scope interception.
   - Machine learning PR-AUC metrics strictly use sklearn.metrics.average_precision_score (AP = 0.8482 calibrated / 0.8529 raw) to eliminate the trapezoidal inflation artifact on constant baselines (0.4920 AP vs 0.7460 trapezoid).
3. **Zero LFS, Selective Git Runtime Artifact Delivery:** Runtime SQLite serving database (ackend/serving/serving.sqlite, ~40.9 MB) and model joblib files (~5 MB total) are packaged directly into the repository using selective .gitignore negations (!backend/serving/serving.sqlite, !backend/models/*.joblib), staying well below GitHub's 100 MB per-file and 2 GB repo limits without requiring Git LFS or external cloud buckets.

---

## D-54 — Phase 11.1 Deployment-Readiness Fixes, Python 3.10.11 Pin, and Metrics Reconciliation

**Date decided:** 2026-11-01 (Phase 11.1)

**Decision:**
1. **Python Runtime Pinning:** Pinned `PYTHON_VERSION: 3.10.11` in `render.yaml` based on Render official documentation (`render.com/docs/python-version`), ensuring deterministic binary wheels and full parity with local development. Documented Linux LightGBM requirement for `libgomp1`.
2. **Artifact Tracking Verification:** Verified all 9 serving/model artifacts and `manifest.json` are tracked in git and not ignored. Proven via clean clone drill with 100% SHA-256 match and 0.000000 prediction diff across 20 reference cases.
3. **NLP Number Reconciliation:**
   - Differentiated sequential test slice (N=120, 96.18% raw accuracy, 10.0% false fallback) vs random seed shuffle (N=125, 93.89% raw accuracy, 20.0% false fallback).
   - Clarified that among in-domain test queries passing gates, accuracy is 99.07% (107/108), yielding 89.17% overall in-domain resolution (107/120).
   - Classified held-out set as "dev-tuned" and paired side-by-side with untouched hostile stress accuracy (35.71%) and out-of-scope fallback rate (97.62%).
4. **Model Comparison Table AP Alignment:** Settled benchmark AP values across all documentation and JSONs to true test-split values: Logistic Regression = 0.8372, Random Forest = 0.8477, LightGBM Calibrated = 0.8482. Clarified that 0.8415 was the Passenger category subgroup AP.
5. **Rate Limiting & Memory Stability at Scale:**
   - Standardized `Retry-After: 60` header on HTTP 429 responses.
   - Tested under sustained 5,000 requests with rate limiter active: 290 HTTP 200s, 4,710 HTTP 429s, throughput 2,923.6 req/s, RSS memory delta +0.75 MB across 5,000 requests.
6. **Accessibility Suite Expansion:** Added comprehensive a11y leftovers tests verifying ErrorState, mobile drawer, definition popovers, Smart Insights table results, Delay Prediction results, keyboard interactions, 200% zoom reflow, and prefers-reduced-motion with zero WCAG AA violations.
7. **License Attribution:** Dataset license status noted as to be confirmed by owner (declared as CC-BY-4.0 on upstream HuggingFace Hub, not Apache 2.0). All live URLs remain unverified until owner deployment.

---

## D-55 — Repository Hygiene, Claude Context Removal, and Per-Phase Working File Cleanup

**Date decided:** 2026-11-04 (Repo-Hygiene Cleanup)

**Decision:**
Decommissioned obsolete development artifacts and transient test outputs across three bounded categories:
1. **Claude-Related Files (Category A):** Removed untracked/git-ignored `docs/CLAUDE_HANDOFF.md` context handoff. Updated `docs/HANDOVER.md` references.
2. **Per-Phase Working Files (Category B):** Removed 10 historical preflight markdown reports (`phase4_preflight.md` through `phase11_preflight.md`, `phase6_1_ui_audit.md`) and 6 obsolete execution runner scripts (`run_preflight.py`, `run_phase5_preflight.py`, `run_phase8_preflight.py`, `run_phase8_5_preflight.py`, `run_phase9_preflight.py`, `capture_phase9_fixtures.py`). Kept `docs/phase5_preflight.json` because it is actively read by `backend/scripts/build_serving_data.py` and `generate_model_comparison_table.py`.
3. **Plainly Useless Junk & Test Artifacts (Category C):** Removed redundant `.gitkeep` files in `backend/scripts/`, `docs/eda/`, and `frontend/` (kept `notebooks/.gitkeep` to preserve the monorepo directory per D-10), deleted 18 unreferenced UI screenshot PNGs in `docs/ui/phase10/` (saving ~2.0 MB), and cleared untracked test caches (`test-results/`, `frontend/test-results/`, `.pytest_cache/`).
4. **Preserved Invariants:** Zero changes to ML inference logic, backend API routes, frontend application code, dependencies, serving database, model weights, or test suites. All 154 Pytest, 73 Vitest, 38 Playwright tests, 211 consistency checks, and clean-clone drills continue passing with zero regressions.


---

## D-56 — Phase 11.2 Overview UI Polish, Global Branding Cleanup, and StrictMode Dedup Abort Resilience

**Date decided:** 2026-11-05 (Phase 11.2 UI Polish Patch)

**Decision:**
1. **Overview Loading Resilience & StrictMode Request Isolation:**
   - **Root Cause:** In React 18 development `StrictMode`, components mount twice. The first mount effect's cleanup ran `AbortController.abort()`. In `client.js`, in-flight GET promise deduplication returned the first mount's in-flight fetch promise to the second mount. When the first abort signal fired, it cancelled the underlying network fetch, causing the promise to reject for the second mount as well. In `useApi.js`, `err.code === 'TIMEOUT'` was treated as an unmount abort and silently ignored without clearing `loading`, permanently trapping the Overview page in the Skeleton loading state.
   - **Fix:** In `client.js`, individual caller `externalSignal`s now wrap the shared in-flight fetch promise via a private listener so an individual subscriber's abort does not cancel the shared network fetch for other concurrent or subsequent callers. In `useApi.js`, only explicit cancellations on the active hook controller (`currentController.signal.aborted`) are treated as unmount cancellations; all genuine errors, timeouts, and network failures correctly set error state and terminate loading, ensuring `<ErrorState>` with Retry displays immediately when the backend is offline.
2. **Global Branding & Disclaimer Removal:**
   - Removed the `"v2.0.4 Community ML Edition"` version pill from the primary navigation brand block in `Sidebar.jsx` and the mobile header in `AppShell.jsx`. Brand header is now simply the blue `TrainFront` badge and "RailSense".
   - Removed the footer disclaimer block from `AppShell.jsx`. Non-affiliation and third-party dataset provenance are documented transparently in `README.md` and `docs/ATTRIBUTION.md`.
3. **Overview Page Visual & Analytical Polish:**
   - **StatCard Titles & Alignment:** Converted titles to concise labels ("Total Stops", "Total Runs", "Train Services", "Stations", "Observation Span", "Fleet Delay Rate", "Median Delay", "Mean Delay", "Early Arrivals", "Data Coverage"), removed `truncate`, and enforced a uniform `min-h-[2.5rem]` header so cards align across 2-line wraps in responsive `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` layouts.
   - **Concise Header Badges:** Replaced bulky, visible grey "Observed Pattern" paragraphs with `sr-only` accessible summaries and added dynamic header badges ("Fleet baseline: 49.9%", "≤15m tolerance: 50.1%", "Lowest: SUB 17.1%") derived strictly from runtime data without hardcoded values.
   - **SectionHeader Info Popover:** Added an accessible `info` popover prop to `SectionHeader.jsx` with keyboard navigation, 44px hit area, and `aria-label`, removing the floating `(i)` icon below delay performance cards.
   - **Slim Context Bar:** Replaced the large alert box with a slim white context bar containing a dynamic date-range pill (`07 Oct – 25 Oct 2026 · 19 days snapshot`). Moved full methodological explanations to the educational collapsible guide.
   - **Equal-Height Chart Layout:** Standardized Daily Trend and Delay Distribution containers to `h-[340px]`. Replaced the large Boundary Days Notice block with an inline legend badge (amber dot for partial edge dates) and hover tooltip note.
   - **Category Breakdown Polish:** Formatted YAxis labels as `"CODE (Name)"` strictly for documented categories in `docs/data_dictionary.md` (`MEX`, `SUB`, `MEMU`, `PAS`, `SUF`, `TOD`, `VNDB`) and added value percentage labels (`LabelList`) at the end of each bar with responsive zero-clipping margins.
   - **WCAG AA Contrast Fix:** Upgraded status subtext in `Sidebar.jsx` from `text-slate-500` to `text-slate-400` on dark navy backgrounds, achieving >= 4.5:1 contrast and zero axe-core violations.

---

## D-57 — Phase 11.3 Train Explorer UI Polish, Default Sort, and Low-Support Clutter Elimination

**Date decided:** 2026-11-05 (Phase 11.3 UI Polish Patch)

**Decision:**
1. **Backend Default Catalog Sorting & Sub-Millisecond Latency:**
   - Added `sort` query parameter to `GET /api/trains` supporting `runs_desc` (default when `q` is absent/empty) and `number_asc`.
   - Validates `sort` against allowed values; returns HTTP 400 (`INVALID_SORT`) for unrecognized sort values.
   - When `q` is non-empty, search relevance/RapidFuzz fuzzy match ordering is strictly preserved.
   - Pre-sorted in-memory catalog at startup into `self._trains_all_by_runs` and `self._trains_by_cat_runs`, achieving 0.60 ms p50 latency (p95 0.91 ms), easily satisfying the < 100 ms target.
   - Updated `docs/openapi.yaml`, `docs/openapi.json`, `docs/API.md`, and `docs/api_contract_for_frontend.md`.
2. **Pluralization Helper & Grammar Uniformity:**
   - Added `pluralize(count, singular, plural = null)` helper in `frontend/src/utils/format.js` with full test coverage in `frontend/src/test/format.test.js`.
   - Corrected all count labels to pluralize accurately ("19 observed runs", "1 stop", "8 scheduled halts", "19 calendar days").
3. **Subheading, Labels & Action Polish:**
   - Renamed subheading from "Single Train Deep Dive" to "Train Explorer" (catalog view) and "Train Delay Profile" (single-train detail view).
   - Updated `NAV_ITEMS[1].title` in `frontend/src/config/app.js` and synced `document.title` dynamically (`Train Explorer | RailSense` and `<TrainNumber> Delay Profile | RailSense`).
   - Renamed catalog list action button from "Inspect" to "View Route".
   - Added Sort dropdown `<select>` next to category filter ("Most runs", "Train number") synced to URL query string.
4. **Timetable Low-Support Clutter Elimination:**
   - Removed repeated yellow `SupportBadge` pills ("Low Support (<30)") from every row in the timetable table.
   - Replaced row-level clutter with plain muted text (`1 stop`, `18 stops`) and an accessible amber `<Info>` tooltip on low-support stops explaining: `"Low support: fewer than 30 eligible stops, treat as noisy"`.
   - Retained exactly one train-level `SupportBadge` in the header card when train overall eligible stops < 30.
5. **Conditional Boundary Notice:**
   - Replaced bulky 4-line boundary notice box with a compact inline `<PartialDayLegend />` ("Partial day" pill with amber indicator and tooltip).
   - Evaluated conditionally: rendered ONLY when the train's `history_by_date` contains at least one date from `PARTIAL_DATES` (`2026-10-07`, `2026-10-25`). Trains with only non-boundary dates render zero boundary notice and zero amber legend.
6. **Explainer Paragraphs & Non-Causal Caveats:**
   - Converted visible explanatory paragraphs under route progression and date history charts to accessible `<p className="sr-only">`.
   - Replaced the bottom caveats card with an accessible collapsible ("About these numbers", collapsed by default, keyboard accessible with `aria-expanded`).
7. **Stray Definition Popover Removal:**
   - Removed free-floating `(i)` definition note under stat cards.
   - Definition moved into `SectionHeader` `info` prop ("delayed = arrival delay > 15 min on label-eligible stops (seq > 1, arrival reported, |delay| <= 1440 min)").
8. **Table Sticky Column & Visual Verification:**
   - Added sticky first column (`#` sequence) with clean border to timetable table.
   - Captured responsive screenshots at 1366x768 into `docs/ui/phase11_3/` (`explorer_catalog_1366.png`, `explorer_train_12951_boundary_1366.png`, `explorer_train_01051_noboundary_1366.png`, total size 304 KB < 1 MB).

---

## D-58 — Phase 11.4 Delay Prediction Polish, Percent Unit Convention & Caveat Consolidation

**Date decided:** 2026-11-05 (Phase 11.4 UI Polish Patch)

**Decision:**
1. **Explicit Percentage vs Fraction Formatting Convention:**
   - Established explicit formatting helpers in `frontend/src/utils/format.js`:
     - `formatPercentValue(val, decimals)`: strictly for values already scaled 0–100 (e.g., `observed_delayed_rate`, `delayedRate`, category shares). Formats `88.24` -> `"88.2%"` (never multiplies).
     - `formatFractionAsPercent(val, decimals)`: strictly for true fractions on `[0, 1]` (e.g., `predict.probability_*`, `predict.threshold`, `precision`, `recall`, `prevalence`). Formats `0.8824` -> `"88.2%"`.
     - `formatPercent(val, decimals)`: retained for backward compatibility with explicit developer warning guard when `val > 1.0` is passed.
   - Audited 68 call sites across `frontend/src`:
     - Fixed `8,824.0%` unit bug in `frontend/src/pages/DelayPredictionPage.jsx` (`observed_delayed_rate`).
     - Fixed identical `5,702.0%` bug in `frontend/src/pages/DelayPatternsPage.jsx` across 11 call sites (`d.delayedRate`, `h.delayedRate`, `c.delayedRate`, `p.delayedRate`, `item.delayedRate`, `stationDetail.delayedRate`, `tr.delayedRate`).
2. **Sparkle Elimination & Domain-Specific Iconography:**
   - Removed all generic AI sparkles (`Sparkles`, `Wand`, `Stars`) across the entire frontend.
   - Form card header updated to "Prediction Inputs" with `SlidersHorizontal` icon.
   - Result card header updated to "Estimated Delay Risk".
   - Primary submit button updated to "Run Prediction" with `Play` icon, with dynamic states: "Running Prediction..." during fetch and "Try again in Ns" cooldown countdown.
   - Replaced sparkles on Train Explorer with `Gauge` and on Smart Insights with `Cpu`.
3. **Caveat Consolidation & Streamlined Result Layout:**
   - Removed yellow "Decision at operational threshold" alert box (threshold is clearly indicated on the circular gauge; plain-words decision line placed in `RiskBadge` header area).
   - Removed stacked blue in-sample box and grey caveats box.
   - Replaced with:
     - Compact status chip row below gauge: "Date inside training window", "Outside observed window", "Limited history" (based on runtime dates and history).
     - Single collapsible "Model assumptions and caveats" (closed by default, `aria-expanded`, keyboard accessible) with dynamic API-driven values (`model_version`, `threshold`, calibration method).
4. **Factor Display Redesign (Diverging Bars):**
   - Removed Cards|Table toggle in `FactorBars.jsx`.
   - Rendered mini horizontal diverging bars scaled to the largest absolute factor magnitude:
     - Positive factors (red/danger): extend right ("raises the estimate").
     - Negative factors (green/success): extend left ("lowers the estimate").
   - Direction phrasing uses strictly non-causal language ("raises"/"lowers the estimate"; never "causes", "slows down", "bottleneck").
   - Units are raw model log-odds (`+0.84`, `-0.52`), never formatted with `%` signs.
   - Screen-reader accessible `sr-only` table provides full semantic accessibility.
5. **Form Footer & Helper Text Cleanup:**
   - Removed internal developer string (`"Rate limited to 120 requests/minute. Model threshold: 0.410."`) from form footer.
   - Replaced academic date helper text with dynamic `"Observed snapshot: {formatDate(DATASET_WINDOW.startDate)} – {formatDate(DATASET_WINDOW.endDate)}."`.
6. **Responsive Verification & Capture:**
   - Captured full-page screenshots into `docs/ui/phase11_4/`:
     - Empty form (1366x768): `predict_empty_1366.png` (93 KB)
     - Result view (360x640): `predict_result_360.png` (33 KB)
     - Result view (1366x768): `predict_result_1366.png` (115 KB)
     - Result view (1920x1080): `predict_result_1920.png` (180 KB)
     - Collapsible open (1366x768): `predict_collapsible_1366.png` (114 KB)
     - Total directory size: 524 KB (< 1 MB).
   - Verified zero horizontal overflow across 360, 768, 1280, 1366, and 1920 viewports.

---

## D-59 — Phase 11.5 Model Lab Polish, Measured Inference Latency, LaTeX Removal & Feature Ordering

**Date decided:** 2026-11-05 (Phase 11.5 UI Polish Patch)

**Decision:**
1. **LaTeX Token Purging & Sanitization Helper:**
   - Created `sanitizeLatex(text)` in `frontend/src/utils/sanitizeText.js` to strip all LaTeX math delimiters and symbols (`$\ge$`, `$\le$`, `\rightarrow`, `\times`, `\$`, etc.) replacing them with standard unicode equivalents (`≥`, `≤`, `→`, `×`, `$`).
   - Audited and purged LaTeX tokens across frontend source (`ModelLabPage.jsx`, `featureLabels.js`), serving files (`backend/serving/model_lab.json`), and documentation (`docs/MODEL_CARD.md`, `docs/serving_design.md`).
   - Added unit test in `frontend/src/test/sanitizeText.test.js` and a regression grep test in `frontend/src/test/SourceGrep.test.js` verifying zero LaTeX tokens in `frontend/src/` and `backend/serving/`.
2. **Feature Importance Chart Usability & Layout:**
   - Truncated feature importance chart to Top 10 features descending by gain to prevent visual crowding.
   - Assigned fixed container height `h-[480px]` and expanded `YAxis` width to `190px` with `interval={0}` and font size 13px, preventing truncation of human-readable feature labels (from `frontend/src/config/featureLabels.js`).
   - Positioned `<LabelList>` tags right-aligned at bar tips (`formatter={v => v.toLocaleString()}`) for direct readability.
   - Replaced causal phrasing with statistical association subtitle: `"Gain metric represents relative contribution to split decisions across the ensemble. Features indicate statistical association with delay risk, not direct causal factors."`.
   - Included `ChartTableToggle` for accessible tabular view.
3. **Stop Position Sequence Ordering:**
   - Replaced alphabetical/lexicographical sorting of journey stop position buckets with true temporal progression order:
     `Early (2-3) -> Mid-Early (4-10) -> Mid (11-25) -> Late (26-50) -> Deep (>50)`.
   - Created `sortPositionBuckets(buckets)` in `frontend/src/utils/positionSort.js` with regex-based numeric lower-bound extraction (`parsePositionBucketOrder`).
   - Applied to both `ModelLabPage.jsx` and `DelayPatternsPage.jsx`.
4. **Wording & Buzzword Elimination:**
   - Replaced academic/internal jargon across API (`/api/model/info`), UI, and docs:
     - `"untouched test partition"` → `"held-out test set"`.
     - `"STRICT TEMPORAL SPLITTING (ZERO LOOKAHEAD)"` → `"Temporal train / validation / test split"`.
     - `"Leakage Safeguards & Banned Features Protocol"` → `"Feature governance: excluded fields"`.
   - Standardized on clean, professional noun phrases without synthetic claims.
5. **En-Route Benchmark Card Consolidation:**
   - Deleted standalone Card 9 ("Research Benchmark Only — Formulation 2").
   - Integrated En-Route LightGBM as a distinct row within the Model Comparison table with a `"Research"` badge, an accessible info tooltip, and an `sr-only` note stating the post-departure operational requirement.
   - Removed speculative "telemetry" and "IoT" references.
6. **Measured In-Process Inference Latency:**
   - Eliminated the hardcoded `2.1 ms` placeholder.
   - Benchmarked real in-process CPU prediction latency on real schedule test inputs (`backend/scripts/benchmark_predict.py`, 200 iterations):
     - **p50:** 27.26 ms
     - **p95:** 30.41 ms
     - **p99:** 34.33 ms
     - **Mean:** 27.42 ms
   - Persisted benchmark results in `docs/experiments/inference_latency.json` and serving store `backend/serving/model_lab.json`.
   - Updated StatCard in `ModelLabPage.jsx` with `Timer` icon, label `"Inference time (local, p95)"`, value `"30.4 ms"`, and subtext `"27.3 ms p50 (in-process CPU)"`.
7. **Responsive Layout & Visual Regression Verification:**
   - Fixed horizontal overflow at 360px caused by an unparented `position: absolute` `.sr-only` table cell child by establishing a `relative` boundary and `overflow-x-hidden`.
   - Validated zero horizontal scroll at 360x640, 768x1024, 1280x800, 1366x768, and 1920x1080.
   - Captured full-page screenshots into `docs/ui/phase11_5/`:
     - `model_lab_360.png` (32 KB)
     - `model_lab_1366.png` (150 KB)
     - `model_lab_1920.png` (187 KB)
     - Total directory size: 369 KB (< 1 MB).


