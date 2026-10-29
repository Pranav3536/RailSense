# RailSense — Phase 3 Data Validation & Quality Report

> **Evaluated Records:** `2,805,574` rows  
> **Evaluation Timestamp:** `2026-10-29T19:49:38.062735`  
> **Policy:** Strict flagging and explicit eligibility masking without silent row deletion.

---

## 1. Summary of Validation Rules & Actions

| Rule ID | Validation Rule | Rows Affected | Action Taken | Rationale |
|---------|-----------------|---------------|--------------|-----------|
| **V-01** | Primary Stop Key Uniqueness | **0** | **KEEP** | `(train_number, start_date, seq)` is 100% unique across all 2.8M rows. |
| **V-02** | Repeated Station Visits | **22,064** | **KEEP (Key on seq)** | Circular/turnaround routes call at the same station multiple times legitimately. |
| **V-03** | Training Label Eligibility | **1,032,178** excluded | **EXCLUDE from label set** | Requires non-null delay, `arrival_reported==1`, `seq>1`, and `abs(delay)<=1440`. **1,773,068 (63.2%)** rows eligible. |
| **V-04** | Origin & Terminus Discrepancy | **148,376** | **KEEP (Feature seq==1)** | Exactly 147,367 match `seq=1` for all 147,367 runs; remaining 1,009 are timetable gaps across 864 runs. |
| **V-05** | Timestamp Consistency | **1,773,607** checked | **100.0% Exact Match** | Stored `arrival_delay_min` perfectly matches recomputed timestamp difference across the entire dataset. |
| **V-06** | Delay Outliers (>24h or <-24h) | **211** (61 early, 150 late) | **FLAG; EXCLUDE from label** | Early delays < -1440 min are date-wrap artifacts (off by 24h). Late delays > 1440 min are extreme anomalies. |
| **V-07** | Sequence Outliers (`seq > 200`) | **348** | **FLAG; KEEP** | Train `13152` contains anomalous `seq=1071` at terminal stop `CBH`. |
| **V-08** | Edge Days Censoring | **120,095** | **Warm-up / Exclude** | 2026-10-07 has left-truncation (1,034 runs); 2026-10-25 has right-censoring (5,712 runs). Excluded from test sets. |
| **V-09** | Selection Bias | **1,031,975** unlabelled | **DOCUMENT** | Models predict conditional on arrival being reported. Unreported stops are skewed towards later sequence numbers. |

---

## 2. Origin Stop & Scheduled Arrival Resolution

An apparent discrepancy was noted in Phase 2: `148,376` rows have NULL `scheduled_arrival`, yet there are `147,367` runs.

### Measured Root Cause
1. **True Origin Stops (`seq = 1`):** Exactly **147,367 rows** have `seq = 1` and NULL `scheduled_arrival`. This is a **1-to-1 exact match** with the 147,367 distinct runs. Trains depart from their origin; they do not arrive.
2. **Intermediate Timetable Gaps:** Exactly **1,009 rows** (`148,376 - 147,367`) have NULL `scheduled_arrival` at intermediate stations (`seq = 22, 23, 34, ...`) across 864 runs where the timetable publisher omitted the arrival timestamp.

---

## 3. Label Eligibility & Verification of UI Claims

### Training Label Eligibility Criteria
A row is valid for delay classification target modeling IF AND ONLY IF:
1. `arrival_delay_min IS NOT NULL` (1,773,607 rows)
2. `arrival_reported == 1` (excludes 8 rows with reported=0)
3. `seq > 1` (excludes 147,367 origin stops where arrival is undefined)
4. `abs(arrival_delay_min) <= 1440` (excludes 211 corrupt date-wrap / 24h+ anomalies)

**Resulting Eligible Label Set:** **1,773,068 rows** (63.2% of full dataset).

### Owner UI Claims Investigation
- **Claim: 41.8% Delayed > 15 min:** Real overall rate is **49.92%**. When Suburban trains (`SUB`) are excluded, the rate is **42.03%** (close to 41.8%).
- **Claim: 26.4 min Average Delay:** Real overall average delay is **38.22 min** (median: **17.0 min**).
- **Conclusion:** Neither claim matches the full dataset directly. Real measured figures must be used in all documentation and UI dashboards.

---

## 4. Full Dataset Delay Consistency Check

Every row in the 2.8M row cache with both timestamps and stored delay was evaluated:
- **Arrival Delay Check:** **1,773,607 rows checked** → **1,773,607 exact matches (100.000%)**.
- **Departure Delay Check:** **1,775,929 rows checked** → **1,775,929 exact matches (100.000%)**.
- **Max Absolute Difference:** **0.000 min**.
- **Midnight Rollover Artifacts:** **0** (full timestamps include date arithmetic).

---

## 5. Edge-Day Truncation & Censoring Analysis

| Date | Total Rows | Runs Count | Labelled Rows | Delayed > 15m % | Status & Policy |
|------|------------|------------|---------------|-----------------|-----------------|
| `2026-10-07` | 22,377 | 1,034 | 18,792 | 60.46% | **Left-truncated:** Use strictly for historical warm-up. |
| `2026-10-08` | 155,680 | 8,181 | 94,877 | 50.13% | Full operational day (Train split) |
| ... | ~159,000 | ~8,350 | ~100,000 | 48–53% | Typical operational days |
| `2026-10-24` | 144,959 | 7,887 | 92,012 | 47.64% | Full operational day (Evaluation split) |
| `2026-10-25` | 97,718 | 5,712 | 53,957 | 41.40% | **Right-censored:** Exclude from evaluation splits. |
