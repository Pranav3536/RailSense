# RailSense — Indian Railways Delay Intelligence & Prediction Platform

> **Status: Phase 3 of 11 complete — Data validation, EDA, leakage-safe feature engineering & prediction task definition verified.**

RailSense is a portfolio Data Science + ML project that turns a real Indian Railways delay dataset into an end-to-end ML platform: data audit, feature engineering, leakage-safe modelling, explainability, and a local NLP query interface — all behind a Flask API served to a React dashboard.

---

## Planned Features (per tab) — ⚠️ None implemented yet

| Tab | Feature | Status |
|-----|---------|--------|
| 1 — Overview ("Railway at a Glance") | Fleet KPIs, delay distribution heatmap, busiest routes | NOT BUILT |
| 2 — Train Explorer ("Single Train Deep Dive") | Per-train timeline, stop-level delay, historical context | NOT BUILT |
| 3 — Delay Prediction ("ML Inference Engine") | Real-time delay probability for a train+station, SHAP feature weights | NOT BUILT |
| 4 — Model Lab ("Model Evaluation & Transparency") | Confusion matrix, PR curve, feature importance, model card | NOT BUILT |
| 5 — Delay Patterns ("Historical Analytics") | Category, station, time-of-day and day-of-week breakdown | NOT BUILT |
| 6 — Smart Insights ("Natural Language Analytics") | Free-text query → parameterised SQL → chart/table (local NLP, no LLM) | NOT BUILT |

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

# 2. Create your local environment file
Copy-Item .env.example backend/.env
# Edit backend/.env and fill in TIDB_USER and TIDB_PASSWORD (keep private!)

# 3. Set up Python environment (from backend/)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # Windows
pip install -r requirements.txt

# 4. Verify TiDB Cloud connectivity & TLS encryption
python scripts/check_connection.py

# 5. Run the data audit script (generates docs/data_audit.json & docs/data_audit.md)
python scripts/audit_data.py

# 6. Run test suite
pytest -v
```

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

## Model Formulation & Split Design (Phase 3 Verified)

> **No model has been trained yet.** Training and evaluation occur in Phase 4.

- **Primary Target:** Schedule-Time (Pre-Run) Binary Delay Prediction: `is_delayed = 1` if `arrival_delay_min > 15`, else `0` (49.92% base rate on eligible stops).
- **Temporal Splitting Strategy:** Split chronologically by journey `start_date` (Warm-up: Oct 07; Train: Oct 08-20; Val: Oct 21-22; Test: Oct 23-24; Excluded/Censored: Oct 25).
- **Anti-Leakage Protocol:** Multi-day journey stops (23.33% of stops occur on subsequent calendar days) are filtered out of historical aggregates via $\text{actual\_arrival} < \text{cutoff\_date}$.
- **Features:** Scikit-learn pipeline in `backend/app/ml/features.py` (schedule-time cyclical features + Bayesian smoothed rolling priors).
- Model card (`MODEL_CARD.md`) will be created in Phase 4.

---

## Screenshots

> *(Empty — to be filled with real screenshots once the UI is built in Phase 6+.)*

---

## Author

**Creator & Maintainer** — GitHub: [Pranav3536](https://github.com/Pranav3536)
