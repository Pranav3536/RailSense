# RailSense — Phase 2 Summary & Real Audit Facts

> **Audited Table:** `railsense.train_records`  
> **Host:** `gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000`  
> **Engine:** TiDB Serverless `8.0.11-TiDB-v8.5.3-serverless`  
> **Audit Source:** Automated audit executed against TiDB Cloud on 2026-10-29.

---

## 1. Connection Status, TLS Status & Verified Package Versions

- **Connection Status:** `OK` (Connected and operational via SQLAlchemy + PyMySQL)
- **TLS Status:** `ACTIVE` (Cipher: `TLS_AES_128_GCM_SHA256`, Certificate Verification: `ON` via `certifi`)
- **Python Runtime:** Python 3.10.11 on Windows
- **Installed & Verified Packages:**
  - `lightgbm`: **4.7.0** (verified imported cleanly)
  - `shap`: **0.49.1** (verified imported cleanly)
  - `scikit-learn`: **1.7.2**
  - `pandas`: **2.3.3**, `numpy`: **2.2.6**
  - `sqlalchemy`: **2.0.55**, `pymysql`: **2.2.8**, `cryptography`: **50.0.2**
  - `flask`: **3.1.3**, `flask-cors`: **6.0.5**, `python-dotenv`: **1.2.4**
  - `matplotlib`: **3.10.9**, `seaborn`: **0.13.2**, `rapidfuzz`: **3.14.5**, `joblib`: **1.6.0**
  - `certifi`: **2026.10.23**, `pytest`: **9.2.0**

---

## 2. Audit Findings vs Owner-Reported Claims

| Metric | Owner-Reported | Measured (Real) | Match Status | Notes |
|--------|----------------|-----------------|--------------|-------|
| Total Rows | 2,805,574 | **2,805,574** | MATCH | Exact row count verified |
| Distinct `train_number` | 10,743 | **10,743** | MATCH | 100% 4-5 digit numeric format |
| Distinct `train_name` | 6,816 | **6,816** | MATCH | Up/Down runs share names |
| Distinct `station_code` | 8,584 | **8,584** | MATCH | Length 1-4 alphanumeric |
| `start_date` Range | 2026-10-07 to 2026-10-25 | **2026-10-07 to 2026-10-25** | MATCH | Exactly 19 calendar days |
| Total Runs `(train, date)` | *Unmeasured* | **147,367** | MEASURED | Unit of whole journey run |
| Duplicate `id` | 0 | **0** | MATCH | Primary key unique |
| Duplicate `(train, date, seq)` | 0 | **0** | MATCH | Strict stop sequence uniqueness |
| Duplicate `(train, date, station)` | 0 | **22,064** | OBSERVED | Circular / turnaround routes calling at same station twice |
| NULL % `scheduled_arrival` | *Unmeasured* | **5.289%** (148,376) | MEASURED | Naturally NULL at origin (`seq=1`) |
| NULL % `scheduled_departure` | *Unmeasured* | **5.289%** (148,376) | MEASURED | Naturally NULL at terminus stop |
| NULL % `actual_arrival` | *Unmeasured* | **36.773%** (1,031,688) | MEASURED | Leakage column (unobserved arrival) |
| NULL % `actual_departure` | *Unmeasured* | **36.690%** (1,029,371) | MEASURED | Leakage column (unobserved departure) |
| NULL % `arrival_delay_min` | *Unmeasured* | **36.783%** (1,031,967) | MEASURED | Missing target at origin or unobserved |
| NULL % `departure_delay_min`| *Unmeasured* | **36.700%** (1,029,645) | MEASURED | Missing target at terminus or unobserved |
| Negative Delays % (Arrival) | > 0% | **8.56%** (151,878) | MATCH | Early arrivals valid; never clipped |
| Delayed > 15 min % (Overall)| 41.8% | **49.92%** | MISMATCH | Real data is balanced (~50:50) |
| Delayed > 15 min % (Reported-only)| *Unmeasured* | **49.91%** | MEASURED | Filtered on `arrival_reported=1` |
| Average Arrival Delay | 26.4 min | **38.22 min** | MISMATCH | Median is 17.0 min (positive skew) |

---

## 3. Schema & Existing Indexes

### Columns (17)
| Column Name | SQL Type | Nullable | Null % | Notes |
|-------------|----------|----------|--------|-------|
| `id` | `bigint(20)` | `NO` | 0.000% | Primary key, auto-increment |
| `train_number` | `varchar(20)` | `YES` | 0.000% | 10,743 distinct (min len 5, max len 5) |
| `train_name` | `varchar(150)`| `YES` | 0.000% | 6,816 distinct commercial names |
| `category` | `varchar(50)` | `YES` | 0.000% | Train class (SUB, MEX, MEMU, PAS, etc.) |
| `start_date` | `date` | `YES` | 0.000% | Journey start date (19 days) |
| `status` | `varchar(30)` | `YES` | 0.000% | completed, cancelled, etc. |
| `seq` | `smallint(6)` | `YES` | 0.000% | Stop sequence in run (1 to 1071; median 17) |
| `station_code` | `varchar(20)` | `YES` | 0.000% | 8,584 distinct codes (len 1 to 4) |
| `scheduled_arrival` | `datetime` | `YES` | 5.289% | Timetable arrival (IST); NULL at `seq=1` |
| `scheduled_departure`| `datetime` | `YES` | 5.289% | Timetable departure (IST); NULL at terminus |
| `actual_arrival` | `datetime` | `YES` | 36.773% | Observed arrival (IST) |
| `actual_departure` | `datetime` | `YES` | 36.690% | Observed departure (IST) |
| `arrival_reported` | `tinyint(1)` | `YES` | 0.787% | 1 = reported, 0 = not reported |
| `departure_reported`| `tinyint(1)` | `YES` | 0.787% | 1 = reported, 0 = not reported |
| `arrival_delay_min` | `int(11)` | `YES` | 36.783% | Target candidate; range -2850 to 3690 min |
| `departure_delay_min`| `int(11)` | `YES` | 36.700% | Departure delay in min |
| `run_quality` | `float` | `YES` | 0.000% | Quality metric (0.0 to 1.0) |

### Existing Indexes
- `PRIMARY` on column `id` (only 1 index currently exists in the table).

---

## 4. Categorical & Operational Distributions

- **Category Breakdown (Top 10 of 20):**
  - `SUB` (Suburban): 826,844 (29.47%)
  - `MEX` (Mail/Express): 680,214 (24.25%)
  - `MEMU` (Mainline EMU): 415,795 (14.82%)
  - `PAS` (Passenger): 363,957 (12.97%)
  - `SUF` (Superfast): 247,228 (8.81%)
  - `DMU`: 140,225 (5.00%)
  - `TOD` (Special/Train on Demand): 49,730 (1.77%)
  - `EMU`: 21,500 (0.77%)
  - `VNDB` (Vande Bharat): 19,542 (0.70%)
  - `JSH` (Jan Shatabdi): 11,263 (0.40%)
- **Status Distribution:**
  - `completed`: 2,605,787 (92.88%)
  - `partially_cancelled`: 64,558 (2.30%)
  - `cancelled`: 59,219 (2.11%)
  - `incomplete`: 43,870 (1.56%)
  - `diverted`: 26,828 (0.96%)
  - `not_started`: 5,312 (0.19%)
- **`arrival_reported`:** `1`: 1,773,599 (63.22%), `0`: 1,009,905 (36.00%), `NULL`: 22,070 (0.79%)
- **`departure_reported`:** `1`: 1,775,913 (63.30%), `0`: 1,007,591 (35.91%), `NULL`: 22,070 (0.79%)
- **`run_quality`:** `1.0`: 424,580 (15.13%), `0.5`: 68,262 (2.43%), `0.0`: 64,600 (2.30%), other fractions (0.16–0.91) comprise the remainder. 0% NULLs.

---

## 5. Label-Reliability Findings & Data-Quality Issues

1. **Origin Stops Lack Arrival Delays:** 148,376 rows (`seq=1`) have NULL `scheduled_arrival` and NULL `arrival_delay_min` by domain definition (trains depart from origin, never arrive). Origin stops cannot be evaluated for arrival delay.
2. **Terminus Stops Lack Departure Delays:** Terminus stops have NULL `scheduled_departure` and NULL `departure_delay_min`.
3. **Circular Route Duplicate Stations:** 22,064 records share `(train_number, start_date, station_code)` because a single train visits the same station multiple times. Journey stops must be keyed by `(train_number, start_date, seq)`.
4. **Valid Early Arrivals:** 8.56% of non-null arrivals have negative delay (early arrival, down to -22 min at p1). They must not be clipped to zero.
5. **UI Claims Mismatch:**
   - Real Delayed >15m rate is **49.92%** (vs owner-claimed 41.8%).
   - Real Mean Delay is **38.22 min** with median **17.0 min** (vs owner-claimed 26.4 min).
6. **Prospective / Synthetic Dates:** Dates are 2026-10-07 to 2026-10-25. Benchmark/research dataset only.

---

## 6. Delay Percentiles & Class Balance

### Delay Percentiles (`arrival_delay_min` on 1,773,607 non-null rows)
- **Mean:** 38.22 min | **Median (p50):** 17.0 min | **Min:** -2850.0 min | **Max:** 3690.0 min
- **p1:** -22.0 min | **p5:** -6.0 min | **p25:** 6.0 min | **p50:** 17.0 min
- **p75:** 40.0 min | **p95:** 169.0 min | **p99:** 389.0 min
- **Histogram Buckets:**
  - `< -30 min`: 7,071 (0.40%)
  - `-30 to -5 min`: 69,678 (3.93%)
  - `-5 to 5 min (On-Time)`: 404,204 (22.79%)
  - `5 to 15 min (Slight)`: 407,233 (22.96%)
  - `15 to 30 min (Moderate)`: 323,364 (18.23%)
  - `30 to 60 min (Significant)`: 263,636 (14.86%)
  - `60 to 180 min (Severe)`: 226,386 (12.76%)
  - `> 180 min (Extreme)`: 72,035 (4.06%)

### Class Balance per Category (`arrival_delay_min > 15`)
- `MEX`: 571,965 rows | **57.02% delayed** | Avg delay: 39.33 min
- `SUB`: 314,135 rows | **17.13% delayed** | Avg delay: 9.76 min
- `MEMU`: 249,133 rows | **59.36% delayed** | Avg delay: 42.33 min
- `PAS`: 235,999 rows | **55.22% delayed** | Avg delay: 38.73 min
- `SUF`: 217,543 rows | **57.41% delayed** | Avg delay: 53.08 min
- `DMU`: 80,406 rows | **50.59% delayed** | Avg delay: 31.18 min
- `TOD`: 41,890 rows | **76.12% delayed** | Avg delay: 148.45 min (most delayed)
- `VNDB`: 16,940 rows | **28.82% delayed** | Avg delay: 11.64 min
- `RAJ`: 5,489 rows | **46.13% delayed** | Avg delay: 33.81 min
- `SHT`: 4,645 rows | **28.03% delayed** | Avg delay: 14.29 min

### Class Balance per Date (`arrival_delay_min > 15`)
- `2026-10-07`: 18,792 rows | 60.46% delayed | Avg 53.55 min
- `2026-10-08`: 94,877 rows | 50.13% delayed | Avg 35.70 min
- `2026-10-09`: 99,869 rows | 50.60% delayed | Avg 37.11 min
- `2026-10-10`: 96,948 rows | 49.17% delayed | Avg 36.51 min
- `2026-10-11`: 97,502 rows | 49.53% delayed | Avg 37.39 min
- `2026-10-12`: 102,291 rows | 50.15% delayed | Avg 37.57 min
- `2026-10-13`: 100,309 rows | 50.59% delayed | Avg 37.60 min
- `2026-10-14`: 100,834 rows | 51.77% delayed | Avg 41.50 min
- `2026-10-15`: 101,525 rows | 51.90% delayed | Avg 44.01 min
- `2026-10-16`: 102,760 rows | 53.39% delayed | Avg 43.73 min
- `2026-10-17`: 101,001 rows | 53.27% delayed | Avg 45.88 min
- `2026-10-18`: 99,723 rows | 50.34% delayed | Avg 43.95 min
- `2026-10-19`: 103,115 rows | 48.40% delayed | Avg 36.29 min
- `2026-10-20`: 101,718 rows | 46.52% delayed | Avg 35.80 min
- `2026-10-21`: 101,700 rows | 47.91% delayed | Avg 33.94 min
- `2026-10-22`: 102,676 rows | 49.12% delayed | Avg 37.83 min
- `2026-10-23`: 101,998 rows | 50.62% delayed | Avg 36.87 min
- `2026-10-24`: 92,012 rows | 47.64% delayed | Avg 31.62 min
- `2026-10-25`: 53,957 rows | 41.40% delayed | Avg 24.62 min

---

## 7. Stored vs Recomputed Delay Consistency Check

- **Sampling Method:** Deterministic `ORDER BY id LIMIT 100000` (80,531 rows with valid arrival timestamps)
- **Arrival Delay Exact Match Rate (`recomputed == stored`):** **100.0%** (80,531 / 80,531)
- **Match within 1 Minute:** **100.0%**
- **Mean Absolute Difference:** **0.000 min** (Max diff: 0.0 min)
- **Departure Delay Exact Match Rate:** **100.0%** (80,441 / 80,441)
- **Midnight Rollover Artifacts in Sample:** 0

---

## 8. Pytest Actual Results

- **Command Run:** `pytest -v` from `backend/`
- **Result:** **55 passed in 2.65 seconds** (0 failed, 0 skipped)
  - `tests/test_config.py`: 9 passed (env validation, placeholder rejection, zero secret exposure)
  - `tests/test_engine.py`: 42 passed (read-only query guard: permitted clauses, DML/DDL rejection, comment stripping, multi-statement rejection)
  - `tests/test_db_integration.py`: 4 passed (`SELECT 1`, active TLS cipher, guard blocking live DML, row count verification)

---

## 9. Current Content of "Questions for Phase 3"

Directly recorded in `docs/data_audit.json` and `docs/data_audit.md`:
1. **Target Formulation:** Confirm whether binary classification at 15 minutes is optimal, or if ordinal multi-class (On-Time, Minor, Major) provides richer portfolio value.
2. **Origin Stop Strategy:** How to handle origin stations (`seq=1`) where `arrival_delay_min` is missing by definition.
3. **Validation Strategy:** Implement a temporal split (e.g. Days 1-14 train, 15-16 val, 17-19 test) to prevent sequence lookahead leakage.
4. **Historical Delay Features:** Calculate expanding window mean delays per train and station using strictly prior dates.
5. **Sequence Delay Propagation:** Can sequence delay propagation (delay at previous stop) be used safely as an inference feature without target leakage?

---

## 10. Blockers & Unverified Items

- **Active Blockers:** **NONE**. TiDB Cloud connects via TLS, read-only guard operates, LightGBM/SHAP installed, audit complete, test suite passes.
- **Data Constraints for Phase 3:**
  - 19-day static observation window requires strictly temporal or train-grouped train/val/test splits.
  - Historical aggregates must use past dates only (`start_date < current_date`) to prevent future lookahead leakage.
  - Origin stops (`seq=1`) must be excluded from arrival delay ML tasks.
- **Unverified Items:**
  - True real-world provenance beyond the Hugging Face dataset upload remains unverified; treated as "Observed Railway Dataset".
  - Behavior of delays on unseen future operational dates cannot be tested due to fixed static dataset.
