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





