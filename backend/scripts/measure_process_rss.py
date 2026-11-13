"""
RailSense — Real Process RSS Memory Profiler (backend/scripts/measure_process_rss.py)
Accurately measures Resident Set Size (RSS) memory of the Flask API process
at idle (loaded models + SQLite client) and under active request load.
"""

import os
import sys
import time
from pathlib import Path

# Add backend to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import psutil


def measure_api_rss():
    proc = psutil.Process()
    print("=" * 70)
    print("RailSense — Real Process RSS Memory Measurement")
    print("=" * 70)

    # 1. Baseline before app init
    base_rss = proc.memory_info().rss / (1024 * 1024)
    print(f"1. Baseline Python RSS (pre-init):        {base_rss:.2f} MB")

    # 2. Initialize App, Models & Serving Store
    from app import create_app
    app = create_app({"TESTING": True})
    client = app.test_client()

    idle_rss = proc.memory_info().rss / (1024 * 1024)
    print(f"2. Idle Server RSS (Loaded Models + DB):  {idle_rss:.2f} MB")

    # 3. Warm-up and active requests
    peak_rss = idle_rss
    routes = [
        ("GET", "/api/health"),
        ("GET", "/api/health/ready"),
        ("GET", "/api/overview"),
        ("GET", "/api/trains?q=12951"),
        ("GET", "/api/trains/12951"),
        ("GET", "/api/stations/BRC"),
        ("GET", "/api/patterns/hour"),
        ("GET", "/api/patterns/dow"),
        ("GET", "/api/patterns/category"),
        ("GET", "/api/patterns/position"),
        ("GET", "/api/patterns/hotspots"),
        ("GET", "/api/model/info"),
        ("GET", "/api/model/metrics"),
    ]

    for method, path in routes:
        client.get(path)
        cur_rss = proc.memory_info().rss / (1024 * 1024)
        peak_rss = max(peak_rss, cur_rss)

    # 4. Multiple /api/predict calls
    predict_payloads = [
        {"train_number": "12951", "station_code": "BRC", "date": "2026-10-26", "seq": 4},
        {"train_number": "12951", "station_code": "RTM", "date": "2026-10-26", "seq": 5},
        {"train_number": "12951", "station_code": "KOTA", "date": "2026-10-26", "seq": 7},
        {"train_number": "00149", "station_code": "KYN", "date": "2026-10-26"},
        {"train_number": "12301", "station_code": "HWH", "date": "2026-10-26", "seq": 2},
    ]

    for p in predict_payloads:
        for _ in range(5):  # 25 predict calls total
            client.post("/api/predict", json=p)
            cur_rss = proc.memory_info().rss / (1024 * 1024)
            peak_rss = max(peak_rss, cur_rss)

    final_rss = proc.memory_info().rss / (1024 * 1024)
    print(f"3. Active Load Peak RSS:                  {peak_rss:.2f} MB")
    print(f"4. Post-Load Settled RSS:                 {final_rss:.2f} MB")
    print("-" * 70)
    print(f"Render Free-Tier Budget:                 512.00 MB")
    print(f"Headroom to 512 MB Limit:                {512.00 - peak_rss:.2f} MB ({((512.00 - peak_rss) / 512.00) * 100:.1f}%)")
    print(f"Safety Margin to 300 MB Target:          {300.00 - peak_rss:.2f} MB ({((300.00 - peak_rss) / 300.00) * 100:.1f}%)")
    print("=" * 70)

    return {
        "baseline_rss_mb": round(base_rss, 2),
        "idle_rss_mb": round(idle_rss, 2),
        "peak_rss_mb": round(peak_rss, 2),
        "final_rss_mb": round(final_rss, 2),
        "render_limit_mb": 512.0,
        "target_limit_mb": 300.0,
    }


if __name__ == "__main__":
    measure_api_rss()
