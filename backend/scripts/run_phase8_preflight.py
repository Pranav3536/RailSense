"""
RailSense — Phase 8 Preflight Verification Script (backend/scripts/run_phase8_preflight.py)
Validates all endpoints for Phase 8:
- POST /api/predict (normal, out-of-window, cold-start, loop route, 422 seq required, 422 origin, invalid payload)
- CORS preflight and POST checks
- GET /api/model/info
- GET /api/model/metrics
Saves actual responses to frontend/src/test/fixtures/
"""

import sys
import json
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app

def run_preflight():
    app = create_app()
    client = app.test_client()
    fixtures_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "test" / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    results = {}

    print("--- 1. Testing CORS on /api/predict ---")
    cors_opt = client.options("/api/predict", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    })
    print(f"OPTIONS /api/predict: status={cors_opt.status_code}")
    print(f"CORS Headers: {dict(cors_opt.headers)}")
    assert cors_opt.status_code == 200, f"Expected 200, got {cors_opt.status_code}"

    cors_post = client.post("/api/predict", json={
        "train_number": "12951",
        "station_code": "BRC",
        "date": "2026-10-15",
        "seq": 4
    }, headers={"Origin": "http://localhost:5173"})
    print(f"POST /api/predict with Origin: status={cors_post.status_code}")
    assert cors_post.status_code == 200
    allow_origin = cors_post.headers.get("Access-Control-Allow-Origin")
    print(f"Access-Control-Allow-Origin: {allow_origin}")
    results["cors"] = {"options_status": cors_opt.status_code, "post_status": cors_post.status_code, "allow_origin": allow_origin}

    print("\n--- 2. Testing POST /api/predict Cases ---")
    
    # 2a. Normal in-window prediction
    normal_payload = {
        "train_number": "12951",
        "station_code": "BRC",
        "date": "2026-10-15",
        "seq": 4
    }
    res_normal = client.post("/api/predict", json=normal_payload)
    print(f"Normal prediction: status={res_normal.status_code}")
    normal_data = res_normal.get_json()
    assert res_normal.status_code == 200
    assert "probability_delayed" in normal_data
    assert "probability_raw" in normal_data
    assert "raw_probability" in normal_data
    assert "risk_band" in normal_data
    with open(fixtures_dir / "predictNormalFixture.json", "w", encoding="utf-8") as f:
        json.dump(normal_data, f, indent=2)
    results["normal"] = normal_data

    # 2b. Out-of-window date (e.g. 2026-11-05)
    out_payload = {
        "train_number": "12951",
        "station_code": "BRC",
        "date": "2026-11-05",
        "seq": 4
    }
    res_out = client.post("/api/predict", json=out_payload)
    print(f"Out-of-window prediction: status={res_out.status_code}")
    out_data = res_out.get_json()
    assert res_out.status_code == 200
    with open(fixtures_dir / "predictOutOfWindowFixture.json", "w", encoding="utf-8") as f:
        json.dump(out_data, f, indent=2)
    results["out_of_window"] = out_data

    # 2c. Cold-start case (rare/unknown train)
    # Using an unknown train or a train with cold start
    # Train 99999 or rare station
    cold_payload = {
        "train_number": "00149",
        "station_code": "KYN",
        "date": "2026-10-18"
    }
    res_cold = client.post("/api/predict", json=cold_payload)
    print(f"Cold-start prediction: status={res_cold.status_code}")
    cold_data = res_cold.get_json()
    assert res_cold.status_code == 200
    with open(fixtures_dir / "predictColdStartFixture.json", "w", encoding="utf-8") as f:
        json.dump(cold_data, f, indent=2)
    results["cold_start"] = cold_data

    # 2d. Loop route with seq (train 02542, station KGN, seq 3)
    loop_payload = {
        "train_number": "02542",
        "station_code": "KGN",
        "date": "2026-10-18",
        "seq": 3
    }
    res_loop = client.post("/api/predict", json=loop_payload)
    print(f"Loop route with seq: status={res_loop.status_code}")
    loop_data = res_loop.get_json()
    assert res_loop.status_code == 200
    with open(fixtures_dir / "predictLoopRouteFixture.json", "w", encoding="utf-8") as f:
        json.dump(loop_data, f, indent=2)
    results["loop_with_seq"] = loop_data

    # 2e. 422: Repeated station without seq (train 02542, station KGN)
    res_422_seq = client.post("/api/predict", json={
        "train_number": "02542",
        "station_code": "KGN",
        "date": "2026-10-18"
    })
    print(f"422 Seq required: status={res_422_seq.status_code}")
    assert res_422_seq.status_code == 422
    data_422_seq = res_422_seq.get_json()
    assert data_422_seq["error"]["code"] == "MULTIPLE_STOPS_REQUIRE_SEQ"
    with open(fixtures_dir / "predict422SeqRequiredFixture.json", "w", encoding="utf-8") as f:
        json.dump(data_422_seq, f, indent=2)
    results["422_seq_required"] = data_422_seq

    # 2f. 422: Origin stop (seq=1)
    res_422_origin = client.post("/api/predict", json={
        "train_number": "12951",
        "station_code": "MMCT",
        "date": "2026-10-18",
        "seq": 1
    })
    print(f"422 Origin stop: status={res_422_origin.status_code}")
    assert res_422_origin.status_code == 422
    data_422_origin = res_422_origin.get_json()
    assert data_422_origin["error"]["code"] == "ORIGIN_STOP_NOT_APPLICABLE"
    with open(fixtures_dir / "predict422OriginFixture.json", "w", encoding="utf-8") as f:
        json.dump(data_422_origin, f, indent=2)
    results["422_origin"] = data_422_origin

    # 2g. Invalid body (missing fields)
    res_400 = client.post("/api/predict", json={"train_number": "12951"})
    print(f"400 Missing fields: status={res_400.status_code}")
    assert res_400.status_code == 400

    print("\n--- 3. Testing GET /api/model/info ---")
    res_info = client.get("/api/model/info")
    print(f"GET /api/model/info: status={res_info.status_code}")
    assert res_info.status_code == 200
    info_data = res_info.get_json()
    with open(fixtures_dir / "modelInfoFixture.json", "w", encoding="utf-8") as f:
        json.dump(info_data, f, indent=2)
    results["model_info"] = info_data

    print("\n--- 4. Testing GET /api/model/metrics ---")
    res_metrics = client.get("/api/model/metrics")
    print(f"GET /api/model/metrics: status={res_metrics.status_code}")
    assert res_metrics.status_code == 200
    metrics_data = res_metrics.get_json()
    with open(fixtures_dir / "modelMetricsFixture.json", "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    results["model_metrics"] = metrics_data

    # Write summary preflight file
    preflight_doc = Path(__file__).resolve().parent.parent.parent / "docs" / "phase8_preflight.md"
    with open(preflight_doc, "w", encoding="utf-8") as f:
        f.write("# Phase 8 Preflight Audit & Verification\n\n")
        f.write("Generated programmatically by `backend/scripts/run_phase8_preflight.py`.\n\n")
        f.write("## 1. CORS Verification\n")
        f.write(f"- Preflight OPTIONS `/api/predict`: HTTP {cors_opt.status_code}\n")
        f.write(f"- Real POST `/api/predict`: HTTP {cors_post.status_code}\n")
        f.write(f"- Header `Access-Control-Allow-Origin`: `{allow_origin}`\n\n")
        f.write("## 2. Real-Time Inference (`/api/predict`)\n")
        f.write(f"- Normal in-window (`12951`, `BRC`, `2026-10-15`, `seq=4`): HTTP {res_normal.status_code}\n")
        f.write(f"  - Probability delayed: {normal_data['probability_delayed']}\n")
        f.write(f"  - Probability raw: {normal_data.get('probability_raw')}\n")
        f.write(f"  - Risk band: {normal_data['risk_band']}\n")
        f.write(f"  - Threshold used: {normal_data['threshold_used']}\n")
        f.write(f"- Out-of-window (`2026-11-05`): HTTP {res_out.status_code}\n")
        f.write(f"- Cold start: HTTP {res_cold.status_code}, is_cold_start={cold_data['historical_context']['is_cold_start']}\n")
        f.write(f"- Loop route with seq (`02542`, `KGN`, `seq=4`): HTTP {res_loop.status_code}\n")
        f.write(f"- Repeated station without seq: HTTP {res_422_seq.status_code} ({data_422_seq['error']['code']})\n")
        f.write(f"- Origin stop (`seq=1`): HTTP {res_422_origin.status_code} ({data_422_origin['error']['code']})\n\n")
        f.write("## 3. Model Information & Metrics\n")
        f.write(f"- GET `/api/model/info`: HTTP {res_info.status_code}, Architecture: `{info_data['architecture']}`\n")
        f.write(f"- GET `/api/model/metrics`: HTTP {res_metrics.status_code}\n")
        f.write(f"  - Final test PR-AUC: {metrics_data['final_test_metrics']['pr_auc']}\n")
        f.write(f"  - Final test ROC-AUC: {metrics_data['final_test_metrics']['roc_auc']}\n")
        f.write(f"  - Final test F1: {metrics_data['final_test_metrics']['f1_positive']}\n")
        f.write(f"  - Curves present: {list(metrics_data.get('curves', {}).keys())}\n")
        f.write(f"  - Categories in test breakdown: {len(metrics_data.get('per_category_test', {}))}\n")
        f.write(f"  - Position bins in test breakdown: {len(metrics_data.get('per_position_test', {}))}\n")

    print("\nPhase 8 Preflight completed successfully. Fixtures written.")

if __name__ == "__main__":
    run_preflight()
