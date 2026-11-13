# RailSense — REST API Reference & Integration Guide

> **Base URL:** `http://localhost:5000/api`  
> **Interactive Documentation:** `http://localhost:5000/api/docs`  
> **OpenAPI 3.0 Specification:** `http://localhost:5000/api/openapi.json` | `docs/openapi.yaml`  
> **Architecture Principle:** Sub-millisecond read access via precomputed serving store (`backend/serving/serving.sqlite`); zero runtime database credentials or remote queries (precomputed local SQLite and static JSON analytics).

---

## 1. Global Standards & Conventions

### Security & Headers
- **CORS:** Configured for local development (`http://localhost:5173`, `http://localhost:3000`) and production origins via `CORS_ORIGINS`.
- **Security Headers:** Every response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict `Content-Security-Policy`.
- **Tracking Headers:** Every response includes `X-Request-ID` and `X-Response-Time-Ms`.
- **Rate Limiting:** In-memory sliding-window limiter enforcing 120 requests/minute per client IP (whitelisting `/api/health`). Exceeded requests receive `429 Too Many Requests` with `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.

### Uniform Error Format
Every error response returns a consistent JSON envelope with HTTP status codes `400`, `404`, `405`, `413`, `422`, `429`, or `500`:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description of what failed.",
    "details": null,
    "request_id": "a90dfb12-9c1e-45fa-bb26-ec4a51e6d421"
  }
}
```

### Label & Non-Causal Language Rules
- **Delayed Definition:** `arrival_delay_min > 15 minutes` evaluated strictly on label-eligible stops (`seq > 1` and `arrival_reported == 1`).
- **Attribution Wording:** Phrasing strictly uses correlation language ("observed delay hotspot", "associated with historical delay", "what the model uses"). Causal claims ("caused by congestion/fog") are never produced.

---

## 2. API Endpoints Reference

### 2.1 Health & Liveness Probes

#### `GET /api/health`
Lightweight container liveness check without disk or database I/O.
```bash
curl -s http://localhost:5000/api/health
```
```json
{
  "status": "healthy",
  "service": "RailSense API",
  "version": "1.0.0",
  "timestamp": "2026-10-29 21:00:00 UTC"
}
```

#### `GET /api/health/ready`
Comprehensive truthful readiness probe verifying local precomputed serving store accessibility, model artifact loading, and static JSON analytics availability. Completely free of remote database credentials or network socket dependencies (cached for 5 seconds).
```bash
curl -s http://localhost:5000/api/health/ready
```
```json
{
  "status": "ready",
  "service": "RailSense API",
  "version": "1.0.0",
  "model_version": "1.0.0",
  "data_as_of": "2026-10-25",
  "data_source": "precomputed_local",
  "components": {
    "serving_store": "ready",
    "prediction_engine": "ready",
    "json_analytics": "ready"
  },
  "timestamp": "2026-10-30 16:55:07 UTC"
}
```

---

### 2.2 Macro Dataset Overview

#### `GET /api/overview`
Returns global dataset counts (2.8M rows, 147k runs, 10.7k trains, 8.5k stations), label eligibility coverage, delay distribution histogram (8 buckets from `<-30` to `>180`), category-level delay distributions, and 19-day per-date trends.
```bash
curl -s http://localhost:5000/api/overview
```

---

### 2.3 Train Catalog & Route Profiles

#### `GET /api/trains`
Search trains by number prefix or name substring, with optional category filtering and pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | `null` | Train number prefix (e.g. `129`) or name substring (e.g. `Rajdhani`) |
| `category` | string | `null` | Category code (e.g. `SUB`, `MEX`, `SUF`, `EXP`, `TOD`) |
| `sort` | string | `runs_desc` | Sort order: `runs_desc` (default when `q` empty) or `number_asc` |
| `page` | integer | `1` | Page number |
| `page_size` | integer | `20` | Results per page (max 100) |

```bash
curl -s "http://localhost:5000/api/trains?q=12951&page=1&page_size=20"
```

#### `GET /api/trains/{train_number}`
Returns full route profile, origin/destination, scheduled stops ordered by `seq`, observed delay rates per stop, and per-date historical performance across the 19-day dataset window.
```bash
curl -s http://localhost:5000/api/trains/12951
```

---

### 2.4 Station Catalog & Top Calling Trains

#### `GET /api/stations`
Search station catalog with pagination, showing stop volume, observed delay rates, and 95% Wilson confidence intervals.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | `null` | Station code prefix (e.g. `NDLS`, `BCT`) |
| `page` | integer | `1` | Page number |
| `page_size` | integer | `20` | Results per page (max 100) |

```bash
curl -s "http://localhost:5000/api/stations?q=NDLS"
```

#### `GET /api/stations/{station_code}`
Returns station detail, observed delay rate, 95% Wilson score bounds, train category breakdown, and sample of top calling trains.
```bash
curl -s http://localhost:5000/api/stations/BRC
```

---

### 2.5 Temporal & Spatial Delay Patterns

#### `GET /api/patterns/{kind}`
Returns empirical delay distributions across the 2.8M row dataset.

**Allowed `kind` values:**
- `hour`: Delay probability and average delay minutes by departure hour (0 to 23).
- `dow`: Delay probability and average delay minutes by day of week (Monday through Sunday).
- `category`: Delay rate and volume distributions across train categories.
- `position`: Delay accumulation progression by journey progress percentile (0% to 100%).
- `hotspots`: Top 15 observed delay hotspot stations with sample counts.

```bash
curl -s http://localhost:5000/api/patterns/hour
```

---

### 2.6 Model Architecture & Evaluation Lab

#### `GET /api/model/info`
Returns deployment model architecture (LightGBM + Isotonic Calibration), hyperparameters, feature inventory, banned leaky features, and temporal partition boundaries.
```bash
curl -s http://localhost:5000/api/model/info
```

#### `GET /api/model/metrics`
Returns complete evaluation suite:
- `algorithm_benchmark`: Multi-algorithm benchmark comparison across 12 models (Baselines, Linear Regression, Logistic Regression, Decision Tree, Random Forest, KNN, LinearSVC, Naive Bayes, XGBoost, LightGBM) with measured single-row latencies, serialized model sizes, and validation/test metrics.
- `unsupervised`: Unsupervised analysis findings (PCA component variance, K-Means cluster distributions).
- `model_comparison`: Comparison across original candidate formulations.
- Recomputed honest Average Precision (AP), ROC-AUC, Brier score, ECE.
- Test split PR and ROC curve coordinates for frontend plotting.
- Feature importance ranking.
- Subgroup error analysis across categories and journey positions.
```bash
curl -s http://localhost:5000/api/model/metrics
```

---

### 2.7 Pre-Departure Delay Prediction

#### `POST /api/predict`
Calculates calibrated delay probability and factor attribution for a scheduled train stop.

**Request Payload:**
```json
{
  "train_number": "12951",
  "station_code": "BRC",
  "date": "2026-10-26",
  "seq": 5
}
```

**Response Payload (200 OK):**
```json
{
  "train_number": "12951",
  "station_code": "BRC",
  "journey_date": "2026-10-26",
  "seq": 5,
  "predicted_delayed": false,
  "probability_delayed": 0.2842,
  "raw_probability": 0.3120,
  "risk_band": "Low",
  "threshold_used": 0.410,
  "contributing_factors": [
    "Train 12951 exhibits high historical punctuality (18.2% delay rate)",
    "Early journey stop (stop #5) benefits from initial timetable buffer"
  ],
  "historical_context": {
    "train_category": "SUF",
    "is_cold_start": false,
    "stop_sequence": 5,
    "scheduled_arrival_time": "22:15:00"
  },
  "caveats": [
    "Pre-departure timetable model: assumes scheduled route and standard operating conditions.",
    "Does not observe dynamic real-time en-route incidents, signal failures, or sudden weather disruptions.",
    "Delay is defined as arrival_delay_min > 15 minutes at the scheduled stop."
  ],
  "model_version": "1.0.0",
  "data_as_of": "2026-10-25"
}
```

---


---

### `POST /api/insights/query`

Process natural language questions about historical delay patterns and fleet punctuality using the local NLP engine.

- **Rate Limit:** 30 requests/minute per client IP
- **Input Constraints:** UTF-8 string, max 300 characters, `Content-Type: application/json`
- **Privacy:** User text is **never logged** (only SHA-256 hash, length, classified intent, confidence, latency).

**Request Body:**
```json
{
  "question": "Which train category is most delayed?",
  "selected_entities": null
}
```

**Response (200 OK):**
```json
{
  "query": "Which train category is most delayed?",
  "understood_intent": "category_ranking",
  "confidence": 0.8703,
  "confidence_level": "HIGH",
  "margin": 0.8501,
  "needs_clarification": false,
  "clarification_options": [],
  "entities": {
    "category": null,
    "train_number": null,
    "train_name": null,
    "station_code": null,
    "weekday": null,
    "time_of_day": null,
    "top_n": 10,
    "order": "top"
  },
  "answer": {
    "answer_text": "Across service classifications, Suburban (SUB) exhibits the lowest observed delay rate at 17.1%...",
    "visual_type": "table",
    "visual_data": [ ... ],
    "definition_note": "Categories sorted by empirical delayed arrival rate (arrival_delay_min > 15m).",
    "support_badge": "Categories: 20 classes",
    "caveats": ["Low-support categories with small sample sizes exhibit wider variance."],
    "deep_link": { "label": "Explore Category Breakdown", "path": "/overview" },
    "template_id": "category_ranking"
  },
  "explanation": {
    "resolved_intent": "category_ranking",
    "confidence_score": 0.8703,
    "confidence_margin": 0.8501,
    "data_source": "Precomputed Serving SQLite Store & Analytics JSON",
    "template_id": "category_ranking",
    "safety_note": "No runtime LLM, no user text concatenated into SQL"
  },
  "suggestions": [],
  "data_as_of": "2026-10-25"
}
```

---

### `GET /api/insights/examples`

Get curated natural language questions, supported topics, and operational constraints.

- **Rate Limit:** 120 requests/minute
- **Cache TTL:** Static response, cached in-memory

**Response (200 OK):**
```json
{
  "examples": [
    {
      "question": "What is the overall delay rate across Indian Railways?",
      "intent": "fleet_summary",
      "badge": "Overview"
    },
    {
      "question": "Which train category is most delayed?",
      "intent": "category_ranking",
      "badge": "Categories"
    }
  ],
  "capabilities": {
    "methodology": "Predefined parameterised templates matched via local TF-IDF...",
    "supported_topics": [ ... ],
    "unsupported_topics": [ ... ]
  },
  "data_as_of": "2026-10-25"
}
```

## 3. Error Code Reference

| HTTP Status | Error Code | Description / Remedy |
|-------------|------------|----------------------|
| `400` | `INVALID_JSON` | Body is not valid JSON. |
| `400` | `MISSING_REQUIRED_FIELDS` | One of `train_number`, `station_code`, `date` is missing. |
| `400` | `INVALID_DATE_FORMAT` | Date format must be `YYYY-MM-DD`. |
| `400` | `INVALID_PAGINATION` | `page` and `page_size` must be positive integers. |
| `400` | `INVALID_PATTERN_KIND` | Must be one of `hour`, `dow`, `category`, `position`, `hotspots`. |
| `404` | `TRAIN_NOT_FOUND` | Train number does not exist in catalog. |
| `404` | `STATION_NOT_FOUND` | Station code does not exist in catalog. |
| `404` | `STATION_NOT_ON_ROUTE` | Station does not appear on train's scheduled route. |
| `404` | `SEQ_NOT_FOUND` | Sequence number exceeds route stop count. |
| `422` | `ORIGIN_STOP_NOT_APPLICABLE` | Stop `seq=1` has no arrival delay (train departs). |
| `422` | `MULTIPLE_STOPS_REQUIRE_SEQ` | Train calls at station multiple times (loop); `seq` is required. |
| `429` | `RATE_LIMIT_EXCEEDED` | Request rate exceeded 120 req/min per IP. |
| `503` | `SERVICE_UNAVAILABLE` | Serving store or prediction engine is not initialized. |
