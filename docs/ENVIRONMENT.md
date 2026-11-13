# RailSense — Environment Configuration Reference

> **Generated:** Phase 10 Integration QA  
> **Applies To:** Local Development, CI/CD Automated Testing, Production Backend (Render), Production Frontend (Vercel)

---

## 1. Overview & Architecture Isolation

As of Phase 8.5, **TiDB Cloud is NOT a runtime dependency**. The production web application reads exclusively from local, immutable, precomputed artifacts (`backend/serving/serving.sqlite`, `patterns.json`, `overview.json`, `model_lab.json`, `backend/models/*.joblib`).

Therefore:
- **Zero `TIDB_*` variables are needed** in production environments (Render or Vercel).
- All runtime serving files are 100% self-contained within the repo.

---

## 2. Backend Environment Variables (Python / Flask)

| Variable | Environment | Default | Required? | Constraints & Description |
|---|---|---|---|---|
| `RAILSENSE_ENV` | All | `development` | Optional | Allowed: `development`, `production`, `testing`. Validated at startup; invalid values halt process. |
| `FLASK_APP` | Local / Render | `backend/wsgi.py` | Optional | WSGI entry point for Flask or Waitress/Gunicorn. |
| `PORT` | Render / Container | `5000` | Optional | Web server listening port (assigned automatically by Render). |
| `CORS_ORIGINS` | Production | `http://localhost:5173,...` | **Recommended in Prod** | Comma-separated list of allowed frontend origins (e.g. `https://railsense.vercel.app`). |
| `TRUSTED_PROXY_COUNT` | Production | `0` | **Recommended in Prod** | Number of reverse proxy hops before Flask (set to `1` for Render/Vercel/Cloudflare). Configures `ProxyFix`. |
| `RATE_LIMIT_MAX` | All | `120` | Optional | Max requests per minute per IP for general API endpoints. |
| `INSIGHTS_RATE_LIMIT_MAX` | All | `30` | Optional | Max requests per minute per IP for NLP question answering. |
| `RATE_LIMIT_WINDOW` | All | `60` | Optional | Sliding rate limit window duration in seconds. |
| `API_MAX_PAGE_SIZE` | All | `100` | Optional | Max allowed items returned per paginated request (`/api/trains`). |

---

## 3. Frontend Environment Variables (React + Vite)

| Variable | Environment | Default | Required? | Constraints & Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | All | `/api` | Optional | Base URL for REST API calls. In local dev, Vite proxy forwards `/api` to `http://127.0.0.1:5000`. In production (Vercel), points to the Render backend URL (e.g. `https://railsense-api.onrender.com`). |

---

## 4. Production Deployment Configurations

### A. Render (Backend Web Service)
- **Runtime:** Python 3.10
- **Build Command:** `pip install -r backend/requirements.txt`
- **Start Command:** `python backend/wsgi.py` (or `gunicorn -w 2 -b 0.0.0.0:$PORT backend.wsgi:app`)
- **Environment Variables:**
  ```env
  RAILSENSE_ENV=production
  TRUSTED_PROXY_COUNT=1
  CORS_ORIGINS=https://railsense.vercel.app,http://localhost:5173
  ```

### B. Vercel (Frontend Static Application)
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  ```env
  VITE_API_BASE_URL=https://railsense-api.onrender.com
  ```

---

## 5. Deprecated / Obsolete Variables

The following variables were used during initial offline ETL in Phase 1-2 and are **completely ignored at runtime**:
- `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`
- `TIDB_CA_PATH`
