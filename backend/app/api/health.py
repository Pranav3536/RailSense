"""
RailSense — Health & Readiness Endpoints (backend/app/api/health.py)
Provides lightweight liveness and truthful local-component readiness checks.
Uses local precomputed SQLite store, trained model artifacts, and JSON analytics.
Completely free of any runtime database or remote socket dependencies.
"""

import time
from typing import Dict, Any, Tuple
from flask import Blueprint, jsonify, current_app

health_bp = Blueprint('health', __name__)

_READINESS_CACHE: Dict[str, Any] = {
    "response": None,
    "status_code": 200,
    "expires_at": 0.0
}
_CACHE_TTL_SECONDS = 5.0


@health_bp.route('/health', methods=['GET'])
def liveness():
    """Lightweight liveness probe (no disk or heavy I/O)."""
    return jsonify({
        "status": "healthy",
        "service": "RailSense API",
        "version": "1.0.0",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC")
    }), 200


@health_bp.route('/health/ready', methods=['GET'])
def readiness():
    """
    Truthful local readiness probe:
    - Precomputed serving store accessible (read-only SQLite query)
    - Prediction engine model artifacts loaded in memory
    - Static JSON analytics documents present and readable
    
    Zero remote database credentials or network socket dependencies.
    Caches check results for 5 seconds to prevent polling overhead.
    """
    now = time.time()
    is_testing = current_app.config.get("TESTING", False)
    if not is_testing and _READINESS_CACHE["response"] is not None and now < _READINESS_CACHE["expires_at"]:
        cached_resp = dict(_READINESS_CACHE["response"])
        cached_resp["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S UTC")
        return jsonify(cached_resp), _READINESS_CACHE["status_code"]

    serving_client = current_app.config.get("SERVING_CLIENT")
    predictor = current_app.config.get("PREDICTOR")

    # 1. Check Precomputed Serving Store
    serving_status = "unavailable"
    if serving_client and hasattr(serving_client, "sqlite_path") and serving_client.sqlite_path.exists():
        try:
            conn = serving_client.get_connection()
            conn.execute("PRAGMA user_version;").fetchone()
            conn.close()
            serving_status = "ready"
        except Exception:
            serving_status = "error"

    # 2. Check Prediction Engine
    model_status = "ready" if (predictor and getattr(predictor, "is_loaded", False)) else "unavailable"

    # 3. Check JSON Analytics Files
    analytics_status = "unavailable"
    if serving_client and hasattr(serving_client, "serving_dir"):
        sdir = serving_client.serving_dir
        if (sdir / "overview.json").exists() and (sdir / "patterns.json").exists() and (sdir / "model_lab.json").exists():
            analytics_status = "ready"
        else:
            analytics_status = "degraded"
    else:
        analytics_status = "ready"

    # Determine overall status
    is_ready = (serving_status == "ready" and model_status == "ready" and analytics_status == "ready")
    is_degraded = (serving_status == "ready" or model_status == "ready") and not is_ready

    if is_ready:
        overall_status = "ready"
        status_code = 200
    elif is_degraded:
        overall_status = "degraded"
        status_code = 200
    else:
        overall_status = "not_ready"
        status_code = 503

    model_ver = "1.0.0"
    if predictor and hasattr(predictor, "metadata") and predictor.metadata:
        model_ver = predictor.metadata.get("version", "1.0.0")

    result = {
        "status": overall_status,
        "service": "RailSense API",
        "version": "1.0.0",
        "model_version": model_ver,
        "data_as_of": "2026-10-25",
        "data_source": "precomputed_local",
        "components": {
            "serving_store": serving_status,
            "prediction_engine": model_status,
            "json_analytics": analytics_status
        },
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC")
    }

    _READINESS_CACHE["response"] = result
    _READINESS_CACHE["status_code"] = status_code
    _READINESS_CACHE["expires_at"] = now + _CACHE_TTL_SECONDS

    return jsonify(result), status_code
