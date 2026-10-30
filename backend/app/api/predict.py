"""
RailSense — Real-Time Inference Endpoint (backend/app/api/predict.py)
Provides schedule-time delay probability predictions, calibrated risk bands,
feature attribution factors, and explicit operational caveats.
"""

from datetime import datetime
from flask import Blueprint, jsonify, request, current_app

predict_bp = Blueprint('predict', __name__)


@predict_bp.route('/predict', methods=['POST'])
def predict_delay():
    """
    Predicts arrival delay probability for a scheduled train stop.
    Request body (JSON):
      - train_number (str | int): e.g. "12951"
      - station_code (str): e.g. "BRC"
      - date (str): Journey start date in "YYYY-MM-DD" format
      - seq (int, optional): Route stop sequence number (required if station repeats on loop)
    """
    serving_client = current_app.config.get("SERVING_CLIENT")
    predictor = current_app.config.get("PREDICTOR")

    if not serving_client or not predictor:
        return jsonify({
            "error": {
                "code": "SERVICE_UNAVAILABLE",
                "message": "Serving store or prediction engine is not initialized."
            }
        }), 503

    if not request.is_json:
        return jsonify({
            "error": {
                "code": "UNSUPPORTED_MEDIA_TYPE",
                "message": "Content-Type must be application/json."
            }
        }), 415

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a valid JSON object."
            }
        }), 400

    train_number = payload.get("train_number")
    station_code = payload.get("station_code")
    date_str = payload.get("date")
    seq_input = payload.get("seq")

    # Validate required parameters
    missing = []
    if not train_number:
        missing.append("train_number")
    if not station_code:
        missing.append("station_code")
    if not date_str:
        missing.append("date")

    if missing:
        return jsonify({
            "error": {
                "code": "MISSING_REQUIRED_FIELDS",
                "message": f"Missing required fields: {', '.join(missing)}",
                "missing_fields": missing
            }
        }), 400

    # Validate date format
    try:
        parsed_date = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({
            "error": {
                "code": "INVALID_DATE_FORMAT",
                "message": f"Date '{date_str}' is invalid. Format must be 'YYYY-MM-DD'."
            }
        }), 400

    # Validate optional seq
    seq_val = None
    if seq_input is not None:
        try:
            seq_val = int(seq_input)
            if seq_val <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "error": {
                    "code": "INVALID_SEQUENCE_NUMBER",
                    "message": "Parameter 'seq' must be a positive integer."
                }
            }), 400

    # Resolve train stop against canonical route template in serving store
    try:
        stop_info, err_code, err_details = serving_client.resolve_train_stop(
            train_number=train_number,
            station_code=station_code,
            seq=seq_val
        )
    except Exception as e:
        return jsonify({
            "error": {
                "code": "DATABASE_ERROR",
                "message": f"Failed to resolve route: {str(e)}"
            }
        }), 500

    if err_code:
        if err_code in ("TRAIN_NOT_FOUND", "STATION_NOT_ON_ROUTE", "SEQ_NOT_FOUND"):
            return jsonify({
                "error": {
                    "code": err_code,
                    "message": err_details
                }
            }), 404
        elif err_code == "ORIGIN_STOP":
            return jsonify({
                "error": {
                    "code": "ORIGIN_STOP_NOT_APPLICABLE",
                    "message": "Origin stops (seq=1) depart from the origin station and have no arrival delay. Arrival delay is only defined for subsequent stops (seq > 1)."
                }
            }), 422
        elif err_code == "MULTIPLE_STOPS_REQUIRE_SEQ":
            return jsonify({
                "error": {
                    "code": "MULTIPLE_STOPS_REQUIRE_SEQ",
                    "message": err_details["message"],
                    "valid_seq_options": err_details["valid_seq_options"]
                }
            }), 422
        else:
            return jsonify({
                "error": {
                    "code": err_code,
                    "message": str(err_details)
                }
            }), 400

    # Extract schedule parameters
    sched_arrival_time = stop_info.get("scheduled_arrival_time") or "12:00:00"
    resolved_seq = int(stop_info["seq"])
    category = stop_info["category"]
    scheduled_arrival_str = f"{parsed_date.strftime('%Y-%m-%d')} {sched_arrival_time}"

    # Perform inference
    try:
        pred_res = predictor.predict_single(
            train_number=train_number,
            station_code=station_code,
            scheduled_arrival=scheduled_arrival_str,
            seq=resolved_seq,
            category=category,
            start_date=parsed_date.strftime('%Y-%m-%d')
        )
    except Exception as e:
        return jsonify({
            "error": {
                "code": "PREDICTION_FAILED",
                "message": f"Model inference error: {str(e)}"
            }
        }), 500

    calib_prob = pred_res["delay_probability"]

    # Assign risk band
    if calib_prob >= 0.65:
        risk_band = "High"
    elif calib_prob >= 0.35:
        risk_band = "Medium"
    else:
        risk_band = "Low"

    # Contextual historical lookup
    hist_ctx = {
        "train_category": category,
        "is_cold_start": pred_res.get("is_cold_start", False),
        "stop_sequence": resolved_seq,
        "scheduled_arrival_time": sched_arrival_time
    }

    caveats = [
        "Pre-departure timetable model: assumes scheduled route and standard operating conditions.",
        "Does not observe dynamic real-time en-route incidents, signal failures, or sudden weather disruptions.",
        "Delay is defined as arrival_delay_min > 15 minutes at the scheduled stop."
    ]

    return jsonify({
        "train_number": str(train_number).strip(),
        "station_code": str(station_code).upper().strip(),
        "journey_date": parsed_date.strftime('%Y-%m-%d'),
        "seq": resolved_seq,
        "predicted_delayed": pred_res["is_delayed_predicted"],
        "probability_delayed": calib_prob,
        "probability_raw": pred_res["raw_probability"],
        "raw_probability": pred_res["raw_probability"],
        "risk_band": risk_band,
        "threshold_used": pred_res["threshold_used"],
        "contributing_factors": pred_res.get("contributing_factors", []),
        "historical_context": hist_ctx,
        "caveats": caveats,
        "model_version": predictor.metadata.get("version", "1.0.0"),
        "data_as_of": "2026-10-25"
    }), 200
