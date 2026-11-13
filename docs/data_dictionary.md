# RailSense — Data Dictionary (`railsense.train_records`)

> **Source:** Observed Railway Dataset (`pjay-in/indian-railways-delays` on Hugging Face)  
> **Storage:** TiDB Cloud (MySQL-compatible, TLS required)  
> **Verified Table Volume:** 2,805,574 rows  
> **Temporal Coverage:** 2026-10-07 to 2026-10-25 (19 calendar days)  
> **Observation Unit:** 1 row = 1 train stop observation (not a whole journey)

---

## 1. Column Inventory & Audit Summary

| # | Column Name | SQL Data Type | Nullable | Measured Null Count | Measured Null % | Primary Function |
|---|-------------|---------------|----------|---------------------|-----------------|------------------|
| 1 | `id` | `bigint(20)` | `NO` | 0 | 0.000% | Primary key, auto-increment |
| 2 | `train_number` | `varchar(20)` | `YES` | 0 | 0.000% | Train identifier (10,743 distinct) |
| 3 | `train_name` | `varchar(150)` | `YES` | 0 | 0.000% | Train commercial name (6,816 distinct) |
| 4 | `category` | `varchar(50)` | `YES` | 0 | 0.000% | Service category (MEX, SUB, SUF, etc.) |
| 5 | `start_date` | `date` | `YES` | 0 | 0.000% | Journey origin departure date |
| 6 | `status` | `varchar(30)` | `YES` | 0 | 0.000% | Operational status indicator |
| 7 | `seq` | `smallint(6)` | `YES` | 0 | 0.000% | Sequential stop index within journey (1 to 194) |
| 8 | `station_code` | `varchar(20)` | `YES` | 0 | 0.000% | Station alphanumeric code (8,584 distinct) |
| 9 | `scheduled_arrival` | `datetime` | `YES` | 148,376 | 5.289% | Scheduled arrival timestamp in IST |
| 10 | `scheduled_departure` | `datetime` | `YES` | 148,376 | 5.289% | Scheduled departure timestamp in IST |
| 11 | `actual_arrival` | `datetime` | `YES` | 1,031,688 | 36.773% | Observed arrival timestamp in IST |
| 12 | `actual_departure` | `datetime` | `YES` | 1,029,371 | 36.690% | Observed departure timestamp in IST |
| 13 | `arrival_reported` | `tinyint(1)` | `YES` | 22,070 | 0.787% | Boolean reporting flag (1=reported, 0=not) |
| 14 | `departure_reported` | `tinyint(1)` | `YES` | 22,070 | 0.787% | Boolean reporting flag (1=reported, 0=not) |
| 15 | `arrival_delay_min` | `int(11)` | `YES` | 1,031,967 | 36.783% | Arrival delay in minutes (negatives valid) |
| 16 | `departure_delay_min` | `int(11)` | `YES` | 1,029,645 | 36.700% | Departure delay in minutes (negatives valid) |
| 17 | `run_quality` | `float` | `YES` | 0 | 0.000% | Run data quality score (0.0 to 1.0) |

---

## 2. Detailed Column Specifications

### `id`
- **Definition:** Surrogate primary key automatically generated upon insertion.
- **Null Behaviour:** Strictly non-null (`0` nulls).
- **Caveats:** Row ordering by `id` does not guarantee strict chronological or sequence ordering; always sort by `(train_number, start_date, seq)` for journeys.

### `train_number`
- **Definition:** Official Indian Railways 4- to 5-digit train number stored as string.
- **Audit Findings:** 10,743 distinct trains; 100% numeric format (length 4–5 digits). No non-numeric strings found.
- **Usage:** Essential grouping key for runs and train-level historical features.

### `train_name`
- **Definition:** Standard commercial/passenger name of the train service (e.g., "PASCHIM EXPRESS").
- **Audit Findings:** 6,816 distinct names. Note: Multiple train numbers share the same name (e.g., up and down services of the same route).

### `category`
- **Definition:** Acronym representing train class/service type.
- **Key Categories Observed:**
  - `MEX` (Mail / Express): 571,965 rows (57.02% delayed >15m)
  - `SUB` (Suburban): 314,135 rows (17.13% delayed >15m)
  - `MEMU` (Mainline Electric Multiple Unit): 249,133 rows
  - `PAS` (Passenger): 235,999 rows
  - `SUF` (Superfast): 217,543 rows
  - `TOD` (Special / Train on Demand): 41,890 rows (76.12% delayed >15m, highest delay category)
  - `VNDB` (Vande Bharat Express): 16,940 rows (28.82% delayed >15m)

### `start_date`
- **Definition:** Date when the train service commenced its journey from the origin station.
- **Audit Findings:** Min date `2026-10-07`, Max date `2026-10-25`. Spans exactly 19 calendar days in October 2026.
- **Caveats:** Dates are in 2026 (prospective/synthetic calendar). Data must be treated as an observed benchmark dataset.

### `status`
- **Definition:** Reported status of the service at the time of observation capture.
- **Null Behaviour:** 0 nulls.

### `seq`
- **Definition:** Station sequence index within a journey run, starting at 1 for the journey origin.
- **Range:** 1 to 194. Median stops per run is 17.
- **Caveats:** Duplicate `(train_number, start_date, seq)` count is **0**, confirming each stop index is strictly unique within a journey.

### `station_code`
- **Definition:** Standard Indian Railways IRCTC station code (e.g., `NDLS`, `HWH`, `CSTM`).
- **Audit Findings:** 8,584 distinct stations; length 2 to 6 characters; 100% valid alphanumeric codes.
- **Caveats:** Duplicate `(train_number, start_date, station_code)` has **22,064** occurrences across the dataset. These correspond to circular, loop, or turnaround routes where a train calls at the same station more than once during its run.

### `scheduled_arrival` & `scheduled_departure`
- **Definition:** Official published timetable arrival and departure timestamps (IST).
- **Null Behaviour:** Exactly 148,376 NULLs each (5.289% of rows).
  - `scheduled_arrival` is naturally NULL for origin stations (`seq=1`).
  - `scheduled_departure` is naturally NULL for terminus stations (the final stop).
- **Sanity Check:** 0 rows observed with `scheduled_departure < scheduled_arrival` on the same stop.

### `actual_arrival` & `actual_departure`
- **Definition:** Real-time observed arrival and departure timestamps recorded by railway signaling/NTES.
- **Null Behaviour:** ~36.7% NULL across the table.
- **Leakage Warning:** **NEVER USE AS ML INPUT FEATURES.** These fields represent the actual event outcome.

### `arrival_reported` & `departure_reported`
- **Definition:** Binary reporting indicator flags (`1` = reported, `0` = not reported).
- **Null Count:** 22,070 rows (0.787%).

### `arrival_delay_min`
- **Definition:** Difference in minutes between actual arrival and scheduled arrival (`actual - scheduled`).
- **Audit Findings:**
  - Non-null count: 1,773,607 (63.22% of total rows)
  - Mean: **38.22 min**
  - Median (p50): **17.0 min**
  - 1st Percentile (early arrival): **-22.0 min**
  - 95th Percentile: **169.0 min**
  - 99th Percentile: **389.0 min**
  - Early arrivals (negative delay): **8.56%** of non-null observations.
- **Integrity Rule:** Negative delays are valid early arrivals. **NEVER CLIP NEGATIVE DELAYS TO ZERO.**

### `departure_delay_min`
- **Definition:** Difference in minutes between actual departure and scheduled departure.
- **Audit Findings:** Mean: 35.84 min, Median: 15.0 min. 5.12% negative delays.

### `run_quality`
- **Definition:** Data completeness/confidence metric for the journey.
- **Null Behaviour:** 0 nulls. Range: 0.0 to 1.0.
