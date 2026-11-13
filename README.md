
# 🚆 RailSense — Indian Railways Delay Intelligence & Prediction Platform

[![Live Demo](https://img.shields.io/badge/Live_App-railsense--app.vercel.app-0070F3?style=for-the-badge&logo=vercel&logoColor=white)](https://railsense-app.vercel.app/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?style=flat&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![LightGBM](https://img.shields.io/badge/LightGBM-4.7.0-2E7D32?style=flat&logo=scikitlearn&logoColor=white)](https://lightgbm.readthedocs.io/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success?style=flat)](https://www.w3.org/WAI/standards-guidelines/wcag/)

> **🌐 Live Deployment:** [https://railsense-app.vercel.app/](https://railsense-app.vercel.app/)  

---

## 📌 1. Executive Summary & Value Proposition

**RailSense** is a full-stack operational transit intelligence platform and pre-departure delay forecasting system engineered on **2,805,574 verified train arrival records** across Indian Railways (observed snapshot: October 7–25, 2026). It bridges the gap between raw historical transit tables and actionable journey intelligence across **10,743 train services** and **8,584 station nodes**.

Unlike naive ML tutorials that suffer from catastrophic future-data leakage through random splits, RailSense is built with production machine learning rigour:

1. **Temporal Anti-Leakage Protocol:** Evaluated strictly on chronological partitions. Multi-day train journeys (spanning up to 4 calendar days) are barred from looking ahead past arrival cutoffs.
2. **Zero Banned Feature Ingestion:** Operational post-hoc columns (`actual_arrival`, `actual_departure`, `departure_delay_min`, `arrival_reported`, `status`, `run_quality`) are permanently excluded from training and inference pipelines.
3. **Calibrated Probability Space:** Raw decision tree log-odds are mapped to empirical real-world probabilities via Isotonic Regression on held-out validation data, cutting Expected Calibration Error (ECE) from 0.0307 to **0.0093**.
4. **Zero-Token Local NLP Engine:** Natural language query understanding runs on sub-millisecond local TF-IDF classification and RapidFuzz entity extraction with parameterized SQL templates — zero cloud API tokens, zero runtime latency, zero hallucinated data.
5. **Memory-Constrained Production Serving:** Optimized for free-tier cloud containers (Render 512 MB RAM). Precomputed lookups and calibrated model artifacts operate at an RSS memory footprint of **~177 MB** with a **~22 ms** CPU inference latency.

---

## 📊 2. Measured Statistical & Machine Learning Results

All metrics are benchmarked on an untouched, held-out test split of **193,965 stop events**:

| Evaluation Metric | Baseline / Benchmark | RailSense LightGBM (Calibrated) | Performance Gain |
|---|---|---|---|
| **Average Precision (PR-AUC)** | 0.4920 (Majority Baseline) | **0.8482** (Test Split) | **+72.40% Relative Lift** |
| **ROC-AUC** | 0.5000 (Random Guess) | **0.8592** (Test Split) | **+71.84% Relative Lift** |
| **Lift over Rolling Prior** | 0.8082 (7-Day Rolling History) | **0.8482** (ML Pipeline) | **+4.95% Net Gain** |
| **Balanced F1 Score** | 0.7330 (History Prior) | **0.7782** (@ Threshold 0.410) | **+6.17% Net Gain** |
| **Expected Calibration Error (ECE)** | 0.0307 (Raw LightGBM) | **0.0093** (Isotonic Calibrated) | **69.7% Error Reduction** |
| **Inference Latency (`predict_single`)** | Target: < 50.0 ms | **21.9 ms** median (Local CPU) | **2.3x Faster than Target** |
| **NLP Classification Accuracy** | 22.90% (Keyword Matching) | **96.18%** (Held-Out Test Set) | **Reliable Query Routing** |
| **Out-of-Scope Fallback Interception** | 0.00% (Naive Baseline) | **97.62%** (42 Hostile OOD Tests) | **Zero Hallucinated Metrics** |

---

## 🧪 3. Comprehensive Model Evaluation & Benchmarks

The **Model Lab** features an empirical benchmark comparing 11 machine learning algorithms, highlighting operational trade-offs across speed, memory, and predictive accuracy:

### Algorithm Comparison Table (193,965 Test Stops)

| Algorithm | PR-AUC | ROC-AUC | F1-Score | Latency (p95) | Artifact Size | Architectural Verdict |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **LightGBM (Calibrated)** | **0.8482** | **0.8592** | **0.7782** | **21.9 ms** | **1.97 MB** | 🏆 **Production Winner:** Highest accuracy, sub-22ms latency, fits 512MB RAM cap. |
| **XGBoost** | 0.8465 | 0.8570 | 0.7750 | 48.2 ms | 35.4 MB | Strong contender; 3x slower training and 18x larger artifact footprint. |
| **Random Forest (100 Trees)** | 0.8310 | 0.8420 | 0.7610 | 115.0 ms | > 1.8 GB | High predictive power, but artifact size causes OOM crashes on free-tier containers. |
| **Decision Tree (CART)** | 0.7290 | 0.7410 | 0.6940 | 3.1 ms | 12.0 MB | Fast, but suffers high variance and overfits on lower-density branch stations. |
| **Logistic Regression (L2)** | 0.7140 | 0.7380 | 0.6820 | 4.8 ms | < 1 MB | Linear boundary misses complex non-linear diurnal and congestion shifts. |
| **Gaussian Naive Bayes** | 0.6420 | 0.6710 | 0.6150 | 2.4 ms | < 1 MB | Violates feature independence assumption between stop sequence and cumulative distance. |
| **Rolling Historical Baseline** | 0.8082 | 0.8120 | 0.7330 | ~2.0 ms | 5.2 MB | Strong domain prior, but cannot capture multi-variable route propagation. |

### Architectural Rationale for Other Evaluated Algorithms:

- **Linear Regression:** Delay prediction is framed as a binary classification problem ($>15\text{ min}$ delay threshold). Linear Regression produces unbounded real numbers $(-\infty, +\infty)$, violates probability bounds $[0, 1]$, and suffers from heteroskedastic error distributions.
- **K-Nearest Neighbors (KNN) & Support Vector Machines (SVM):** KNN requires $O(N)$ distance computations per request ($N = 1.77M$ training stops), resulting in $>4.5\text{ s}$ per prediction. Kernel SVM scales with $O(N^2)$ to $O(N^3)$ computational complexity, making multi-million record railway serving unfeasible.
- **K-Means Clustering & PCA (Unsupervised Role):** Evaluated during exploratory data analysis. K-Means was employed to cluster stations into 4 operational tiers (Major Junctions, Suburban Nodes, Intermediate Passes, Terminal Yards). PCA demonstrated that feature variance was broadly distributed across 18 components; LightGBM was selected because gradient boosted decision trees naturally handle tabular cardinality without discarding variance.

---

## 🏗️ 4. System Architecture & Request Lifecycle

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Web Browser                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Vercel Global Edge CDN (React 18 + Vite)                 │
│  - Live URL: https://railsense-app.vercel.app/                         │
│  - 6 Modular Analytics Views (Home, Overview, Train Hub, etc.)         │
│  - WCAG 2.1 AA accessible light UI with deep navy sidebar navigation   │
│  - Automatic WakeUpNotice detector for Render cold start (> 4.0s)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            Render Free Web Service (Waitress WSGI + Flask)             │
│  - Memory RSS: ~177 MB (well below 512 MB free tier ceiling)           │
│  - Sliding-window rate limiter: 120 req/min with 429 Retry-After       │
│  - Startup Verification: SHA-256 integrity check across all artifacts  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct Local Disk Lookups
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Immutable Serving Store (< 46 MB)                  │
│  - backend/serving/serving.sqlite (40.89 MB, Indexed Route Catalog)    │
│  - backend/models/deployment_model.joblib (1.97 MB LightGBM Booster)   │
│  - backend/models/calibrator.joblib (Isotonic Calibration Curve)       │
│  - backend/models/historical_tables.json (Smoothed Prior Lookups)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ 5. Platform Walkthrough: 6 Analytical Views

1. **🏠 Home ("Quick Guide", `/`):**
   - Executive onboarding portal highlighting core platform metrics: **10,743 trains**, **8,584 stations**, and **28.1 Lakh records**.
   - 4-step workflow explaining train selection, bottleneck identification, probability estimation, and network-wide exploration.
   - Direct launch action buttons routing into Train Hub, Network Trends, and Model Lab.

2. **📊 Overview ("Railway at a Glance", `/overview`):**
   - Fleet volume KPIs across 1,773,068 label-eligible stops with a **49.91%** global delay incidence rate.
   - 8-tier delay distribution histogram (from on-time $\le 0\text{ min}$ to severe $> 180\text{ min}$).
   - Train category punctuality breakdown (e.g., Suburban at 26.2% vs. Mail Express at 68.3%).
   - Daily operational trendlines with marked left-truncated and right-censored observation boundaries.

3. **🚆 Train Hub ("Route & Predictions", `/trains`, `/trains/:trainNumber`):**
   - Unified workspace merging searchable route timetable exploration with pre-departure machine learning predictions.
   - Search 10,743 trains with pagination, category filters, and sequence sorting.
   - Complete route timetable keyed by canonical sequence (`seq`), correctly handling circular/loop routes where station codes repeat.
   - Embedded ML delay predictor: outputs calibrated probability percentages, risk tier badges (Low, Moderate, High, Severe), top 3 predictive factors in plain English, and stop historical profiles.
   - Bidirectional URL parameter synchronization (`?seq=&date=`) for sharable analytical deep-links.

4. **🧪 Model Lab ("Model Evaluation & Transparency", `/model-lab`):**
   - Test-set evaluation metrics: Precision (74.0%), Recall (82.0%), and F1 Score (0.7782).
   - Multi-algorithm reproducible comparison table with validation/test split toggle, inference latency, and file footprint.
   - Detailed technical justifications for tree-based vs. linear/instance-based algorithm selection.
   - 2x2 confusion matrix over 193,965 test stops and top 5 global feature importance rankings.

5. **📈 Delay Patterns ("Network Patterns", `/patterns`):**
   - Diurnal departure-hour curves illustrating afternoon and late-night delay accumulation.
   - Day-of-week reliability variations qualified by calendar sample size.
   - Distance progression graphs revealing how delays compound between origin and destination terminals.
   - Interactive Station and Train Hotspot Explorer with threshold filtering.

6. **💬 Smart Insights ("Natural Language Analytics", `/insights`):**
   - Zero-token, local NLP query assistant answering questions regarding fleet punctuality, route bottlenecks, and specific train statistics.
   - Powered by local TF-IDF vectorization and RapidFuzz entity extraction with parameterized SQLite execution.
   - Resilient fallback flow providing contextual suggestion chips when queries are ambiguous.

---

## 💻 6. Local Development Quickstart

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Git

### 1. Clone & Set Up Backend

```powershell
# Clone the repository
git clone https://github.com/Pranav3536/RailSense.git
cd RailSense

# Activate Python Virtual Environment
.\.venv\Scripts\Activate.ps1
# On Linux/macOS: source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Verify model and database artifacts
python backend/scripts/verify_artifacts.py

# Launch multi-threaded Waitress WSGI server
python backend/wsgi.py
```

*Backend API initializes on `http://127.0.0.1:5000`*

### 2. Set Up & Run Frontend

In a separate terminal window:

```powershell
cd frontend
npm install
npm run dev
```

*Frontend dev server initializes on `http://localhost:5173`*

---

## 🧪 7. Test Suite & Verification Commands

RailSense includes end-to-end automated testing covering machine learning pipelines, REST endpoints, UI components, and browser accessibility:

```powershell
# 1. Backend Pytest Suite (156 unit & integration tests)
pytest backend/tests/ -v

# 2. Frontend Vitest Suite (102 component & page tests)
npm --prefix frontend test -- --run

# 3. Frontend Code Quality & Linting
npm --prefix frontend run lint

# 4. Production Build Verification
npm --prefix frontend run build

# 5. Playwright Browser E2E & Accessibility Suite
npm --prefix frontend run test:e2e

# 6. Live Deployment Smoke Test
python backend/scripts/smoke_deployed.py https://railsense-app.vercel.app/
```

---

## 📁 8. Repository Structure

```text
RailSense/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (overview, trains, predict, model, patterns, insights)
│   │   ├── ml/              # Inference engine, feature pipeline, isotonic calibrator
│   │   └── nlp/             # TF-IDF intent classifier, entity matchers, SQL templates
│   ├── models/              # LightGBM booster (.joblib), calibrator, rolling priors
│   ├── serving/             # SQLite route catalog & precomputed summary tables
│   ├── scripts/             # Data audit, algorithm benchmark generation, artifact verifier
│   ├── tests/               # 156 Pytest integration & unit test suites
│   ├── requirements.txt     # Python production dependencies
│   └── wsgi.py              # Production Waitress WSGI server runner
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (PageHeader, Badges, Metrics, Timelines)
│   │   ├── pages/           # 6 main views (Home, Overview, TrainHub, ModelLab, etc.)
│   │   └── api/             # Axios/fetch client wrapper services
│   ├── e2e/                 # Playwright accessibility & responsive test suites
│   ├── package.json         # React 18, Vite, Tailwind CSS configurations
│   └── vite.config.js       # Vite build & proxy settings
└── docs/                    # Architecture decisions, benchmark tables, and QA logs
```

---

## 📜 9. License & Attribution

- **Application Code:** [MIT License](https://www.google.com/search?q=LICENSE)
- **Dataset:** Indian Railways Transit Records (`pjay-in/indian-railways-delays` via HuggingFace). See [docs/ATTRIBUTION.md](https://www.google.com/search?q=docs/ATTRIBUTION.md) for data provenance.
- **Author & Developer:** Pranav Shrivastav ([GitHub: @Pranav3536](https://github.com/Pranav3536))
- **Live URL:** [https://railsense-app.vercel.app/](https://railsense-app.vercel.app/)
