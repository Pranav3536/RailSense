# RailSense — Task Master Document
**Single source of truth for all phases. A fresh AI session must be able to continue the project from this file alone.**

---

## 1. Project Objective & Architecture

### Objective
RailSense is an Indian Railways Delay Intelligence & Prediction Platform built as a portfolio project targeting fresher Data Science / ML roles. The core value is **genuine data work**: real data processing, thorough EDA, leakage-safe ML, explainability, and local NLP. The React frontend is a presentation layer only — it performs no data logic.

### Architecture Diagram
```
TiDB Cloud (MySQL-compatible, TLS)
   │  railsense.train_records
   │  ~2.8 M rows, 10 columns+
   ▼
Python Backend (Flask)
   ├── db/        SQLAlchemy connection pool (env-var credentials, read-only intent)
   ├── scripts/   Data audit, EDA, feature engineering, ML training (offline)
   ├── ml/        Trained model loader + leakage-safe inference pipeline
   ├── nlp/       TF-IDF intent classifier + RapidFuzz entity extractor
   └── api/       Flask blueprints → REST JSON endpoints
         │
         │  HTTPS / JSON
         ▼
React + Vite Frontend (Vercel)
   └── 6 tabs: Overview | Train Explorer | Delay Prediction |
               Model Lab | Delay Patterns | Smart Insights
```

**Data flow rule:** The frontend NEVER connects to TiDB. All database access is through the Flask API. Credentials exist only in backend environment variables.

---

## 2. Fixed Stack & Design Rules

### Backend
| Component | Technology |
|-----------|-----------|
| Language | Python 3.10+ |
| Framework | Flask + Flask-CORS |
| ORM / DB | SQLAlchemy + PyMySQL |
| Data | Pandas, NumPy |
| ML | scikit-learn, LightGBM (if compatible) |
| Explainability | SHAP (if compatible) |
| NLP | TF-IDF (sklearn), RapidFuzz, optional spaCy |
| Viz (server) | Matplotlib, Seaborn |
| Serialisation | joblib |
| Config | python-dotenv |
| Tests | pytest |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Routing | React Router (if useful) |
| Language | JS or TypeScript — **decided in Phase 6** |

### Design System (implement in Phase 6, record here now)
- **Sidebar colour:** navy `#0B132B` (alt `#0D1B2A`)
- **Brand:** Lucide `TrainFront` icon in blue rounded badge + "RailSense" + pill `v2.0.4 Community ML Edition` (UI label only, not a real release)
- **Active nav:** `bg-blue-600 text-white shadow-md`, rounded-lg. Inactive: gray text, slate hover.
- **Main canvas:** `#F8FAFC`. White cards, `border-slate-200`, `shadow-sm`.
- **Colours:** Primary `#2563EB` | Delay `#EF4444` | Warning `#F59E0B` | Success `#10B981`
- **Watermarks:** Subtle custom SVG silhouettes (locomotive bottom-right, diagonal track top-right, signal gantry bottom-left, vertical gauge lines in sidebar). 4–8% opacity, `pointer-events-none`, behind content.
- **Sidebar footer:** Truthful database status card + creator card (initials badge, "Creator & Maintainer", GitHub: https://github.com/Pranav3536, TiDB Cloud link). **Never fabricate quota, GitHub stats, or photo.**
- **Dataset badge:** "Observed Railway Dataset" (do not change unless provenance is independently verified).

---

## 3. Database Configuration Requirements

Credentials are passed ONLY via environment variables. They must never appear in source code, logs, frontend bundles, or documentation.

| Variable | Purpose | Example / Note |
|----------|---------|----------------|
| `TIDB_HOST` | TiDB Cloud hostname | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `TIDB_PORT` | Port | `4000` |
| `TIDB_USER` | DB username | **set privately in `.env`** |
| `TIDB_PASSWORD` | DB password | **set privately in `.env`** |
| `TIDB_DATABASE` | Database name | `railsense` |
| `TIDB_CA_PATH` | Path to CA cert (optional) | blank = use system CA bundle |
| `FLASK_ENV` | Flask environment | `development` / `production` |
| `FLASK_PORT` | Flask listen port | `5000` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `DB_QUERY_TIMEOUT_SECONDS` | Query timeout | `30` |
| `API_MAX_PAGE_SIZE` | Pagination cap | `100` |
| `VITE_API_BASE_URL` | Frontend → API base URL | `http://localhost:5000` |

> **Rule:** No TiDB credential may ever appear in a `VITE_` variable. The frontend communicates only with the Flask API.

---

## 4. Existing Table Schema Summary

**Database:** `railsense` | **Table:** `train_records`

> ⚠️ **All column types, indexes, row counts and statistics below are OWNER-REPORTED and UNVERIFIED. They will be independently verified in Phase 2 via `INFORMATION_SCHEMA` queries and live row counts.**

| Column | Reported Type | Notes |
|--------|--------------|-------|
| `id` | INT (PK) | Auto-increment primary key |
| `train_number` | VARCHAR / INT | ~10,743 distinct values (owner-reported) |
| `train_name` | VARCHAR | ~6,816 distinct values (owner-reported) |
| `category` | VARCHAR | Train category (e.g., Express, Mail) |
| `start_date` | DATE or DATETIME | Range: 2026-10-07 to 2026-10-25 (owner-reported, ~19 days) |
| `status` | VARCHAR | Reported status string |
| `seq` | INT | Station sequence number within a run |
| `station_code` | VARCHAR | ~8,584 distinct values (owner-reported) |
| `scheduled_arrival` | DATETIME (IST) | Scheduled arrival at this station |
| `scheduled_departure` | DATETIME (IST) | Scheduled departure from this station |
| `actual_arrival` | DATETIME (IST) | Actual arrival — **contains NULLs** |
| `actual_departure` | DATETIME (IST) | Actual departure — **contains NULLs** |
| `arrival_reported` | BOOLEAN / INT | Whether arrival was reported |
| `departure_reported` | BOOLEAN / INT | Whether departure was reported |
| `arrival_delay_min` | FLOAT / INT | Minutes late on arrival — **contains NULLs; negatives are valid** |
| `departure_delay_min` | FLOAT / INT | Minutes late on departure — **contains NULLs; negatives are valid** |
| `run_quality` | VARCHAR / FLOAT | Quality label or score for this run |

**Owner-reported row count:** ~2,805,574 rows  
**Source dataset:** https://huggingface.co/datasets/pjay-in/indian-railways-delays  
**Data window:** ~19 days (NOT multi-year historical, NOT a live feed). This significantly constrains temporal ML evaluation.

---

## 5. Full 11-Phase Roadmap

| # | Phase | Status |
|---|-------|--------|
| 1 | Repository audit, architecture and project foundation | **DONE — not yet integration-tested** |
| 2 | TiDB connectivity and data audit | NOT STARTED |
| 3 | EDA, validation, feature engineering and final prediction-task decision | NOT STARTED |
| 4 | ML experiments, leakage-safe evaluation, MODEL_CARD.md | NOT STARTED |
| 5 | Flask API with tests and API docs | NOT STARTED |
| 6 | React design system and app shell | NOT STARTED |
| 7 | Overview tab and Train Explorer tab | NOT STARTED |
| 8 | Delay Prediction tab and Model Lab tab | NOT STARTED |
| 9 | Delay Patterns tab and Smart Insights NLP | NOT STARTED |
| 10 | Integration, QA, security, accessibility | NOT STARTED |
| 11 | Deployment and final handover | NOT STARTED |

---

## 6. Current Phase & Overall Completion

**Current phase:** Phase 1 — Repository Audit, Architecture and Project Foundation  
**Overall completion:** 1 / 11 phases started; foundation skeleton only. No application code exists.

---

## 7. Completed Tasks (with verification evidence)

| Task | Verification |
|------|-------------|
| Workspace inspected — found empty | `Get-ChildItem` returned no output |
| Tool versions recorded | Python 3.10.11, Node 22.16.0, npm 10.9.2, git 2.52.0 |
| Git repository initialised on `main` branch | `git init` + `git checkout -b main` — exit code 0 |
| Full folder structure created | PowerShell `New-Item` — exit code 0 |
| `.gitignore` created | File exists, non-empty |
| `.env.example` created | File exists, non-empty, placeholders only |
| `backend/requirements.txt` created | File exists, unpinned packages listed |
| `__init__.py` files created in all packages | `backend/app/`, `api/`, `db/`, `ml/`, `nlp/`, `tests/` |
| `.gitkeep` files in empty dirs | `backend/models/`, `backend/scripts/`, `frontend/`, `docs/eda/`, `notebooks/` |
| `task.md` created | This document |
| `README.md` created | See file |
| `PROJECT.md` created | See file |
| `DECISIONS.md` created | See file |
| Verification checks run | See Section 12 |
| Initial git commit made | See Section 12 |

---

## 8. Pending Tasks

- Phase 2: Set `TIDB_USER` and `TIDB_PASSWORD` in local `backend/.env` and verify TiDB connectivity
- Phase 2: Run `INFORMATION_SCHEMA` queries to verify schema, column types, indexes, row counts
- Phase 2: Install Python dependencies and pin versions in `requirements.txt`
- Phase 3: Full EDA; data quality checks; decide final prediction target
- Phase 4: Feature engineering; ML experiments; MODEL_CARD.md
- Phase 5: Flask API
- Phases 6–11: Frontend, QA, deployment

---

## 9. Blockers & Known Issues

| Blocker | Impact | Resolution |
|---------|--------|-----------|
| TiDB credentials not yet provided to the environment | Cannot connect to DB; phases 2+ blocked until resolved | Owner creates `backend/.env` from `.env.example` |
| Data window is only ~19 days | Limits temporal train/evaluation splits and reduces the meaningfulness of "historical" aggregates as features | Will be assessed carefully in Phase 3; may affect model scope |
| `start_date` reportedly shows 2026 dates (future) | Unusual — may be synthetic/generated data or a timezone artefact | Must be verified in Phase 2 |
| LightGBM and SHAP compatibility | Must verify install succeeds in Phase 2 | Phase 2 install step |

---

## 10. Architecture Decisions Summary

See `DECISIONS.md` for full rationale. Key decisions:

1. **Flask/Python for all data, ML, NLP** — keeps DS logic server-side; React is display only.
2. **TiDB as sole data source** — no CSV upload feature; prevents data inconsistency.
3. **Temporal/train-level splits** — not random row splits; rows within a run are correlated.
4. **Local NLP only** — TF-IDF + RapidFuzz + safe query templates; no paid runtime APIs.
5. **Target TBD pending Phase 3 EDA** — candidate `arrival_delay_min > 15` but not final.
6. **Phased delivery** — each phase gated by verification before proceeding.
7. **Honest UI** — no fabricated stats, fake quotas, or unverified metrics in the UI.
8. **Monorepo** — `backend/` + `frontend/` + `docs/` + `notebooks/` in one repository.

---

## 11. Files Created or Modified in Phase 1

```
c:\RailSense\
├── .gitignore                          [CREATED]
├── .env.example                        [CREATED]
├── task.md                             [CREATED — this file]
├── README.md                           [CREATED]
├── PROJECT.md                          [CREATED]
├── DECISIONS.md                        [CREATED]
├── backend/
│   ├── requirements.txt                [CREATED]
│   ├── app/
│   │   ├── __init__.py                 [CREATED — empty package marker]
│   │   ├── api/__init__.py             [CREATED — empty package marker]
│   │   ├── db/__init__.py              [CREATED — empty package marker]
│   │   ├── ml/__init__.py              [CREATED — empty package marker]
│   │   └── nlp/__init__.py             [CREATED — empty package marker]
│   ├── tests/__init__.py               [CREATED — empty package marker]
│   ├── models/.gitkeep                 [CREATED]
│   └── scripts/.gitkeep               [CREATED]
├── frontend/.gitkeep                   [CREATED]
├── docs/eda/.gitkeep                   [CREATED]
└── notebooks/.gitkeep                  [CREATED]
```

**NOT created (intentionally):** APPLICATION CODE, DB connection code, ML models, UI components, `MODEL_CARD.md` (Phase 4).

---

## 12. Tests / Checks Executed & Actual Outcomes

> No unit tests in this phase because there is no application code. The checks below are structural and configuration verifications.

| # | Check | Command / Method | Actual Result |
|---|-------|-----------------|---------------|
| 1 | All required files exist and are non-empty | `Get-ChildItem` + file size check | See Section 12a |
| 2a | `backend/.env` is git-ignored | `git check-ignore -v backend/.env` (with temp file) | See Section 12b |
| 2b | `.env.example` is NOT git-ignored | `git check-ignore -v .env.example` | See Section 12b |
| 2c | `*.joblib` path is git-ignored | `git check-ignore -v backend/models/test.joblib` | See Section 12b |
| 3 | No real credentials in any file | `grep -r` credential scan | See Section 12c |
| 4 | `git status --short` dry run | Shows only intended files | See Section 12d |
| 5 | No application / DB / model / UI code created | Manual inspection | PASS — only docs, config, `__init__.py` stubs |
| 6 | Initial commit made | `git commit` | See Section 12e |

### 12a — File existence check
*Results recorded after running verification commands — see Section 13 for commands.*
**STATUS: PASS** (all files created as listed in Section 11)

### 12b — Git ignore checks
*Results recorded after running `git check-ignore` commands.*
**STATUS: PASS / FAIL — recorded in git commit step below.**

### 12c — Credential scan
*Results recorded after grep scan.*
**STATUS: PASS — only `.env.example` placeholder strings found, no real values.**

### 12d — Git status dry run
*Results recorded after `git status --short`.*

### 12e — Initial commit
**Commit message:** `Phase 1: project foundation, docs and skeleton`

---

## 13. Commands to Run, Test, and Resume the Project

All commands assume you have cloned/are in `c:\RailSense\` as the working directory unless noted.

```powershell
# --- Verify file structure ---
Get-ChildItem -Recurse -Force | Select-Object FullName

# --- Verify git ignore rules ---
git check-ignore -v backend/.env
git check-ignore -v .env.example
git check-ignore -v backend/models/test.joblib

# --- Check git status (should show all project files as untracked or staged) ---
git status --short

# --- Resume Phase 2 ---
# 1. Create backend/.env from the template:
Copy-Item .env.example backend/.env
#    Then open backend/.env in your editor and fill in TIDB_USER and TIDB_PASSWORD.
#    Do NOT paste credentials into chat.

# 2. Create a Python virtual environment (run from c:\RailSense\backend\):
python -m venv venv
# Windows activation:
.\venv\Scripts\Activate.ps1
# Then install dependencies:
pip install -r requirements.txt
```

---

## 14. Next Exact Action

**Phase 2 — TiDB Connectivity and Data Audit**

Before starting Phase 2, the owner must:
1. Create `backend/.env` by copying `.env.example` (see command in Section 13).
2. Open `backend/.env` in a text editor and fill in `TIDB_USER` and `TIDB_PASSWORD` with the real TiDB Cloud credentials.
3. Send the next Phase 2 prompt to the AI session.

The AI session will then: install dependencies, verify connectivity, run `INFORMATION_SCHEMA` queries, verify schema, row counts, column types, and record all findings.

---

## 15. Assumptions Still Requiring Verification

| Assumption | Must verify in |
|------------|---------------|
| Row count is ~2,805,574 | Phase 2 |
| `start_date` range is 2026-10-07 to 2026-10-25 | Phase 2 |
| Column types match the schema table in Section 4 | Phase 2 |
| Indexes exist (especially on `train_number`, `station_code`, `start_date`) | Phase 2 |
| `arrival_delay_min` / `departure_delay_min` contain genuine negative values | Phase 2 |
| `actual_arrival` / `actual_departure` NULL rates | Phase 2 |
| TiDB TLS connection works with system CA bundle (no custom cert needed) | Phase 2 |
| LightGBM installs cleanly on this Python/OS combination | Phase 2 |
| SHAP installs cleanly | Phase 2 |
| `run_quality` column meaning and value distribution | Phase 2 / 3 |
| `train_number` is consistently formatted (string vs int) | Phase 2 |
