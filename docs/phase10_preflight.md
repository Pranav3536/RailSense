# RailSense — Phase 10 Preflight & Verification Report

> **Generated:** 2026-10-30 21:25 IST  
> **Status:** Phase 10 Preflight Complete — Baseline Established, Discrepancies Reconciled

---

## 1. Baseline Verification Measurements (Before Phase 10 Changes)

| Metric | Measured Real Value | Notes / Status |
| :--- | :--- | :--- |
| **Backend Pytest** | **133 passed, 4 skipped in 23.76s** | 137 total tests across 13 test files. 4 integration tests skip cleanly without live DB credentials. |
| **Frontend Vitest** | **64 passed across 12 files in 67.00s** | 100% passing rate. |
| **Frontend Linter** | **0 errors, 0 warnings** | `npm --prefix frontend run lint` exited code 0 with `--max-warnings 0`. |
| **Frontend Build** | **Built in 18.24s** | Main chunk: `dist/assets/index-CNx7e2JX.js` (201.63 kB / 65.06 kB gzip).<br>Largest chunk: `dist/assets/BarChart-DaJ2V_9F.js` (383.06 kB / 105.84 kB gzip). |

---

## 2. Reconciliation of Phase 9 Discrepancies

### (a) Vitest Per-File vs Total Count Reconciliation
- **Investigation:** Grepped all `it(` and `test(` declarations across `frontend/src/test/`:
  - `adapters.test.js`: 6
  - `apiClient.test.js`: 6
  - `DelayPatternsPage.test.jsx`: 7
  - `DelayPredictionPage.test.jsx`: 4
  - `format.test.js`: 6
  - `ModelLabPage.test.jsx`: 2
  - `OverviewPage.test.jsx`: 5
  - `Pages.test.jsx`: 3
  - `Sidebar.test.jsx`: 6
  - `SmartInsightsPage.test.jsx`: 7
  - `SourceGrep.test.js`: 7
  - `TrainExplorerPage.test.jsx`: 5
  - **Sum:** $6 + 6 + 7 + 4 + 6 + 2 + 5 + 3 + 6 + 7 + 7 + 5 = \mathbf{64\text{ tests}}$.
- **Root Cause:** In the Phase 9 narrative summary, the author misstated `OverviewPage.test.jsx (4 tests)` and `TrainExplorerPage.test.jsx (10 tests)` (summing to 68 in prose), whereas the actual test files contained 5 and 5 tests, summing to exactly 64.

### (b) NLP Evaluation Set Sizes and Metric Denominators
- **Investigation:** Examined `backend/app/nlp/eval/questions.jsonl` and `backend/scripts/evaluate_nlp.py`.
- **Set Sizes:**
  - Total question pool: **218 questions** across 19 discrete intents.
  - Development tuning split (40% seed 42): **87 questions**.
  - Held-out test split (60% seed 42): **131 questions**.
- **Metric Denominators:** All reported test metrics were evaluated strictly on the **131 held-out test questions**:
  - Logistic Regression ($C=5.0$): $123 / 131 = \mathbf{93.89\%}$
  - Nearest Centroid: $118 / 131 = \mathbf{90.08\%}$
  - Keyword Baseline: $30 / 131 = \mathbf{22.90\%}$
- **Action:** Updated `backend/app/nlp/eval/questions.jsonl` to explicitly label `split: "dev"` and `split: "test"`, and clarified documentation in `docs/NLP_EVALUATION.md`.

### (c) Label-Eligible Stops Count Mismatch
- **Investigation:**
  - **2,805,574** = Total rows in `train_records`.
  - **1,773,607** = Rows with non-null `arrival_delay_min` (63.22%).
  - **1,773,068** = Label-eligible arrivals (`arrival_reported == 1`, `seq > 1`, $|\text{arrival\_delay\_min}| \le 1440$). The 539 excluded rows are sequence origin stops (`seq=1`), unverified reporting flags, or extreme multi-day timing errors.
- **Root Cause:** Certain Phase 9 narrative documents loosely labeled `1,773,607` as "label-eligible arrivals".
- **Action:** Standardized all UI copy, DECISIONS.md, and documentation to strictly distinguish between raw non-null delays (1,773,607) and label-eligible stops (**1,773,068**).

### (d) Patterns Page Fleet Reference Line (50.4% vs 49.91%)
- **Investigation:** In `DelayPatternsPage.jsx`, the reference line was hardcoded to `y={50.44}` ("Fleet Avg (50.4%)").
- **Root Cause:** 50.44% was an artifact from the Oct 08–20 training split prevalence (50.36% / 50.44%). The true fleet delayed rate across all 1,773,068 label-eligible stops in `overview.json` is **49.91%**.
- **Action:** Updated `backend/app/api/patterns.py` to serve `"fleet_delayed_rate": 49.91` from the overview delay summary, and updated `DelayPatternsPage.jsx` to dynamically consume the API field with a matching definition.

### (e) CategoryLabel / Patterns "Official" Claims Audit
- **Investigation:** Scanned source code and documentation for the word "official".
- **Finding:** Found occurrences in `DECISIONS.md`, `run_experiments.py`, and `model_lab.json` ("official classification of the service").
- **Action:** Removed "official" claims. Mappings are explicitly documented as "service classifications from docs/data_dictionary.md". Raw codes without a documented mapping display with a dataset tooltip.

### (f) Backend Test Delta Explanation (107 -> 133)
- **Investigation:**
  - Phase 8.5: **103 passed**, 4 skipped = 107 total.
  - Phase 9 added: `test_nlp.py` (21 tests) + `test_insights_routes.py` (9 tests) = **30 new tests**.
  - Calculation: $103\text{ passed} + 30\text{ new} = \mathbf{133\text{ passed}}$ (137 total).
- **Root Cause:** A previous writer subtracted 107 (total count of Phase 8.5) from 133 (passed count of Phase 9) to arrive at 26, creating an apparent 4-test discrepancy that was purely an arithmetic conflation of total vs passed counts.

---

## 3. Audit of Phase 9 Unreported Items (i to ix)

| Item | Description | Status | Proof & Measurements |
| :--- | :--- | :--- | :--- |
| **(i)** | Fresh temporary venv with runtime requirements.txt only | **DONE** | Tested all 10 core endpoints (`/health`, `/ready`, `/overview`, `/trains`, `/trains/12951`, `/patterns/hour`, `/model/info`, `/model/metrics`, `/insights/examples`, `/predict`). Gunicorn pinned with platform marker `sys_platform != 'win32'` for Linux deployment. |
| **(ii)** | Grep for stale label "Temporal, Spatial & Network Bottlenecks" & banned causal words | **DONE** | Verified zero occurrences of stale tab label in `frontend/src`. Cleaned remaining causal words ("bottleneck", "congestion") from `model_lab.json` and `explanations_simple.md`. |
| **(iii)** | Delay Prediction hard-coding audit | **DONE** | Threshold dynamically read from API `threshold_used` (canonical 0.410). Removed hardcoded default date button. In-sample notice updated to specify exact dates: deployment model fitted on Oct 08–22, 2026; rolling tables cover Oct 08–24, 2026. |
| **(iv)** | Canonical raw probability field | **DONE** | `raw_probability` established as canonical response key; `probability_raw` documented as deprecated backwards-compatible alias. |
| **(v)** | Benchmark AP reconciliation (LR & RF) | **DONE** | In `MODEL_CARD.md`, LR AP = **0.8372**, RF AP = **0.8477**, LightGBM AP = **0.8482**. 0.8415 identified as Passenger category subgroup AP. Synchronized `model_lab.json` to exact measured values. |
| **(vi)** | Missing frontend test coverage | **DONE** | Expanded test suites for `DelayPredictionPage.test.jsx` (form validation, seq routing, cooldown, warnings) and `ModelLabPage.test.jsx` (split toggle, fixtures, research benchmark separation). |
| **(vii)** | Request rate in normal 1-minute usage | **DONE** | Clicking through all 6 tabs generates **13–15 requests/minute**, utilizing only ~11.7% of the 120 req/min rate limit budget. |
| **(viii)** | True worker RSS before/after NLP load | **DONE** | Measured on active Waitress worker PID: Idle = **165.10 MB**, Active peak with NLP = **167.29 MB** (+2.19 MB incremental RAM for NLP). Headroom to 512 MB: **344.71 MB (67.3%)**. |
| **(ix)** | 3 Real Insights Q&As | **DONE** | 1. "What is the overall punctuality of the fleet?" -> Intent: `fleet_summary`, Conf: 0.8127, Delayed rate: 49.91%.<br>2. "How punctual is train 12951?" -> Intent: `train_summary`, Conf: 0.6760, Delayed rate: 20.49%.<br>3. "Which stations have the worst delays?" -> Intent: `station_hotspots`, Conf: 0.7380, Top stations: BTL, PJB, SBD. |

---

## 4. Scope Alignment & Corrections
- **Scope Correction:** Phase 10 is strictly Integration QA, Security Hardening, Accessibility, and Deployment-Readiness. **No Dockerfiles** are included. Phase 11 will handle deployment to Vercel (frontend) and Render (backend).
- Updated `docs/CLAUDE_HANDOFF.md`, `task.md`, and `README.md` to remove Dockerization references.
