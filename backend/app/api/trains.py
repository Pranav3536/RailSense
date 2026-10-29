"""
RailSense — Train Catalog Endpoints (backend/app/api/trains.py)
Provides paginated train search and full train route profiles with
precomputed stop-level delay statistics from the serving SQLite store.
"""

from flask import Blueprint, jsonify, request, current_app

trains_bp = Blueprint('trains', __name__)


@trains_bp.route('/trains', methods=['GET'])
def list_trains():
    """
    Search and paginate train catalog.
    Query parameters:
      - q: search train_number prefix or train_name substring
      - category: filter by train category (e.g. SUB, MEX, SUF, EXP)
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
    category = request.args.get("category", "").strip() or None

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
        results = serving_client.get_trains(
            query=query,
            category=category,
            page=page,
            page_size=page_size
        )
        results["definition"] = "delayed = arrival_delay_min > 15m on label-eligible stops in historical window (2026-10-07 to 2026-10-25)"
        results["data_as_of"] = "2026-10-25"
        return jsonify(results), 200
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATABASE_ERROR",
                "message": f"Failed to retrieve trains: {str(e)}"
            }
        }), 500


@trains_bp.route('/trains/<train_number>', methods=['GET'])
def get_train_detail(train_number: str):
    """
    Fetch comprehensive train profile:
    - Route origin and destination
    - Total runs observed
    - Full canonical schedule template with sequence numbers and scheduled times
    - Per-stop observed delay rates, sample sizes, and mean delays
    - Per-date delay history across the 19-day window
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    if not serving_client:
        return jsonify({
            "error": {
                "code": "SERVING_STORE_UNAVAILABLE",
                "message": "Serving store client is not configured."
            }
        }), 503

    clean_train = str(train_number).strip()
    if not clean_train:
        return jsonify({
            "error": {
                "code": "INVALID_TRAIN_NUMBER",
                "message": "Train number cannot be empty."
            }
        }), 400

    try:
        train_data = serving_client.get_train_detail(clean_train)
        if not train_data:
            return jsonify({
                "error": {
                    "code": "TRAIN_NOT_FOUND",
                    "message": f"Train '{clean_train}' not found in catalog.",
                    "details": None
                }
            }), 404

        train_data["data_as_of"] = "2026-10-25"
        return jsonify(train_data), 200
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATABASE_ERROR",
                "message": f"Failed to retrieve train detail: {str(e)}"
            }
        }), 500
