"""
RailSense — Temporal & Spatial Patterns Endpoint (backend/app/api/patterns.py)
Provides precomputed delay distributions by departure hour, day of week,
train category, route position progress, and observed delay hotspots.
"""

from flask import Blueprint, jsonify, current_app, request

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
      - hour: delay rate and mean delay by scheduled arrival hour (0-23 IST)
      - dow: delay rate and mean delay by day of week (Monday-Sunday, scheduled arrival date)
      - category: delay distribution and volume across train categories
      - position: delay progression as a function of journey sequence position bucket
      - hotspots: observed delay hotspots and punctual services (stations or trains)
        Query params for hotspots:
          * level: 'station' (default) or 'train'
          * order: 'top' (default, highest delay rate) or 'bottom' (most punctual)
          * min_support: integer (minimum allowed: 100 for stations, 50 for trains)
          * limit: integer (1 to 50, default 10)
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
        ov_data = serving_client.get_overview_json()
        fleet_delayed_rate = ov_data.get("delay_summary", {}).get("fleet_delayed_rate", 49.91)

        if target_key == 'category':
            kind_data = ov_data.get("category_breakdown", [])
            return jsonify({
                "kind": clean_kind,
                "data": kind_data,
                "fleet_delayed_rate": fleet_delayed_rate,
                "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
                "data_as_of": "2026-10-25"
            }), 200

        patterns_data = serving_client.get_patterns_json()
        raw_kind_data = patterns_data.get(target_key)

        if raw_kind_data is None:
            return jsonify({
                "error": {
                    "code": "PATTERN_NOT_FOUND",
                    "message": f"Pattern section '{clean_kind}' not found in precomputed store."
                }
            }), 404

        if clean_kind == 'hotspots':
            level = request.args.get('level', 'station').strip().lower()
            if level not in ('station', 'train'):
                level = 'station'

            order = request.args.get('order', 'top').strip().lower()
            if order not in ('top', 'bottom', 'punctual', 'delayed'):
                order = 'top'

            level_key = 'stations' if level == 'station' else 'trains'
            min_allowed_support = 100 if level == 'station' else 50
            
            try:
                limit = int(request.args.get('limit', 10))
                limit = max(1, min(50, limit))
            except (ValueError, TypeError):
                limit = 10

            try:
                min_sup_req = int(request.args.get('min_support', min_allowed_support))
                min_support = max(min_allowed_support, min_sup_req)
            except (ValueError, TypeError):
                min_support = min_allowed_support

            group_dict = raw_kind_data.get(level_key, {})
            pool = group_dict.get('top_hotspots', []) if order in ('top', 'delayed') else group_dict.get('top_punctual', [])
            
            # Filter by min_support if higher than base threshold
            filtered = [dict(item) for item in pool if item.get('stops_count', 0) >= min_support][:limit]

            # Enrich train items with train_name and category from catalog
            if level == 'train':
                for item in filtered:
                    tr_info = serving_client.get_train(item.get('train_number'))
                    if tr_info:
                        item['train_name'] = tr_info.get('train_name', '')
                        item['category'] = tr_info.get('category', '')

            return jsonify({
                "kind": "hotspots",
                "level": level,
                "order": 'top' if order in ('top', 'delayed') else 'bottom',
                "min_support": min_support,
                "limit": limit,
                "total_available": len(pool),
                "items": filtered,
                "data": filtered,
                "raw_hotspots": raw_kind_data,
                "definition": "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)",
                "data_as_of": "2026-10-25"
            }), 200

        return jsonify({
            "kind": clean_kind,
            "data": raw_kind_data,
            "fleet_delayed_rate": fleet_delayed_rate,
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
