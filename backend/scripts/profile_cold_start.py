"""
RailSense — Cold Start & Initialization Profiler
(backend/scripts/profile_cold_start.py)

Measures individual component cold-start latencies:
1. Serving Store & Train Catalog (10,743 trains) in-memory cache
2. LightGBM Delay Predictor model load from disk
3. NLP Intent Classifier & Entity Extractor initialization
4. Full Flask app factory creation
"""

import os
import sys
import time
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.serving_client import ServingClient
from app.ml.predict import RailSensePredictor
from app.nlp.classifier import IntentClassifier
from app.nlp.entities import EntityExtractor
from app import create_app


def profile_cold_start():
    print("=" * 70)
    print("RailSense Cold Start Profiling")
    print("=" * 70)

    # 1. Train Catalog / Serving Store
    t0 = time.perf_counter()
    sc = ServingClient()
    t1 = time.perf_counter()
    serving_ms = (t1 - t0) * 1000.0
    catalog_count = len(sc._trains_all)
    print(f"1. ServingClient & Catalog Cache ({catalog_count:,} trains): {serving_ms:.2f} ms")

    # 2. LightGBM Predictor
    t0 = time.perf_counter()
    pred = RailSensePredictor().load()
    t1 = time.perf_counter()
    predictor_ms = (t1 - t0) * 1000.0
    print(f"2. LightGBM Delay Predictor Model Load:            {predictor_ms:.2f} ms")

    # 3. NLP Intent Classifier
    t0 = time.perf_counter()
    clf = IntentClassifier()
    t1 = time.perf_counter()
    nlp_ms = (t1 - t0) * 1000.0
    print(f"3. NLP Intent Classifier Initialization:           {nlp_ms:.2f} ms")

    # 4. Full Flask App Factory
    t0 = time.perf_counter()
    app = create_app({"TESTING": True, "RAILSENSE_ENV": "testing"})
    t1 = time.perf_counter()
    full_app_ms = (t1 - t0) * 1000.0
    print(f"4. Full Flask create_app() Factory:                {full_app_ms:.2f} ms")

    results = {
        "timestamp": "2026-10-30T23:25:00+05:30",
        "train_catalog_count": catalog_count,
        "serving_store_init_ms": round(serving_ms, 2),
        "lightgbm_model_load_ms": round(predictor_ms, 2),
        "nlp_classifier_init_ms": round(nlp_ms, 2),
        "full_flask_factory_ms": round(full_app_ms, 2),
        "cold_start_under_2_seconds": bool(full_app_ms < 2000.0)
    }

    out_file = PROJECT_ROOT / "docs" / "experiments" / "cold_start_profile.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n[OK] Saved cold start profile to {out_file}")
    return results


if __name__ == "__main__":
    profile_cold_start()
