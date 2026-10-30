"""
RailSense — Concurrency, Latency & Memory Load Test Suite
(backend/scripts/load_test.py)

Simulates 20 concurrent clients querying diverse endpoints across the API for 60 seconds
(or configurable duration). Measures throughput (req/s), p50/p95/p99 latency percentiles,
error rates, and RSS memory usage progression.
"""

import os
import sys
import time
import json
import psutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

DOCS_DIR = PROJECT_ROOT / "docs"

TEST_WORKLOAD = [
    ("GET", "/api/health", None),
    ("GET", "/api/overview", None),
    ("GET", "/api/patterns/hour", None),
    ("GET", "/api/patterns/dow", None),
    ("GET", "/api/patterns/hotspots?level=station&limit=10", None),
    ("GET", "/api/patterns/hotspots?level=train&limit=10", None),
    ("GET", "/api/trains?query=12951", None),
    ("GET", "/api/trains/12951", None),
    ("GET", "/api/model/summary", None),
    ("POST", "/api/predict", {
        "train_number": "12951",
        "station_code": "BVI",
        "date": "2026-10-20"
    }),
    ("POST", "/api/insights/query", {
        "question": "What is the fleet delayed rate?"
    }),
]


def run_single_request(client, method, path, payload):
    t0 = time.perf_counter()
    try:
        if method == "GET":
            r = client.get(path)
        else:
            r = client.post(path, json=payload)
        t1 = time.perf_counter()
        dur_ms = (t1 - t0) * 1000.0
        return r.status_code, dur_ms, None
    except Exception as e:
        t1 = time.perf_counter()
        return 500, (t1 - t0) * 1000.0, str(e)


def run_load_test(duration_seconds: int = 60, concurrency: int = 20):
    print("=" * 80)
    print("RailSense Load & Stress Performance Benchmark")
    print(f"Target Concurrency: {concurrency} clients")
    print(f"Test Duration:      {duration_seconds} seconds")
    print("=" * 80)

    # Initialize app with high rate limits for stress test
    app = create_app({
        "TESTING": True,
        "RAILSENSE_ENV": "testing",
        "RATE_LIMIT_MAX": 100000,
        "INSIGHTS_RATE_LIMIT_MAX": 100000,
    })

    process = psutil.Process(os.getpid())
    start_rss_mb = process.memory_info().rss / (1024 * 1024)
    print(f"Initial Process RSS Memory: {start_rss_mb:.2f} MB")

    latencies_ms = []
    status_counts = {}
    errors = []
    workload_len = len(TEST_WORKLOAD)

    start_time = time.time()
    end_time = start_time + duration_seconds
    total_requests = 0

    memory_samples = [start_rss_mb]

    # Create thread pool
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = set()

        def submit_work(idx):
            req_spec = TEST_WORKLOAD[idx % workload_len]
            # Use dedicated test_client per thread
            thread_client = app.test_client()
            return executor.submit(
                run_single_request,
                thread_client,
                req_spec[0],
                req_spec[1],
                req_spec[2]
            )

        # Pre-fill workers
        for i in range(concurrency * 2):
            futures.add(submit_work(total_requests))
            total_requests += 1

        last_mem_sample = time.time()

        while futures and time.time() < end_time:
            # Periodically sample memory
            if time.time() - last_mem_sample > 2.0:
                cur_rss = process.memory_info().rss / (1024 * 1024)
                memory_samples.append(cur_rss)
                last_mem_sample = time.time()

            done_futures = [f for f in futures if f.done()]
            if not done_futures:
                time.sleep(0.005)
                continue

            for f in done_futures:
                futures.remove(f)
                status, dur, err = f.result()
                latencies_ms.append(dur)
                status_counts[status] = status_counts.get(status, 0) + 1
                if err or status >= 500:
                    errors.append({"status": status, "err": err})

                # Submit replacement request if time remains
                if time.time() < end_time:
                    futures.add(submit_work(total_requests))
                    total_requests += 1

        # Wait for remaining in-flight requests
        for f in as_completed(futures):
            status, dur, err = f.result()
            latencies_ms.append(dur)
            status_counts[status] = status_counts.get(status, 0) + 1

    actual_duration = time.time() - start_time
    final_rss_mb = process.memory_info().rss / (1024 * 1024)
    peak_rss_mb = max(memory_samples) if memory_samples else final_rss_mb

    latencies_arr = np.array(latencies_ms)
    p50 = float(np.percentile(latencies_arr, 50))
    p90 = float(np.percentile(latencies_arr, 90))
    p95 = float(np.percentile(latencies_arr, 95))
    p99 = float(np.percentile(latencies_arr, 99))
    mean_lat = float(np.mean(latencies_arr))
    max_lat = float(np.max(latencies_arr))
    rps = len(latencies_arr) / actual_duration

    print("\n" + "=" * 80)
    print("Load Test Results Summary:")
    print("=" * 80)
    print(f"Total Requests Completed: {len(latencies_arr):,}")
    print(f"Actual Duration:          {actual_duration:.2f} s")
    print(f"Throughput:               {rps:.1f} requests/sec")
    print(f"Status Code Breakdown:    {status_counts}")
    print(f"Total Failures (>=500):   {len(errors)}")
    print(f"Mean Latency:             {mean_lat:.2f} ms")
    print(f"Median (p50):             {p50:.2f} ms")
    print(f"p90 Latency:              {p90:.2f} ms")
    print(f"p95 Latency:              {p95:.2f} ms")
    print(f"p99 Latency:              {p99:.2f} ms")
    print(f"Max Latency:              {max_lat:.2f} ms")
    print(f"Initial RSS Memory:       {start_rss_mb:.2f} MB")
    print(f"Peak RSS Memory:          {peak_rss_mb:.2f} MB")
    print(f"Final RSS Memory:         {final_rss_mb:.2f} MB")
    print(f"RSS Memory Delta:         {final_rss_mb - start_rss_mb:+.2f} MB")

    results = {
        "benchmark_metadata": {
            "timestamp": "2026-10-30T23:25:00+05:30",
            "concurrency": concurrency,
            "target_duration_seconds": duration_seconds,
            "actual_duration_seconds": round(actual_duration, 2),
            "workload_endpoints": len(TEST_WORKLOAD)
        },
        "performance_metrics": {
            "total_requests": len(latencies_arr),
            "throughput_rps": round(rps, 2),
            "status_codes": status_counts,
            "failure_count": len(errors),
            "failure_rate_pct": round((len(errors) / max(1, len(latencies_arr))) * 100, 4)
        },
        "latency_percentiles_ms": {
            "mean": round(mean_lat, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "max": round(max_lat, 2)
        },
        "memory_profile_mb": {
            "start_rss_mb": round(start_rss_mb, 2),
            "peak_rss_mb": round(peak_rss_mb, 2),
            "final_rss_mb": round(final_rss_mb, 2),
            "delta_rss_mb": round(final_rss_mb - start_rss_mb, 2)
        }
    }

    out_path = DOCS_DIR / "experiments" / "load_test_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n[OK] Saved load test results to {out_path}")
    return results


if __name__ == "__main__":
    dur = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    conc = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    run_load_test(dur, conc)
