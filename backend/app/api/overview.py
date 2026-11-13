"""
RailSense — Overview Endpoint (backend/app/api/overview.py)
Returns macro dataset metrics, delay distributions, category breakdowns,
and worst observed delay hotspots from the precomputed serving store.
"""

from flask import Blueprint, jsonify, current_app

overview_bp = Blueprint('overview', __name__)


@overview_bp.route('/overview', methods=['GET'])
def get_overview():
    """
    Returns global system statistics and delay summaries.
    Data is precomputed and served from static analytics cache.
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    if not serving_client:
        return jsonify({
            "error": {
                "code": "SERVING_STORE_UNAVAILABLE",
                "message": "Serving store client is not configured."
            }
        }), 503

    try:
        data = serving_client.get_overview_json()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATA_LOAD_ERROR",
                "message": f"Failed to load overview data: {str(e)}"
            }
        }), 500
