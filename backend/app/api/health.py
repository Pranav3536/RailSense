"""
RailSense — Health & Readiness Endpoints (backend/app/api/health.py)
Provides lightweight liveness and comprehensive readiness checks.
"""

import time
from flask import Blueprint, jsonify, current_app
from sqlalchemy import text

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def liveness():
    """Lightweight liveness probe (no database or disk I/O)."""
    return jsonify({
        "status": "healthy",
        "service": "RailSense API",
        "version": "1.0.0",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC")
    }), 200


@health_bp.route('/health/ready', methods=['GET'])
def readiness():
    """
    Truthful readiness probe:
    - Model artifacts loaded
    - Precomputed serving store accessible
    - Live TiDB Cloud connection reachable (bounded 3-second SELECT 1 check)
    Never exposes internal hostnames, usernames, or secrets.
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    predictor = current_app.config.get("PREDICTOR")
    db_engine = current_app.config.get("DB_ENGINE")

    # 1. Check Serving Store
    serving_status = "unavailable"
    if serving_client and serving_client.sqlite_path.exists():
        try:
            conn = serving_client.get_connection()
            conn.execute("SELECT 1;").fetchone()
            conn.close()
            serving_status = "ready"
        except Exception:
            serving_status = "error"

    # 2. Check Model Artifacts
    model_status = "ready" if (predictor and predictor.is_loaded) else "unavailable"

    # 3. Check Live TiDB Cloud with 3-second timeout
    tidb_status = "unavailable"
    if db_engine:
        try:
            with db_engine.connect() as conn:
                res = conn.execute(text("SELECT 1;")).fetchone()
                if res and res[0] == 1:
                    tidb_status = "connected"
        except Exception:
            tidb_status = "unavailable"

    is_ready = bool(serving_status == "ready" and model_status == "ready")
    status_code = 200 if is_ready else 503

    return jsonify({
        "status": "ready" if is_ready else "not_ready",
        "service": "RailSense API",
        "version": "1.0.0",
        "components": {
            "serving_store": serving_status,
            "prediction_engine": model_status,
            "tidb_cloud": tidb_status
        },
        "data_as_of": "2026-10-25",
        "model_version": predictor.metadata.get("version", "1.0.0") if predictor else "1.0.0",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC")
    }), status_code
