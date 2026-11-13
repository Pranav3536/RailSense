"""
RailSense — Reference Prediction Fixture Generator (backend/scripts/generate_smoke_expected.py)
Generates docs/deploy_smoke_expected.json with 20 deterministic reference predictions
used by smoke_deployed.py and E2E verification suites.
"""

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

REFERENCE_REQUESTS = [
    # 1-5: Train 12951 (Mumbai Central -> New Delhi Rajdhani)
    {"train_number": "12951", "station_code": "BVI", "seq": 2, "date": "2026-10-15"},
    {"train_number": "12951", "station_code": "ST", "seq": 3, "date": "2026-10-15"},
    {"train_number": "12951", "station_code": "BRC", "seq": 4, "date": "2026-10-15"},
    {"train_number": "12951", "station_code": "RTM", "seq": 5, "date": "2026-10-15"},
    {"train_number": "12951", "station_code": "NDLS", "seq": 8, "date": "2026-10-15"},

    # 6-10: Train 12952 (New Delhi -> Mumbai Central Rajdhani)
    {"train_number": "12952", "station_code": "KOTA", "seq": 2, "date": "2026-10-16"},
    {"train_number": "12952", "station_code": "NAD", "seq": 3, "date": "2026-10-16"},
    {"train_number": "12952", "station_code": "RTM", "seq": 4, "date": "2026-10-16"},
    {"train_number": "12952", "station_code": "BRC", "seq": 5, "date": "2026-10-16"},
    {"train_number": "12952", "station_code": "MMCT", "seq": 8, "date": "2026-10-16"},

    # 11-14: Train 12002 (Bhopal Shatabdi)
    {"train_number": "12002", "station_code": "MTJ", "seq": 2, "date": "2026-10-18"},
    {"train_number": "12002", "station_code": "AGC", "seq": 3, "date": "2026-10-18"},
    {"train_number": "12002", "station_code": "GWL", "seq": 6, "date": "2026-10-18"},
    {"train_number": "12002", "station_code": "VGLJ", "seq": 7, "date": "2026-10-18"},

    # 15-17: Train 12301 (Howrah Rajdhani)
    {"train_number": "12301", "station_code": "ASN", "seq": 2, "date": "2026-10-20"},
    {"train_number": "12301", "station_code": "DHN", "seq": 3, "date": "2026-10-20"},
    {"train_number": "12301", "station_code": "CNB", "seq": 8, "date": "2026-10-20"},

    # 18-20: Train 22436 (Vande Bharat Express) & Prospective Generalization Dates
    {"train_number": "22436", "station_code": "CNB", "seq": 2, "date": "2026-10-22"},
    {"train_number": "22436", "station_code": "BSB", "seq": 4, "date": "2026-10-22"},
    {"train_number": "12951", "station_code": "NDLS", "seq": 8, "date": "2026-11-05"},
]

def generate_reference_predictions():
    print("=" * 70)
    print("Generating 20 Reference Predictions for Post-Deploy Smoke Verification")
    print("=" * 70)

    app = create_app({"TESTING": True})
    client = app.test_client()

    reference_cases = []
    for idx, payload in enumerate(REFERENCE_REQUESTS, start=1):
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200, f"Request {idx} failed with {res.status_code}: {res.get_data(as_text=True)}"
        data = res.get_json()

        entry = {
            "id": idx,
            "request": payload,
            "expected_status": 200,
            "expected_probability": data["probability_delayed"],
            "expected_predicted_delayed": data["predicted_delayed"],
            "expected_risk_band": data["risk_band"],
            "expected_model_version": data["model_version"],
            "tolerance": 0.02
        }
        reference_cases.append(entry)
        print(f"[{idx:02d}/20] Train {payload['train_number']} -> {payload['station_code']}: p = {data['probability_delayed']:.4f} ({data['risk_band']})")

    out_file = PROJECT_ROOT / "docs" / "deploy_smoke_expected.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"version": "1.0.0", "reference_cases": reference_cases}, f, indent=2)

    print(f"\n[OK] Successfully saved 20 reference predictions to {out_file}")

if __name__ == "__main__":
    generate_reference_predictions()
