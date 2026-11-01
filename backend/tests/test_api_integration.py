"""
RailSense — End-to-End API Integration & Performance Test Suite (backend/tests/test_api_integration.py)
Validates full request lifecycle against precomputed serving store, trained models,
latency targets, and ensures process memory remains well within Render's 512MB RAM budget (< 300MB).
"""

import time
import pytest
from app import create_app


@pytest.fixture(scope="module")
def integration_client():
    """Create test client with real serving client and predictor singletons."""
    app = create_app({"TESTING": True})
    return app.test_client()


@pytest.mark.integration
def test_end_to_end_delay_intelligence(integration_client):
    # 1. Macro Overview
    t0 = time.perf_counter()
    res_ov = integration_client.get("/api/overview")
    t_ov = (time.perf_counter() - t0) * 1000
    assert res_ov.status_code == 200
    ov_data = res_ov.get_json()
    assert ov_data["fleet_kpis"]["total_stops_observed"] == 2805574
    assert t_ov < 100.0, f"Overview latency {t_ov:.1f}ms exceeds 100ms target"

    # 2. Train Catalog Query
    t0 = time.perf_counter()
    res_tr = integration_client.get("/api/trains?q=12951")
    t_tr = (time.perf_counter() - t0) * 1000
    assert res_tr.status_code == 200
    tr_data = res_tr.get_json()
    assert len(tr_data["items"]) >= 1
    assert t_tr < 100.0, f"Train catalog query latency {t_tr:.1f}ms exceeds 100ms"

    # 3. Train Profile with Stop-Level Statistics
    t0 = time.perf_counter()
    res_detail = integration_client.get("/api/trains/12951")
    t_detail = (time.perf_counter() - t0) * 1000
    assert res_detail.status_code == 200
    detail_data = res_detail.get_json()
    assert detail_data["train_number"] == "12951"
    assert len(detail_data["stops"]) > 0
    assert t_detail < 100.0, f"Train detail latency {t_detail:.1f}ms exceeds 100ms"

    # 4. Station Profile with Wilson Intervals
    t0 = time.perf_counter()
    res_stn = integration_client.get("/api/stations/BRC")
    t_stn = (time.perf_counter() - t0) * 1000
    assert res_stn.status_code == 200
    stn_data = res_stn.get_json()
    assert stn_data["station_code"] == "BRC"
    assert "wilson_lower" in stn_data
    assert "wilson_upper" in stn_data
    assert t_stn < 100.0, f"Station detail latency {t_stn:.1f}ms exceeds 100ms"

    # 5. Multiple Sequential Real-Time Predictions (with warmup)
    warmup_tc = {"train_number": "00149", "station_code": "KYN", "date": "2026-10-26"}
    integration_client.post("/api/predict", json=warmup_tc)

    test_cases = [
        {"train_number": "12951", "station_code": "BRC", "date": "2026-10-26", "seq": 4},
        {"train_number": "12951", "station_code": "RTM", "date": "2026-10-26", "seq": 5},
        {"train_number": "12951", "station_code": "KOTA", "date": "2026-10-26", "seq": 7},
    ]

    latencies = []
    for tc in test_cases:
        t0 = time.perf_counter()
        res_pred = integration_client.post("/api/predict", json=tc)
        dur = (time.perf_counter() - t0) * 1000
        latencies.append(dur)
        assert res_pred.status_code == 200
        p_data = res_pred.get_json()
        assert 0.0 <= p_data["probability_delayed"] <= 1.0
        assert p_data["risk_band"] in ("Low", "Medium", "High")

    avg_pred_latency = sum(latencies) / len(latencies)
    assert avg_pred_latency < 100.0, f"Average prediction latency {avg_pred_latency:.1f}ms exceeds 100ms"


@pytest.mark.integration
def test_process_memory_budget():
    """Verifies that the serving client and predictor memory footprint remains below 300MB."""
    import tracemalloc
    tracemalloc.start()
    from app import create_app
    test_app = create_app({"TESTING": True})
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    peak_mb = peak / (1024 * 1024)
    print(f"\n[Memory Audit] Traced Peak Allocations: {peak_mb:.2f} MB (Budget: 300.00 MB)")
    assert peak_mb < 300.0, f"Traced memory {peak_mb:.2f} MB exceeds 300 MB budget"
