# RailSense — Real REST API Contract for Frontend Integration

> **Generated Programmatically in Phase 6 from Live Endpoints**  
> **Base URL:** `http://localhost:5000/api`  
> **CORS Verified:** `http://localhost:5173` returns `Access-Control-Allow-Origin: http://localhost:5173`. Disallowed origins receive no CORS header.  
> **Notice:** All field names, types, and error structures below reflect the exact runtime responses of the Python backend. Frontend components in Phase 7–9 MUST strictly consume these keys without inventing field names.

---

## 1. Uniform Error Envelope

All HTTP client (`4xx`) and server (`5xx`) errors return a standard JSON structure:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error.",
    "details": "Optional extra dictionary or null",
    "request_id": "97e68bc5-01e4-44b2-a4a3-df5b4b122249"
  }
}
```

---

## 2. Status Card Contract (`/api/health/ready`)

The sidebar's **Truthful Database & Service Status Card** consumes `/api/health/ready`:
```json
{
  "components": {
    "prediction_engine": "ready",
    "serving_store": "ready",
    "tidb_cloud": "unavailable"
  },
  "data_as_of": "2026-10-25",
  "model_version": "1.0.0",
  "service": "RailSense API",
  "status": "ready",
  "timestamp": "2026-10-30 10:56:37 UTC",
  "version": "1.0.0"
}
```

### Exact Field Mapping for UI Status States:
- **`components.tidb_cloud`:** `'connected'` -> Database connected (green success); `'unavailable'` -> Database unavailable (amber warning).
- **`components.serving_store`:** `'ready'` -> Serving store operational.
- **`components.prediction_engine`:** `'ready'` -> Model loaded.
- **`model_version`:** e.g. `'1.0.0'`.
- **`data_as_of`:** `'2026-10-25'` (dataset cutoff date).
- **Network failure (fetch throws/aborts):** API unreachable (red danger).

---

## 3. Comprehensive Endpoint Schemas & Truncated Examples

### `GET /api/health` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "service": "RailSense API",
  "status": "healthy",
  "timestamp": "2026-10-30 10:56:37 UTC",
  "version": "1.0.0"
}
```

---

### `GET /api/health/ready` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "components": {
    "prediction_engine": "ready",
    "serving_store": "ready",
    "tidb_cloud": "unavailable"
  },
  "data_as_of": "2026-10-25",
  "model_version": "1.0.0",
  "service": "RailSense API",
  "status": "ready",
  "timestamp": "2026-10-30 10:56:37 UTC",
  "version": "1.0.0"
}
```

---

### `GET /api/overview` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "category_breakdown": [
    {
      "category": "MEX",
      "delayed_rate": 57.02,
      "eligible_stops": 571895,
      "mean_delay_min": 39.41,
      "median_delay_min": 20.0,
      "total_stops": 680214
    },
    {
      "category": "SUB",
      "delayed_rate": 17.07,
      "eligible_stops": 313903,
      "mean_delay_min": 9.57,
      "median_delay_min": 6.0,
      "total_stops": 826844
    },
    "... (18 more items)"
  ],
  "delay_summary": {
    "definition": "Delay is classified as arrival_delay_min > 15 minutes evaluated strictly on label-eligible stops (arrival_reported=1, seq>1, |delay|<=1440m). Negative delays are valid early arrivals and never clipped.",
    "eligible_stops_count": 1773068,
    "fleet_delayed_rate": 49.91,
    "fleet_early_arrival_pct": 8.56,
    "fleet_mean_delay_min": 38.1,
    "fleet_median_delay_min": 15.0,
    "label_coverage_pct": 63.2
  },
  "fleet_kpis": {
    "date_range": {
      "days": 19,
      "end": "2026-10-25",
      "start": "2026-10-07"
    },
    "distinct_stations": 8584,
    "distinct_train_numbers": 10743,
    "total_stops_observed": 2805574,
    "total_train_runs": 147367
  },
  "per_date_trend": [
    {
      "date": "2026-10-07",
      "delayed_rate": 60.47,
      "eligible_stops": 18788,
      "is_partial": true,
      "mean_delay_min": 53.71,
      "partial_note": "Left-truncated collection start",
      "runs_count": 1034,
      "total_stops": 22377
    },
    {
      "date": "2026-10-08",
      "delayed_rate": 50.13,
      "eligible_stops": 94868,
      "is_partial": false,
      "mean_delay_min": 35.7,
      "partial_note": null,
      "runs_count": 8181,
      "total_stops": 155680
    },
    "... (17 more items)"
  ],
  "provenance": {
    "build_script_version": "1.0.0",
    "built_at": "2026-10-29 21:16:14 UTC",
    "date_range": "2026-10-07 to 2026-10-25",
    "row_count": 2805574,
    "runs_count": 147367,
    "source": "TiDB Cloud railsense.train_records (via local cache)"
  }
}
```

---

### `GET /api/trains?q=12951&page=1&page_size=2` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible stops in historical window (2026-10-07 to 2026-10-25)",
  "items": [
    {
      "category": "RAJ",
      "days_observed": 18,
      "delayed_rate": 20.49,
      "eligible_stops_count": 122,
      "mean_delay": 32.87,
      "origin_station_code": "MMCT",
      "runs_count": 18,
      "stops_count": 16,
      "terminus_station_code": "NDLS",
      "train_name": "NDLS TEJAS RAJ",
      "train_number": "12951"
    }
  ],
  "pagination": {
    "has_next": false,
    "has_prev": false,
    "page": 1,
    "page_size": 2,
    "total": 1,
    "total_pages": 1
  }
}
```

---

### `GET /api/trains/12951` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "category": "RAJ",
  "data_as_of": "2026-10-25",
  "days_observed": 18,
  "definition": "Observed delay metrics are calculated from label-eligible stops (arrival_delay_min > 15m) in the 19-day dataset window.",
  "delayed_rate": 20.49,
  "eligible_stops_count": 122,
  "history_by_date": [
    {
      "delayed_rate": 0.0,
      "mean_delay": 5.86,
      "start_date": "2026-10-07",
      "stops_count": 7,
      "train_number": "12951"
    },
    {
      "delayed_rate": 14.29,
      "mean_delay": 5.43,
      "start_date": "2026-10-08",
      "stops_count": 7,
      "train_number": "12951"
    },
    "... (16 more items)"
  ],
  "mean_delay": 32.87,
  "origin_station_code": "MMCT",
  "runs_count": 18,
  "stops": [
    {
      "arrival_day_offset": 0,
      "departure_day_offset": 0,
      "is_origin": 1,
      "is_terminus": 0,
      "observed_delayed_rate": null,
      "observed_mean_delay_min": null,
      "observed_stops_count": 0,
      "scheduled_arrival_time": null,
      "scheduled_departure_time": "17:00",
      "seq": 1,
      "station_code": "MMCT",
      "train_number": "12951"
    },
    {
      "arrival_day_offset": 0,
      "departure_day_offset": 0,
      "is_origin": 0,
      "is_terminus": 0,
      "observed_delayed_rate": 28.57,
      "observed_mean_delay_min": 34.93,
      "observed_stops_count": 14,
      "scheduled_arrival_time": "17:20",
      "scheduled_departure_time": "17:22",
      "seq": 2,
      "station_code": "BVI",
      "train_number": "12951"
    },
    "... (14 more items)"
  ],
  "stops_count": 16,
  "terminus_station_code": "NDLS",
  "train_name": "NDLS TEJAS RAJ",
  "train_number": "12951"
}
```

---

### `GET /api/stations?q=BRC&page=1&page_size=2` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
  "items": [
    {
      "category_mix": {
        "MEMU": 395,
        "MEX": 646,
        "RAJ": 105,
        "SUF": 1445,
        "TOD": 213
      },
      "delayed_rate": 25.28,
      "mean_delay": 22.52,
      "station_code": "BRC",
      "stops_count": 3222,
      "trains_count": 476,
      "wilson_lower": 23.7,
      "wilson_upper": 26.92
    },
    {
      "category_mix": {
        "PAS": 70
      },
      "delayed_rate": 70.77,
      "mean_delay": 57.72,
      "station_code": "BRCK",
      "stops_count": 70,
      "trains_count": 4,
      "wilson_lower": 58.8,
      "wilson_upper": 80.42
    }
  ],
  "pagination": {
    "has_next": false,
    "has_prev": false,
    "page": 1,
    "page_size": 2,
    "total": 2,
    "total_pages": 1
  }
}
```

---

### `GET /api/stations/BRC` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "calling_trains_sample": [
    {
      "category": "SUF",
      "delayed_rate": 0.0,
      "mean_delay": -8.79,
      "observed_stops": 19,
      "train_name": "BRC INTERCITY",
      "train_number": "12929"
    },
    {
      "category": "SUF",
      "delayed_rate": 57.89,
      "mean_delay": 26.58,
      "observed_stops": 19,
      "train_name": "KARNAVATI EXP",
      "train_number": "12933"
    },
    "... (8 more items)"
  ],
  "category_mix": {
    "MEMU": 395,
    "MEX": 646,
    "RAJ": 105,
    "SUF": 1445,
    "TOD": 213
  },
  "data_as_of": "2026-10-25",
  "definition": "Station delay metrics represent arrivals delayed > 15m with 95% Wilson score confidence intervals.",
  "delayed_rate": 25.28,
  "mean_delay": 22.52,
  "station_code": "BRC",
  "stops_count": 3222,
  "trains_count": 476,
  "wilson_lower": 23.7,
  "wilson_upper": 26.92
}
```

---

### `GET /api/patterns/hour` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data": [
    {
      "delayed_rate": 57.7,
      "hour": 0,
      "mean_delay_min": 49.08,
      "stops_count": 39906
    },
    {
      "delayed_rate": 60.57,
      "hour": 1,
      "mean_delay_min": 52.99,
      "stops_count": 33417
    },
    "... (22 more items)"
  ],
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
  "kind": "hour"
}
```

---

### `GET /api/patterns/dow` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data": [
    {
      "day_of_week": "Monday",
      "delayed_rate": 49.61,
      "mean_delay_min": 38.43,
      "stops_count": 204875
    },
    {
      "day_of_week": "Tuesday",
      "delayed_rate": 48.41,
      "mean_delay_min": 36.27,
      "stops_count": 202913
    },
    "... (5 more items)"
  ],
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
  "kind": "dow"
}
```

---

### `GET /api/patterns/category` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data": [
    {
      "category": "MEX",
      "delayed_rate": 57.02,
      "eligible_stops": 571895,
      "mean_delay_min": 39.41,
      "median_delay_min": 20.0,
      "total_stops": 680214
    },
    {
      "category": "SUB",
      "delayed_rate": 17.07,
      "eligible_stops": 313903,
      "mean_delay_min": 9.57,
      "median_delay_min": 6.0,
      "total_stops": 826844
    },
    "... (18 more items)"
  ],
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
  "kind": "category"
}
```

---

### `GET /api/patterns/position` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data": [
    {
      "delayed_rate": 26.31,
      "mean_delay_min": 18.3,
      "position_bucket": "Early (2-3)",
      "stops_count": 185293
    },
    {
      "delayed_rate": 44.32,
      "mean_delay_min": 28.09,
      "position_bucket": "Mid-Early (4-10)",
      "stops_count": 597242
    },
    "... (3 more items)"
  ],
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
  "kind": "position"
}
```

---

### `GET /api/patterns/hotspots` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "data": {
    "stations": {
      "min_support_threshold": 100,
      "top_hotspots": [
        {
          "delayed_count": 191,
          "delayed_rate": 100.0,
          "mean_delay": 171.61,
          "station_code": "BTL",
          "stops_count": 191,
          "wilson_lower": 98.03,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 188,
          "delayed_rate": 100.0,
          "mean_delay": 175.07,
          "station_code": "PJB",
          "stops_count": 188,
          "wilson_lower": 98.0,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 254,
          "delayed_rate": 99.61,
          "mean_delay": 117.76,
          "station_code": "SBD",
          "stops_count": 255,
          "wilson_lower": 97.81,
          "wilson_upper": 99.93
        },
        {
          "delayed_count": 241,
          "delayed_rate": 99.59,
          "mean_delay": 122.72,
          "station_code": "DDCE",
          "stops_count": 242,
          "wilson_lower": 97.7,
          "wilson_upper": 99.93
        },
        {
          "delayed_count": 368,
          "delayed_rate": 99.19,
          "mean_delay": 130.83,
          "station_code": "BMB",
          "stops_count": 371,
          "wilson_lower": 97.65,
          "wilson_upper": 99.72
        },
        {
          "delayed_count": 141,
          "delayed_rate": 100.0,
          "mean_delay": 136.6,
          "station_code": "WDG",
          "stops_count": 141,
          "wilson_lower": 97.35,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 139,
          "delayed_rate": 100.0,
          "mean_delay": 142.34,
          "station_code": "DEMU",
          "stops_count": 139,
          "wilson_lower": 97.31,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 138,
          "delayed_rate": 100.0,
          "mean_delay": 139.3,
          "station_code": "RCGT",
          "stops_count": 138,
          "wilson_lower": 97.29,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 136,
          "delayed_rate": 100.0,
          "mean_delay": 133.76,
          "station_code": "NVA",
          "stops_count": 136,
          "wilson_lower": 97.25,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 135,
          "delayed_rate": 100.0,
          "mean_delay": 170.47,
          "station_code": "BELD",
          "stops_count": 135,
          "wilson_lower": 97.23,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 134,
          "delayed_rate": 100.0,
          "mean_delay": 134.88,
          "station_code": "CTQ",
          "stops_count": 134,
          "wilson_lower": 97.21,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 251,
          "delayed_rate": 99.21,
          "mean_delay": 115.06,
          "station_code": "PMS",
          "stops_count": 253,
          "wilson_lower": 97.16,
          "wilson_upper": 99.78
        },
        {
          "delayed_count": 189,
          "delayed_rate": 99.47,
          "mean_delay": 172.0,
          "station_code": "DKS",
          "stops_count": 190,
          "wilson_lower": 97.08,
          "wilson_upper": 99.91
        },
        {
          "delayed_count": 127,
          "delayed_rate": 100.0,
          "mean_delay": 128.15,
          "station_code": "JDI",
          "stops_count": 127,
          "wilson_lower": 97.06,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 127,
          "delayed_rate": 100.0,
          "mean_delay": 124.21,
          "station_code": "BUU",
          "stops_count": 127,
          "wilson_lower": 97.06,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 184,
          "delayed_rate": 99.46,
          "mean_delay": 64.34,
          "station_code": "KIS",
          "stops_count": 185,
          "wilson_lower": 97.0,
          "wilson_upper": 99.9
        },
        {
          "delayed_count": 174,
          "delayed_rate": 99.43,
          "mean_delay": 119.4,
          "station_code": "GPH",
          "stops_count": 175,
          "wilson_lower": 96.83,
          "wilson_upper": 99.9
        },
        {
          "delayed_count": 171,
          "delayed_rate": 99.42,
          "mean_delay": 143.81,
          "station_code": "BHTN",
          "stops_count": 172,
          "wilson_lower": 96.78,
          "wilson_upper": 99.9
        },
        {
          "delayed_count": 248,
          "delayed_rate": 98.8,
          "mean_delay": 120.67,
          "station_code": "BAKL",
          "stops_count": 251,
          "wilson_lower": 96.55,
          "wilson_upper": 99.59
        },
        {
          "delayed_count": 105,
          "delayed_rate": 100.0,
          "mean_delay": 175.78,
          "station_code": "MKD",
          "stops_count": 105,
          "wilson_lower": 96.47,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 105,
          "delayed_rate": 100.0,
          "mean_delay": 181.91,
          "station_code": "GJ",
          "stops_count": 105,
          "wilson_lower": 96.47,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 104,
          "delayed_rate": 100.0,
          "mean_delay": 183.05,
          "station_code": "KWN",
          "stops_count": 104,
          "wilson_lower": 96.44,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 104,
          "delayed_rate": 100.0,
          "mean_delay": 176.59,
          "station_code": "TKYR",
          "stops_count": 104,
          "wilson_lower": 96.44,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 103,
          "delayed_rate": 100.0,
          "mean_delay": 179.37,
          "station_code": "MNU",
          "stops_count": 103,
          "wilson_lower": 96.4,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 236,
          "delayed_rate": 98.74,
          "mean_delay": 138.0,
          "station_code": "MOU",
          "stops_count": 239,
          "wilson_lower": 96.38,
          "wilson_upper": 99.57
        },
        {
          "delayed_count": 101,
          "delayed_rate": 100.0,
          "mean_delay": 144.87,
          "station_code": "GPC",
          "stops_count": 101,
          "wilson_lower": 96.34,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 147,
          "delayed_rate": 99.32,
          "mean_delay": 76.04,
          "station_code": "HDS",
          "stops_count": 148,
          "wilson_lower": 96.27,
          "wilson_upper": 99.88
        },
        {
          "delayed_count": 147,
          "delayed_rate": 99.32,
          "mean_delay": 68.24,
          "station_code": "BYY",
          "stops_count": 148,
          "wilson_lower": 96.27,
          "wilson_upper": 99.88
        },
        {
          "delayed_count": 186,
          "delayed_rate": 98.94,
          "mean_delay": 168.91,
          "station_code": "DNL",
          "stops_count": 188,
          "wilson_lower": 96.2,
          "wilson_upper": 99.71
        },
        {
          "delayed_count": 183,
          "delayed_rate": 98.92,
          "mean_delay": 74.3,
          "station_code": "JEN",
          "stops_count": 185,
          "wilson_lower": 96.14,
          "wilson_upper": 99.7
        },
        {
          "delayed_count": 140,
          "delayed_rate": 99.29,
          "mean_delay": 138.01,
          "station_code": "AJU",
          "stops_count": 141,
          "wilson_lower": 96.09,
          "wilson_upper": 99.87
        },
        {
          "delayed_count": 249,
          "delayed_rate": 98.42,
          "mean_delay": 123.88,
          "station_code": "MUA",
          "stops_count": 253,
          "wilson_lower": 96.01,
          "wilson_upper": 99.38
        },
        {
          "delayed_count": 137,
          "delayed_rate": 99.28,
          "mean_delay": 129.28,
          "station_code": "HNDR",
          "stops_count": 138,
          "wilson_lower": 96.01,
          "wilson_upper": 99.87
        },
        {
          "delayed_count": 315,
          "delayed_rate": 98.13,
          "mean_delay": 144.46,
          "station_code": "SKT",
          "stops_count": 321,
          "wilson_lower": 95.98,
          "wilson_upper": 99.14
        },
        {
          "delayed_count": 134,
          "delayed_rate": 99.26,
          "mean_delay": 130.3,
          "station_code": "KOLE",
          "stops_count": 135,
          "wilson_lower": 95.92,
          "wilson_upper": 99.87
        },
        {
          "delayed_count": 240,
          "delayed_rate": 98.36,
          "mean_delay": 187.02,
          "station_code": "SKS",
          "stops_count": 244,
          "wilson_lower": 95.86,
          "wilson_upper": 99.36
        },
        {
          "delayed_count": 239,
          "delayed_rate": 98.35,
          "mean_delay": 128.57,
          "station_code": "JTR",
          "stops_count": 243,
          "wilson_lower": 95.84,
          "wilson_upper": 99.36
        },
        {
          "delayed_count": 237,
          "delayed_rate": 98.34,
          "mean_delay": 160.9,
          "station_code": "BPH",
          "stops_count": 241,
          "wilson_lower": 95.81,
          "wilson_upper": 99.35
        },
        {
          "delayed_count": 130,
          "delayed_rate": 99.24,
          "mean_delay": 110.53,
          "station_code": "GMIA",
          "stops_count": 131,
          "wilson_lower": 95.8,
          "wilson_upper": 99.87
        },
        {
          "delayed_count": 466,
          "delayed_rate": 97.49,
          "mean_delay": 192.77,
          "station_code": "DGG",
          "stops_count": 478,
          "wilson_lower": 95.66,
          "wilson_upper": 98.56
        },
        {
          "delayed_count": 123,
          "delayed_rate": 99.19,
          "mean_delay": 114.19,
          "station_code": "PUS",
          "stops_count": 124,
          "wilson_lower": 95.57,
          "wilson_upper": 99.86
        },
        {
          "delayed_count": 247,
          "delayed_rate": 98.02,
          "mean_delay": 114.75,
          "station_code": "MUP",
          "stops_count": 252,
          "wilson_lower": 95.44,
          "wilson_upper": 99.15
        },
        {
          "delayed_count": 215,
          "delayed_rate": 98.17,
          "mean_delay": 110.07,
          "station_code": "MGME",
          "stops_count": 219,
          "wilson_lower": 95.4,
          "wilson_upper": 99.29
        },
        {
          "delayed_count": 184,
          "delayed_rate": 98.4,
          "mean_delay": 118.67,
          "station_code": "GUH",
          "stops_count": 187,
          "wilson_lower": 95.39,
          "wilson_upper": 99.45
        },
        {
          "delayed_count": 588,
          "delayed_rate": 96.87,
          "mean_delay": 166.25,
          "station_code": "RJN",
          "stops_count": 607,
          "wilson_lower": 95.16,
          "wilson_upper": 97.99
        },
        {
          "delayed_count": 112,
          "delayed_rate": 99.12,
          "mean_delay": 117.65,
          "station_code": "BRMO",
          "stops_count": 113,
          "wilson_lower": 95.16,
          "wilson_upper": 99.84
        },
        {
          "delayed_count": 304,
          "delayed_rate": 97.44,
          "mean_delay": 100.61,
          "station_code": "KLRE",
          "stops_count": 312,
          "wilson_lower": 95.02,
          "wilson_upper": 98.7
        },
        {
          "delayed_count": 225,
          "delayed_rate": 97.83,
          "mean_delay": 123.38,
          "station_code": "SCKR",
          "stops_count": 230,
          "wilson_lower": 95.01,
          "wilson_upper": 99.07
        },
        {
          "delayed_count": 169,
          "delayed_rate": 98.26,
          "mean_delay": 164.36,
          "station_code": "WSA",
          "stops_count": 172,
          "wilson_lower": 95.0,
          "wilson_upper": 99.41
        },
        {
          "delayed_count": 169,
          "delayed_rate": 98.26,
          "mean_delay": 136.21,
          "station_code": "BNE",
          "stops_count": 172,
          "wilson_lower": 95.0,
          "wilson_upper": 99.41
        }
      ],
      "top_punctual": [
        {
          "delayed_count": 1,
          "delayed_rate": 0.06,
          "mean_delay": 1.97,
          "station_code": "VLCY",
          "stops_count": 1653,
          "wilson_lower": 0.01,
          "wilson_upper": 0.34
        },
        {
          "delayed_count": 2,
          "delayed_rate": 0.12,
          "mean_delay": 3.08,
          "station_code": "MTMY",
          "stops_count": 1652,
          "wilson_lower": 0.03,
          "wilson_upper": 0.44
        },
        {
          "delayed_count": 2,
          "delayed_rate": 0.12,
          "mean_delay": 2.72,
          "station_code": "MCPK",
          "stops_count": 1651,
          "wilson_lower": 0.03,
          "wilson_upper": 0.44
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": -2.32,
          "station_code": "STMM",
          "stops_count": 827,
          "wilson_lower": 0.0,
          "wilson_upper": 0.46
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": -0.06,
          "station_code": "CG",
          "stops_count": 536,
          "wilson_lower": 0.0,
          "wilson_upper": 0.71
        },
        {
          "delayed_count": 32,
          "delayed_rate": 0.95,
          "mean_delay": 3.57,
          "station_code": "MKK",
          "stops_count": 3352,
          "wilson_lower": 0.68,
          "wilson_upper": 1.34
        },
        {
          "delayed_count": 5,
          "delayed_rate": 0.61,
          "mean_delay": 4.97,
          "station_code": "TLX",
          "stops_count": 822,
          "wilson_lower": 0.26,
          "wilson_upper": 1.42
        },
        {
          "delayed_count": 38,
          "delayed_rate": 1.13,
          "mean_delay": 3.66,
          "station_code": "PV",
          "stops_count": 3365,
          "wilson_lower": 0.82,
          "wilson_upper": 1.55
        },
        {
          "delayed_count": 47,
          "delayed_rate": 1.26,
          "mean_delay": 4.59,
          "station_code": "SPR",
          "stops_count": 3727,
          "wilson_lower": 0.95,
          "wilson_upper": 1.67
        },
        {
          "delayed_count": 43,
          "delayed_rate": 1.27,
          "mean_delay": 3.62,
          "station_code": "STM",
          "stops_count": 3396,
          "wilson_lower": 0.94,
          "wilson_upper": 1.7
        },
        {
          "delayed_count": 7,
          "delayed_rate": 0.88,
          "mean_delay": 1.92,
          "station_code": "LKPR",
          "stops_count": 799,
          "wilson_lower": 0.43,
          "wilson_upper": 1.8
        },
        {
          "delayed_count": 31,
          "delayed_rate": 1.32,
          "mean_delay": 3.94,
          "station_code": "BRP",
          "stops_count": 2348,
          "wilson_lower": 0.93,
          "wilson_upper": 1.87
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.35,
          "mean_delay": 1.6,
          "station_code": "PTD",
          "stops_count": 288,
          "wilson_lower": 0.06,
          "wilson_upper": 1.94
        },
        {
          "delayed_count": 3,
          "delayed_rate": 0.68,
          "mean_delay": 1.51,
          "station_code": "HNB",
          "stops_count": 441,
          "wilson_lower": 0.23,
          "wilson_upper": 1.98
        },
        {
          "delayed_count": 48,
          "delayed_rate": 1.53,
          "mean_delay": 1.49,
          "station_code": "MSB",
          "stops_count": 3146,
          "wilson_lower": 1.15,
          "wilson_upper": 2.02
        },
        {
          "delayed_count": 44,
          "delayed_rate": 1.66,
          "mean_delay": 4.39,
          "station_code": "BLN",
          "stops_count": 2643,
          "wilson_lower": 1.24,
          "wilson_upper": 2.23
        },
        {
          "delayed_count": 9,
          "delayed_rate": 1.21,
          "mean_delay": 5.73,
          "station_code": "NAI",
          "stops_count": 741,
          "wilson_lower": 0.64,
          "wilson_upper": 2.29
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.41,
          "mean_delay": 2.78,
          "station_code": "SPS",
          "stops_count": 241,
          "wilson_lower": 0.07,
          "wilson_upper": 2.31
        },
        {
          "delayed_count": 6,
          "delayed_rate": 1.08,
          "mean_delay": 1.88,
          "station_code": "DH",
          "stops_count": 556,
          "wilson_lower": 0.5,
          "wilson_upper": 2.33
        },
        {
          "delayed_count": 14,
          "delayed_rate": 1.49,
          "mean_delay": 5.63,
          "station_code": "GOF",
          "stops_count": 942,
          "wilson_lower": 0.89,
          "wilson_upper": 2.48
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": -14.17,
          "station_code": "CBY",
          "stops_count": 144,
          "wilson_lower": 0.0,
          "wilson_upper": 2.6
        },
        {
          "delayed_count": 17,
          "delayed_rate": 1.7,
          "mean_delay": 5.48,
          "station_code": "CHT",
          "stops_count": 1002,
          "wilson_lower": 1.06,
          "wilson_upper": 2.7
        },
        {
          "delayed_count": 6,
          "delayed_rate": 1.27,
          "mean_delay": 2.13,
          "station_code": "KBGB",
          "stops_count": 474,
          "wilson_lower": 0.58,
          "wilson_upper": 2.73
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.51,
          "mean_delay": 0.12,
          "station_code": "LOV",
          "stops_count": 198,
          "wilson_lower": 0.09,
          "wilson_upper": 2.8
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": -12.56,
          "station_code": "ASV",
          "stops_count": 126,
          "wilson_lower": 0.0,
          "wilson_upper": 2.96
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.54,
          "mean_delay": -0.03,
          "station_code": "KXT",
          "stops_count": 186,
          "wilson_lower": 0.09,
          "wilson_upper": 2.98
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.57,
          "mean_delay": 1.49,
          "station_code": "WEL",
          "stops_count": 175,
          "wilson_lower": 0.1,
          "wilson_upper": 3.17
        },
        {
          "delayed_count": 3,
          "delayed_rate": 1.09,
          "mean_delay": 0.96,
          "station_code": "PRES",
          "stops_count": 274,
          "wilson_lower": 0.37,
          "wilson_upper": 3.17
        },
        {
          "delayed_count": 91,
          "delayed_rate": 2.63,
          "mean_delay": 4.42,
          "station_code": "MPK",
          "stops_count": 3458,
          "wilson_lower": 2.15,
          "wilson_upper": 3.22
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.58,
          "mean_delay": 0.29,
          "station_code": "AVK",
          "stops_count": 172,
          "wilson_lower": 0.1,
          "wilson_upper": 3.22
        },
        {
          "delayed_count": 3,
          "delayed_rate": 1.2,
          "mean_delay": -10.96,
          "station_code": "HMT",
          "stops_count": 251,
          "wilson_lower": 0.41,
          "wilson_upper": 3.45
        },
        {
          "delayed_count": 48,
          "delayed_rate": 2.66,
          "mean_delay": 1.57,
          "station_code": "MASS",
          "stops_count": 1806,
          "wilson_lower": 2.01,
          "wilson_upper": 3.51
        },
        {
          "delayed_count": 3,
          "delayed_rate": 1.22,
          "mean_delay": 3.02,
          "station_code": "BCF",
          "stops_count": 245,
          "wilson_lower": 0.42,
          "wilson_upper": 3.54
        },
        {
          "delayed_count": 10,
          "delayed_rate": 2.01,
          "mean_delay": 6.37,
          "station_code": "KWDP",
          "stops_count": 498,
          "wilson_lower": 1.09,
          "wilson_upper": 3.66
        },
        {
          "delayed_count": 26,
          "delayed_rate": 2.56,
          "mean_delay": 1.58,
          "station_code": "BNJ",
          "stops_count": 1014,
          "wilson_lower": 1.76,
          "wilson_upper": 3.73
        },
        {
          "delayed_count": 4,
          "delayed_rate": 1.54,
          "mean_delay": 2.94,
          "station_code": "NMKA",
          "stops_count": 260,
          "wilson_lower": 0.6,
          "wilson_upper": 3.89
        },
        {
          "delayed_count": 4,
          "delayed_rate": 1.57,
          "mean_delay": -0.04,
          "station_code": "KLYM",
          "stops_count": 254,
          "wilson_lower": 0.61,
          "wilson_upper": 3.98
        },
        {
          "delayed_count": 17,
          "delayed_rate": 2.51,
          "mean_delay": 2.57,
          "station_code": "HYG",
          "stops_count": 677,
          "wilson_lower": 1.57,
          "wilson_upper": 3.98
        },
        {
          "delayed_count": 4,
          "delayed_rate": 1.62,
          "mean_delay": 3.1,
          "station_code": "NGX",
          "stops_count": 247,
          "wilson_lower": 0.63,
          "wilson_upper": 4.09
        },
        {
          "delayed_count": 28,
          "delayed_rate": 2.98,
          "mean_delay": 7.45,
          "station_code": "DPDP",
          "stops_count": 939,
          "wilson_lower": 2.07,
          "wilson_upper": 4.28
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.79,
          "mean_delay": -3.37,
          "station_code": "MTP",
          "stops_count": 127,
          "wilson_lower": 0.14,
          "wilson_upper": 4.33
        },
        {
          "delayed_count": 21,
          "delayed_rate": 2.92,
          "mean_delay": 5.26,
          "station_code": "MPN",
          "stops_count": 718,
          "wilson_lower": 1.92,
          "wilson_upper": 4.43
        },
        {
          "delayed_count": 11,
          "delayed_rate": 2.56,
          "mean_delay": 2.2,
          "station_code": "STB",
          "stops_count": 429,
          "wilson_lower": 1.44,
          "wilson_upper": 4.53
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.86,
          "mean_delay": -4.08,
          "station_code": "TCN",
          "stops_count": 116,
          "wilson_lower": 0.15,
          "wilson_upper": 4.72
        },
        {
          "delayed_count": 27,
          "delayed_rate": 3.4,
          "mean_delay": 6.92,
          "station_code": "AKRA",
          "stops_count": 793,
          "wilson_lower": 2.35,
          "wilson_upper": 4.91
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.92,
          "mean_delay": -4.6,
          "station_code": "ONR",
          "stops_count": 109,
          "wilson_lower": 0.16,
          "wilson_upper": 5.01
        },
        {
          "delayed_count": 26,
          "delayed_rate": 3.49,
          "mean_delay": 4.99,
          "station_code": "FLU",
          "stops_count": 746,
          "wilson_lower": 2.39,
          "wilson_upper": 5.06
        },
        {
          "delayed_count": 2,
          "delayed_rate": 1.43,
          "mean_delay": 5.59,
          "station_code": "KRUR",
          "stops_count": 140,
          "wilson_lower": 0.39,
          "wilson_upper": 5.06
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.94,
          "mean_delay": -1.91,
          "station_code": "ARPR",
          "stops_count": 106,
          "wilson_lower": 0.17,
          "wilson_upper": 5.15
        },
        {
          "delayed_count": 6,
          "delayed_rate": 2.41,
          "mean_delay": 2.62,
          "station_code": "BGNA",
          "stops_count": 249,
          "wilson_lower": 1.11,
          "wilson_upper": 5.16
        }
      ]
    },
    "trains": {
      "min_support_threshold": 50,
      "top_hotspots": [
        {
          "delayed_count": 674,
          "delayed_rate": 99.85,
          "mean_delay": 125.05,
          "stops_count": 675,
          "train_number": "17479",
          "wilson_lower": 99.17,
          "wilson_upper": 99.97
        },
        {
          "delayed_count": 622,
          "delayed_rate": 99.84,
          "mean_delay": 210.32,
          "stops_count": 623,
          "train_number": "58205",
          "wilson_lower": 99.1,
          "wilson_upper": 99.97
        },
        {
          "delayed_count": 386,
          "delayed_rate": 100.0,
          "mean_delay": 192.8,
          "stops_count": 386,
          "train_number": "54411",
          "wilson_lower": 99.01,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 874,
          "delayed_rate": 99.66,
          "mean_delay": 271.92,
          "stops_count": 877,
          "train_number": "12834",
          "wilson_lower": 99.0,
          "wilson_upper": 99.88
        },
        {
          "delayed_count": 375,
          "delayed_rate": 100.0,
          "mean_delay": 109.25,
          "stops_count": 375,
          "train_number": "64465",
          "wilson_lower": 98.99,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 351,
          "delayed_rate": 100.0,
          "mean_delay": 145.3,
          "stops_count": 351,
          "train_number": "64557",
          "wilson_lower": 98.92,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 513,
          "delayed_rate": 99.81,
          "mean_delay": 660.16,
          "stops_count": 514,
          "train_number": "12130",
          "wilson_lower": 98.91,
          "wilson_upper": 99.97
        },
        {
          "delayed_count": 639,
          "delayed_rate": 99.69,
          "mean_delay": 150.45,
          "stops_count": 641,
          "train_number": "55061",
          "wilson_lower": 98.87,
          "wilson_upper": 99.91
        },
        {
          "delayed_count": 334,
          "delayed_rate": 100.0,
          "mean_delay": 303.57,
          "stops_count": 334,
          "train_number": "14681",
          "wilson_lower": 98.86,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 325,
          "delayed_rate": 100.0,
          "mean_delay": 102.13,
          "stops_count": 325,
          "train_number": "68706",
          "wilson_lower": 98.83,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 593,
          "delayed_rate": 99.66,
          "mean_delay": 224.41,
          "stops_count": 595,
          "train_number": "55132",
          "wilson_lower": 98.78,
          "wilson_upper": 99.91
        },
        {
          "delayed_count": 292,
          "delayed_rate": 100.0,
          "mean_delay": 219.6,
          "stops_count": 292,
          "train_number": "68715",
          "wilson_lower": 98.7,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 290,
          "delayed_rate": 100.0,
          "mean_delay": 209.88,
          "stops_count": 290,
          "train_number": "68742",
          "wilson_lower": 98.69,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 423,
          "delayed_rate": 99.76,
          "mean_delay": 173.92,
          "stops_count": 424,
          "train_number": "54076",
          "wilson_lower": 98.68,
          "wilson_upper": 99.96
        },
        {
          "delayed_count": 284,
          "delayed_rate": 100.0,
          "mean_delay": 146.51,
          "stops_count": 284,
          "train_number": "68804",
          "wilson_lower": 98.67,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 285,
          "delayed_rate": 100.0,
          "mean_delay": 237.95,
          "stops_count": 285,
          "train_number": "68723",
          "wilson_lower": 98.67,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 280,
          "delayed_rate": 100.0,
          "mean_delay": 200.2,
          "stops_count": 280,
          "train_number": "68713",
          "wilson_lower": 98.65,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 280,
          "delayed_rate": 100.0,
          "mean_delay": 169.96,
          "stops_count": 280,
          "train_number": "68743",
          "wilson_lower": 98.65,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 415,
          "delayed_rate": 99.76,
          "mean_delay": 113.01,
          "stops_count": 416,
          "train_number": "63295",
          "wilson_lower": 98.65,
          "wilson_upper": 99.96
        },
        {
          "delayed_count": 273,
          "delayed_rate": 100.0,
          "mean_delay": 201.47,
          "stops_count": 273,
          "train_number": "68815",
          "wilson_lower": 98.61,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 271,
          "delayed_rate": 100.0,
          "mean_delay": 227.23,
          "stops_count": 271,
          "train_number": "68816",
          "wilson_lower": 98.6,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 263,
          "delayed_rate": 100.0,
          "mean_delay": 120.82,
          "stops_count": 263,
          "train_number": "64931",
          "wilson_lower": 98.56,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 261,
          "delayed_rate": 100.0,
          "mean_delay": 155.0,
          "stops_count": 261,
          "train_number": "64102",
          "wilson_lower": 98.55,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 260,
          "delayed_rate": 100.0,
          "mean_delay": 213.54,
          "stops_count": 260,
          "train_number": "63230",
          "wilson_lower": 98.54,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 377,
          "delayed_rate": 99.74,
          "mean_delay": 157.73,
          "stops_count": 378,
          "train_number": "53612",
          "wilson_lower": 98.52,
          "wilson_upper": 99.95
        },
        {
          "delayed_count": 251,
          "delayed_rate": 100.0,
          "mean_delay": 148.65,
          "stops_count": 251,
          "train_number": "51886",
          "wilson_lower": 98.49,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 251,
          "delayed_rate": 100.0,
          "mean_delay": 308.53,
          "stops_count": 251,
          "train_number": "68716",
          "wilson_lower": 98.49,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 233,
          "delayed_rate": 100.0,
          "mean_delay": 238.73,
          "stops_count": 233,
          "train_number": "68730",
          "wilson_lower": 98.38,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 442,
          "delayed_rate": 99.55,
          "mean_delay": 266.09,
          "stops_count": 444,
          "train_number": "18109",
          "wilson_lower": 98.37,
          "wilson_upper": 99.88
        },
        {
          "delayed_count": 228,
          "delayed_rate": 100.0,
          "mean_delay": 107.24,
          "stops_count": 228,
          "train_number": "74024",
          "wilson_lower": 98.34,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 225,
          "delayed_rate": 100.0,
          "mean_delay": 539.58,
          "stops_count": 225,
          "train_number": "04051",
          "wilson_lower": 98.32,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 222,
          "delayed_rate": 100.0,
          "mean_delay": 203.62,
          "stops_count": 222,
          "train_number": "68737",
          "wilson_lower": 98.3,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 220,
          "delayed_rate": 100.0,
          "mean_delay": 170.42,
          "stops_count": 220,
          "train_number": "68738",
          "wilson_lower": 98.28,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 325,
          "delayed_rate": 99.69,
          "mean_delay": 186.75,
          "stops_count": 326,
          "train_number": "64454",
          "wilson_lower": 98.28,
          "wilson_upper": 99.95
        },
        {
          "delayed_count": 215,
          "delayed_rate": 100.0,
          "mean_delay": 234.31,
          "stops_count": 215,
          "train_number": "64453",
          "wilson_lower": 98.24,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 205,
          "delayed_rate": 100.0,
          "mean_delay": 188.54,
          "stops_count": 205,
          "train_number": "22647",
          "wilson_lower": 98.16,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 300,
          "delayed_rate": 99.67,
          "mean_delay": 401.18,
          "stops_count": 301,
          "train_number": "04097",
          "wilson_lower": 98.14,
          "wilson_upper": 99.94
        },
        {
          "delayed_count": 203,
          "delayed_rate": 100.0,
          "mean_delay": 112.71,
          "stops_count": 203,
          "train_number": "63255",
          "wilson_lower": 98.14,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 202,
          "delayed_rate": 100.0,
          "mean_delay": 131.53,
          "stops_count": 202,
          "train_number": "54417",
          "wilson_lower": 98.13,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 201,
          "delayed_rate": 100.0,
          "mean_delay": 113.54,
          "stops_count": 201,
          "train_number": "74002",
          "wilson_lower": 98.12,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 198,
          "delayed_rate": 100.0,
          "mean_delay": 165.03,
          "stops_count": 198,
          "train_number": "22840",
          "wilson_lower": 98.1,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 454,
          "delayed_rate": 99.34,
          "mean_delay": 88.79,
          "stops_count": 457,
          "train_number": "54035",
          "wilson_lower": 98.09,
          "wilson_upper": 99.78
        },
        {
          "delayed_count": 195,
          "delayed_rate": 100.0,
          "mean_delay": 142.04,
          "stops_count": 195,
          "train_number": "61619",
          "wilson_lower": 98.07,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 444,
          "delayed_rate": 99.33,
          "mean_delay": 139.04,
          "stops_count": 447,
          "train_number": "63231",
          "wilson_lower": 98.05,
          "wilson_upper": 99.77
        },
        {
          "delayed_count": 188,
          "delayed_rate": 100.0,
          "mean_delay": 147.23,
          "stops_count": 188,
          "train_number": "54420",
          "wilson_lower": 98.0,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 188,
          "delayed_rate": 100.0,
          "mean_delay": 205.51,
          "stops_count": 188,
          "train_number": "55073",
          "wilson_lower": 98.0,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 630,
          "delayed_rate": 99.06,
          "mean_delay": 126.45,
          "stops_count": 636,
          "train_number": "53348",
          "wilson_lower": 97.96,
          "wilson_upper": 99.57
        },
        {
          "delayed_count": 424,
          "delayed_rate": 99.3,
          "mean_delay": 292.44,
          "stops_count": 427,
          "train_number": "12860",
          "wilson_lower": 97.95,
          "wilson_upper": 99.76
        },
        {
          "delayed_count": 182,
          "delayed_rate": 100.0,
          "mean_delay": 118.6,
          "stops_count": 182,
          "train_number": "68411",
          "wilson_lower": 97.93,
          "wilson_upper": 100.0
        },
        {
          "delayed_count": 181,
          "delayed_rate": 100.0,
          "mean_delay": 489.82,
          "stops_count": 181,
          "train_number": "01144",
          "wilson_lower": 97.92,
          "wilson_upper": 100.0
        }
      ],
      "top_punctual": [
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": -0.52,
          "stops_count": 458,
          "train_number": "63176",
          "wilson_lower": 0.0,
          "wilson_upper": 0.83
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.67,
          "stops_count": 343,
          "train_number": "31768",
          "wilson_lower": 0.0,
          "wilson_upper": 1.11
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.78,
          "stops_count": 275,
          "train_number": "66308",
          "wilson_lower": 0.0,
          "wilson_upper": 1.38
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.93,
          "stops_count": 243,
          "train_number": "37750",
          "wilson_lower": 0.0,
          "wilson_upper": 1.56
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.04,
          "stops_count": 232,
          "train_number": "37746",
          "wilson_lower": 0.0,
          "wilson_upper": 1.63
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 0.44,
          "stops_count": 226,
          "train_number": "37320",
          "wilson_lower": 0.0,
          "wilson_upper": 1.67
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.56,
          "stops_count": 225,
          "train_number": "37340",
          "wilson_lower": 0.0,
          "wilson_upper": 1.68
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.3,
          "mean_delay": 3.77,
          "stops_count": 332,
          "train_number": "31773",
          "wilson_lower": 0.05,
          "wilson_upper": 1.69
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.0,
          "stops_count": 222,
          "train_number": "37358",
          "wilson_lower": 0.0,
          "wilson_upper": 1.7
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.8,
          "stops_count": 219,
          "train_number": "37336",
          "wilson_lower": 0.0,
          "wilson_upper": 1.72
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.71,
          "stops_count": 219,
          "train_number": "37326",
          "wilson_lower": 0.0,
          "wilson_upper": 1.72
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.42,
          "stops_count": 218,
          "train_number": "37334",
          "wilson_lower": 0.0,
          "wilson_upper": 1.73
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 5.18,
          "stops_count": 217,
          "train_number": "37351",
          "wilson_lower": 0.0,
          "wilson_upper": 1.74
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 4.45,
          "stops_count": 214,
          "train_number": "40702",
          "wilson_lower": 0.0,
          "wilson_upper": 1.76
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 6.41,
          "stops_count": 214,
          "train_number": "37228",
          "wilson_lower": 0.0,
          "wilson_upper": 1.76
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 4.97,
          "stops_count": 213,
          "train_number": "33824",
          "wilson_lower": 0.0,
          "wilson_upper": 1.77
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 5.09,
          "stops_count": 212,
          "train_number": "37216",
          "wilson_lower": 0.0,
          "wilson_upper": 1.78
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 5.07,
          "stops_count": 211,
          "train_number": "33830",
          "wilson_lower": 0.0,
          "wilson_upper": 1.79
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.46,
          "stops_count": 210,
          "train_number": "37758",
          "wilson_lower": 0.0,
          "wilson_upper": 1.8
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 4.82,
          "stops_count": 209,
          "train_number": "33820",
          "wilson_lower": 0.0,
          "wilson_upper": 1.8
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.86,
          "stops_count": 210,
          "train_number": "33819",
          "wilson_lower": 0.0,
          "wilson_upper": 1.8
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.65,
          "stops_count": 209,
          "train_number": "31813",
          "wilson_lower": 0.0,
          "wilson_upper": 1.8
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.0,
          "stops_count": 208,
          "train_number": "37332",
          "wilson_lower": 0.0,
          "wilson_upper": 1.81
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.67,
          "stops_count": 204,
          "train_number": "76819",
          "wilson_lower": 0.0,
          "wilson_upper": 1.85
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.33,
          "stops_count": 200,
          "train_number": "33812",
          "wilson_lower": 0.0,
          "wilson_upper": 1.88
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 4.96,
          "stops_count": 197,
          "train_number": "33762",
          "wilson_lower": 0.0,
          "wilson_upper": 1.91
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.35,
          "mean_delay": 6.53,
          "stops_count": 285,
          "train_number": "31616",
          "wilson_lower": 0.06,
          "wilson_upper": 1.96
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.68,
          "stops_count": 184,
          "train_number": "37304",
          "wilson_lower": 0.0,
          "wilson_upper": 2.05
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.9,
          "stops_count": 183,
          "train_number": "31331",
          "wilson_lower": 0.0,
          "wilson_upper": 2.06
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.47,
          "stops_count": 182,
          "train_number": "33518",
          "wilson_lower": 0.0,
          "wilson_upper": 2.07
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.65,
          "stops_count": 181,
          "train_number": "31313",
          "wilson_lower": 0.0,
          "wilson_upper": 2.08
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.07,
          "stops_count": 180,
          "train_number": "31317",
          "wilson_lower": 0.0,
          "wilson_upper": 2.09
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.52,
          "stops_count": 180,
          "train_number": "33522",
          "wilson_lower": 0.0,
          "wilson_upper": 2.09
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.98,
          "stops_count": 179,
          "train_number": "31329",
          "wilson_lower": 0.0,
          "wilson_upper": 2.1
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 4.54,
          "stops_count": 178,
          "train_number": "40546",
          "wilson_lower": 0.0,
          "wilson_upper": 2.11
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.06,
          "stops_count": 178,
          "train_number": "33520",
          "wilson_lower": 0.0,
          "wilson_upper": 2.11
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.35,
          "stops_count": 178,
          "train_number": "33528",
          "wilson_lower": 0.0,
          "wilson_upper": 2.11
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.73,
          "stops_count": 178,
          "train_number": "53005",
          "wilson_lower": 0.0,
          "wilson_upper": 2.11
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.34,
          "stops_count": 177,
          "train_number": "53017",
          "wilson_lower": 0.0,
          "wilson_upper": 2.12
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.46,
          "stops_count": 177,
          "train_number": "40516",
          "wilson_lower": 0.0,
          "wilson_upper": 2.12
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.78,
          "stops_count": 176,
          "train_number": "40510",
          "wilson_lower": 0.0,
          "wilson_upper": 2.14
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.21,
          "stops_count": 175,
          "train_number": "34795",
          "wilson_lower": 0.0,
          "wilson_upper": 2.15
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.26,
          "stops_count": 175,
          "train_number": "34791",
          "wilson_lower": 0.0,
          "wilson_upper": 2.15
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 2.94,
          "stops_count": 174,
          "train_number": "33514",
          "wilson_lower": 0.0,
          "wilson_upper": 2.16
        },
        {
          "delayed_count": 1,
          "delayed_rate": 0.4,
          "mean_delay": 4.06,
          "stops_count": 252,
          "train_number": "31861",
          "wilson_lower": 0.07,
          "wilson_upper": 2.21
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.24,
          "stops_count": 170,
          "train_number": "40512",
          "wilson_lower": 0.0,
          "wilson_upper": 2.21
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.86,
          "stops_count": 168,
          "train_number": "33682",
          "wilson_lower": 0.0,
          "wilson_upper": 2.24
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 4.0,
          "stops_count": 168,
          "train_number": "33538",
          "wilson_lower": 0.0,
          "wilson_upper": 2.24
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 1.65,
          "stops_count": 168,
          "train_number": "40505",
          "wilson_lower": 0.0,
          "wilson_upper": 2.24
        },
        {
          "delayed_count": 0,
          "delayed_rate": 0.0,
          "mean_delay": 3.13,
          "stops_count": 167,
          "train_number": "53009",
          "wilson_lower": 0.0,
          "wilson_upper": 2.25
        }
      ]
    }
  },
  "data_as_of": "2026-10-25",
  "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
  "kind": "hotspots"
}
```

---

### `GET /api/model/info` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "architecture": "LightGBM Gradient Boosted Decision Trees + Isotonic Regression",
  "calibration": {
    "method": "Isotonic Regression (sklearn.isotonic.IsotonicRegression)",
    "test_brier_score": 0.1536,
    "training_split": "Validation Split (2026-10-21 to 2026-10-22)",
    "validation_ece_reduction": "0.0307 -> 0.0093"
  },
  "data_as_of": "2026-10-25",
  "features": {
    "banned_leaky_features": [
      "actual_arrival",
      "actual_departure",
      "departure_delay_min",
      "arrival_reported",
      "status",
      "run_quality"
    ],
    "feature_names": [
      "scheduled_hour",
      "sin_hour",
      "cos_hour",
      "day_of_week",
      "sin_dow",
      "cos_dow",
      "is_weekend",
      "is_night",
      "seq",
      "log_seq",
      "is_origin_adjacent",
      "is_deep_journey",
      "cat_SUB",
      "cat_MEX",
      "cat_SUF",
      "cat_PAS",
      "cat_MEMU",
      "cat_DMU",
      "cat_VNDB",
      "cat_SHT",
      "cat_TOD",
      "cat_OTHER",
      "category_prior_rate",
      "category_prior_mean",
      "train_hist_delay_rate",
      "train_hist_mean_delay",
      "station_hist_delay_rate",
      "station_hist_mean_delay"
    ],
    "total_features": 28
  },
  "latency": {
    "measured_single_prediction_ms": 2.1,
    "target_p95_ms": 15.0
  },
  "model_name": "RailSense Delay Predictor (LightGBM + Isotonic Calibration)",
  "operational_thresholds": {
    "balanced_f1_threshold": 0.41,
    "default_threshold": 0.5,
    "note": "Calibrated probabilities reflect true historical empirical frequencies. The 0.410 threshold maximizes F1 score (0.7782 on untouched test split).",
    "recall_80_threshold": 0.455
  },
  "split_design": {
    "censored_partition": "2026-10-25 (excluded from evaluation due to 23:08 IST right-censoring)",
    "protocol": "Strict temporal causal ordering (no random cross-validation)",
    "test_partition": "2026-10-23 to 2026-10-24 (2 days, ~194k stops)",
    "train_partition": "2026-10-08 to 2026-10-20 (13 days, ~1.3M stops)",
    "validation_partition": "2026-10-21 to 2026-10-22 (2 days, ~200k stops)",
    "warmup_partition": "2026-10-07 (used strictly for rolling historical lag population)"
  },
  "target": {
    "definition": "arrival_delay_min > 15 minutes",
    "eligibility": "seq > 1 AND arrival_reported == 1 AND NOT extreme_outlier",
    "name": "delayed",
    "positive_prevalence_test": 0.492,
    "positive_prevalence_train": 0.499
  },
  "task_type": "binary_classification",
  "version": "1.0.0"
}
```

---

### `GET /api/model/metrics` (Status: 200)

**Response Top-Level Structure / Schema:**
```json
{
  "curves": {
    "calibration_reliability": [
      {
        "bin_mid": 0.05,
        "observed_frequency": 0.049,
        "predicted_prob": 0.034,
        "samples_count": 32993
      },
      {
        "bin_mid": 0.15,
        "observed_frequency": 0.169,
        "predicted_prob": 0.15,
        "samples_count": 19598
      },
      {
        "bin_mid": 0.25,
        "observed_frequency": 0.298,
        "predicted_prob": 0.258,
        "samples_count": 21165
      },
      {
        "bin_mid": 0.35,
        "observed_frequency": 0.41,
        "predicted_prob": 0.372,
        "samples_count": 14461
      },
      {
        "bin_mid": 0.45,
        "observed_frequency": 0.486,
        "predicted_prob": 0.45,
        "samples_count": 14690
      },
      {
        "bin_mid": 0.55,
        "observed_frequency": 0.559,
        "predicted_prob": 0.517,
        "samples_count": 8842
      },
      {
        "bin_mid": 0.65,
        "observed_frequency": 0.653,
        "predicted_prob": 0.641,
        "samples_count": 23466
      },
      {
        "bin_mid": 0.75,
        "observed_frequency": 0.773,
        "predicted_prob": 0.758,
        "samples_count": 20977
      },
      {
        "bin_mid": 0.85,
        "observed_frequency": 0.876,
        "predicted_prob": 0.867,
        "samples_count": 19998
      },
      {
        "bin_mid": 0.95,
        "observed_frequency": 0.965,
        "predicted_prob": 0.954,
        "samples_count": 17775
      }
    ],
    "precision_recall": [
      {
        "precision": 0.492,
        "recall": 1.0
      },
      {
        "precision": 0.495,
        "recall": 1.0
      },
      {
        "precision": 0.53,
        "recall": 0.997
      },
      {
        "precision": 0.53,
        "recall": 0.997
      },
      {
        "precision": 0.539,
        "recall": 0.996
      },
      {
        "precision": 0.541,
        "recall": 0.995
      },
      {
        "precision": 0.557,
        "recall": 0.992
      },
      {
        "precision": 0.57,
        "recall": 0.988
      },
      {
        "precision": 0.571,
        "recall": 0.988
      },
      {
        "precision": 0.573,
        "recall": 0.987
      },
      {
        "precision": 0.581,
        "recall": 0.984
      },
      {
        "precision": 0.581,
        "recall": 0.984
      },
      {
        "precision": 0.592,
        "recall": 0.979
      },
      {
        "precision": 0.602,
        "recall": 0.974
      },
      {
        "precision": 0.602,
        "recall": 0.974
      },
      {
        "precision": 0.627,
        "recall": 0.958
      },
      {
        "precision": 0.63,
        "recall": 0.956
      },
      {
        "precision": 0.63,
        "recall": 0.956
      },
      {
        "precision": 0.631,
        "recall": 0.956
      },
      {
        "precision": 0.659,
        "recall": 0.932
      },
      {
        "precision": 0.677,
        "recall": 0.913
      },
      {
        "precision": 0.681,
        "recall": 0.908
      },
      {
        "precision": 0.681,
        "recall": 0.908
      },
      {
        "precision": 0.685,
        "recall": 0.903
      },
      {
        "precision": 0.701,
        "recall": 0.882
      },
      {
        "precision": 0.708,
        "recall": 0.872
      },
      {
        "precision": 0.717,
        "recall": 0.859
      },
      {
        "precision": 0.74,
        "recall": 0.82
      },
      {
        "precision": 0.748,
        "recall": 0.807
      },
      {
        "precision": 0.756,
        "recall": 0.793
      },
      {
        "precision": 0.781,
        "recall": 0.746
      },
      {
        "precision": 0.789,
        "recall": 0.729
      },
      {
        "precision": 0.797,
        "recall": 0.711
      },
      {
        "precision": 0.816,
        "recall": 0.668
      },
      {
        "precision": 0.816,
        "recall": 0.668
      },
      {
        "precision": 0.816,
        "recall": 0.668
      },
      {
        "precision": 0.848,
        "recall": 0.584
      },
      {
        "precision": 0.848,
        "recall": 0.584
      },
      {
        "precision": 0.86,
        "recall": 0.55
      },
      {
        "precision": 0.873,
        "recall": 0.513
      },
      {
        "precision": 0.873,
        "recall": 0.513
      },
      {
        "precision": 0.873,
        "recall": 0.513
      },
      {
        "precision": 0.874,
        "recall": 0.51
      },
      {
        "precision": 0.885,
        "recall": 0.478
      },
      {
        "precision": 0.918,
        "recall": 0.363
      },
      {
        "precision": 0.918,
        "recall": 0.362
      },
      {
        "precision": 0.923,
        "recall": 0.343
      },
      {
        "precision": 0.924,
        "recall": 0.34
      },
      {
        "precision": 0.924,
        "recall": 0.34
      },
      {
        "precision": 0.943,
        "recall": 0.269
      },
      {
        "precision": 0.946,
        "recall": 0.256
      },
      {
        "precision": 0.946,
        "recall": 0.256
      },
      {
        "precision": 0.959,
        "recall": 0.2
      },
      {
        "precision": 0.965,
        "recall": 0.176
      },
      {
        "precision": 0.97,
        "recall": 0.152
      },
      {
        "precision": 0.975,
        "recall": 0.129
      },
      {
        "precision": 0.98,
        "recall": 0.084
      },
      {
        "precision": 0.982,
        "recall": 0.061
      },
      {
        "precision": 0.996,
        "recall": 0.018
      },
      {
        "precision": 1.0,
        "recall": 0.0
      }
    ],
    "roc": [
      {
        "fpr": 0.0,
        "tpr": 0.0
      },
      {
        "fpr": 0.0,
        "tpr": 0.018
      },
      {
        "fpr": 0.001,
        "tpr": 0.04
      },
      {
        "fpr": 0.002,
        "tpr": 0.083
      },
      {
        "fpr": 0.002,
        "tpr": 0.09
      },
      {
        "fpr": 0.005,
        "tpr": 0.152
      },
      {
        "fpr": 0.006,
        "tpr": 0.176
      },
      {
        "fpr": 0.006,
        "tpr": 0.18
      },
      {
        "fpr": 0.008,
        "tpr": 0.2
      },
      {
        "fpr": 0.014,
        "tpr": 0.256
      },
      {
        "fpr": 0.016,
        "tpr": 0.269
      },
      {
        "fpr": 0.025,
        "tpr": 0.331
      },
      {
        "fpr": 0.027,
        "tpr": 0.34
      },
      {
        "fpr": 0.028,
        "tpr": 0.343
      },
      {
        "fpr": 0.028,
        "tpr": 0.343
      },
      {
        "fpr": 0.031,
        "tpr": 0.362
      },
      {
        "fpr": 0.034,
        "tpr": 0.376
      },
      {
        "fpr": 0.06,
        "tpr": 0.478
      },
      {
        "fpr": 0.071,
        "tpr": 0.51
      },
      {
        "fpr": 0.072,
        "tpr": 0.513
      },
      {
        "fpr": 0.072,
        "tpr": 0.513
      },
      {
        "fpr": 0.072,
        "tpr": 0.513
      },
      {
        "fpr": 0.08,
        "tpr": 0.533
      },
      {
        "fpr": 0.08,
        "tpr": 0.533
      },
      {
        "fpr": 0.101,
        "tpr": 0.584
      },
      {
        "fpr": 0.101,
        "tpr": 0.584
      },
      {
        "fpr": 0.126,
        "tpr": 0.634
      },
      {
        "fpr": 0.146,
        "tpr": 0.668
      },
      {
        "fpr": 0.146,
        "tpr": 0.668
      },
      {
        "fpr": 0.176,
        "tpr": 0.711
      },
      {
        "fpr": 0.189,
        "tpr": 0.729
      },
      {
        "fpr": 0.202,
        "tpr": 0.746
      },
      {
        "fpr": 0.204,
        "tpr": 0.748
      },
      {
        "fpr": 0.248,
        "tpr": 0.793
      },
      {
        "fpr": 0.264,
        "tpr": 0.807
      },
      {
        "fpr": 0.279,
        "tpr": 0.82
      },
      {
        "fpr": 0.307,
        "tpr": 0.843
      },
      {
        "fpr": 0.329,
        "tpr": 0.859
      },
      {
        "fpr": 0.348,
        "tpr": 0.872
      },
      {
        "fpr": 0.365,
        "tpr": 0.882
      },
      {
        "fpr": 0.403,
        "tpr": 0.903
      },
      {
        "fpr": 0.412,
        "tpr": 0.908
      },
      {
        "fpr": 0.412,
        "tpr": 0.908
      },
      {
        "fpr": 0.422,
        "tpr": 0.913
      },
      {
        "fpr": 0.46,
        "tpr": 0.929
      },
      {
        "fpr": 0.488,
        "tpr": 0.939
      },
      {
        "fpr": 0.542,
        "tpr": 0.956
      },
      {
        "fpr": 0.543,
        "tpr": 0.956
      },
      {
        "fpr": 0.544,
        "tpr": 0.956
      },
      {
        "fpr": 0.625,
        "tpr": 0.974
      },
      {
        "fpr": 0.649,
        "tpr": 0.979
      },
      {
        "fpr": 0.682,
        "tpr": 0.983
      },
      {
        "fpr": 0.702,
        "tpr": 0.986
      },
      {
        "fpr": 0.72,
        "tpr": 0.988
      },
      {
        "fpr": 0.721,
        "tpr": 0.988
      },
      {
        "fpr": 0.764,
        "tpr": 0.992
      },
      {
        "fpr": 0.818,
        "tpr": 0.995
      },
      {
        "fpr": 0.856,
        "tpr": 0.997
      },
      {
        "fpr": 0.928,
        "tpr": 0.999
      },
      {
        "fpr": 1.0,
        "tpr": 1.0
      }
    ]
  },
  "feature_importance": [
    {
      "feature": "train_hist_delay_rate",
      "importance_gain": 803004.295922721,
      "importance_split": 2664
    },
    {
      "feature": "train_hist_mean_delay",
      "importance_gain": 244572.41275245656,
      "importance_split": 2466
    },
    "... (13 more items)"
  ],
  "final_test_metrics": {
    "brier_score": 0.1529,
    "confusion_matrix": {
      "fn": 17037,
      "fp": 27248,
      "tn": 71289,
      "tp": 78391
    },
    "ece": 0.0183,
    "f1_macro": 0.7714,
    "f1_positive": 0.7798,
    "pr_auc": 0.8525,
    "precision": 0.7421,
    "precision_at_recall_80": 0.7476,
    "recall": 0.8215,
    "roc_auc": 0.8602,
    "threshold": 0.42
  },
  "lifts": {
    "lift_over_category_pct": 42.03,
    "lift_over_history_pct": 4.95,
    "lift_over_majority_pct": 72.4
  },
  "model_comparison": {
    "Category Prior": {
      "ap_test": 0.5972,
      "ap_val": 0.5892,
      "roc_test": 0.6539,
      "roc_val": 0.6495
    },
    "En-Route LightGBM": {
      "ap_test": 0.9289,
      "ap_val": 0.9324,
      "roc_test": 0.9272,
      "roc_val": 0.9318
    },
    "LightGBM (Calibrated)": {
      "ap_test": 0.8482,
      "ap_val": 0.8608,
      "roc_test": 0.8592,
      "roc_val": 0.8722
    },
    "LightGBM (Raw)": {
      "ap_test": 0.8529,
      "ap_val": 0.8657,
      "roc_test": 0.8594,
      "roc_val": 0.8724
    },
    "Majority Baseline": {
      "ap_test": 0.492,
      "ap_val": 0.4851,
      "roc_test": 0.5,
      "roc_val": 0.5
    },
    "Train Historical Prior": {
      "ap_test": 0.8082,
      "ap_val": 0.8245,
      "roc_test": 0.8206,
      "roc_val": 0.8376
    }
  },
  "model_metadata": {
    "algorithm": "LightGBM Gradient Boosted Decision Trees + Isotonic Regression",
    "banned_features": [
      "actual_arrival",
      "actual_departure",
      "departure_delay_min",
      "arrival_reported",
      "status",
      "run_quality"
    ],
    "best_iteration": 298,
    "features_count": 28,
    "model_name": "RailSense Delay Predictor (LightGBM + Isotonic Calibration)",
    "recall80_threshold": 0.45499999999999996,
    "threshold": 0.41000000000000003,
    "version": "1.0.0"
  },
  "per_category_test": {
    "AMTB": {
      "count": 690,
      "f1": 0.7921,
      "pr_auc": 0.8267,
      "precision": 0.7605,
      "prevalence": 0.6681,
      "recall": 0.8265
    },
    "DMU": {
      "count": 9031,
      "f1": 0.7656,
      "pr_auc": 0.8371,
      "precision": 0.7297,
      "prevalence": 0.5007,
      "recall": 0.8052
    },
    "DRNT": {
      "count": 168,
      "f1": 0.7174,
      "pr_auc": 0.7804,
      "precision": 0.6535,
      "prevalence": 0.494,
      "recall": 0.7952
    },
    "EMU": {
      "count": 1454,
      "f1": 0.8871,
      "pr_auc": 0.9544,
      "precision": 0.805,
      "prevalence": 0.7414,
      "recall": 0.9879
    },
    "GBR": {
      "count": 465,
      "f1": 0.7761,
      "pr_auc": 0.8724,
      "precision": 0.7376,
      "prevalence": 0.5462,
      "recall": 0.8189
    },
    "JSH": {
      "count": 1052,
      "f1": 0.7275,
      "pr_auc": 0.7783,
      "precision": 0.7132,
      "prevalence": 0.4648,
      "recall": 0.7423
    },
    "MEMU": {
      "count": 28151,
      "f1": 0.8301,
      "pr_auc": 0.9055,
      "precision": 0.795,
      "prevalence": 0.5978,
      "recall": 0.8684
    },
    "MEX": {
      "count": 61066,
      "f1": 0.7717,
      "pr_auc": 0.8251,
      "precision": 0.7183,
      "prevalence": 0.5646,
      "recall": 0.8336
    },
    "PAS": {
      "count": 27044,
      "f1": 0.8165,
      "pr_auc": 0.8972,
      "precision": 0.7845,
      "prevalence": 0.5656,
      "recall": 0.8513
    },
    "PEXP": {
      "count": 27,
      "f1": 0.7879,
      "pr_auc": 0.8519,
      "precision": 0.6842,
      "prevalence": 0.5185,
      "recall": 0.9286
    },
    "RAJ": {
      "count": 543,
      "f1": 0.5875,
      "pr_auc": 0.6028,
      "precision": 0.59,
      "prevalence": 0.4438,
      "recall": 0.5851
    },
    "SHT": {
      "count": 516,
      "f1": 0.542,
      "pr_auc": 0.6613,
      "precision": 0.6574,
      "prevalence": 0.2984,
      "recall": 0.461
    },
    "SUB": {
      "count": 35856,
      "f1": 0.5357,
      "pr_auc": 0.5774,
      "precision": 0.5827,
      "prevalence": 0.1496,
      "recall": 0.4957
    },
    "SUF": {
      "count": 21637,
      "f1": 0.7656,
      "pr_auc": 0.8239,
      "precision": 0.7186,
      "prevalence": 0.5697,
      "recall": 0.8192
    },
    "TEJ": {
      "count": 90,
      "f1": 0.7164,
      "pr_auc": 0.6314,
      "precision": 0.7742,
      "prevalence": 0.4,
      "recall": 0.6667
    },
    "TOD": {
      "count": 3988,
      "f1": 0.898,
      "pr_auc": 0.9491,
      "precision": 0.8581,
      "prevalence": 0.7826,
      "recall": 0.9417
    },
    "TRST": {
      "count": 4,
      "f1": 0.0,
      "pr_auc": 0.125,
      "precision": 0.0,
      "prevalence": 0.25,
      "recall": 0.0
    },
    "VNDB": {
      "count": 2069,
      "f1": 0.5884,
      "pr_auc": 0.6856,
      "precision": 0.6853,
      "prevalence": 0.3103,
      "recall": 0.5156
    },
    "VNDM": {
      "count": 63,
      "f1": 0.6383,
      "pr_auc": 0.735,
      "precision": 0.7143,
      "prevalence": 0.4127,
      "recall": 0.5769
    },
    "VNDS": {
      "count": 51,
      "f1": 0.0,
      "pr_auc": 0.6508,
      "precision": 0.0,
      "prevalence": 0.2745,
      "recall": 0.0
    }
  },
  "per_position_test": {
    "Deep (>50)": {
      "count": 2756,
      "f1": 0.8715,
      "pr_auc": 0.9213,
      "precision": 0.7984,
      "prevalence": 0.7388,
      "recall": 0.9592
    },
    "Early (2-3)": {
      "count": 20669,
      "f1": 0.5724,
      "pr_auc": 0.6519,
      "precision": 0.6435,
      "prevalence": 0.2585,
      "recall": 0.5155
    },
    "Late (26-50)": {
      "count": 24766,
      "f1": 0.8394,
      "pr_auc": 0.9015,
      "precision": 0.7748,
      "prevalence": 0.6383,
      "recall": 0.9157
    },
    "Mid (11-25)": {
      "count": 79060,
      "f1": 0.8036,
      "pr_auc": 0.8713,
      "precision": 0.7532,
      "prevalence": 0.541,
      "recall": 0.8611
    },
    "Mid-Early (4-10)": {
      "count": 66714,
      "f1": 0.7361,
      "pr_auc": 0.8088,
      "precision": 0.7142,
      "prevalence": 0.4418,
      "recall": 0.7593
    }
  },
  "provenance": {
    "build_script_version": "1.0.0",
    "built_at": "2026-10-29 21:16:14 UTC",
    "date_range": "2026-10-07 to 2026-10-25",
    "row_count": 2805574,
    "runs_count": 147367,
    "source": "TiDB Cloud railsense.train_records (via local cache)"
  },
  "simple_explanations_markdown": "# RailSense \u2014 Model Explanations in Plain English\n\n> **Audience:** Non-technical passengers, railway operators, and portfolio reviewers.  \n> **Key Rule:** Machine learning models identify **observed statistical associations**, not physical or operational causes.\n\n---\n\n## What Drives the Model's Delay Predictions?\n\nOur LightGBM model looks at four major categories of timetable and historical information to estimate whether your train will arrive late by more than 15 minutes:\n\n### 1. Train Historical Performance (`train_hist_delay_rate`, `train_hist_mean_delay`)\n- **What it means:** How often this exact train was late over the previous 7 completed days.\n- **Why it matters:** In Indian Railways, certain rakes (train compositions) run consecutive daily schedules across congested corridors. A train with a history of persistent delays has a substantially higher probability of facing schedule disruptions today.\n\n### 2. Station Operational Congestion (`station_hist_delay_rate`, `station_hist_mean_delay`)\n- **What it means:** The observed historical delay frequency at your arrival station.\n- **Why it matters:** Major junction stations handle intersecting trunk lines, passenger connections, and platform bottlenecks. High-traffic junction stations are observed delay hotspots.\n\n### 3. Train Category & Track Priority (`category`, `category_prior_rate`)\n- **What it means:** The official classification of the service (Suburban `SUB`, Vande Bharat `VNDB`, Superfast `SUF`, Express `MEX`, Special `TOD`).\n- **Why it matters:** Indian Railways dispatchers operate under strict operational path precedence:\n  - **Suburban (`SUB`):** Dedicated tracks and strict suburban schedules mean Suburban trains arrive punctually 83% of the time.\n  - **Special / Holiday (`TOD`):** Unscheduled holiday specials receive lower line priority and are observed late 76% of the time.\n\n### 4. Journey Sequence Position (`seq`, `log_seq`, `is_deep_journey`)\n- **What it means:** How far along its route the train currently is (e.g. stop #3 vs stop #45).\n- **Why it matters:** Timetable buffers are gradually absorbed over hundreds of kilometers. Trains near the beginning of their route are frequently punctual; trains past stop #30 accumulate compounded route delays.\n\n---\n\n## When is the Model Most Reliable?\n\n1. **High Confidence Predictions:**\n   - **Suburban Trains:** Predicts on-time arrivals with >90% precision.\n   - **Late Journey Superfasts:** High accuracy in identifying compound delay cascades once a train enters multi-state trunk routes.\n\n2. **Model Limitations & Weaknesses:**\n   - **Cold-Start Trains:** Rare, newly numbered holiday specials with zero 7-day prior history rely strictly on category-level priors.\n   - **Early-Morning Long Hauls:** Express trains scheduled between 02:00 and 05:00 IST exhibit high variance due to overnight freight interleaving.\n"
}
```

---

### `POST /api/predict` (Status: 200)

**Request Body:**
```json
{
  "train_number": "12951",
  "station_code": "BRC",
  "date": "2026-10-26",
  "seq": 4
}
```

**Response Top-Level Structure / Schema:**
```json
{
  "caveats": [
    "Pre-departure timetable model: assumes scheduled route and standard operating conditions.",
    "Does not observe dynamic real-time en-route incidents, signal failures, or sudden weather disruptions.",
    "... (1 more items)"
  ],
  "contributing_factors": [
    "Train 12951 exhibits high historical punctuality (24.9% delay rate)"
  ],
  "data_as_of": "2026-10-25",
  "historical_context": {
    "is_cold_start": false,
    "scheduled_arrival_time": "21:06",
    "stop_sequence": 4,
    "train_category": "RAJ"
  },
  "journey_date": "2026-10-26",
  "model_version": "1.0.0",
  "predicted_delayed": false,
  "probability_delayed": 0.227,
  "probability_raw": 0.2541,
  "raw_probability": 0.2541,
  "risk_band": "Low",
  "seq": 4,
  "station_code": "BRC",
  "threshold_used": 0.42,
  "train_number": "12951"
}
```

---

### `GET /api/trains/999999` (Status: 404)

**Response Top-Level Structure / Schema:**
```json
{
  "error": {
    "code": "TRAIN_NOT_FOUND",
    "details": null,
    "message": "Train '999999' not found in catalog."
  }
}
```

---

### `POST /api/predict` (Status: 422)

**Request Body:**
```json
{
  "train_number": "12951",
  "station_code": "BRC",
  "date": "2026-10-26"
}
```

**Response Top-Level Structure / Schema:**
```json
{
  "error": {
    "code": "MULTIPLE_STOPS_REQUIRE_SEQ",
    "message": "Train 12951 calls at station BRC multiple times. Please specify 'seq'.",
    "valid_seq_options": [
      4,
      12
    ]
  }
}
```

---


## Phase 9 Endpoints

### 1. `GET /api/patterns`

Returns precomputed delay pattern distributions and hotspot analyses.

**Query Parameters:**
- `dim` (required): `hour` | `dow` | `category` | `position` | `hotspots`
- `level` (optional, for `dim=hotspots`): `station` (default) | `train`
- `order` (optional, for `dim=hotspots`): `top` (default, highest delay rate) | `bottom` (lowest delay rate)
- `min_support` (optional, for `dim=hotspots`): integer minimum arrivals (defaults: 100 for stations, 50 for trains)
- `limit` (optional, for `dim=hotspots`): integer (1 to 100, default 20)

**Response `dim=hour`:**
```json
{
  "dimension": "hour",
  "generated_at": "2026-10-30T10:00:00Z",
  "total_arrivals": 1773607,
  "fleet_delayed_rate": 0.5036,
  "bins": [
    {
      "hour": 0,
      "total_arrivals": 58241,
      "delayed_arrivals": 31201,
      "delayed_rate": 0.5357,
      "avg_delay_min": 24.8,
      "p50_delay_min": 18.0,
      "p90_delay_min": 68.0,
      "wilson_ci_lower": 0.5316,
      "wilson_ci_upper": 0.5398
    }
  ]
}
```

**Response `dim=hotspots` (Station level):**
```json
{
  "dimension": "hotspots",
  "level": "station",
  "order": "top",
  "min_support": 100,
  "limit": 20,
  "hotspots": [
    {
      "station_code": "SPJ",
      "station_name": "SAMASTIPUR JN",
      "total_arrivals": 1284,
      "delayed_arrivals": 1042,
      "delayed_rate": 0.8115,
      "avg_delay_min": 68.4,
      "wilson_ci_lower": 0.7891,
      "wilson_ci_upper": 0.8322
    }
  ]
}
```

---

### 2. `POST /api/insights/query`

Performs local natural language question answering with deterministic template execution.

**Request Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "query": "Is train 12951 punctual?"
}
```

**Response (Success):**
```json
{
  "query": "Is train 12951 punctual?",
  "intent": "train_punctuality",
  "confidence": 0.942,
  "confidence_band": "High",
  "answer": "Train 12951 (NDLS TEJAS RAJ) recorded a 28.4% delayed arrival rate across 194 observed stops in our 19-day dataset, with an average delay of 8.2 minutes.",
  "caveat": "Historical observation from Oct 7 to Oct 25, 2026. Not a guarantee of future operational performance.",
  "deep_link": {
    "tab": "explorer",
    "path": "/explorer?train=12951",
    "label": "Open Train 12951 in Explorer"
  },
  "visual": {
    "type": "kpi_card",
    "metrics": [
      { "label": "Observed Delay Rate", "value": "28.4%" },
      { "label": "Avg Delay", "value": "8.2 min" },
      { "label": "Sample Size", "value": "194 stops" }
    ]
  },
  "clarification_needed": false,
  "candidates": [],
  "explanation": {
    "method": "Local TF-IDF (1-2 word + 3-5 char n-grams) + Logistic Regression",
    "matched_entities": { "train_number": "12951", "train_name": "NDLS TEJAS RAJ" },
    "execution_time_ms": 1.15
  }
}
```

**Response (Clarification Required, e.g. ambiguous query):**
```json
{
  "query": "How is Rajdhani doing?",
  "intent": "train_punctuality",
  "confidence": 0.88,
  "confidence_band": "High",
  "answer": "Multiple Rajdhani services match your query. Please select the specific service you wish to inspect:",
  "caveat": "Observational data covers Oct 7 to Oct 25, 2026.",
  "deep_link": null,
  "visual": null,
  "clarification_needed": true,
  "candidates": [
    { "train_number": "12951", "train_name": "NDLS TEJAS RAJ" },
    { "train_number": "12431", "train_name": "RAJDHANI EXP" },
    { "train_number": "22691", "train_name": "RAJDHANI EXP" }
  ],
  "explanation": {
    "method": "Fuzzy token matching identified multiple candidate trains.",
    "execution_time_ms": 1.42
  }
}
```

**Response (Refusal / Redirect):**
```json
{
  "query": "Will train 12951 be delayed tomorrow?",
  "intent": "pre_departure_prediction_refusal",
  "confidence": 0.95,
  "confidence_band": "High",
  "answer": "Smart Insights answers historical questions from our 19-day dataset. To predict delays for an upcoming trip, please use our ML Inference Engine on the Delay Prediction tab.",
  "caveat": null,
  "deep_link": {
    "tab": "predict",
    "path": "/predict?train=12951",
    "label": "Open Delay Prediction"
  },
  "visual": null,
  "clarification_needed": false,
  "candidates": [],
  "explanation": {
    "method": "Intent classification routed forward prediction query to Tab 3.",
    "execution_time_ms": 0.92
  }
}
```

---

### 3. `GET /api/insights/examples`

Returns categorized starter questions for the Smart Insights natural language interface.

**Response:**
```json
{
  "categories": [
    {
      "name": "Fleet Overview",
      "questions": [
        "What is the overall delayed arrival rate across the railway?",
        "How many trains and stations are tracked in this dataset?"
      ]
    },
    {
      "name": "Train Punctuality",
      "questions": [
        "How punctual is train 12951 (NDLS TEJAS RAJ)?",
        "Which are the most punctual trains in the fleet?"
      ]
    },
    {
      "name": "Station Hotspots",
      "questions": [
        "Which stations have the highest observed delay rates?",
        "What is the delay record at New Delhi (NDLS)?"
      ]
    },
    {
      "name": "Temporal & Route Patterns",
      "questions": [
        "What time of day sees the highest arrival delays?",
        "Are delays higher on weekends or weekdays?"
      ]
    }
  ]
}
```
