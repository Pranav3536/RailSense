"""
RailSense — Temporal & Spatial Patterns Endpoint (backend/app/api/patterns.py)
Provides precomputed delay distributions by departure hour, day of week,
train category, route position progress, and observed delay hotspots.
"""

from flask import Blueprint, jsonify, current_app

patterns_bp = Blueprint('patterns', __name__)

PATTERN_KEY_MAP = {
    'hour': 'by_hour',
    'by_hour': 'by_hour',
    'dow': 'by_day_of_week',
    'day_of_week': 'by_day_of_week',
    'by_day_of_week': 'by_day_of_week',
    'position': 'by_position',
    'by_position': 'by_position',
    'hotspots': 'hotspots',
    'category': 'category',
    'by_category': 'category'
}

VALID_PATTERN_KINDS = {'hour', 'dow', 'category', 'position', 'hotspots'}


@patterns_bp.route('/patterns/<kind>', methods=['GET'])
def get_pattern(kind: str):
    """
    Returns empirical delay pattern distributions across 2.8M rows.
    Valid kinds:
      - hour: delay probability and mean delay by hour of day (0-23)
      - dow: delay probability and mean delay by day of week (Monday-Sunday)
      - category: delay distribution and volume across train categories
      - position: delay progression as a function of journey sequence position
      - hotspots: top observed delay hotspot stations with confidence intervals
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    if not serving_client:
        return jsonify({
            "error": {
                "code": "SERVING_STORE_UNAVAILABLE",
                "message": "Serving store client is not configured."
            }
        }), 503

    clean_kind = str(kind).lower().strip()
    target_key = PATTERN_KEY_MAP.get(clean_kind)

    if not target_key:
        return jsonify({
            "error": {
                "code": "INVALID_PATTERN_KIND",
                "message": f"Invalid pattern kind '{kind}'. Must be one of: {', '.join(sorted(VALID_PATTERN_KINDS))}",
                "valid_options": sorted(list(VALID_PATTERN_KINDS))
            }
        }), 400

    try:
        if target_key == 'category':
            ov_data = serving_client.get_overview_json()
            kind_data = ov_data.get("category_breakdown", [])
        else:
            patterns_data = serving_client.get_patterns_json()
            kind_data = patterns_data.get(target_key)

        if kind_data is None:
            return jsonify({
                "error": {
                    "code": "PATTERN_NOT_FOUND",
                    "message": f"Pattern section '{clean_kind}' not found in precomputed store."
                }
            }), 404

        return jsonify({
            "kind": clean_kind,
            "data": kind_data,
            "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
            "data_as_of": "2026-10-25"
        }), 200
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATA_LOAD_ERROR",
                "message": f"Failed to load patterns data: {str(e)}"
            }
        }), 500
