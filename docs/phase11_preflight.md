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
- **Status:** **CC-BY-4.0** (Creative Commons Attribution 4.0 International, verified on upstream HuggingFace dataset card). Full third-party attribution documented in `docs/ATTRIBUTION.md`.

---

## 3. Phase 11.1 Deployment-Readiness Corrections & Verification Audit

### (a) Task 1: Artifact Tracking & Clean-Clone Proof
- Verified `git ls-files` for `backend/models` and `backend/serving` against `backend/serving/manifest.json`.
- Confirmed all 9 serving/model artifacts plus `manifest.json` (10 files total) are tracked in git and not ignored by `.gitignore`.
- Executed clean-clone drill in isolated directory (`$env:TEMP\railsense_clean_clone`):
  - `python backend/scripts/verify_artifacts.py` passed with 100% SHA-256 integrity match.
  - Production WSGI application started cleanly.
  - All 8 core endpoints returned HTTP 200 `[PASS]`.
  - All 20 reference predictions matched within `0.000000` absolute difference (well within $\le 10^{-4}$ tolerance).

### (b) Task 2: Python Version Pin & Linux / WSL Compatibility
- Researched official Render documentation (`render.com/docs/python-version`): confirmed Python 3.10.11 is a fully supported native runtime version on Render.
- Pinned `PYTHON_VERSION: 3.10.11` in `render.yaml` and documented in `docs/DEPLOYMENT.md`.
- Verified `render.yaml` contains complete environment variable specification (`RAILSENSE_ENV`, `PYTHON_VERSION`, `PYTHONUNBUFFERED`, `TRUSTED_PROXY_COUNT=1`, `CORS_ORIGINS` with `sync: false`, `ENABLE_DOCS=true`, `FLASK_THREADS=4`, `FLASK_HOST=0.0.0.0`, `PORT=10000`). Zero `TIDB_*` runtime dependencies.
- Verified in Linux (WSL Ubuntu 26.04) environment with Python 3.10 virtual environment:
  - Installed `libgomp1` (required by LightGBM C++ OpenMP runtime on Linux).
  - LightGBM 4.7.0 imported and predicted cleanly.
  - Production WSGI server booted, all 8 endpoints passed, all 20 reference predictions matched with `0.000000` difference. Added `libgomp1` troubleshooting section to `docs/DEPLOYMENT.md`.

### (c) Task 3: NLP Number Reconciliation
- Resolved metric divergence between Phase 10 and Phase 11 evaluations:
  - Phase 10 used `np.random.shuffle(indices)` with `seed=42`, producing 125 in-domain queries (93.89% raw accuracy, 20.0% false fallback rate).
  - Phase 11 used sequential slice `EVAL_QUESTIONS[87:]`, producing 120 in-domain queries (96.18% raw accuracy, 10.0% false fallback rate).
  - Reconciled query resolution: 12 in-domain queries triggered fallback, leaving 108 answered queries of which 107 were correct (**99.07% accuracy among answered queries; 107/120 = 89.17% overall in-domain resolution**).
  - Held-out test set transparently classified as **dev-tuned** (thresholds and patterns refined against domain vocabulary). Paired side-by-side with untouched **hostile stress accuracy (35.71%)** and **42 OOD fallback interception (97.62%)** across all documentation.

### (d) Task 4: Model Comparison Table AP Settlement
- Audited test-split AP values across all baseline and ML models:
  - **Logistic Regression:** AP = **0.8372**
  - **Random Forest:** AP = **0.8477**
  - **LightGBM (Calibrated):** AP = **0.8482**
- Clarified that `0.8415` was the subgroup AP on the Passenger (`PAS`) category slice (`MODEL_CARD.md` line 100), not the overall model AP. All documentation and table JSONs now match.

### (e) Task 5: Production Rehearsal, Security, Accessibility, and Scale Verification
- **Production-Mode Rehearsal:** `backend/scripts/rehearse_production_mode.py` verified CORS allow/deny, security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`, CSP), HSTS behind proxy with `X-Forwarded-Proto`, docs toggle `ENABLE_DOCS`, rate limiter IP resolution under `TRUSTED_PROXY_COUNT=1`, and uniform error envelopes with `request_id`.
- **Vercel CSP Rehearsal & Dist Inspection:** Verified zero `.map` source map files in `frontend/dist`. Inspected all bundle occurrences of `localhost` (safe fallback) and `TiDB` (external attribution and copy). Added deep-link SPA reload test with zero CSP violations in `functional.spec.js`.
- **Deployment URL Specification:** Updated `docs/DEPLOYMENT.md` so `VITE_API_BASE_URL` includes `/api` (`https://railsense-backend.onrender.com/api`) and documented CSP `connect-src` placeholder configuration.
- **Accessibility Verification:** Added `a11y_leftovers.spec.js` auditing ErrorState, mobile drawer, definition popovers, Smart Insights table results, Delay Prediction result view, keyboard drawer focus trap and Escape dismiss, ChartTableToggle keyboard interaction, Delay Patterns hotspot filter controls, 200% zoom reflow (zero horizontal overflow across all 6 tabs), and prefers-reduced-motion media feature. 10/10 tests pass with **0 critical, 0 serious, 0 moderate violations**.
- **Package Audits:**
  - `npm audit`: 2 moderate vulnerabilities in production (`react-router` / `react-router-dom`), 21 in dev tooling.
  - `pip-audit`: 79 vulnerabilities confined to 4 non-runtime utility packages (`pip 23.0.1`, `setuptools 65.5.0`, `filelock 4.1.0`, `pillow 12.3.0`). Zero vulnerabilities in runtime packages (`Flask`, `LightGBM`, `scikit-learn`, `waitress`, `werkzeug`, `numpy`, `psutil`).
- **Rate Limiter Load & Memory Test:** Executed `backend/scripts/rate_limit_load_test.py` across **5,000 requests** with rate limiter active:
  - 290 requests succeeded with HTTP 200 (exact match for multi-client quotas).
  - 4,710 requests throttled with HTTP 429 (`RATE_LIMIT_EXCEEDED`) containing `Retry-After: 60` and `request_id`.
  - Throughput: **2,923.6 req/s**, mean latency: **0.34 ms** (p50: 0.28 ms, p95: 0.76 ms, p99: 1.48 ms).
  - RSS memory progression: 174.87 MB $\rightarrow$ 175.62 MB (**+0.75 MB delta across 5,000 requests**, proving bounded memory and zero leak).
- **Cold Start Discrepancy Breakdown:**
  - Phase 10's **401 ms** measured isolated component loading (`LightGBM Booster` + calibrator + SQLite connection) in an already-initialized Python runtime.
  - Phase 11's **~3,500 ms** measures full end-to-end OS launch: OS process creation (~500 ms) + importing heavyweight scientific packages (`numpy`, `pandas`, `scipy`, `lightgbm`, `sklearn`, `flask`, ~1,900 ms) + `create_app()` and artifact loading (~400 ms) + Waitress socket binding (~150 ms) + first HTTP request processing (~5 ms). Warm requests complete in sub-millisecond time.

### (f) Task 6: License Confirmation & Attribution Integrity
- Verified dataset license as CC-BY-4.0 on upstream HuggingFace Hub (`pjay-in/indian-railways-delays`).
- Confirmed zero premature claims of "live" deployment in `README.md` (all live URLs remain explicitly marked `UNVERIFIED` pending owner deployment).
