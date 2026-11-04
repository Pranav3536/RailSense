# RailSense — Project Technical Handover Document

> **Platform:** RailSense (Indian Railways Delay Intelligence & Prediction)  
> **Status:** All 11 Development Phases Complete  
> **Primary Author / Maintainer:** Pranav ([GitHub: Pranav3536](https://github.com/Pranav3536))  
> **Target Audience:** Engineering Owners, Future Maintainers, Portfolio Interviewers

---

## 1. System Inventory & File Manifest

The RailSense repository is organised as a clean, decoupled monorepo:

```
c:\RailSense\
├── .gitignore                      # Selective tracking rules for <= 46MB runtime serving files
├── DECISIONS.md                    # 53 Architecture Decision Records (D-01 through D-53)
├── PROJECT.md                      # Comprehensive project vision, architecture & conventions
├── README.md                       # Public-facing portfolio documentation & feature tour
├── render.yaml                     # Render Infrastructure-as-Code blueprint
├── task.md                         # Phase-by-phase task master specification
│
├── backend/
│   ├── requirements.txt            # Minimal runtime serving dependencies (Waitress, LightGBM, Flask)
│   ├── requirements-dev.txt        # Local testing & dev tooling (pytest, flake8)
│   ├── requirements-refresh.txt    # TiDB Cloud refresh tooling dependencies (SQLAlchemy, PyMySQL)
│   ├── wsgi.py                     # Production WSGI entrypoint (Waitress, 0.0.0.0, PORT, threads=4)
│   │
│   ├── app/                        # Flask Application Package
│   │   ├── __init__.py             # App factory, security headers, ProxyFix, Rate Limiting
│   │   ├── serving_client.py       # High-performance read-only SQLite serving database client
│   │   ├── api/                    # REST Blueprints (overview, trains, predict, model, patterns, insights)
│   │   ├── ml/                     # Model loading, feature assembly, isotonic calibration & inference
│   │   └── nlp/                    # TF-IDF vectorizer, Logistic Regression classifier, RapidFuzz entity matching
│   │
│   ├── models/                     # Production Serving Models (tracked directly in git)
│   │   ├── deployment_model.joblib # LightGBM GBDT binary classifier (1.97 MB)
│   │   ├── calibrator.joblib       # IsotonicRegression probability calibrator (3.3 KB)
│   │   ├── hist_transformer.joblib # Scaler and feature encoder (643 KB)
│   │   ├── historical_tables.json  # Smoothed 7-day train/station/category delay priors (2.33 MB)
│   │   └── model_metadata.json     # Feature schemas, thresholds, training metadata (1.5 KB)
│   │
│   ├── serving/                    # Precomputed Static & Indexed Serving Data
│   │   ├── serving.sqlite          # Indexed SQLite database: 10,743 trains & stop timetable (40.89 MB)
│   │   ├── manifest.json           # SHA-256 cryptographic checksums & sizes of all 9 serving files
│   │   ├── overview.json           # Fleet-level precomputed KPIs and histograms
│   │   ├── patterns.json           # Diurnal, day-of-week, position, and hotspot aggregates
│   │   └── model_lab.json          # Benchmark curves, confusion matrices, and lift metrics
│   │
│   ├── scripts/                    # Automation & Verification Tooling
│   │   ├── verify_artifacts.py     # Checksum validator called at production startup
│   │   ├── profile_cold_start.py   # Cold-start latency and memory RSS profiler
│   │   ├── test_rate_limiter.py    # Rate limiter & 429 throttling verifier
│   │   ├── reconcile_nlp_metrics.py# NLP intent classification reconciliation & expanded OOD runner
│   │   ├── generate_smoke_expected.py # Generates 20 reference predictions ground truth
│   │   └── smoke_deployed.py       # Post-deployment live production verification runner
│   │
│   └── tests/                      # Pytest Suite (154 passing unit & contract tests)
│
├── frontend/
│   ├── package.json                # React 18, Vite 6, Tailwind CSS, Recharts, Lucide React
│   ├── vite.config.js              # Vite bundler configuration & Vitest setup
│   ├── vercel.json                 # Vercel deployment configuration, SPA rewrites & security headers
│   │
│   ├── src/
│   │   ├── api/                    # API client with in-flight deduplication, TTL caching, error envelopes
│   │   ├── components/
│   │   │   ├── layout/             # AppShell, Sidebar, PageHeader
│   │   │   ├── ui/                 # StatCard, ChartCard, ProbabilityGauge, FactorBars, WakeUpNotice
│   │   │   └── charts/             # Theme tokens, Recharts wrappers (Line, Bar, Area)
│   │   ├── pages/                  # 6 Tab Views (Overview, Explorer, Predict, ModelLab, Patterns, Insights)
│   │   └── test/                   # Vitest unit test suite (73 passing tests)
│   │
│   └── e2e/                        # Playwright Browser E2E Suite (27 passing tests across all tabs)
│       ├── a11y.spec.js            # Axe-core automated WCAG 2.1 AA accessibility audit
│       ├── functional.spec.js      # Full end-to-end user workflows with real backend API
│       ├── failure.spec.js         # Error state handling, 429 rate limiting, WakeUpNotice
│       ├── responsive.spec.js      # Viewport testing across 360px, 768px, 1280px, 1366px, 1920px
│       └── deployed.spec.js        # Post-deployment verification for live production URLs
│
└── docs/                           # Technical Specifications & Experiment Reports
    ├── DEPLOYMENT.md               # 6-step owner deployment guide & troubleshooting matrix
    ├── MODEL_CARD.md               # Production model card (schemas, lifts, curves, ethics)
    ├── UI_DESIGN_SYSTEM.md         # Design system tokens, color contrast, and typography scale
    ├── NLP_EVALUATION.md           # NLP intent benchmarks, false fallbacks, stress evaluation
    ├── ATTRIBUTION.md              # Dataset provenance, citations, and library licenses
    ├── INTERVIEW_NOTES.md          # Technical talking points for Data Science / ML interviews
    └── QA_REPORT.md                # Comprehensive QA benchmarks and verification report
```

---

## 2. Architecture & Data Flow

1. **Decoupled Runtime Principle:** TiDB Cloud is **NOT a runtime dependency** (permanently removed in Phase 8.5). All runtime data comes from local, immutable serving files (`backend/serving/serving.sqlite`, `backend/serving/*.json`, `backend/models/*.joblib`).
2. **Serving Store Architecture:**
   - `serving.sqlite` (40.89 MB) stores canonical route timetables for 10,743 trains and precomputed stop delay statistics.
   - All database queries are read-only (`file:...mode=ro` URI connection), eliminating concurrency locks.
3. **ML Serving Pipeline:**
   - `backend/app/ml/predict.py` loads the trained LightGBM booster (`deployment_model.joblib`) and Isotonic calibrator (`calibrator.joblib`) on process start.
   - Inference requires only schedule-time features (timetable hour, day of week, train historical delay rate, stop sequence position).
   - Single-prediction execution latency is **~2.1 milliseconds** on standard CPU.
4. **NLP Serving Pipeline:**
   - Combined word (1–2 grams) + character (3–5 grams) TF-IDF vectorizer fed to a fast Logistic Regression model.
   - Execution latency is **~1.5 milliseconds**.
   - Conservative threshold gating (`confidence >= 0.40`, `margin >= 0.08`) prevents hallucinations by safely routing low-confidence queries to polite suggestion chips.

---

## 3. How to Run Locally

### Backend Server
```bash
# Activate virtual environment
backend/.venv/Scripts/Activate.ps1

# Start WSGI server (Waitress on Windows/Linux)
python backend/wsgi.py
# Listens on http://0.0.0.0:5000
```

### Frontend Dashboard
```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## 4. How to Run Test Suites

| Suite | Scope | Command | Expected Output |
|---|---|---|---|
| **Backend Pytest** | API endpoints, ML inference, NLP, DB client | `pytest backend/tests/ -v` | 154 passed, 4 skipped in ~64s |
| **Frontend Vitest** | UI components, page adapters, mocks | `npm --prefix frontend test -- --run` | 73 passed across 13 files in ~38s |
| **Frontend Linter** | ESLint code quality & hooks | `npm --prefix frontend run lint` | 0 errors, 0 warnings |
| **Frontend Build** | Production Vite build | `npm --prefix frontend run build` | Clean build in ~22s (`dist/`) |
| **Playwright E2E** | Full browser workflow & accessibility | `npm --prefix frontend run test:e2e` | 27 passed in ~1.6m |
| **Post-Deploy Smoke** | Live production API & frontend | `python backend/scripts/smoke_deployed.py <API_URL> <FE_URL>` | 28/28 checks passed |

---

## 5. Offline Data Refresh Procedure (If Ever Needed)

> [!WARNING]
> Running a data refresh requires active TiDB Cloud credentials and takes ~15–30 minutes to rebuild serving stores. It should only be executed if new raw train records are acquired.

1. Install refresh dependencies:
   ```bash
   pip install -r backend/requirements-refresh.txt
   ```
2. Populate `backend/.env` with read-only TiDB Cloud credentials (`TIDB_HOST`, `TIDB_USER`, `TIDB_PASSWORD`).
3. Re-extract local cache and rebuild serving tables:
   ```bash
   python backend/scripts/build_serving_data.py
   python backend/scripts/verify_artifacts.py
   ```
4. If serving artifacts change, re-generate checksum manifest and reference predictions:
   ```bash
   python backend/scripts/generate_smoke_expected.py
   ```
5. Remove `backend/.env` credentials before committing.

---

## 6. Secrets Management & Security Protocol

- **Zero Runtime Secrets:** Neither Render nor Vercel require database credentials or API keys.
- **Git History Cleanliness:** Verified via `git log -S <secret>`. Zero passwords or private tokens exist in git history.
- **Safe Environment Variables:**
  - Backend: `RAILSENSE_ENV=production`, `PYTHONUNBUFFERED=1`, `FLASK_THREADS=4`, `CORS_ORIGINS=<FRONTEND_URL>`.
  - Frontend: `VITE_API_BASE_URL=<RENDER_BACKEND_URL>`.
