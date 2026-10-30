# RailSense — Serving Artifact Delivery & Hosting Strategy

> **Status:** Phase 10 Delivery Assessment  
> **Total Artifact Payload:** **45.90 MB** across 9 files  
> **Largest Single File:** `backend/serving/serving.sqlite` (40.89 MB)  
> **Cryptographic Checksum Registry:** `backend/serving/manifest.json`

---

## 1. Artifact Inventory & Checksum Manifest

Every production artifact required for offline serving was audited, sized, and SHA-256 hashed via `backend/scripts/package_artifacts.py`:

| Artifact Path | Category | File Size | SHA-256 Checksum (Prefix) | Runtime Role |
|---|---|---|---|---|
| `backend/serving/serving.sqlite` | Database | 40.89 MB | `fb3474d1d038f3fe...` | Read-only timetable catalog & stop stats |
| `backend/models/historical_tables.json` | Model Tables | 2.33 MB | `0f10ac218989343f...` | Precomputed historical feature aggregates |
| `backend/models/deployment_model.joblib` | ML Model | 1.97 MB | `f535641f9c62ae86...` | Serialized LightGBM Booster |
| `backend/models/hist_transformer.joblib` | ML Pipeline | 0.61 MB | `004b5fb6931b930c...` | Target encoder & feature normalizer |
| `backend/serving/patterns.json` | Analytics | 0.05 MB | `6aa43258c0b7ecaa...` | Empirical hourly, DOW & spatial distributions |
| `backend/serving/model_lab.json` | Analytics | 0.02 MB | `f376e125383a03bd...` | Model calibration, PR curves & SHAP importances |
| `backend/serving/overview.json` | Analytics | 0.01 MB | `9f336f947232e6d6...` | Fleet-wide KPIs and day-by-day aggregates |
| `backend/models/calibrator.joblib` | ML Pipeline | 0.003 MB | `308bd3d1eac8e108...` | Isotonic probability calibrator |
| `backend/models/model_metadata.json` | Metadata | 0.001 MB | `88fc5e54dcc6d13b...` | Feature catalog schema & decision thresholds |
| **TOTAL** | — | **45.90 MB** | — | **Self-contained serving engine** |

---

## 2. Hosting Architecture Comparison

| Hosting Architecture | Feasibility | Cost | Operational Overhead | Fit for RailSense |
|---|---|---|---|---|
| **Direct Git Repository (RECOMMENDED)** | **High** | **$0** | **Zero** | **Best Choice.** Total repo size with artifacts is ~50 MB. Largest file is 40.89 MB, well below GitHub's 100 MB hard limit and below GitHub's 50 MB warning threshold. Build on Render/Vercel pulls artifacts directly via `git clone` with zero extra steps or API keys. |
| **Git LFS (Large File Storage)** | Medium | Free up to 1GB/mo bandwidth | Low | Adds LFS bandwidth tracking and setup friction on CI/CD runners; unnecessary given file sizes < 50MB. |
| **Hugging Face Hub (`huggingface_hub`)** | High | Free | Low | Excellent backup option if dataset expands beyond 100MB. Can download via `hf_hub_download` at build time. |
| **Cloudflare R2 / AWS S3** | High | ~$0.015/GB/mo | Medium | Requires IAM credentials, S3 bucket provisioning, and runtime network fetch during container startup. |

---

## 3. Verification & Deployment Pipeline

1. **Pre-build Verification:**
   Before deployment or packaging, run:
   ```powershell
   python backend/scripts/verify_artifacts.py
   ```
   Exits `0` only if all 9 files exist with exact size and SHA-256 match.

2. **Cold Start Latency:**
   - Full Flask factory startup takes **401 ms** (measured in `docs/experiments/cold_start_profile.json`).
   - SQLite URI connection in read-only mode (`file:...mode=ro`) starts in **69 ms**.
   - Zero database migration steps required at runtime.
