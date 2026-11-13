"""
RailSense — Inference Latency Benchmark (backend/scripts/benchmark_predict.py)
Measures real in-process single prediction latency over 200 iterations after warmup.
Outputs measured p50 and p95 latency to docs/experiments/inference_latency.json.
Provenance: machine-local, single-threaded, in-process Python CPU (excludes HTTP/network framing).
"""

import os
import sys
import time
import json
import datetime
from pathlib import Path
import numpy as np
import pandas as pd

# Ensure backend directory is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.ml.predict import RailSensePredictor

# Real evaluation sample inputs
SAMPLE_STOPS = [
    {"train_number": "12951", "station_code": "BRC", "scheduled_arrival": "2026-10-24 21:06:00", "seq": 4, "category": "RAJ"},
    {"train_number": "12951", "station_code": "RTM", "scheduled_arrival": "2026-10-24 23:55:00", "seq": 5, "category": "RAJ"},
    {"train_number": "12002", "station_code": "AGC", "scheduled_arrival": "2026-10-24 07:50:00", "seq": 3, "category": "SHT"},
    {"train_number": "12002", "station_code": "GWL", "scheduled_arrival": "2026-10-24 09:23:00", "seq": 4, "category": "SHT"},
    {"train_number": "12301", "station_code": "CNB", "scheduled_arrival": "2026-10-24 21:35:00", "seq": 3, "category": "RAJ"},
    {"train_number": "12301", "station_code": "DDU", "scheduled_arrival": "2026-10-24 00:50:00", "seq": 4, "category": "RAJ"},
    {"train_number": "22691", "station_code": "SC", "scheduled_arrival": "2026-10-24 07:15:00", "seq": 6, "category": "RAJ"},
    {"train_number": "12626", "station_code": "BPL", "scheduled_arrival": "2026-10-24 05:40:00", "seq": 12, "category": "SUF"},
]


def run_benchmark(num_runs: int = 200, warmup_runs: int = 15):
    print("=" * 70)
    print("RailSense — Single Inference Latency Benchmark")
    print("=" * 70)

    predictor = RailSensePredictor()
    predictor.load()
    print("[OK] Loaded RailSensePredictor models and historical tables.")

    # Warm-up phase
    print(f"Executing {warmup_runs} warm-up predictions...")
    for i in range(warmup_runs):
        sample = SAMPLE_STOPS[i % len(SAMPLE_STOPS)]
        predictor.predict_single(
            train_number=sample["train_number"],
            station_code=sample["station_code"],
            scheduled_arrival=sample["scheduled_arrival"],
            seq=sample["seq"],
            category=sample["category"]
        )

    # Timed benchmark phase
    print(f"Benchmarking {num_runs} single-stop predictions with high-resolution timer...")
    latencies_ms = []

    for i in range(num_runs):
        sample = SAMPLE_STOPS[i % len(SAMPLE_STOPS)]
        start_ns = time.perf_counter_ns()
        predictor.predict_single(
            train_number=sample["train_number"],
            station_code=sample["station_code"],
            scheduled_arrival=sample["scheduled_arrival"],
            seq=sample["seq"],
            category=sample["category"]
        )
        end_ns = time.perf_counter_ns()
        latencies_ms.append((end_ns - start_ns) / 1_000_000.0)

    p50 = float(np.percentile(latencies_ms, 50))
    p95 = float(np.percentile(latencies_ms, 95))
    p99 = float(np.percentile(latencies_ms, 99))
    mean_lat = float(np.mean(latencies_ms))
    min_lat = float(np.min(latencies_ms))
    max_lat = float(np.max(latencies_ms))

    print(f"Results across {num_runs} real runs:")
    print(f"  Median (p50): {p50:.2f} ms")
    print(f"  95th percentile (p95): {p95:.2f} ms")
    print(f"  99th percentile (p99): {p99:.2f} ms")
    print(f"  Mean: {mean_lat:.2f} ms")
    print(f"  Min / Max: {min_lat:.2f} ms / {max_lat:.2f} ms")

    benchmark_data = {
        "benchmark_timestamp": pd.Timestamp.now().isoformat(),
        "iterations": num_runs,
        "warmup_iterations": warmup_runs,
        "measured_single_prediction_p50_ms": round(p50, 2),
        "measured_single_prediction_p95_ms": round(p95, 2),
        "measured_single_prediction_p99_ms": round(p99, 2),
        "measured_single_prediction_mean_ms": round(mean_lat, 2),
        "target_p95_ms": 25.0,
        "method": "In-process Python 3.10 CPU single-threaded predict_single calls on real schedule inputs with factor extraction",
        "provenance": "machine-local, single-threaded, in-process Python CPU (excludes network/HTTP framing)"
    }

    out_path = PROJECT_ROOT / "docs" / "experiments" / "inference_latency.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)

    print(f"[OK] Saved latency benchmark to {out_path}")
    return benchmark_data


if __name__ == "__main__":
    run_benchmark()
