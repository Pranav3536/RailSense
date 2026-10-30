# Phase 8.5 Preflight Verification Report
Generated at: 2026-10-30 16:36:34 UTC

## 1. TiDB Dependency Inventory (Before Removal)
Total reference hits: 272
- **CONFIG**: 19 references
- **DOC**: 107 references
- **OFFLINE-TOOL**: 50 references
- **RUNTIME**: 67 references
- **TEST**: 29 references

### Runtime Hits Detail (Must be eliminated from runtime path):
- `backend/app/serving_client.py:4` (tidb): `and JSON analytics documents without executing heavy runtime aggregations on TiDB.`
- `backend/app/__init__.py:20` (app.db): `from app.db.engine import create_db_engine`
- `backend/app/__init__.py:109` (tidb): `app.logger.warning(f"TiDB engine initialization deferred: {e}")`
- `backend/app/api/health.py:8` (sqlalchemy): `from sqlalchemy import text`
- `backend/app/api/health.py:30` (tidb): `- Live TiDB Cloud connection reachable (bounded 3-second SELECT 1 check)`
- `backend/app/api/health.py:42` (SELECT 1): `conn.execute("SELECT 1;").fetchone()`
- `backend/app/api/health.py:51` (tidb): `# 3. Check Live TiDB Cloud with 3-second timeout`
- `backend/app/api/health.py:52` (tidb): `tidb_status = "unavailable"`
- `backend/app/api/health.py:56` (SELECT 1): `res = conn.execute(text("SELECT 1;")).fetchone()`
- `backend/app/api/health.py:58` (tidb): `tidb_status = "connected"`
- `backend/app/api/health.py:60` (tidb): `tidb_status = "unavailable"`
- `backend/app/api/health.py:72` (tidb): `"tidb_cloud": tidb_status`
- `backend/app/db/config.py:46` (tidb): `raise DatabaseConfigError("TIDB_HOST must not be empty.")`
- `backend/app/db/config.py:48` (tidb): `raise DatabaseConfigError("TIDB_USER must not be empty.")`
- `backend/app/db/config.py:50` (tidb): `raise DatabaseConfigError("TIDB_PASSWORD must not be empty.")`
- `backend/app/db/config.py:52` (tidb): `raise DatabaseConfigError("TIDB_DATABASE must not be empty.")`
- `backend/app/db/config.py:56` (tidb): `(self.user, "TIDB_USER"),`
- `backend/app/db/config.py:57` (tidb): `(self.password, "TIDB_PASSWORD"),`
- `backend/app/db/config.py:58` (tidb): `(self.host, "TIDB_HOST"),`
- `backend/app/db/config.py:67` (tidb): `raise DatabaseConfigError(f"TIDB_PORT must be a valid port (1-65535), got: {self.port}")`
- `backend/app/db/config.py:76` (tidb): `raise DatabaseConfigError(f"TIDB_CA_PATH specified but file does not exist: {self.ca_path}")`
- `backend/app/db/config.py:132` (tidb): `host = os.getenv("TIDB_HOST")`
- `backend/app/db/config.py:133` (tidb): `port_raw = os.getenv("TIDB_PORT", "4000")`
- `backend/app/db/config.py:134` (tidb): `user = os.getenv("TIDB_USER")`
- `backend/app/db/config.py:135` (tidb): `password = os.getenv("TIDB_PASSWORD")`
- `backend/app/db/config.py:136` (tidb): `database = os.getenv("TIDB_DATABASE", "railsense")`
- `backend/app/db/config.py:137` (tidb): `ca_path = os.getenv("TIDB_CA_PATH", "").strip() or None`
- `backend/app/db/config.py:143` (tidb): `missing.append("TIDB_HOST")`
- `backend/app/db/config.py:145` (tidb): `missing.append("TIDB_USER")`
- `backend/app/db/config.py:147` (tidb): `missing.append("TIDB_PASSWORD")`
- `backend/app/db/config.py:149` (tidb): `missing.append("TIDB_DATABASE")`
- `backend/app/db/config.py:157` (tidb): `raise DatabaseConfigError(f"TIDB_PORT must be an integer, got: {port_raw!r}")`
- `backend/app/db/engine.py:5` (sqlalchemy): `- SQLAlchemy engine with TLS certificate verification, connection pooling, and timeouts.`
- `backend/app/db/engine.py:13` (certifi): `import certifi`
- `backend/app/db/engine.py:14` (sqlalchemy): `import sqlalchemy as sa`
- `backend/app/db/engine.py:15` (sqlalchemy): `from sqlalchemy.engine import Engine, Connection`
- `backend/app/db/engine.py:16` (sqlalchemy): `from sqlalchemy.sql import text`
- `backend/app/db/engine.py:17` (app.db): `from app.db.config import DBConfig, load_db_config`
- `backend/app/db/engine.py:132` (tidb): `Create a SQLAlchemy engine connected to TiDB Cloud with TLS verification.`
- `backend/app/db/engine.py:137` (certifi): `# TLS CA path: use configured path or certifi's bundle`
- `backend/app/db/engine.py:138` (certifi): `ca_cert = config.ca_path if config.ca_path else certifi.where()`
- `backend/app/db/engine.py:145` (pymysql): `f"mysql+pymysql://{encoded_user}:{encoded_password}"`
- `backend/app/db/engine.py:160` (create_engine): `engine = sa.create_engine(`
- `frontend/src/api/endpoints.js:23` (tidb): `* Returns { status, components: { serving_store, prediction_engine, tidb_cloud }, data_as_of, model_`
- `frontend/src/components/layout/Sidebar.jsx:61` (tidb): `desc: 'TiDB Cloud online',`
- `frontend/src/components/layout/Sidebar.jsx:70` (tidb): `desc: rawError?.details?.components?.tidb_cloud || 'Database offline',`
- `frontend/src/components/layout/Sidebar.jsx:214` (tidb): `href={CREATOR_CONFIG.tidbCloudUrl}`
- `frontend/src/components/layout/Sidebar.jsx:218` (tidb): `aria-label="TiDB Cloud"`
- `frontend/src/components/layout/Sidebar.jsx:219` (tidb): `title="TiDB Cloud"`
- `frontend/src/config/creator.js:13` (tidb): `tidbCloudUrl: 'https://tidbcloud.com',`
- `frontend/src/hooks/useReadiness.js:32` (tidb): `tidbStatus: null,`
- `frontend/src/hooks/useReadiness.js:44` (tidb): `const tidbStatus = data?.components?.tidb_cloud;`
- `frontend/src/hooks/useReadiness.js:45` (tidb): `const isConnected = (tidbStatus === 'connected');`
- `frontend/src/hooks/useReadiness.js:53` (tidb): `tidbStatus: tidbStatus || 'unavailable',`
- `frontend/src/hooks/useReadiness.js:68` (tidb): `tidbStatus: 'unavailable',`
- `frontend/src/hooks/useReadiness.js:80` (tidb): `tidbStatus: null,`
- `frontend/src/pages/ModelLabPage.jsx:827` (tidb): `Strict verification: these features exist in the raw TiDB database but are strictly prohibited from `
- `frontend/src/test/Sidebar.test.jsx:70` (tidb): `const tidbLink = screen.getByTitle('TiDB Cloud');`
- `frontend/src/test/Sidebar.test.jsx:71` (tidb): `expect(tidbLink).toHaveAttribute('href', expect.stringContaining('tidbcloud.com'));`
- `frontend/src/test/Sidebar.test.jsx:74` (tidb): `it('displays "Database connected" when /api/health/ready reports healthy TiDB', async () => {`
- `frontend/src/test/Sidebar.test.jsx:80` (tidb): `tidb_cloud: 'connected',`
- `frontend/src/test/Sidebar.test.jsx:95` (tidb): `expect(screen.getByText('TiDB Cloud online')).toBeInTheDocument();`
- `frontend/src/test/SourceGrep.test.js:47` (tidb): `it('contains zero TiDB passwords, host connection strings, or secret values in frontend production c`
- `frontend/src/test/SourceGrep.test.js:55` (tidb): `'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',`
- `frontend/src/test/SourceGrep.test.js:56` (tidb): `'TIDB_PASSWORD',`
- `frontend/src/test/fixtures/modelMetricsFixture.json:915` (tidb): `"source": "TiDB Cloud railsense.train_records (via local cache)"`
- `frontend/src/test/fixtures/overviewFixture.json:4` (tidb): `"source": "TiDB Cloud railsense.train_records (via local cache)",`

## 2. Data Cache Verification (`backend/data_cache/`)
- Parquet files found: 19 (Expected: 19)
- Total rows: 2,805,574 (Expected: 2,805,574) -> MATCH
- Total unique runs: 147,367 (Expected: 147,367) -> MATCH
- Date range: 2026-10-07 to 2026-10-25 (Expected: 2026-10-07 to 2026-10-25) -> MATCH
- Duplicate IDs: 0 -> MATCH
- Columns check (17 columns): MATCH
- Key Column Null Counts vs Audit:
  - `arrival_delay_min`: measured 1,031,967 | audit 1,031,967 -> MATCH
  - `departure_delay_min`: measured 1,029,645 | audit 1,029,645 -> MATCH
  - `actual_arrival`: measured 1,031,688 | audit 1,031,688 -> MATCH
  - `actual_departure`: measured 1,029,371 | audit 1,029,371 -> MATCH
  - `train_name`: measured 0 | audit 0 -> MATCH
  - `category`: measured 0 | audit 0 -> MATCH

## 3. Serving Store Verification (`backend/serving/`)
- `serving.sqlite` size: 42,881,024 bytes (40.89 MB)
- PRAGMA integrity_check: `ok` -> MATCH
  - Table `trains`: 10,743 rows (Expected: 10,743) -> MATCH
  - Table `train_stops`: 216,339 rows (Expected: 216,339) -> MATCH
  - Table `stations`: 8,584 rows (Expected: 8,584) -> MATCH
  - Table `train_stop_stats`: 162,928 rows (Expected: 162,928) -> MATCH
  - Table `train_date_stats`: 142,850 rows (Expected: 142,850) -> MATCH
- Total indexes found: 13
  - `sqlite_autoindex_trains_1` on `trains`
  - `idx_trains_cat` on `trains`
  - `idx_trains_name` on `trains`
  - `sqlite_autoindex_train_stops_1` on `train_stops`
  - `idx_train_stops_lookup` on `train_stops`
  - `idx_train_stops_stn` on `train_stops`
  - `sqlite_autoindex_stations_1` on `stations`
  - `idx_stations_delayed` on `stations`
  - `idx_stations_stops` on `stations`
  - `sqlite_autoindex_train_stop_stats_1` on `train_stop_stats`
  - `sqlite_autoindex_train_date_stats_1` on `train_date_stats`
  - `idx_train_date` on `train_date_stats`
  - `idx_stop_stats_stn` on `train_stop_stats`
- `overview.json` (11,182 bytes): parse OK, provenance present: `True`
- `patterns.json` (55,917 bytes): parse OK, provenance present: `True`
- `model_lab.json` (21,222 bytes): parse OK, provenance present: `True`

## 4. Reproducibility Check (DB-Free Serving Build)
Testing `backend/scripts/build_serving_data.py` into temporary directory WITHOUT TiDB credentials...
- Script DB-Free Import Test: PASS (build_serving_data imported cleanly without DB env.)

## 5. Model Artifacts Verification (`backend/models/`)
- `.gitkeep`: 0 bytes
- `calibrator.joblib`: 3,335 bytes
- `deployment_model.joblib`: 2,066,954 bytes
- `en_route_model.joblib`: 1,660,376 bytes
- `evaluation_model.joblib`: 2,057,537 bytes
- `hist_transformer.joblib`: 643,276 bytes
- `historical_tables.json`: 2,440,181 bytes
- `model_metadata.json`: 1,506 bytes
- `RailSensePredictor.is_loaded`: True
- `model_metadata.json` version: 1.0.0 (model: None)
- Real Prediction Smoke Tests (Offline, Zero Network):
  - Train 12951 stop 4 (BRC) on 2026-10-25: prob=0.2270, raw=0.2519, delayed=False, cold_start=False
  - Train 12951 stop 5 (RTM) on 2026-10-25: prob=0.2554, raw=0.2959, delayed=False, cold_start=False
  - Train 12004 stop 3 (ALJN) on 2026-10-20: prob=0.0502, raw=0.0568, delayed=False, cold_start=False
  - Train 02542 stop 3 (KGN) on 2026-10-22: prob=0.2530, raw=0.2779, delayed=False, cold_start=True
  - Train 12951 stop 4 (BRC) on 2026-11-05: prob=0.1584, raw=0.1920, delayed=False, cold_start=False

## 6. Offline-Start Proof (Impact of Missing/Invalid TiDB)
Testing Flask app factory behavior when TIDB_HOST is invalid or unreachable...
- `GET /api/health`: HTTP 200 in 16.49ms
- `GET /api/health/ready`: HTTP 200 in 231.40ms
  - Response status: ready
  - Components: {'prediction_engine': 'ready', 'serving_store': 'ready', 'tidb_cloud': 'unavailable'}
  - Finding: /api/health/ready attempted a live TiDB socket connect, taking 231.40ms due to network timeout, marking tidb_cloud as 'unavailable'.

## 7. Baseline Latency Measurements (Current Serving Store + API)
| Method | Endpoint | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Median (ms) | Status |
|---|---|---|---|---|---|---|
| `GET` | `/api/health` | 1.01 | 2.00 | 1.00 | **1.01** | HTTP 200 |
| `GET` | `/api/health/ready` | 48.22 | 34.21 | 25.50 | **34.21** | HTTP 200 |
| `GET` | `/api/trains?page=1&page_size=15` | 9.65 | 7.03 | 6.93 | **7.03** | HTTP 200 |
| `GET` | `/api/trains?q=12951` | 17.38 | 7.50 | 9.35 | **9.35** | HTTP 200 |
| `GET` | `/api/trains?q=rajdhani` | 13.60 | 16.73 | 10.66 | **13.60** | HTTP 200 |
| `GET` | `/api/trains?category=MEX&page=1&page_size=15` | 10.79 | 9.68 | 5.72 | **9.68** | HTTP 200 |
| `GET` | `/api/overview` | 3.05 | 5.01 | 2.86 | **3.05** | HTTP 200 |
| `GET` | `/api/patterns/hour` | 8.70 | 3.08 | 4.30 | **4.30** | HTTP 200 |
| `GET` | `/api/model/metrics` | 2.71 | 5.88 | 0.96 | **2.71** | HTTP 200 |
| `POST` | `/api/predict` | 33.45 | 57.95 | 39.75 | **39.75** | HTTP 200 |

## 8. Baseline Test Counts (Phase 8 Baseline)
- **Backend Pytest**: 103 passed, 4 skipped (107 total)
- **Frontend Vitest**: 48 passed across 10 test files
- **Frontend ESLint**: 0 errors, 0 warnings
- **Frontend Vite build**: 200.27 kB (gzip: 64.60 kB)

