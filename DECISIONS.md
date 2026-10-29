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
| D-13 | TLS with certificate verification always ON | Phase 2 |
| D-14 | Run defined as (train_number, start_date) | Phase 2 |
| D-15 | Deterministic 100k-row sampling for delay consistency check | Phase 2 |

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
