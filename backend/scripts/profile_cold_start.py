"""
RailSense — Cold Start End-to-End Profiler (backend/scripts/profile_cold_start.py)
Measures:
1. Component initialization latency (ServingClient, Model Loader, NLP Classifier)
2. Time to first /api/health/ready
3. Time to first /api/predict (warm prediction)
4. Memory footprint (RSS) after initialization and prediction
"""

import os
import sys
import time
import json
import psutil
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DOCS_DIR = PROJECT_ROOT / "docs"
EXPERIMENTS_DIR = DOCS_DIR / "experiments"

def profile_cold_start():
    print("=" * 80)
    print("RailSense Phase 11 — Cold Start End-to-End Profiling")
    print("=" * 80)

    proc = psutil.Process()
    rss_start_mb = proc.memory_info().rss / (1024 * 1024)

    t0 = time.perf_counter()

    # 1. Measure Flask create_app import and instantiation
    t_app_start = time.perf_counter()
    from app import create_app
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()
    t_app_end = time.perf_counter()
    app_factory_ms = (t_app_end - t_app_start) * 1000.0

    # 2. First /api/health/ready request
    t_ready_start = time.perf_counter()
    res_ready = client.get("/api/health/ready")
    t_ready_end = time.perf_counter()
    ready_ms = (t_ready_end - t_ready_start) * 1000.0
    ready_status = res_ready.status_code
    ready_json = res_ready.get_json()

    # 3. First /api/predict request
    t_predict_start = time.perf_counter()
    res_predict = client.post("/api/predict", json={
        "train_number": "12951",
        "station_code": "BVI",
        "seq": 2,
        "date": "2026-10-15"
    })
    t_predict_end = time.perf_counter()
    predict_ms = (t_predict_end - t_predict_start) * 1000.0
    predict_status = res_predict.status_code
    predict_json = res_predict.get_json()

    total_cold_start_ms = (time.perf_counter() - t0) * 1000.0
    rss_final_mb = proc.memory_info().rss / (1024 * 1024)

    print(f"Flask App Creation:          {app_factory_ms:7.2f} ms")
    print(f"First /api/health/ready:      {ready_ms:7.2f} ms (Status: {ready_status})")
    print(f"First /api/predict:           {predict_ms:7.2f} ms (Status: {predict_status})")
    print(f"Total Cold Start Latency:     {total_cold_start_ms:7.2f} ms")
    print(f"Memory RSS at Start:          {rss_start_mb:7.2f} MB")
    print(f"Memory RSS After Prediction:  {rss_final_mb:7.2f} MB (Delta: +{rss_final_mb - rss_start_mb:.2f} MB)")

    result = {
        "timestamp": "2026-10-31T17:15:00+05:30",
        "app_factory_ms": round(app_factory_ms, 2),
        "first_health_ready_ms": round(ready_ms, 2),
        "first_predict_ms": round(predict_ms, 2),
        "total_cold_start_ms": round(total_cold_start_ms, 2),
        "rss_start_mb": round(rss_start_mb, 2),
        "rss_after_predict_mb": round(rss_final_mb, 2),
        "ready_status": ready_status,
        "predict_status": predict_status,
        "first_predict_probability": predict_json.get("calibrated_delay_probability") if predict_json else None
    }

    out_file = EXPERIMENTS_DIR / "cold_start_profile.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"[OK] Saved profile to {out_file}")

if __name__ == "__main__":
    profile_cold_start()
