# RailSense — Indian Railways Delay Intelligence & Prediction Platform

[![Python](https://img.shields.io/badge/Python-3.10-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-black.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![LightGBM](https://img.shields.io/badge/LightGBM-4.7.0-brightgreen.svg)](https://lightgbm.readthedocs.io/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-success.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Tests](https://img.shields.io/badge/Tests-154%20Pytest%20%7C%2073%20Vitest%20%7C%2038%20Playwright-emerald.svg)](https://github.com/)

> **Live Deployment:**  
> - **Frontend (Vercel):** `UNVERIFIED` (pending owner deployment via [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))  
> - **Backend API (Render):** `UNVERIFIED` (pending owner deployment via [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))  
> - **Status:** **Local implementation and test suites verified.** 154 backend pytest passing (4 skipped), 73 frontend Vitest passing, 38 browser Playwright E2E passing (4 live skipped) with 0 severe, critical, or moderate WCAG 2.1 AA violations across 16 audited viewports and dynamic states.

---

## 1. Executive Summary & Core Value Proposition

RailSense is a production-grade machine learning platform and analytics dashboard engineered over an observed dataset of **2,805,574 train arrival records** across Indian Railways (October 7–25, 2026).

Unlike toy ML tutorials using random train/test splits that leak future temporal signals, RailSense adheres to rigorous data science principles:
1. **Strict Temporal Anti-Leakage Protocol:** Models are evaluated across chronological partitions. Multi-day in-flight train runs (spanning up to 4 calendar days) are strictly barred from looking ahead past arrival cutoffs.
2. **Zero Banned Feature Ingestion:** Operational post-hoc columns (`actual_arrival`, `actual_departure`, `departure_delay_min`, `arrival_reported`, `status`, `run_quality`) are permanently excluded from inference pipelines.
3. **Calibrated Probability Space:** Raw decision tree scores are calibrated into true empirical frequencies via Isotonic Regression on held-out validation data, reducing Expected Calibration Error (ECE) from 0.0307 to **0.0093**.
4. **100% Free, Zero-LLM Local NLP:** Natural language query understanding is powered entirely by a sub-millisecond local TF-IDF + Logistic Regression pipeline and RapidFuzz entity extraction with parameterised SQL templates — zero paid API tokens, zero hallucinated SQL, zero runtime cloud LLMs.
5. **Decoupled Architecture:** Zero remote database dependency at runtime. Serving requests query an indexed, precomputed SQLite database (~40.9 MB) and calibrated LightGBM booster artifacts, staying within Render's free 512 MB memory tier (~177 MB RSS).

---

## 2. Key Measured Statistical & Machine Learning Results

| Evaluation Metric | Baseline / Benchmark | RailSense LightGBM (Calibrated) | Lift / Performance |
|---|---|---|---|
| **Average Precision (AP / PR-AUC)** | 0.4920 (Majority Baseline) | **0.8482** (Untouched Test Split) | **+72.40% Relative Lift** |
| **ROC-AUC** | 0.5000 (Random Guessing) | **0.8592** (Untouched Test Split) | **+71.84% Relative Lift** |
| **Lift over Train Historical Prior** | 0.8082 (7-Day Rolling History) | **0.8482** (Machine Learning Model) | **+4.95% Net Gain** |
| **Balanced F1 Score** | 0.7330 (History Prior) | **0.7782** (@ Operational Threshold 0.410) | **+6.17% Net Gain** |
| **Expected Calibration Error (ECE)** | 0.0307 (Raw LightGBM) | **0.0093** (Isotonic Calibrated) | **69.7% Error Reduction** |
| **Model Inference Latency (`predict_single`)** | Target: < 50.0 ms | **21.9 ms** median / **22.0 ms** mean (Local CPU) | **2.3x Faster than Target** |
| **NLP Intent Classification Accuracy** | 22.90% (Keyword Search) | **96.18%** (Held-Out Test, Dev-Tuned) / **35.71%** (Hostile Stress Suite) | **Conservative Fallback Interception** |
| **Out-of-Scope Fallback Interception** | Random Guessing: 0% | **97.62%** (Expanded 42 OOD Suite) | **Zero Hallucinated Metrics** |

---

## 3. System Architecture & Request Lifecycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Web Browser                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Vercel Global Edge CDN (React 18 + Vite)                │
│  - 6 Analytical Tabs (Overview, Explorer, Predictor, Lab, Patterns)    │
│  - Security Headers: CSP, X-Frame-Options: DENY, Referrer-Policy       │
│  - Automated WakeUpNotice detector for Render cold start (> 4.0s)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Render Free Web Service (Waitress WSGI + Flask)          │
│  - Memory RSS: ~177 MB (Under 512 MB Free Tier Cap)                    │
│  - Rate Limiter: 120 req/min (IP sliding window with 429 Retry-After)   │
│  - Startup Verification: SHA-256 integrity check of all 9 artifacts    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct Local Disk Access
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Immutable Serving Store (< 46 MB)                    │
│  - backend/serving/serving.sqlite (40.89 MB, Indexed Train Catalog)    │
│  - backend/models/deployment_model.joblib (1.97 MB, LightGBM Booster)  │
│  - backend/models/calibrator.joblib (Isotonic Regression Transformer)   │
│  - backend/models/historical_tables.json (Smoothed Rolling Priors)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Platform Feature Tour (6 Analytical Views)

1. **Tab 1 — Overview ("Railway at a Glance"):**
   - Macro fleet volume KPIs (1,773,068 label-eligible stops, 49.91% delayed rate).
   - 8-tier delay distribution histogram (from on-time $\le 0$ min to severe $> 180$ min).
   - Category-level punctuality comparison (Suburban at 26.2% vs. Mail Express at 68.3%).
   - 19-day daily trendline with explicit left-truncated and right-censored boundary marking.

2. **Tab 2 — Train Explorer ("Single Train Deep Dive"):**
   - Searchable catalog of 10,743 train services with pagination and search filters.
   - Route timetable keyed strictly by canonical sequence number (`seq`), handling circular/loop routes where station codes repeat.
   - Stop-level delay accumulation profile and per-date run history.

3. **Tab 3 — Delay Prediction ("ML Inference Engine"):**
   - Schedule-time pre-departure arrival delay probability forecasting for arbitrary train, destination stop, and journey date.
   - Calibrated probability gauge with visual operational decision threshold marker (`0.410`).
   - Educational risk band classification (`Low`, `Medium`, `High`) and top SHAP feature associations.
   - Prospective date generalization alerts and cold-start fallback indicators.

4. **Tab 4 — Model Lab ("Model Evaluation & Transparency"):**
   - Transparent multi-model benchmark table comparing Majority, Category Prior, Train History Prior, Raw LightGBM, and Calibrated LightGBM across Validation and Test splits.
   - Interactive Precision-Recall (PR) Curve, Calibration Reliability Diagram, and ROC Curve.
   - Test partition confusion matrix at the operational threshold (`78,276` True Positives).
   - Top 10 feature importance gain ranking and Banned Features protocol transparency.
   - Formulation 2 (En-Route Dynamic Telemetry) research benchmark card.

5. **Tab 5 — Delay Patterns ("Historical Analytics"):**
   - Diurnal hour-of-day progression highlighting late-night delay accumulation.
   - Day-of-week distribution with sample size caution notes (2–3 calendar days per weekday).
   - Route progression analysis showing how delay propagates from origin to destination.
   - Interactive Hotspot Explorer with level toggle (Station vs. Train) and user-driven "Apply" filtering.

6. **Tab 6 — Smart Insights ("Natural Language Analytics"):**
   - Local parameterised NLP interface answering analytical questions about fleet punctuality, specific trains, station hotspots, and methodological definitions.
   - Zero LLM runtime tokens — runs in sub-2ms on standard CPU.
   - Polite fallback flow with 3 interactive candidate suggestion chips for ambiguous queries.
   - Automated intent clarification and prediction redirection.

---

## 5. Local Development Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Git

### 1. Clone & Set Up Backend
```bash
git clone https://github.com/<YOUR_USERNAME>/RailSense.git
cd RailSense

# Create and activate Python virtual environment
python -m venv backend/.venv
# Windows PowerShell:
backend/.venv/Scripts/Activate.ps1
# Linux/macOS:
# source backend/.venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Verify Serving Artifacts
```bash
python backend/scripts/verify_artifacts.py
```

### 3. Launch Backend API Server
```bash
python backend/wsgi.py
# Server starts on http://127.0.0.1:5000
```

### 4. Set Up & Run Frontend
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
# Vite dev server opens at http://localhost:5173
```

---

## 6. Test Suite & Verification Commands

The RailSense repository includes comprehensive automated test suites covering backend units, API contracts, frontend components, and browser accessibility:

```bash
# 1. Backend Pytest Suite (154 passed, 4 skipped in ~64s)
pytest backend/tests/ -v

# 2. Frontend Vitest Unit Suite (73 passed in ~38s)
npm --prefix frontend test -- --run

# 3. Frontend ESLint Check (0 warnings, 0 errors)
npm --prefix frontend run lint

# 4. Production Frontend Build Check
npm --prefix frontend run build

# 5. Playwright Browser E2E Suite (38 passed, 4 live skipped in ~2.0m)
npm --prefix frontend run test:e2e

# 6. Post-Deployment Verification Tooling (when live URLs are provided)
python backend/scripts/smoke_deployed.py <DEPLOYED_API_URL> [<DEPLOYED_FRONTEND_URL>]
```

---

## 7. Production Deployment Instructions

For complete, step-by-step production deployment instructions to Render (free tier backend) and Vercel (free edge frontend), consult:
👉 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

For engineering interview talking points, architectural decisions, and failure modes:
👉 **[docs/INTERVIEW_NOTES.md](docs/INTERVIEW_NOTES.md)**

For data provenance and licensing details:
👉 **[docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)**

---

## 8. License & Attribution

- **Application Source Code:** MIT License (see repository root).
- **Underlying Dataset:** Indian Railways Delay Dataset (`pjay-in/indian-railways-delays` on HuggingFace). License: **CC-BY-4.0** (Creative Commons Attribution 4.0 International). See [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) for full attribution.
- **Creator & Maintainer:** Pranav ([GitHub Profile](https://github.com/Pranav3536))
