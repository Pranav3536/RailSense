# RailSense — Phase 7 Preflight Audit & Contract Verification

> **Document:** `docs/phase7_preflight.md`  
> **Phase:** Phase 7 (Tab 1 Overview & Tab 2 Train Explorer)  
> **Verification Date:** 2026-10-30  
> **Backend Base URL:** `http://localhost:5000/api`  
> **Status:** All endpoints audited against live backend serving engine and verified.

---

## 1. Executive Summary & Verification Matrix

All Phase 7 required endpoints were queried and audited using live responses from `create_app()` test client and serving store artifacts:

| Endpoint | Method | Status | Primary Keys / Structure | Tested & Verified |
|---|---|---|---|---|
| `/api/overview` | `GET` | 200 | `fleet_kpis`, `delay_summary`, `delay_distribution`, `category_breakdown`, `per_date_trend` | Verified |
| `/api/trains` | `GET` | 200 | `items`, `pagination` (`page`, `page_size`, `total`, `total_pages`, `has_next`, `has_prev`) | Verified |
| `/api/trains/<train_number>` | `GET` | 200 | Top-level metadata, `stops` array, `history_by_date` array | Verified |
| `/api/health/ready` | `GET` | 200/503 | `components`, `status`, `data_as_of`, `model_version` | Verified |

---

## 2. Field Names, Types, and Unit Consistency

A thorough audit of every rate, count, and identifier was conducted to ensure the frontend adapter layer normalizes and renders data with 100% precision:

### 2.1 Rates & Percentages
- **`/api/overview`:**
  - `fleet_kpis.label_coverage_pct`: percentage `0.0 - 100.0` (e.g. `63.20`).
  - `delay_summary.fleet_delayed_rate`: percentage `0.0 - 100.0` (e.g. `49.91`).
  - `delay_summary.fleet_early_arrival_pct`: percentage `0.0 - 100.0` (e.g. `8.56`).
  - `category_breakdown[].delayed_rate`: percentage `0.0 - 100.0` (e.g. `57.02`).
  - `per_date_trend[].delayed_rate`: percentage `0.0 - 100.0` (e.g. `48.33`).
- **`/api/trains`:**
  - `items[].delayed_rate`: percentage `0.0 - 100.0` (e.g. `20.49`).
- **`/api/trains/<train_number>`:**
  - `delayed_rate`: train-level overall delayed rate, percentage `0.0 - 100.0`.
  - `stops[].observed_delayed_rate`: stop-level observed delayed rate, percentage `0.0 - 100.0` **OR `null`** when unobserved / non-eligible.
  - `history_by_date[].delayed_rate`: per-date delayed rate, percentage `0.0 - 100.0`.

> **Conclusion for Adapters:** All delay rates from the backend API are returned on a percentage scale (`0.0` to `100.0`). The frontend adapter normalizes all nulls gracefully to null and guarantees formatters consume rates consistently.

### 2.2 Delays (Minutes)
- All delay fields (`fleet_mean_delay_min`, `fleet_median_delay_min`, `mean_delay`, `observed_mean_delay_min`, `mean_delay_min`) are in **minutes**. Early arrivals have negative values (e.g. `-5.0 min`) and are never clipped.

### 2.3 Station Names & Distance Verification
- **Audit Result:** Neither `station_name` nor `distance_from_origin_km` exist anywhere in the TiDB database or the SQLite serving tables (`train_records` has only `station_code`).
- **Rule Enforcement:** The UI must display station codes (e.g. `MMCT`, `NDLS`, `KOTA`) and must **never** fabricate human-readable names or synthetic distances.

---

## 3. Median Delay Discrepancy Investigation & Resolution

- **The Question:** Phase 2 data audit reported arrival delay median as `17.0 min` (mean `38.22 min`), while `overview.json` serving store serves `fleet_median_delay_min: 15.0 min` (mean `38.1 min`).
- **Root Cause Discovered in Code Audit:**
  - In `backend/scripts/audit_data.py` (lines 490–505), percentiles were calculated using a deterministic 100,000-row sample query:  
    `SELECT arrival_delay_min FROM train_records WHERE arrival_delay_min IS NOT NULL ORDER BY id LIMIT 100000;`  
    In that first 100k sample slice, `p50` was `17.0 min`.
  - In `backend/scripts/build_serving_data.py` (and re-verified directly in Python across all 19 parquet partition files comprising the full 2,805,574 rows and 1,773,068 label-eligible stops):
    - `all_df.loc[eligible_mask, 'arrival_delay_min'].median() = 15.0 min`
    - `all_df.loc[non_null_mask, 'arrival_delay_min'].median() = 15.0 min`
- **Verdict:** The serving store value (`15.0 min`) is the true population median across all 2.8M rows, whereas the Phase 2 audit value (`17.0 min`) was an artifact of the 100k slice. The serving store value is 100% accurate and mathematically sound.

---

## 4. Delay Distribution Histogram Implementation

As required, additive field `delay_distribution` has been computed and added to `overview.json`, `build_serving_data.py`, `docs/openapi.yaml`, `docs/API.md`, and validated in `backend/tests/test_api_routes.py`.

### Measured Population Breakdown (1,773,068 label-eligible stops):
| Bucket | Label | Stops Count | Share (%) | Visual Classification |
|---|---|---|---|---|
| `<-30` | Early (>30m) | 7,010 | 0.40% | `early` (emerald) |
| `-30..-5` | Early (5-30m) | 69,678 | 3.93% | `early` (emerald) |
| `-5..5` | On-Time (±5m) | 404,190 | 22.80% | `ontime` (emerald) |
| `5..15` | Minor (5-15m) | 407,232 | 22.97% | `minor` (amber) |
| `15..30` | Moderate (15-30m) | 323,363 | 18.24% | `moderate` (orange) |
| `30..60` | Significant (30-60m) | 263,620 | 14.87% | `significant` (rose) |
| `60..180` | Severe (1-3h) | 226,138 | 12.75% | `severe` (rose) |
| `>180` | Extreme (>3h) | 71,837 | 4.05% | `extreme` (dark rose) |
| **Total** | | **1,773,068** | **100.0%** | |

---

## 5. Circular / Loop Trains & Stop Keying Architecture

- An audit of the `train_stops` schedule templates revealed **200 circular or loop train services** in Indian Railways where the same station code appears multiple times in the same route run (e.g. train `11013` visits 33 stops across 32 unique stations; train `12145` visits 48 stops across 24 unique stations).
- **Mandate:** All React components, lists, tables, and charts MUST use `seq` as their primary key (`key={stop.seq}`), **never** `station_code`.

---

## 6. Support Thresholds & Partial Window Caveats

- **Low Support Threshold:** Centralized constant `LOW_SUPPORT_THRESHOLD = 30`. Any stop or aggregation with fewer than 30 eligible observations must display a muted style and a "Low Support" badge (`< 30 stops`), and must be excluded from ranking highlights.
- **Partial Dates:** `2026-10-07` (left-truncated start) and `2026-10-25` (right-censored end). These edge dates are explicitly marked in time-series charts with custom dashed or shaded styling, distinct legend entries, and explanatory tooltips citing `docs/validation_report.md`.
