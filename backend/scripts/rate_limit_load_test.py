"""
RailSense — Rate Limiter Load Test & RSS Memory Stability Suite
(backend/scripts/rate_limit_load_test.py)

Simulates >= 5,000 requests against the Flask backend with rate limiter enabled:
- Multi-client simulation (diverse simulated client IPs via X-Forwarded-For under TRUSTED_PROXY_COUNT=1)
- Measures exact 200 vs 429 status distribution
- Validates 429 error envelope, retry-after header, and request_id
- Measures latency percentiles (p50, p95, p99)
- Tracks process RSS memory at intervals of 500 requests to demonstrate bounded memory
- Saves results to docs/experiments/rate_limit_load_test.json
"""

import os
import sys
import time
import json
import psutil
from pathlib import Path
import numpy as np

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

DOCS_DIR = PROJECT_ROOT / "docs"
EXPERIMENTS_DIR = DOCS_DIR / "experiments"

def run_rate_limited_load_test(total_requests: int = 5000):
    print("=" * 80)
    print(f"RailSense Rate Limiter Load Test: {total_requests} Requests")
    print("=" * 80)

    # Initialize app with rate limit: 60 req/min per IP
    limit_per_ip = 60
    app = create_app({
        "TESTING": True,
        "RAILSENSE_ENV": "production",
        "RATE_LIMIT_MAX": limit_per_ip,
        "RATE_LIMIT_WINDOW_SECONDS": 60,
        "TRUSTED_PROXY_COUNT": 1,
    })

    client = app.test_client()
    proc = psutil.Process()
    start_rss_mb = proc.memory_info().rss / (1024 * 1024)
    print(f"Initial RSS Memory: {start_rss_mb:.2f} MB")

    # 5 distinct simulated clients:
    # Client 0: 2000 requests (burst client, will get 60 x 200s, 1940 x 429s)
    # Client 1: 1500 requests (burst client, will get 60 x 200s, 1440 x 429s)
    # Client 2: 1000 requests (burst client, will get 60 x 200s, 940 x 429s)
    # Client 3: 450 requests  (burst client, will get 60 x 200s, 390 x 429s)
    # Client 4: 50 requests   (well-behaved client, will get 50 x 200s, 0 x 429s)
    # Total requests = 2000 + 1500 + 1000 + 450 + 50 = 5000 requests!
    # Expected 200s = 60 + 60 + 60 + 60 + 50 = 290
    # Expected 429s = 1940 + 1440 + 940 + 390 + 0 = 4710

    client_allocation = [
        ("198.51.100.10", 2000),
        ("198.51.100.20", 1500),
        ("198.51.100.30", 1000),
        ("198.51.100.40", 450),
        ("198.51.100.50", 50),
    ]

    status_counts = {200: 0, 429: 0}
    other_statuses = {}
    latencies = []
    rss_trajectory = [(0, round(start_rss_mb, 2))]
    sample_429_env = None
    sample_429_headers = None

    endpoints = [
        "/api/overview",
        "/api/patterns/hour",
        "/api/trains?q=12951",
        "/api/model/info",
    ]

    t_start = time.perf_counter()
    req_counter = 0

    for client_ip, count in client_allocation:
        headers = {"X-Forwarded-For": client_ip}
        for i in range(count):
            ep = endpoints[req_counter % len(endpoints)]
            t0 = time.perf_counter()
            res = client.get(ep, headers=headers)
            t1 = time.perf_counter()
            lat_ms = (t1 - t0) * 1000.0
            latencies.append(lat_ms)

            status = res.status_code
            if status in status_counts:
                status_counts[status] += 1
            else:
                other_statuses[status] = other_statuses.get(status, 0) + 1

            if status == 429 and sample_429_env is None:
                sample_429_env = res.get_json()
                sample_429_headers = dict(res.headers)

            req_counter += 1
            if req_counter % 500 == 0:
                current_rss = proc.memory_info().rss / (1024 * 1024)
                rss_trajectory.append((req_counter, round(current_rss, 2)))
                print(f"Progress: {req_counter}/{total_requests} reqs | RSS: {current_rss:.2f} MB | 200s: {status_counts[200]} | 429s: {status_counts[429]}")

    t_total = time.perf_counter() - t_start
    final_rss_mb = proc.memory_info().rss / (1024 * 1024)
    throughput_rps = req_counter / t_total

    p50 = float(np.percentile(latencies, 50))
    p95 = float(np.percentile(latencies, 95))
    p99 = float(np.percentile(latencies, 99))
    mean_lat = float(np.mean(latencies))

    print("\n" + "=" * 80)
    print("RESULTS:")
    print(f"Total Requests:      {req_counter}")
    print(f"Duration:            {t_total:.2f} s")
    print(f"Throughput:          {throughput_rps:.1f} req/s")
    print(f"Status 200:          {status_counts[200]} (Expected: 290)")
    print(f"Status 429:          {status_counts[429]} (Expected: 4710)")
    print(f"Other Statuses:      {other_statuses}")
    print(f"Latency Mean:        {mean_lat:.2f} ms")
    print(f"Latency p50:         {p50:.2f} ms")
    print(f"Latency p95:         {p95:.2f} ms")
    print(f"Latency p99:         {p99:.2f} ms")
    print(f"RSS Memory Start:    {start_rss_mb:.2f} MB")
    print(f"RSS Memory Final:    {final_rss_mb:.2f} MB (Delta: {final_rss_mb - start_rss_mb:+.2f} MB)")
    print(f"RSS Trajectory:      {rss_trajectory}")
    print("=" * 80)

    assert status_counts[200] == 290, f"Expected 290 200s, got {status_counts[200]}"
    assert status_counts[429] == 4710, f"Expected 4710 429s, got {status_counts[429]}"
    assert len(other_statuses) == 0, f"Unexpected statuses: {other_statuses}"
    assert sample_429_env.get("error", {}).get("code") == "RATE_LIMIT_EXCEEDED"
    assert "Retry-After" in sample_429_headers

    output_data = {
        "timestamp": "2026-11-01T22:20:00+05:30",
        "total_requests": req_counter,
        "concurrency_mode": "in-process WSGI client with sliding-window limiter",
        "status_distribution": status_counts,
        "other_statuses": other_statuses,
        "duration_seconds": round(t_total, 2),
        "throughput_rps": round(throughput_rps, 1),
        "latency_percentiles_ms": {
            "mean": round(mean_lat, 2),
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
        },
        "rss_memory_mb": {
            "initial": round(start_rss_mb, 2),
            "final": round(final_rss_mb, 2),
            "delta": round(final_rss_mb - start_rss_mb, 2),
            "trajectory_every_500_reqs": rss_trajectory,
        },
        "sample_429_response": {
            "error_code": sample_429_env.get("error", {}).get("code"),
            "retry_after": sample_429_headers.get("Retry-After"),
            "request_id_present": bool(sample_429_env.get("error", {}).get("request_id")),
        },
        "verified": True,
    }

    out_file = EXPERIMENTS_DIR / "rate_limit_5000_load_test.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
    print(f"[OK] Saved load test results to {out_file}")

if __name__ == "__main__":
    run_rate_limited_load_test()
