"""
RailSense — REST API Smoke Test & Latency Profiler (backend/scripts/smoke_api.py)
Exercises all endpoints through Flask test client, measures response status,
latency (p50/p95), payload size, and verifies zero crashes.
"""

import sys
import time
from pathlib import Path

# Add backend directory to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app


def run_smoke_tests():
    print("=" * 82)
    print("RailSense — REST API Smoke & Latency Verification")
    print("=" * 82)

    app = create_app({"TESTING": True})
    client = app.test_client()

    endpoints = [
        ("GET", "/", None, 200),
        ("GET", "/api/health", None, 200),
        ("GET", "/api/health/ready", None, (200, 503)),
        ("GET", "/api/overview", None, 200),
        ("GET", "/api/trains?q=12951&page=1&page_size=10", None, 200),
        ("GET", "/api/trains/12951", None, 200),
        ("GET", "/api/stations?q=BRC", None, 200),
        ("GET", "/api/stations/BRC", None, 200),
        ("GET", "/api/patterns/hour", None, 200),
        ("GET", "/api/patterns/dow", None, 200),
        ("GET", "/api/patterns/category", None, 200),
        ("GET", "/api/patterns/position", None, 200),
        ("GET", "/api/patterns/hotspots", None, 200),
        ("GET", "/api/model/info", None, 200),
        ("GET", "/api/model/metrics", None, 200),
        ("POST", "/api/predict (auto-seq)", {"train_number": "00149", "station_code": "KYN", "date": "2026-10-26"}, 200),
        ("POST", "/api/predict (explicit seq)", {"train_number": "12951", "station_code": "BRC", "date": "2026-10-26", "seq": 4}, 200),
        ("POST", "/api/predict (multi-stop)", {"train_number": "12951", "station_code": "BRC", "date": "2026-10-26"}, 422),
        ("POST", "/api/predict (origin seq=1)", {"train_number": "12951", "station_code": "MMCT", "date": "2026-10-26", "seq": 1}, 422),
        ("GET", "/api/openapi.json", None, 200),
        ("GET", "/api/docs", None, 200),
    ]

    results = []
    print(f"\n{'Method':<6} {'Endpoint':<42} {'Status':<8} {'Latency (ms)':<14} {'Size':<10}")
    print("-" * 82)

    for method, label, payload, expected_status in endpoints:
        # Determine actual request URL
        path = label.split(" ")[0] if " " in label else label

        latencies = []
        status = 0
        resp_len = 0

        # Run 3 iterations to get stable latency
        for _ in range(3):
            t0 = time.perf_counter()
            if method == "GET":
                res = client.get(path)
            elif method == "POST":
                res = client.post(path, json=payload)
            dur = (time.perf_counter() - t0) * 1000
            latencies.append(dur)
            status = res.status_code
            resp_len = len(res.data)

        p50 = sorted(latencies)[1]

        # Verify status
        if isinstance(expected_status, tuple):
            assert status in expected_status, f"Unexpected status {status} for {label}"
        else:
            assert status == expected_status, f"Unexpected status {status} for {label}"

        status_str = f"[OK] {status}"
        print(f"{method:<6} {label:<42} {status_str:<8} {p50:<14.2f} {resp_len:<10}")
        results.append({"label": label, "status": status, "latency_ms": p50, "size_bytes": resp_len})

    print("-" * 82)
    avg_latency = sum(r["latency_ms"] for r in results) / len(results)
    max_latency = max(r["latency_ms"] for r in results)
    print(f"Total Endpoints Tested: {len(results)}")
    print(f"Mean Endpoint Latency: {avg_latency:.2f} ms")
    print(f"Peak Endpoint Latency: {max_latency:.2f} ms")
    print("=" * 82)
    print("[PASS] All API endpoints verified successfully!")
    print("=" * 82)


if __name__ == "__main__":
    run_smoke_tests()
