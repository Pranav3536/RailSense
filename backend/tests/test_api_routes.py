"""
RailSense — REST API Unit & Endpoint Test Suite (backend/tests/test_api_routes.py)
Tests all versioned routes, request validators, error handlers, security headers,
and rate limiting using Flask's test client.
"""

import json
import pytest
from app import create_app


@pytest.fixture(scope="module")
def app_instance():
    """Create a test application instance."""
    app = create_app({"TESTING": True, "RATE_LIMIT_MAX": 200})
    return app


@pytest.fixture(scope="module")
def client(app_instance):
    """Flask test client."""
    return app_instance.test_client()


# ---------------------------------------------------------------------
# 1. Health Probes
# ---------------------------------------------------------------------
def test_liveness_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "RailSense API"
    assert "version" in data
    assert "timestamp" in data


def test_readiness_health(client):
    res = client.get("/api/health/ready")
    assert res.status_code in (200, 503)
    data = res.get_json()
    assert "components" in data
    assert "serving_store" in data["components"]
    assert "prediction_engine" in data["components"]
    assert "json_analytics" in data["components"]
    assert data.get("data_source") == "precomputed_local"
    assert "tidb_cloud" not in data["components"]
    assert "tidb" not in json.dumps(data).lower()


def test_root_landing(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.get_json()
    assert data["service"] == "RailSense API"
    assert data["documentation"] == "/api/docs"


# ---------------------------------------------------------------------
# 2. Overview Endpoint
# ---------------------------------------------------------------------
def test_overview_endpoint(client):
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.get_json()
    assert "fleet_kpis" in data
    assert data["fleet_kpis"]["total_stops_observed"] == 2805574
    assert data["fleet_kpis"]["total_train_runs"] == 147367
    assert data["fleet_kpis"]["distinct_train_numbers"] == 10743
    assert data["fleet_kpis"]["distinct_stations"] == 8584
    assert "category_breakdown" in data
    assert "delay_summary" in data
    assert "definition" in data["delay_summary"]
    assert "delay_distribution" in data
    assert len(data["delay_distribution"]) == 8
    assert data["delay_distribution"][0]["bucket"] == "<-30"
    assert data["delay_distribution"][-1]["bucket"] == ">180"


# ---------------------------------------------------------------------
# 3. Train Catalog Endpoints
# ---------------------------------------------------------------------
def test_trains_list_and_pagination(client):
    res = client.get("/api/trains?page=1&page_size=10")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    assert len(data["items"]) == 10
    assert "pagination" in data
    assert data["pagination"]["total"] == 10743
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["page_size"] == 10
    assert "definition" in data
    # Default sort is runs_desc
    runs = [t["runs_count"] for t in data["items"]]
    assert runs == sorted(runs, reverse=True)
    assert runs[0] >= 19


def test_trains_sort_number_asc(client):
    res = client.get("/api/trains?sort=number_asc&page=1&page_size=10")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["items"]) == 10
    train_nums = [t["train_number"] for t in data["items"]]
    assert train_nums == sorted(train_nums)


def test_trains_sort_invalid(client):
    res = client.get("/api/trains?sort=invalid_sort")
    assert res.status_code == 400
    data = res.get_json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_SORT"



def test_trains_search_prefix(client):
    res = client.get("/api/trains?q=12951")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["train_number"] == "12951"


def test_train_detail_found(client):
    res = client.get("/api/trains/12951")
    assert res.status_code == 200
    data = res.get_json()
    assert data["train_number"] == "12951"
    assert "stops" in data
    assert len(data["stops"]) > 0
    assert "history_by_date" in data
    assert "definition" in data


def test_train_detail_not_found(client):
    res = client.get("/api/trains/99999999")
    assert res.status_code == 404
    data = res.get_json()
    assert data["error"]["code"] == "TRAIN_NOT_FOUND"


# ---------------------------------------------------------------------
# 4. Station Catalog Endpoints
# ---------------------------------------------------------------------
def test_stations_list_and_pagination(client):
    res = client.get("/api/stations?page=1&page_size=15")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    assert len(data["items"]) == 15
    assert data["pagination"]["total"] == 8584


def test_station_detail_found(client):
    res = client.get("/api/stations/BRC")
    assert res.status_code == 200
    data = res.get_json()
    assert data["station_code"] == "BRC"
    assert "delayed_rate" in data
    assert "wilson_lower" in data
    assert "wilson_upper" in data
    assert "category_mix" in data
    assert "calling_trains_sample" in data


def test_station_detail_not_found(client):
    res = client.get("/api/stations/ZZZZZZ")
    assert res.status_code == 404
    data = res.get_json()
    assert data["error"]["code"] == "STATION_NOT_FOUND"


# ---------------------------------------------------------------------
# 5. Patterns Endpoints
# ---------------------------------------------------------------------
@pytest.mark.parametrize("kind", ["hour", "dow", "category", "position", "hotspots"])
def test_patterns_valid_kinds(client, kind):
    res = client.get(f"/api/patterns/{kind}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["kind"] == kind
    assert "data" in data
    assert "definition" in data
    assert "data_as_of" in data


def test_patterns_invalid_kind(client):
    res = client.get("/api/patterns/unsupported_pattern")
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"]["code"] == "INVALID_PATTERN_KIND"
    assert "valid_options" in data["error"]


# ---------------------------------------------------------------------
# 6. Model Metadata & Evaluation Lab
# ---------------------------------------------------------------------
def test_model_info(client):
    res = client.get("/api/model/info")
    assert res.status_code == 200
    data = res.get_json()
    assert "architecture" in data
    assert "features" in data
    assert data["features"]["total_features"] == 28
    assert "split_design" in data
    assert "operational_thresholds" in data
    assert data["operational_thresholds"]["balanced_f1_threshold"] == 0.410
    assert "banned_leaky_features" in data["features"]


def test_model_metrics(client):
    res = client.get("/api/model/metrics")
    assert res.status_code == 200
    data = res.get_json()
    assert "model_comparison" in data
    assert "curves" in data
    assert "precision_recall" in data["curves"]
    assert "roc" in data["curves"]
    assert "calibration_reliability" in data["curves"]
    assert "feature_importance" in data


# ---------------------------------------------------------------------
# 7. Real-Time Delay Prediction
# ---------------------------------------------------------------------
def test_predict_success(client):
    payload = {
        "train_number": "12951",
        "station_code": "BRC",
        "date": "2026-10-26",
        "seq": 4
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["train_number"] == "12951"
    assert data["station_code"] == "BRC"
    assert data["seq"] == 4
    assert "probability_delayed" in data
    assert 0.0 <= data["probability_delayed"] <= 1.0
    assert "probability_raw" in data
    assert "raw_probability" in data
    assert 0.0 <= data["probability_raw"] <= 1.0
    assert data["risk_band"] in ("Low", "Medium", "High")
    assert "contributing_factors" in data
    assert "historical_context" in data
    assert "caveats" in data
    assert len(data["caveats"]) >= 2


def test_predict_auto_seq(client):
    payload = {
        "train_number": "00149",
        "station_code": "KYN",
        "date": "2026-10-26"
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["seq"] == 2
    assert 0.0 <= data["probability_delayed"] <= 1.0


def test_predict_multi_stop_seq_required(client):
    payload = {
        "train_number": "12951",
        "station_code": "BRC",
        "date": "2026-10-26"
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"]["code"] == "MULTIPLE_STOPS_REQUIRE_SEQ"
    assert "valid_seq_options" in data["error"]


def test_predict_origin_stop_error(client):
    # Origin stop of 12951 is MMCT / seq=1
    payload = {
        "train_number": "12951",
        "station_code": "MMCT",
        "date": "2026-10-26",
        "seq": 1
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"]["code"] == "ORIGIN_STOP_NOT_APPLICABLE"


def test_predict_invalid_date(client):
    payload = {
        "train_number": "12951",
        "station_code": "BRC",
        "date": "not-a-real-date"
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"]["code"] == "INVALID_DATE_FORMAT"


def test_predict_missing_fields(client):
    payload = {
        "train_number": "12951"
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"]["code"] == "MISSING_REQUIRED_FIELDS"


def test_predict_train_not_found(client):
    payload = {
        "train_number": "999999",
        "station_code": "BRC",
        "date": "2026-10-26"
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 404
    data = res.get_json()
    assert data["error"]["code"] == "TRAIN_NOT_FOUND"


# ---------------------------------------------------------------------
# 8. Documentation & OpenAPI Spec
# ---------------------------------------------------------------------
def test_openapi_json(client):
    res = client.get("/api/openapi.json")
    assert res.status_code == 200
    data = res.get_json()
    assert data["openapi"] == "3.0.3"
    assert "/api/predict" in data["paths"]


def test_docs_ui(client):
    res = client.get("/api/docs")
    assert res.status_code == 200
    assert "swagger-ui" in res.data.decode("utf-8")


# ---------------------------------------------------------------------
# 9. Middleware, Headers & Error Handling
# ---------------------------------------------------------------------
def test_security_and_performance_headers(client):
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Content-Security-Policy" in res.headers
    assert "X-Request-ID" in res.headers
    assert "X-Response-Time-Ms" in res.headers


def test_method_not_allowed(client):
    res = client.put("/api/overview")
    assert res.status_code == 405
    data = res.get_json()
    assert data["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_rate_limiter(app_instance):
    # Create test app with tight rate limit
    strict_app = create_app({"TESTING": True, "RATE_LIMIT_MAX": 3, "RATE_LIMIT_WINDOW": 60})
    strict_client = strict_app.test_client()

    # 3 allowed requests
    for _ in range(3):
        r = strict_client.get("/api/overview")
        assert r.status_code == 200

    # 4th request should be rate limited
    r4 = strict_client.get("/api/overview")
    assert r4.status_code == 429
    data = r4.get_json()
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
