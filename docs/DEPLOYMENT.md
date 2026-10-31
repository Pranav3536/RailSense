# RailSense — Owner Production Deployment Guide

> **Target Architecture:** Render Free Web Service (Python Flask Backend) + Vercel (React Vite SPA Frontend)  
> **Estimated Deployment Time:** 15–20 minutes  
> **Prerequisites:** GitHub account, Render account (free tier), Vercel account (hobby/free tier). Zero credit card required.

---

## 1. Architecture & Deployment Overview

```
                        ┌──────────────────────────────────────┐
                        │          End User Browser            │
                        └──────────────────┬───────────────────┘
                                           │
                        ┌──────────────────┴───────────────────┐
                        │           Vercel Global CDN          │
                        │     (React + Vite Single Page App)   │
                        │    Rewrites, Cache-Control, CSP      │
                        └──────────────────┬───────────────────┘
                                           │ HTTPS REST API
                                           ▼
                        ┌──────────────────────────────────────┐
                        │          Render Free Tier            │
                        │     (Waitress WSGI + Flask API)      │
                        │  Single Process, 4 Threads, <180MB   │
                        │  Precomputed SQLite + LightGBM Model │
                        └──────────────────────────────────────┘
```

### Key Architectural Strengths:
1. **Zero Database Credentials in Cloud:** TiDB Cloud is completely detached at runtime. The backend queries a high-performance, read-only SQLite serving database (`backend/serving/serving.sqlite`, ~40.9 MB) bundled directly in the git repository.
2. **Zero Git LFS Overhead:** All tracked files are strictly below GitHub's 100 MB per-file push limit (largest file is 40.89 MB).
3. **Under Free Tier Limits:** Worker memory footprint is ~177 MB (well within Render's 512 MB ceiling).
4. **Resilient to Free Tier Spin-Down:** Render free tier spins down after 15 minutes of inactivity. The RailSense UI detects HTTP delays $> 4\text{s}$ and automatically displays a non-blocking `WakeUpNotice` banner informing the user of server wake-up.

---

## 2. Step-by-Step Deployment Procedure

### Step 1: Push Repository to GitHub

1. Open your terminal in `c:\RailSense`:
2. Create a new repository on [GitHub](https://github.com/new) named `RailSense` (public or private).
3. Link your local repo and push `main`:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/RailSense.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy Backend to Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `RailSense` repo.
4. Configure the service settings:
   - **Name:** `railsense-backend`
   - **Region:** `Singapore` (recommended for lowest latency to Indian subcontinent) or `Oregon`
   - **Branch:** `main`
   - **Root Directory:** *(leave blank — runs from repo root)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `python backend/wsgi.py`
   - **Instance Type:** `Free`
5. Click **Advanced** $\rightarrow$ **Add Environment Variable** and add the following keys:
   | Key | Value | Purpose |
   |---|---|---|
   | `RAILSENSE_ENV` | `production` | Enables artifact checksum verification on startup |
   | `PYTHONUNBUFFERED` | `1` | Forces stdout flushing for real-time Render logs |
   | `FLASK_THREADS` | `4` | 4 concurrent waitress worker threads (< 180 MB RSS) |
   | `CORS_ORIGINS` | `*` | Allows initial frontend connection (restricted in Step 5) |
   | `PORT` | `10000` | Port automatically assigned by Render |
6. Click **Create Web Service**. Wait ~3–5 minutes for dependencies to install and artifacts to verify.

---

### Step 3: Verify Render Backend Live

1. Once Render reports **"Live"**, copy your backend URL (e.g., `https://railsense-backend.onrender.com`).
2. Run a health probe from your terminal or browser:
   ```bash
   curl -i https://railsense-backend.onrender.com/api/health/ready
   ```
3. Confirm you receive HTTP `200 OK` with JSON:
   ```json
   {
     "status": "ready",
     "catalog_loaded": true,
     "serving_store": "ready",
     "model_loaded": true,
     "nlp_loaded": true
   }
   ```

---

### Step 4: Deploy Frontend to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your `RailSense` GitHub repository.
4. In the **Configure Project** screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select **`frontend`**
   - **Build Command:** `npm run build` *(default)*
   - **Output Directory:** `dist` *(default)*
5. Expand **Environment Variables** and add:
   | Key | Value | Notes |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://railsense-backend.onrender.com` | **Do NOT include trailing slash `/`** |
6. Click **Deploy**. Vercel will install dependencies, build the production bundle, and deploy to their global edge CDN in ~1 minute.
7. Once deployed, note your frontend URL (e.g., `https://railsense.vercel.app`).

---

### Step 5: Lock Down Production CORS on Render

1. Return to your [Render Dashboard](https://dashboard.render.com/) $\rightarrow$ `railsense-backend` $\rightarrow$ **Environment**.
2. Find `CORS_ORIGINS` and change its value from `*` to your production frontend domain:
   ```
   CORS_ORIGINS=https://railsense.vercel.app
   ```
3. Save changes. Render will automatically perform a zero-downtime rolling restart.

---

### Step 6: Post-Deployment Smoke Verification

Run the automated verification tooling against your live URLs:

```bash
# 1. Run live backend smoke verification (20 reference predictions + security headers + CORS)
python backend/scripts/smoke_deployed.py https://railsense-backend.onrender.com https://railsense.vercel.app

# 2. Run Playwright live E2E smoke tests
npx --prefix frontend playwright test e2e/deployed.spec.js
```

---

## 3. Comprehensive Troubleshooting Matrix

| Symptom / Error | Root Cause | Exact Resolution |
|---|---|---|
| **Render Build Fails:** `No module named '...'` | Build command didn't install `backend/requirements.txt` | Ensure Render Build Command is set to: `pip install -r backend/requirements.txt`. |
| **Render Startup Fails:** `Production serving artifacts verification failed!` | One of the 9 manifest files was modified, truncated, or corrupted in git | Run `python backend/scripts/verify_artifacts.py` locally to detect the mismatched SHA-256 hash. Re-commit the exact manifest file. |
| **Render Out of Memory (OOM / Error 137)** | Worker threads or process count exceeded 512 MB memory limit | Ensure `FLASK_THREADS` is set to `4` (default). Never start multiple worker processes (Waitress single process with 4 threads consumes ~177 MB RSS). |
| **Render Web Service Timeout / Sleep** | Render free tier enters idle sleep after 15 minutes without requests | Normal behavior. First request takes ~40–50s to wake up. The RailSense frontend displays an automated `WakeUpNotice` banner informing the visitor. |
| **Frontend Network Error / Failed to Fetch** | `VITE_API_BASE_URL` misconfigured or missing in Vercel | In Vercel Project Settings $\rightarrow$ Environment Variables, check `VITE_API_BASE_URL`. It must match your live Render backend URL exactly without trailing slash. Redeploy after editing. |
| **CORS Error in Browser Console** | Render `CORS_ORIGINS` does not match the Vercel URL | In Render $\rightarrow$ Environment, set `CORS_ORIGINS=https://your-app.vercel.app` (or `*` for initial setup). Ensure protocol `https://` matches. |
| **Vercel 404 on Direct Route Refresh (`/predict`)** | Missing SPA rewrite rule in static host | Verify `frontend/vercel.json` exists in git with `"source": "/(.*)", "destination": "/index.html"`. |
| **Delay Prediction Returns 429 Too Many Requests** | IP exceeded 120 req/minute rate limit | Wait 20 seconds. The UI features an automatic cooldown timer countdown that disables the button until the rate window reopens. |
