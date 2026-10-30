# RailSense — Indian Railways Delay Intelligence & Prediction Platform

> **Status: Phase 9 of 11 complete — All 6 Tabs (Overview, Train Explorer, Delay Prediction, Model Lab, Delay Patterns, Smart Insights) connected live to REST API, 64 Vitest tests, 133 backend pytest passing.**

RailSense is a portfolio Data Science + ML project that turns a real Indian Railways delay dataset (2.8M rows) into an end-to-end ML platform: data audit, feature engineering, leakage-safe modelling, explainability, a high-performance REST API backed by an indexed serving store, and a local NLP query interface — all served to a React dashboard.

---

## Features (per tab)

| Tab | Feature | Status |
|-----|---------|--------|
| 1 — Overview ("Railway at a Glance") | Fleet KPIs, 8-tier delay distribution histogram, category comparison, 19-day daily trendline with boundary caveats | **COMPLETE (Phase 7)** |
| 2 — Train Explorer ("Single Train Deep Dive") | Search catalog, canonical timetable keyed strictly by `seq`, stop delay progression, per-date history | **COMPLETE (Phase 7)** |
| 3 — Delay Prediction ("ML Inference Engine") | Real-time delay probability for arbitrary train+stop, calibrated gauge with 0.410 threshold marker, risk bands, local feature associations, and cold-start fallback | **COMPLETE (Phase 8.5)** |
| 4 — Model Lab ("Model Evaluation & Transparency") | Multi-model benchmark comparison table with Test/Val split toggle, PR curve, Calibration reliability diagram, ROC curve, test partition confusion matrix, feature importance, and Formulation 2 research benchmark | **COMPLETE (Phase 8.5)** |
| 5 — Delay Patterns ("Historical Analytics") | Category, station, time-of-day, day-of-week breakdown, route position, and interactive hotspot explorer | **COMPLETE (Phase 9)** |
| 6 — Smart Insights ("Natural Language Analytics") | Local NLP question answering (TF-IDF + Logistic Regression + RapidFuzz) with deterministic templates, clarification flow, and prediction redirect | **COMPLETE (Phase 9)** |

---

## Architecture

```
TiDB Cloud (MySQL-compatible)
      │
      │  TLS/SSL, port 4000
      ▼
Python / Flask Backend (Render or similar)
      │  SQLAlchemy + PyMySQL
      │  Pandas EDA  |  sklearn / LightGBM ML  |  SHAP  |  TF-IDF NLP
      │
      │  REST JSON API (HTTPS)
      ▼
React + Vite Frontend (Vercel)
      │  Recharts + Lucide + Tailwind
      └─ 6-tab dashboard
```

**Security principle:** The React app never speaks directly to TiDB. All DB access is through the Flask API. Credentials exist only as server-side environment variables.

---

## Tech Stack

### Backend
- **Language:** Python 3.10+
- **Framework:** Flask + Flask-CORS
- **Database client:** SQLAlchemy + PyMySQL (TLS)
- **Data:** Pandas, NumPy
- **ML:** scikit-learn, LightGBM
- **Explainability:** SHAP
- **NLP:** TF-IDF, RapidFuzz (no paid APIs, no hosted LLMs at runtime)
- **Viz:** Matplotlib, Seaborn (server-side EDA)
- **Tests:** pytest

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Charts:** Recharts
- **Language:** Plain JavaScript (JSX) — TypeScript is NOT used (final decision)
- **Routing:** React Router
- **Hosting:** Vercel (free tier)

---

## Repository Structure

```
railsense/
├── task.md              ← Master project tracker (read this first)
├── README.md            ← This file
├── PROJECT.md           ← Technical blueprint
├── DECISIONS.md         ← Architecture decision log
├── .gitignore
├── .env.example         ← Environment variable template (no secrets)
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── api/         ← Flask blueprints (Phase 5)
│   │   ├── db/          ← DB connection & query helpers (Phase 2)
│   │   ├── ml/          ← Model loading & inference (Phase 4/5)
│   │   └── nlp/         ← NLP intent/entity pipeline (Phase 9)
│   ├── tests/           ← pytest test suite (Phase 5+)
│   ├── models/          ← Saved model metadata JSON (binaries gitignored)
│   └── scripts/         ← EDA, audit, training scripts (Phase 3/4)
├── frontend/            ← React app (Phase 6)
├── docs/eda/            ← EDA plots and reports (Phase 3)
└── notebooks/           ← Jupyter analysis notebooks (Phase 3)
```

---

## Prerequisites

- Python 3.10+
- Node 18+ and npm 8+
- Git
- A TiDB Cloud account with credentials to the `railsense` database

---

## Setup & Verification

```powershell
# 1. Clone the repository
git clone <repo-url>
cd railsense

# 2. Set up Python environment (runtime requires ZERO database credentials!)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # Windows
pip install -r requirements.txt

# 3. Run API smoke test & runtime independence verification (23 endpoints)
python scripts/smoke_api.py

# 4. Start local Flask API with multi-threaded Waitress WSGI server
python wsgi.py
# Server runs at: http://127.0.0.1:5000 (Swagger UI at http://127.0.0.1:5000/api/docs)

# 5. Run full test suite (133 passed, 4 skipped in ~13s)
pytest tests -v
```

---

## Optional Data Refresh (Offline, Not Part of App)

The deployed application runs completely offline using local precomputed SQLite and JSON stores. To perform an optional offline data extraction from TiDB Cloud:

```powershell
pip install -r requirements-refresh.txt
# Set TIDB_HOST, TIDB_USER, TIDB_PASSWORD in backend/.env
python scripts/check_connection.py
python scripts/extract_data.py
python scripts/build_serving_data.py
```
*Note: Refreshing shifts the historical observation window and may require model retraining and threshold re-validation.*

---

## Environment Variables

See [`.env.example`](.env.example) for the full list and descriptions.

**Never commit `.env`.** The `.gitignore` excludes all `.env.*` variants except `.env.example`.

Key variables:

| Variable | Purpose |
|----------|---------|
| `TIDB_HOST` | TiDB Cloud gateway hostname |
| `TIDB_PORT` | `4000` |
| `TIDB_USER` / `TIDB_PASSWORD` | Database credentials (never hardcode) |
| `TIDB_DATABASE` | `railsense` |
| `FLASK_ENV` | `development` or `production` |
| `VITE_API_BASE_URL` | React → Flask API URL (not a DB URL) |

---

## Data Limitations

- The dataset covers approximately **19 days** (2026-10-07 to 2026-10-25 — owner-reported, to be verified in Phase 2).
- It is **NOT** multi-year historical data and is **NOT** a live feed.
- Labelled "Observed Railway Dataset" until provenance is independently verified.
- Actual timestamps and delay columns contain missing values.
- Negative delay values are valid (train arrived/departed early) and are never clipped.
- All dataset statistics are owner-reported and will be re-verified in Phase 2.

---

## Model Card & Verified Benchmark Results (Phase 4 Verified)

See [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md) for full benchmark documentation, per-segment error analysis, and SHAP explainability.

- **Primary Architecture:** LightGBM + Isotonic Calibration (`AP = 0.8482`, `ROC-AUC = 0.8592`, `F1 = 0.7782` on untouched Test split).
- **Decision Threshold:** `0.410` (tuned on Validation to maximize F1; catches 82.0% of late arrivals with 74.0% precision).
- **En-Route Model (Formulation 2):** Incorporates observed delay at stop $k-1$ (`PR-AUC = 0.9293`, `ROC-AUC = 0.9278`, `F1 = 0.8527`).
- **Explainability:** SHAP TreeExplainer plots archived in `docs/model/` with plain-English translation in `docs/model/explanations_simple.md`.
- **Saved Artifacts:** Model binaries stored in `backend/models/` (gitignored), metadata in `backend/models/model_metadata.json`, and inference service in `backend/app/ml/predict.py`.

---

## Screenshots

> *(Empty — to be filled with real screenshots once the UI is built in Phase 6+.)*

---

## Author

**Creator & Maintainer** — GitHub: [Pranav3536](https://github.com/Pranav3536)
