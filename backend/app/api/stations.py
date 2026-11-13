"""
RailSense — Station Catalog Endpoints (backend/app/api/stations.py)
Provides paginated station search, Wilson confidence bounds, category mix,
and calling trains samples from the precomputed serving SQLite store.
"""

from flask import Blueprint, jsonify, request, current_app

stations_bp = Blueprint('stations', __name__)


@stations_bp.route('/stations', methods=['GET'])
def list_stations():
    """
    Search and paginate station catalog.
    Query parameters:
      - q: search station_code prefix
      - page: page number (default 1)
      - page_size: items per page (default 20, max 100)
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    if not serving_client:
        return jsonify({
            "error": {
                "code": "SERVING_STORE_UNAVAILABLE",
                "message": "Serving store client is not configured."
            }
        }), 503

    query = request.args.get("q", "").strip() or None

    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 20))
    except (ValueError, TypeError):
        return jsonify({
            "error": {
                "code": "INVALID_PAGINATION",
                "message": "Query parameters 'page' and 'page_size' must be integers."
            }
        }), 400

    max_page_size = current_app.config.get("API_MAX_PAGE_SIZE", 100)
    page_size = min(page_size, max_page_size)

    try:
        results = serving_client.get_stations(
            query=query,
            page=page,
            page_size=page_size
        )
        results["definition"] = "delayed = arrival_delay_min > 15m on label-eligible arrivals (seq > 1, arrival_reported = 1)"
        results["data_as_of"] = "2026-10-25"
        return jsonify(results), 200
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATABASE_ERROR",
                "message": f"Failed to retrieve stations: {str(e)}"
            }
        }), 500


@stations_bp.route('/stations/<station_code>', methods=['GET'])
def get_station_detail(station_code: str):
    """
    Fetch comprehensive station profile:
    - Station code and total stops observed
    - Observed delay rate with 95% Wilson score confidence intervals
    - Average and median arrival delay in minutes
    - Train category distribution at this station
    - Top trains calling at this station with their observed delay rates
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    if not serving_client:
        return jsonify({
            "error": {
                "code": "SERVING_STORE_UNAVAILABLE",
                "message": "Serving store client is not configured."
            }
        }), 503

    clean_stn = str(station_code).upper().strip()
    if not clean_stn:
        return jsonify({
            "error": {
                "code": "INVALID_STATION_CODE",
                "message": "Station code cannot be empty."
            }
        }), 400

    try:
        stn_data = serving_client.get_station_detail(clean_stn)
        if not stn_data:
            return jsonify({
                "error": {
                    "code": "STATION_NOT_FOUND",
                    "message": f"Station '{clean_stn}' not found in catalog.",
                    "details": None
                }
            }), 404

        stn_data["data_as_of"] = "2026-10-25"
        return jsonify(stn_data), 200
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATABASE_ERROR",
                "message": f"Failed to retrieve station detail: {str(e)}"
            }
        }), 500
