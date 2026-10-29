# RailSense — Phase 2 Comprehensive Data Audit Report

> **Audited Table:** `railsense.train_records`  
> **Host:** `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`  
> **Audit Timestamp:** `2026-10-29T19:20:32.955687`  
> **Source Provenance:** Observed Railway Dataset (Hugging Face `pjay-in/indian-railways-delays`)

---

## 1. Executive Summary & Verification vs Owner Claims

| Metric | Owner-Reported | Measured (Real) | Match Status | Notes |
|--------|----------------|-----------------|--------------|-------|
| **Total Rows** | 2,805,574 | **2,805,574** | MATCH | Exact row count verified |
| **Distinct Trains** | 10,743 | **10,743** | MATCH | `train_number` distinct count |
| **Distinct Train Names** | 6,816 | **6,816** | MATCH | `train_name` distinct count |
| **Distinct Stations** | 8,584 | **8,584** | MATCH | `station_code` distinct count |
| **Start Date Range** | 2026-10-07 to 2026-10-25 | **2026-10-07 to 2026-10-25** | MATCH | Span: 19 calendar days |
| **Duplicate IDs** | 0 | **0** | MATCH | Primary key unique |
| **Duplicate (Train, Date, Seq)** | 0 | **0** | MATCH | No duplicate stops in sequence |
| **Negative Delay %** | > 0% | **8.56%** | MATCH | Early arrivals are valid, preserved |
| **Delayed > 15 min %** | 41.8% | **49.92%** | MISMATCH | Reported-only: 49.91% |
| **Average Delay** | 26.4 min | **38.22 min** | MISMATCH | Measured on all non-null arrivals |

---

## 2. Schema and Indexes

### Columns (17)
| Column | Type | Nullable | Default | Extra |
|--------|------|----------|---------|-------|
| `id` | `bigint` | `NO` | `None` | `auto_increment` |
| `train_number` | `varchar(20)` | `YES` | `None` | `None` |
| `train_name` | `varchar(150)` | `YES` | `None` | `None` |
| `category` | `varchar(50)` | `YES` | `None` | `None` |
| `start_date` | `date` | `YES` | `None` | `None` |
| `status` | `varchar(30)` | `YES` | `None` | `None` |
| `seq` | `smallint` | `YES` | `None` | `None` |
| `station_code` | `varchar(20)` | `YES` | `None` | `None` |
| `scheduled_arrival` | `datetime` | `YES` | `None` | `None` |
| `scheduled_departure` | `datetime` | `YES` | `None` | `None` |
| `actual_arrival` | `datetime` | `YES` | `None` | `None` |
| `actual_departure` | `datetime` | `YES` | `None` | `None` |
| `arrival_reported` | `tinyint(1)` | `YES` | `None` | `None` |
| `departure_reported` | `tinyint(1)` | `YES` | `None` | `None` |
| `arrival_delay_min` | `int` | `YES` | `None` | `None` |
| `departure_delay_min` | `int` | `YES` | `None` | `None` |
| `run_quality` | `float` | `YES` | `None` | `None` |

### Existing Indexes
- **Index:** `PRIMARY` on column `id` (Non-unique: None, Seq: 1)

### Recommended Indexes for Future Phases (Phase 5 API)
1. `CREATE INDEX idx_train_start_date ON train_records(train_number, start_date);` (Optimizes per-run journey lookups)
2. `CREATE INDEX idx_station_code ON train_records(station_code);` (Optimizes station delay analytics)
3. `CREATE INDEX idx_start_date ON train_records(start_date);` (Optimizes temporal queries and date filtering)

---

## 3. NULL Rate Analysis

| Column | Null Count | Null % | Interpretation |
|--------|------------|--------|----------------|
| `id` | 0 | **0.000%** | Required |
| `train_number` | 0 | **0.000%** | Required |
| `train_name` | 0 | **0.000%** | Required |
| `category` | 0 | **0.000%** | Required |
| `start_date` | 0 | **0.000%** | Required |
| `status` | 0 | **0.000%** | Required |
| `seq` | 0 | **0.000%** | Required |
| `station_code` | 0 | **0.000%** | Required |
| `scheduled_arrival` | 148,376 | **5.289%** | Naturally NULL for origin stations (seq=1) |
| `scheduled_departure` | 148,376 | **5.289%** | Naturally NULL for terminus stations |
| `actual_arrival` | 1,031,688 | **36.773%** | Optional/Observed |
| `actual_departure` | 1,029,371 | **36.690%** | Optional/Observed |
| `arrival_reported` | 22,070 | **0.787%** | Optional/Observed |
| `departure_reported` | 22,070 | **0.787%** | Optional/Observed |
| `arrival_delay_min` | 1,031,967 | **36.783%** | Naturally NULL for origin stations (seq=1) |
| `departure_delay_min` | 1,029,645 | **36.700%** | Naturally NULL for terminus stations |
| `run_quality` | 0 | **0.000%** | Required |

---

## 4. Journey & Run Analysis
- **Total Runs Measured:** `147,367` runs (unique `(train_number, start_date)`).
- **Stops per Run:**
  - Min: `2`
  - Median: `17.0`
  - Mean: `19.04`
  - p95: `40.0`
  - Max: `194`
- **Runs per Train:**
  - Min: `1`
  - Median: `18.0`
  - Mean: `13.72`
  - Max: `19`

---

## 5. Delay Distribution & Percentiles

### Arrival Delay (`arrival_delay_min`)
- **Non-null Observations:** `1,773,607`
- **Mean:** `38.22 min`
- **Median (p50):** `17.0 min`
- **Range:** `-2850.0 min` to `3690.0 min`
- **Early Arrivals (Negative Delays):** `8.56%` (valid, never clipped)
- **On-time Exactly (0 min):** `2.88%`
- **Delayed (> 0 min):** `88.56%`

| Percentile | Value (min) |
|------------|-------------|
| p1 (Very early) | -22.0 min |
| p5 | -6.0 min |
| p25 | 6.0 min |
| p50 (Median) | 17.0 min |
| p75 | 40.0 min |
| p95 | 169.0 min |
| p99 (Extreme) | 389.0 min |

### Delay Histogram Buckets
| Bucket | Count | % of Non-Null |
|--------|-------|---------------|
| < -30 | 7,071 | 0.4% |
| -30 to -5 | 69,678 | 3.93% |
| -5 to 5 (On-Time) | 404,204 | 22.79% |
| 5 to 15 (Slight) | 407,233 | 22.96% |
| 15 to 30 (Moderate) | 323,364 | 18.23% |
| 30 to 60 (Significant) | 263,636 | 14.86% |
| 60 to 180 (Severe) | 226,386 | 12.76% |
| > 180 (Extreme) | 72,035 | 4.06% |

---

## 6. Delay Consistency Check (100,000 Row Sample)
- **Sample Method:** Deterministic `ORDER BY id LIMIT 100000`
- **Exact Match Rate:** `100.0%`
- **Match within 1 Minute:** `100.0%`
- **Mean Absolute Difference:** `0.0 min`
- **Midnight Rollover Artifacts:** `0` rows (0.0%) where difference is ~1440 min due to calendar date rollover.

---

## 7. Categorical Distributions & Target Class Balance

### Train Categories
| Category | Row Count | % Share | Delayed > 15 min % | Avg Delay |
|----------|-----------|---------|-------------------|-----------|
| MEX | 571,965 | - | 57.02% | 39.33 min |
| SUB | 314,135 | - | 17.13% | 9.76 min |
| MEMU | 249,133 | - | 59.36% | 42.33 min |
| PAS | 235,999 | - | 55.22% | 38.73 min |
| SUF | 217,543 | - | 57.41% | 53.08 min |
| DMU | 80,406 | - | 50.59% | 31.18 min |
| TOD | 41,890 | - | 76.12% | 148.45 min |
| VNDB | 16,940 | - | 28.82% | 11.64 min |
| EMU | 11,133 | - | 75.80% | 56.91 min |
| JSH | 9,389 | - | 45.12% | 23.95 min |
| AMTB | 7,055 | - | 60.92% | 60.67 min |
| RAJ | 5,489 | - | 46.13% | 33.81 min |
| SHT | 4,645 | - | 28.03% | 14.29 min |
| GBR | 4,234 | - | 57.23% | 55.51 min |
| DRNT | 1,730 | - | 53.18% | 89.96 min |
| VNDM | 605 | - | 34.88% | 12.83 min |
| TEJ | 558 | - | 33.69% | 40.27 min |
| VNDS | 382 | - | 24.87% | 7.76 min |
| PEXP | 335 | - | 73.73% | 296.18 min |
| TRST | 41 | - | 58.54% | -10.90 min |

### Candidate ML Target Class Balance
- Target: `is_delayed = arrival_delay_min > 15`
- Overall Positive Class (% Delayed > 15m): **49.92%**
- Negative Class (% On-Time / <= 15m): **50.08%**
- Well-balanced binary classification problem (~50:50), avoiding severe imbalance issues.

---

## 8. Provenance & Critical Caveats

1. **Observed Snapshot:** Data spans only ~19 days (October 7, 2026 to October 25, 2026). It is not multi-year data.
2. **Future Dates (2026):** Timestamps are prospective/synthetic. No claims of real-time operational truth should be made.
3. **No Live Ingestion:** Static dataset loaded in TiDB Cloud.
4. **Valid Negatives:** Early arrivals represent trains arriving ahead of schedule; clipping to zero would introduce artificial positive bias.

---

## 9. Key Questions for Phase 3 (EDA & Feature Engineering)

1. **Target Formulation:** Confirm whether binary classification at 15 minutes is optimal, or if ordinal multi-class (On-Time, Minor, Major) provides richer portfolio value.
2. **Origin Stop Strategy:** How to handle origin stations (`seq=1`) where `arrival_delay_min` is missing by definition.
3. **Validation Strategy:** Implement a temporal split (e.g. Days 1-14 train, 15-16 val, 17-19 test) to prevent sequence lookahead leakage.
4. **Historical Delay Features:** Calculate expanding window mean delays per train and station using strictly prior dates.
