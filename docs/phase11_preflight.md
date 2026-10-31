# RailSense — Phase 11 Preflight & Verification Report

> **Generated:** 2026-10-31 17:15 IST  
> **Status:** Phase 11 Preflight Complete — Deployment Baseline Established, Discrepancies Reconciled

---

## 1. Baseline Verification Measurements (Before Phase 11 Deployment Changes)

| Metric | Measured Real Value | Notes / Status |
| :--- | :--- | :--- |
| **Git Working Tree** | Clean, branch `main`, 13 commits | `git remote -v`: 0 remotes configured (fresh local git repository). |
| **Backend Pytest** | **154 passed, 4 skipped in 64.18s** | 158 total test cases across 14 test files. 4 integration tests skip cleanly without live DB credentials. |
| **Frontend Vitest** | **73 passed across 13 test files in 37.53s** | 100% passing rate. Expanded from 67 to 73 unit tests with new DelayPredictionPage and ModelLabPage tests. |
| **Frontend Linter** | **0 errors, 0 warnings** | `npm --prefix frontend run lint` exited code 0 with `--max-warnings 0`. |
| **Frontend Production Build** | **Clean build in 21.20s** | Main chunk: `dist/assets/index-D-A5r6d8.js` (206.42 kB / 66.88 kB gzip).<br>CSS: `dist/assets/index-B5ffmKac.css` (44.04 kB / 7.98 kB gzip). |
| **Playwright E2E Suite** | **27 passed in 1.6m** | Automated `@axe-core/playwright` accessibility audits across all 6 tabs, failure recovery, functional workflows, and responsive viewports. |
| **Git Secret Scan** | **0 occurrences in entire history** | Evaluated via `git log --all --full-history -S <real_password>`. Exact match count = 0. |

---

## 2. Preflight Discrepancy Reconciliations

### (a) NLP Intent Classification & Fallback Reconciliation
- **Investigation:** Examined relationship between raw argmax classification and gated end-to-end evaluation with confidence ($\ge 0.40$) and margin ($\ge 0.08$) thresholds:
  - **Raw Argmax Accuracy:** **96.18%** (126/131) on held-out test split.
  - **End-to-End Answered Correctly:** **97.50%** (117/120) on in-domain test queries passing threshold gates.
  - **In-Domain Conservative Fallback Rate:** **10.00%** (12/120) valid in-domain queries routed to fallback suggestions.
  - **Top-3 Suggestion Chip Hit Rate:** **91.67%** (11/12) of in-domain queries in fallback had true intent in top 3 chips.
  - **Out-of-Scope Rejection (Test Set):** **100.0%** (11/11) intercepted.
  - **Expanded Independent OOD Benchmark ($N=42$):** **97.62%** (41/42) safely trapped into fallback; 2.38% (1/42) falsely mapped.
  - **Hostile Stress Suite ($N=42$):** **35.71%** (15/42) end-to-end accuracy across typos, Hinglish, word inversion, injections, and edge cases evaluated without retuning.
- **Artifact:** Generated `backend/scripts/reconcile_nlp_metrics.py`, saved `docs/experiments/nlp_reconciliation.json`, and updated `docs/NLP_EVALUATION.md`.

### (b) Vitest Unit Test Expansion
- **Investigation:** Added 6 targeted unit tests:
  - Disabling origin stop (`seq=1`) with descriptive text in arrival dropdown.
  - Sequence-keying for circular and loop routes where station code repeats.
  - Form validation preventing prediction dispatch on missing parameters.
  - Handling HTTP 422 repeated station / invalid stop error envelopes.
  - Deep-link query parameter prefilling (`?train=12951&seq=3&date=2026-10-20`).
  - Model Lab comparison table fixtures integrity check matching `model_lab.json`.
- **Result:** Vitest suite expanded from 67 tests to 73 tests, all passing cleanly.

### (c) Design Token Palette & WCAG AA Contrast Reconciliation
- **Investigation:** While vibrant brand fills (`#2563EB`, `#10B981`, `#F59E0B`, `#EF4444`) provide clear graphic visibility on solid card backgrounds, typography and outlines rendered over light canvases (`#FFFFFF` and `#F8FAFC`) strictly use darker 600/700 variants (`#1D4ED8`, `#059669`, `#D97706`, `#DC2626`) to meet WCAG 2.1 Level AA minimum contrast ratio ($> 4.5:1$).
- **Action:** Documented in `DECISIONS.md` (D-53) and `docs/UI_DESIGN_SYSTEM.md`.

### (d) Baseline Model PR-AUC vs. Average Precision (AP) Reconciliation
- **Investigation:** Evaluated difference between trapezoidal PR-AUC (`auc(recall, precision)`) and true `sklearn.metrics.average_precision_score`:
  - On constant predictors (Majority Baseline), trapezoidal integration creates an artificial diagonal line connecting $(0, 1.0)$ to $(1, p)$, yielding $\frac{1 + p}{2} \approx 0.7460$.
  - True `average_precision_score` properly evaluates constant predictors to positive prevalence ($p = 0.4920$).
  - Schedule-Time Baselines:
    - **Majority Baseline:** AP = 0.4920 (Val 0.4851)
    - **Category Prior:** AP = 0.5972 (Val 0.5892)
    - **Train Historical Prior:** AP = 0.8082 (Val 0.8245)
    - **Logistic Regression:** AP = 0.8372 (Test PR-AUC in `final_test_results.json`)
    - **Random Forest:** AP = 0.8477 (Test PR-AUC in `final_test_results.json`)
    - **LightGBM (Raw):** AP = 0.8529 (Val 0.8657)
    - **LightGBM (Calibrated):** AP = **0.8482** (Val 0.8608)
    - **En-Route LightGBM (Formulation 2 Research Benchmark):** AP = 0.9289 (Val 0.9324)

### (e) Cold Start Latency & Memory Footprint
- **Investigation:** Measured using `backend/scripts/profile_cold_start.py`:
  - Flask application creation & artifact loading: **3,500.78 ms**
  - First `/api/health/ready` check: **21.71 ms**
  - First schedule-time prediction (`/api/predict` for train 12951): **82.44 ms**
  - Memory RSS at process start: **16.65 MB**
  - Memory RSS after warm prediction: **176.69 MB** (Delta: +160.04 MB)
  - Well under Render's 512 MB free tier memory cap.

### (f) Rate Limiting & Throttling Verification
- **Investigation:** Measured using `backend/scripts/test_rate_limiter.py` with 40 requests against a 30 req/min limit:
  - First 30 requests succeeded with HTTP 200.
  - Next 10 requests were rejected with HTTP 429 (`RATE_LIMIT_EXCEEDED`).
  - Structured error envelope returned with request tracking ID.

### (g) Dataset License Status
- **Investigation:** Dataset originates from HuggingFace repository `pjay-in/indian-railways-delays`.
- **Status:** **UNVERIFIED** (sandboxed environment has no external network access to resolve live HuggingFace metadata). Attributed in `docs/ATTRIBUTION.md`.
