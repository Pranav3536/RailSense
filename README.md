<div align="center">

```
   ______       _  _  _____                      
   | ___ \     (_)| |/  ___|                     
   | |_/ /__ _  _ | |\ `--.   ___  _ __   ___  ___ 
   |    // _` || || | `--. \ / _ \| '_ \ / __|/ _ \
   | |\ \ (_| || || |/\__/ /|  __/| | | |\__ \  __/
   \_| \_\__,_||_||_|\____/  \___||_| |_||___/\___|
```

### 🚂 Indian Railways Delay Intelligence & Prediction Platform
**An end-to-end Machine Learning and Analytics system trained on 2.8M+ train arrival records to forecast schedule-time delays before departure.**

---

[![Live Demo](https://img.shields.io/badge/Live_App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://railsense-app.vercel.app/overview)
[![API Endpoint](https://img.shields.io/badge/REST_API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://railsense-backend-s3z9.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![LightGBM](https://img.shields.io/badge/LightGBM-4.7.0-brightgreen?style=for-the-badge)](https://lightgbm.readthedocs.io/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

```
[ New Delhi ] ════════ 🚃 ════════ 🚃 ════════ 🚃 ════════ [ Howrah Junction ]
      ▲                                                              ▲
   Origin                                                       Destination
  Scheduled                                                 Calibrated Forecast
  Departure                                                 P(Delay > 15m) = 74.2%
```

<br/>

**[ Explore Live Web Application ](https://railsense-app.vercel.app/overview)** • **[ Test Backend API ](https://railsense-backend-s3z9.onrender.com)** • **[ View Architecture ](#-system-architecture)**

</div>

---

> ⚡ **Live Deployment & Cold-Start Notice**:  
> The backend is deployed on Render's free tier. If the service has been inactive, the first request may take **~45 seconds** while the container wakes up. The frontend automatically waits and displays system status until the server is warm.

---

## 📌 Table of Contents
- [Executive Summary](#-executive-summary)
- [Key Machine Learning Results](#-key-machine-learning-results)
- [Dataset & Network Scope](#-dataset--network-scope)
- [Data Leakage Prevention & Hygiene](#-data-leakage-prevention--hygiene)
- [Feature Engineering Pipeline](#-feature-engineering-pipeline)
- [Machine Learning & Model Selection](#-machine-learning--model-selection)
- [Probability Calibration](#-probability-calibration)
- [Smart Insights: Zero-LLM Local NLP](#-smart-insights-zero-llm-local-nlp)
- [Platform Tour (6 Analytical Modules)](#-platform-tour-6-analytical-modules)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Local Setup & Run](#-local-setup--run)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Author & Attribution](#-author--attribution)

---

## 🚄 Executive Summary

Indian Railways is one of the world's most intricate rail transit networks, operating over 10,000 passenger services daily. Train delays create cascading bottleneck effects across signaling blocks, junctions, and platform lines.

Traditional predictive models in transit analytics often suffer from **temporal data leakage**—such as testing on random cross-validation splits that let the model "peek" at future stops of an in-flight train, or using post-departure data that isn't available before a train leaves.

**RailSense** solves this by strictly framing delay prediction as a **schedule-time, pre-departure classification task**:
- **Target**: Will a train arrive at a given station with a delay of **$>15$ minutes**?
- **Data Scope**: **2,805,574 arrival records** across 10,743 trains and 8,584 stations.
- **Strict Anti-Leakage Protocol**: Evaluated on chronological test splits with zero post-hoc operational features.
- **Calibrated Probabilities**: Outputs true real-world risk percentages rather than uncalibrated classification scores.
- **Cost-Free Local NLP**: Answers analytical questions in sub-2ms using zero paid cloud LLM tokens.

---

## 📊 Key Machine Learning Results

All metrics are benchmarked on an **untouched, chronological held-out test split of 193,965 arrivals** (the final 3 calendar days of the dataset).

| Metric / Benchmark | Baseline / Heuristic | RailSense LightGBM | Impact / Relative Lift |
|---|---|---|---|
| **Precision-Recall AUC (PR-AUC)** | `0.4920` (Majority Base) | **`0.8482`** | **+72.4% Relative Lift** |
| **ROC-AUC** | `0.5000` (Random Guess) | **`0.8592`** | **+71.8% Relative Lift** |
| **Historical Prior Lift** | `0.8082` (7-Day Rolling Rate) | **`0.8482`** | **+4.95% Net Gain over History** |
| **Balanced F1-Score** | `0.7330` (Heuristic Prior) | **`0.7782`** (@ 0.410 Threshold) | **+6.17% Net Gain** |
| **Expected Calibration Error (ECE)** | `0.0307` (Raw Trees) | **`0.0093`** (Isotonic) | **69.7% Error Reduction** |
| **Single-Prediction Latency** | Target: $< 50.0$ ms | **`21.9 ms`** (Single CPU Core) | **2.3x Faster than Target** |

```
                     Confusion Matrix on 193,965 Test Stops
                          Actual Delayed       Actual On-Time
    Predicted Delayed       79,532 (TP)          27,910 (FP)
    Predicted On-Time       17,454 (FN)          69,069 (TN)

    • Test Precision: 74.02%  (When a delay is flagged, it is right 3 out of 4 times)
    • Test Recall:    82.01%  (Catches over 82% of all empirical delays)
```

---

## 📦 Dataset & Network Scope

The model is trained on observed passenger train telemetry across the Indian Railways network from **October 7 to October 25, 2026**.

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           Dataset at a Glance                          │
  ├──────────────────────────────────┬─────────────────────────────────────┤
  │ Total Observed Stop Records      │ 2,805,574                           │
  │ Valid Label-Eligible Arrivals    │ 1,773,068                           │
  │ Unique Train Services Cataloged  │ 10,743 trains                       │
  │ Stations Mapped in Network       │ 8,584 railway stations              │
  │ Base Fleet Delay Rate (> 15 min) │ 49.91%                              │
  └──────────────────────────────────┴─────────────────────────────────────┘
```

### Empirical Delay Breakdown by Service Category
Delay behavior varies substantially by train operational category:
- **Suburban / Local (`SUB`):** 26.2% delay rate (dedicated tracks, tight headways).
- **Vande Bharat Express (`VNDB`):** 31.4% delay rate (top signaling priority, modern rolling stock).
- **Passenger Services (`PAS`):** 48.7% delay rate (frequent loop-line halts for express overtakes).
- **Mail / Express (`MEX`):** 68.3% delay rate (long trans-continental hauls spanning $>1,000$ km).
- **Special / Holiday (`TOD`):** 74.1% delay rate (lowest operational path priority).

---

## 🛡️ Data Leakage Prevention & Hygiene

Preventing data leakage is the foundational engineering standard of RailSense:

### 1. Chronological Splitting (No Random $k$-Fold Splits)
In railway operations, a single train journey often runs for 2 to 4 consecutive days across thousands of kilometers. Using standard random cross-validation spreads stops of the *same run* across training and testing, artificially inflating accuracy.
- **Train Split:** Days 1–14 (Oct 7–20, 2026)
- **Validation Split (Calibration & Threshold Tuning):** Days 15–16 (Oct 21–22, 2026)
- **Held-Out Test Split:** Days 17–19 (Oct 23–25, 2026; 193,965 stops)
- **In-Flight Isolation:** Multi-day runs originating in training but extending into test days are clipped at the boundary.

### 2. Permanent Exclusion of Banned Operational Features
The prediction is made **at scheduled departure time**. Features that are recorded only during or after the journey are permanently banned from the feature store:
```python
BANNED_FEATURES = [
    "actual_arrival",
    "actual_departure",
    "departure_delay_min",
    "arrival_reported",
    "status",
    "run_quality"
]
```

---

## ⚙️ Feature Engineering Pipeline

All transformations are deterministic and executed synchronously during runtime inference:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Engineered Feature Categories                     │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Route Topology & Progression                                         │
│    • Cumulative Route Distance (km from origin to target station)       │
│    • Stop Sequence Index & Relative Route Depth (seq / total_stops)     │
│    • Scheduled Inter-Station Running Time (minutes)                     │
│    • Route Density Ratio = Total Route Stops / Total Route Distance     │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Temporal & Diurnal Variance                                          │
│    • Scheduled Arrival Hour (Cyclical Sine & Cosine Encodings)          │
│    • Day of Week (Cyclical Sine & Cosine Encodings)                     │
│    • High-Congestion Night Window Indicator (22:00 – 05:00)             │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Bayesian-Smoothed Historical Priors (Out-of-Fold)                    │
│    • Train Rolling 7-Day Delay Prior                                    │
│    • Destination Station Historical Bottleneck Prior                    │
│    • Train Service Category Historical Prior                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Machine Learning & Model Selection

### Why LightGBM?
Multiple algorithms were benchmarked under identical temporal split conditions:
1. **Rolling Historical Average:** Strong simple heuristic (`0.8082` PR-AUC), but cannot account for diurnal progression, sequence depth, or route congestion.
2. **Logistic Regression:** Fast, but struggled to capture non-linear interactions without complex feature expansion (`0.7610` PR-AUC).
3. **Random Forest:** Good accuracy, but serialized model size exceeded 2.5 GB, violating free-tier cloud memory limits.
4. **LightGBM (Selected Architecture):**
   - **PR-AUC: `0.8482` | ROC-AUC: `0.8592`**
   - Serialized model artifact is only **1.97 MB**.
   - Single-prediction execution takes just **21.9 ms** on standard CPU.
   - Native handling of categorical train types and station density bins.

---

## 🎯 Probability Calibration

Decision trees generate ranking scores that don't always reflect true probabilities. If a model predicts a 70% chance of delay, exactly 7 out of 10 of those trains should arrive late in the real world.

To achieve this, RailSense uses **Isotonic Regression** fitted on the chronological validation set:

```
        Raw Model Predictions vs. Calibrated Real-World Probabilities

  Predicted Risk Band:      [0 - 20%]   [20 - 40%]   [40 - 60%]   [60 - 80%]   [80 - 100%]
  Empirical True Delay %:     11.2%        30.8%        51.1%        69.9%        89.4%
  Calibrated Forecast:        11.0%        30.2%        50.6%        70.1%        89.8%
                              ────────────────────────────────────────────────────────
                                         Expected Calibration Error (ECE)
                                         Raw LightGBM:         0.0307
                                         Isotonic Calibrated:  0.0093  (69.7% Error Drop)
```

---

## 💬 Smart Insights: Zero-LLM Local NLP

Instead of relying on commercial cloud LLM APIs—which add latency ($>1.5\text{s}$), runtime token costs, and risk hallucinated SQL—RailSense includes a **lightweight, deterministic local NLP pipeline**:

```
                       User Natural Language Query
          "Which stations on the Western Railway have top delay rates?"
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ 1. Text Normalizer & Preprocessor                       │
       └────────────────────────────┬────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
  ┌─────────────────────────┐               ┌─────────────────────────┐
  │ 2. Intent Classifier    │               │ 3. Entity Resolution    │
  │    TF-IDF Vectorizer +  │               │    RapidFuzz Fuzzy      │
  │    Logistic Regression  │               │    String Token Match   │
  │    (96.18% Accuracy)    │               │    (Station / Train)    │
  └────────────┬────────────┘               └────────────┬────────────┘
               │                                         │
               └────────────────────┬────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ 4. Parameterized SQL Query Execution                    │
       │    Selects predefined safe template; zero raw SQL gen.  │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
               Instant Analytical Response Card (< 2.0 ms)
```

- **Intent Classification Accuracy:** **96.18%** on held-out analytical intents.
- **Out-of-Domain Guardrail:** **97.62%** polite fallback rate on off-topic questions.
- **Execution Latency:** **$< 2.0\text{ ms}$** on standard single-core CPU.

---

## 🖥️ Platform Tour (6 Analytical Modules)

| View | Screenshot / Scope | Key Capabilities |
|---|---|---|
| **1. Overview** | *"Railway at a Glance"* | Network-wide fleet volume KPIs, 8-bucket delay duration histogram, category punctuality comparison, and 19-day daily trend. |
| **2. Train Explorer** | *"Single Train Deep Dive"* | Paginated catalog of 10,743 services, canonical sequence route resolution, and stop-by-stop delay accumulation profiles. |
| **3. Delay Prediction** | *"Delay Prediction Engine"* | Live pre-departure delay forecasting for any train, station, and journey date with calibrated risk bands and attribution factors. |
| **4. Model Lab** | *"Model Transparency"* | Held-out test performance audit (PR-AUC, ROC-AUC), confusion matrix breakdown, top feature rankings, and service-level recall. |
| **5. Delay Patterns** | *"Historical Discovery"* | Diurnal 24-hour congestion curves, day-of-week distributions, and route bottleneck hotspot rankings. |
| **6. Smart Insights** | *"Natural Language Engine"* | Sub-2ms local query interface answering fleet punctuality and hotspot questions with zero LLM tokens. |

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Client Browser                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Frontend Presentation Layer (Vercel Edge)                │
│  - React 18 + Vite SPA with Tailwind CSS & Recharts                    │
│  - In-memory GET request caching with 60s timeout handling cold starts │
│  - Accessible design audited against WCAG 2.1 AA standards             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Serving API Layer (Render Web Service)                 │
│  - Python 3.10 + Flask 3.1.3 served via Waitress WSGI                  │
│  - Memory Footprint: ~177 MB RSS (Safely within 512 MB Free Tier limit)│
│  - Startup SHA-256 verification of all serialized artifacts            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct Local Disk Access
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Immutable Model & Serving Store                      │
│  - backend/serving/serving.sqlite (~40.89 MB precomputed store)        │
│  - backend/models/deployment_model.joblib (1.97 MB LightGBM Booster)   │
│  - backend/models/calibrator.joblib (Isotonic Calibration Regressor)   │
│  - backend/models/historical_tables.json (Bayesian-smoothed priors)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Machine Learning & Modeling:** LightGBM 4.7.0, Scikit-Learn, NumPy, Pandas, Joblib
- **Local Natural Language Processing:** TF-IDF Vectorization, Logistic Regression, RapidFuzz
- **Backend API & Serving:** Python 3.10, Flask 3.1.3, Waitress WSGI, SQLite 3 (WAL mode)
- **Frontend & Visualization:** React 18.3, Vite, Recharts, Tailwind CSS, Lucide Icons
- **Cloud Infrastructure:** Vercel (Edge Frontend), Render (Python Backend Service)

---

## 🚀 Local Setup & Run

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Git

### 1. Clone Repository & Set Up Virtual Environment
```bash
git clone https://github.com/Pranav3536/RailSense.git
cd RailSense

# Create and activate virtual environment
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate
```

### 2. Install Backend Dependencies & Verify Artifacts
```bash
pip install -r backend/requirements.txt

# Run SHA-256 integrity checks across model and database artifacts
python backend/scripts/verify_artifacts.py
```

### 3. Launch Flask Backend Server
```bash
python backend/wsgi.py
# Server starts on http://127.0.0.1:5000
```

### 4. Install & Launch Frontend
In a second terminal window:
```bash
cd frontend
npm install
npm run dev
# Vite dev server runs at http://localhost:5173
```

---

## 🧪 Testing & Quality Assurance

The platform includes automated testing across backend models, API routes, and frontend views:

```bash
# 1. Backend Pytest Suite (Data transformations, model inference, API contracts)
pytest backend/tests/ -v

# 2. Frontend Unit & Adapter Tests (Vitest)
npm --prefix frontend test -- --run

# 3. Static Analysis & Linting
npm --prefix frontend run lint

# 4. Production Frontend Compilation Check
npm --prefix frontend run build

# 5. Playwright Browser E2E Suite
npm --prefix frontend run test:e2e
```

---

## 👤 Author & Attribution

- **Creator & Data Science Engineer:** **Pranav Shrivastav**  
- **GitHub:** [@Pranav3536](https://github.com/Pranav3536)  
- **Dataset Attribution:** Indian Railways Delay Dataset (`pjay-in/indian-railways-delays` on HuggingFace).  
- **License:** Project source code is licensed under the [MIT License](LICENSE).  

---

<div align="center">

```
   ═════════════════════════════════════════════════════════════════════════
          RailSense • Developed with Data Science Discipline & Care
   ═════════════════════════════════════════════════════════════════════════
```

**[ Back to Top ⬆ ](#-indian-railways-delay-intelligence--prediction-platform)**

</div>
