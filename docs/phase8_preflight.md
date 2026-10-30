# Phase 8 Preflight Audit & Verification

Generated programmatically by `backend/scripts/run_phase8_preflight.py`.

## 1. CORS Verification
- Preflight OPTIONS `/api/predict`: HTTP 200
- Real POST `/api/predict`: HTTP 200
- Header `Access-Control-Allow-Origin`: `http://localhost:5173`

## 2. Real-Time Inference (`/api/predict`)
- Normal in-window (`12951`, `BRC`, `2026-10-15`, `seq=4`): HTTP 200
  - Probability delayed: 0.1584
  - Probability raw: 0.192
  - Risk band: Low
  - Threshold used: 0.42
- Out-of-window (`2026-11-05`): HTTP 200
- Cold start: HTTP 200, is_cold_start=False
- Loop route with seq (`02542`, `KGN`, `seq=4`): HTTP 200
- Repeated station without seq: HTTP 422 (MULTIPLE_STOPS_REQUIRE_SEQ)
- Origin stop (`seq=1`): HTTP 422 (ORIGIN_STOP_NOT_APPLICABLE)

## 3. Model Information & Metrics
- GET `/api/model/info`: HTTP 200, Architecture: `LightGBM Gradient Boosted Decision Trees + Isotonic Regression`
- GET `/api/model/metrics`: HTTP 200
  - Final test PR-AUC: 0.8525
  - Final test ROC-AUC: 0.8602
  - Final test F1: 0.7798
  - Curves present: ['calibration_reliability', 'precision_recall', 'roc']
  - Categories in test breakdown: 20
  - Position bins in test breakdown: 5
