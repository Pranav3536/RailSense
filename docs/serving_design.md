# RailSense — Precomputed Serving Store Design & Architecture

> **Document Status:** Architectural Specification for Phase 5 & Production Serving  
> **Key Constraint:** TiDB Cloud `railsense.train_records` contains 2,805,574 rows with only a primary key `(id)` index. Request-time full-table aggregations are strictly forbidden to avoid query timeouts, quota exhaustion, and unacceptable API latency.

---

## 1. Executive Summary & Design Rationale

In high-throughput web applications and portfolio production deployments, machine learning inference and analytical exploration require sub-50ms response times. The TiDB Cloud serverless database hosts raw transactional records but is not indexed for complex multi-column group-by aggregations across 2.8 million rows.

To guarantee **< 15ms endpoint latency** and stay well within the **300 MB RAM budget** (compatible with Render's 512 MB free tier), RailSense implements a **Precomputed Serving Architecture**:
- All fleet metrics, schedule templates, station summaries, and historical distributions are precomputed offline from the local parquet cache via a deterministic build pipeline (`backend/scripts/build_serving_data.py`).
- Runtime requests read strictly from an indexed, read-only SQLite database (`backend/serving/serving.sqlite`) and static pre-aggregated JSON documents (`backend/serving/`).
- Live TiDB Cloud access at runtime is restricted to a bounded, non-blocking health readiness ping (`SELECT 1`).

---

## 2. Serving Store Structure & Components

```
backend/serving/
├── serving.sqlite           [SQLite3 database, read-only, indexed, ~25-35 MB]
├── overview.json            [Precomputed Fleet KPIs, per-date trends, category distribution]
├── patterns.json            [Precomputed slices by hour, dow, category, seq, and hotspots]
└── model_lab.json           [Model comparison, test curve points, SHAP, feature importances]
```

### 2.1 SQLite Relational Schema (`serving.sqlite`)

The SQLite database uses standard types, B-tree indexes, and PRAGMA settings optimized for read-only concurrent access:

```sql
-- 1. Train Catalog
CREATE TABLE trains (
    train_number TEXT PRIMARY KEY,
    train_name TEXT,
    category TEXT NOT NULL,
    runs_count INTEGER NOT NULL,
    days_observed INTEGER NOT NULL,
    stops_count INTEGER NOT NULL,
    origin_station_code TEXT NOT NULL,
    terminus_station_code TEXT NOT NULL,
    delayed_rate REAL NOT NULL,
    mean_delay REAL NOT NULL,
    eligible_stops_count INTEGER NOT NULL
);
CREATE INDEX idx_trains_cat ON trains(category);
CREATE INDEX idx_trains_name ON trains(train_name);

-- 2. Train Schedule Templates (Stops per train)
CREATE TABLE train_stops (
    train_number TEXT NOT NULL,
    seq INTEGER NOT NULL,
    station_code TEXT NOT NULL,
    scheduled_arrival_time TEXT,
    scheduled_departure_time TEXT,
    arrival_day_offset INTEGER NOT NULL DEFAULT 0,
    departure_day_offset INTEGER NOT NULL DEFAULT 0,
    is_origin INTEGER NOT NULL DEFAULT 0,
    is_terminus INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (train_number, seq)
);
CREATE INDEX idx_train_stops_lookup ON train_stops(train_number, station_code);
CREATE INDEX idx_train_stops_station ON train_stops(station_code);

-- 3. Station Catalog
CREATE TABLE stations (
    station_code TEXT PRIMARY KEY,
    trains_count INTEGER NOT NULL,
    stops_count INTEGER NOT NULL,
    delayed_rate REAL NOT NULL,
    mean_delay REAL NOT NULL,
    wilson_lower REAL NOT NULL,
    wilson_upper REAL NOT NULL,
    category_mix_json TEXT NOT NULL
);
CREATE INDEX idx_stations_delayed ON stations(delayed_rate);
CREATE INDEX idx_stations_stops ON stations(stops_count);

-- 4. Train Per-Stop Historical Delay Statistics
CREATE TABLE train_stop_stats (
    train_number TEXT NOT NULL,
    seq INTEGER NOT NULL,
    station_code TEXT NOT NULL,
    observed_stops INTEGER NOT NULL,
    delayed_rate REAL NOT NULL,
    mean_delay REAL NOT NULL,
    PRIMARY KEY (train_number, seq)
);

-- 5. Train Per-Date Historical Run Statistics
CREATE TABLE train_date_stats (
    train_number TEXT NOT NULL,
    start_date TEXT NOT NULL,
    stops_count INTEGER NOT NULL,
    delayed_rate REAL NOT NULL,
    mean_delay REAL NOT NULL,
    PRIMARY KEY (train_number, start_date)
);
```

---

## 3. Precomputed Analytics Documents (`backend/serving/*.json`)

### 3.1 `overview.json` (Powers Overview Tab)
- **Fleet Totals:** Exact counts matching the Phase 2 audit (2,805,574 rows, 147,367 runs, 10,743 trains, 8,584 stations, date range `2026-10-07` to `2026-10-25`).
- **Label Coverage:** Total eligible stops (1,773,068 rows, 63.20%), overall delayed rate (49.92%), mean delay (38.22m), median delay (17.0m).
- **Category Breakdown:** Counts, delayed rates, and mean delays per category.
- **Per-Date Trend:** Daily volume and delay rates, explicitly flagging edge days `2026-10-07` (left-truncated) and `2026-10-25` (right-censored) as partial data.
- **Definition & Provenance Block:** Every statistic includes an explicit `definition` string and timestamp.

### 3.2 `patterns.json` (Powers Delay Patterns Tab)
- **Hour-of-Day Dynamics:** 24 hourly buckets with delay probabilities and mean delays.
- **Day-of-Week Dynamics:** 7 days with volume and punctuality metrics.
- **Sequence Position Compounding:** 5 journey sequence buckets showing delay accumulation.
- **Observed Hotspots & Punctual Nodes:** Top 50 hotspot and punctual stations/trains filtered by minimum support ($N \ge 100$ stops) and ranked by Wilson lower/upper confidence bounds.

### 3.3 `model_lab.json` (Powers Model Lab Tab)
- **Benchmark Table:** Recomputed Average Precision, ROC-AUC, F1, Precision, Recall, Brier, and ECE across Baselines, LR, RF, LightGBM, and En-Route.
- **Evaluation Curve Data:** 100-point sample vectors for Precision-Recall curve, ROC curve, and 10-bin Calibration reliability curve.
- **Feature Importance:** Gain and split rankings.
- **SHAP Values:** Mean absolute attribution scores and summary distributions.
- **Simple-English Guide:** Integrated from `docs/model/explanations_simple.md`.

---

## 4. Concurrency, Memory & Security Protocol

1. **Read-Only Connection Pool:**
   Connections to SQLite are opened with the URI parameter `file:backend/serving/serving.sqlite?mode=ro`. No write locks or write transactions are ever initiated by the API.
2. **Memory Footprint:**
   - SQLite uses memory-mapped I/O (`PRAGMA mmap_size = 33554432;` 32 MB).
   - In-memory JSON structures occupy < 5 MB RAM.
   - Total Flask process memory at startup remains **< 160 MB RAM**, well beneath the 300 MB target.
3. **Audit Verification Assertion:**
   The build script computes total rows and runs from the local parquet cache and strictly asserts equality with Phase 2 audit ground truths (`2,805,574` rows, `147,367` runs). If any discrepancy is found, the build process aborts immediately.
4. **Git Tracking & Deployment Strategy (Phase 11 Open Item):**
   - Precomputed JSON files (~2 MB) are git-tracked.
   - `serving.sqlite` size will be measured; if < 35 MB, it can be committed or built during deployment.
