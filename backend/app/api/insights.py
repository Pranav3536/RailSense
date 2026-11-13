"""
RailSense — Smart Insights Natural Language Analytics API (backend/app/api/insights.py)
Exposes POST /api/insights/query and GET /api/insights/examples.
Uses local TF-IDF + RapidFuzz NLP service with zero external network dependencies.
"""

import hashlib
import json
import logging
from typing import Dict, Any
from flask import Blueprint, request, jsonify, current_app

from app.nlp.normalizer import MAX_QUESTION_LENGTH, TextNormalizationError

insights_bp = Blueprint('insights', __name__)
logger = logging.getLogger('railsense.insights')


@insights_bp.route('/insights/query', methods=['POST'])
def query_insights():
    """
    Submits a natural language delay query to the local NLP engine.
    Rate limited to 30 requests/minute.
    Never logs the full user question (privacy rule: sha256 prefix + length only).
    """
    # 1. Content-Type Check
    if not request.is_json:
        return jsonify({
            "error": {
                "code": "UNSUPPORTED_MEDIA_TYPE",
                "message": "Content-Type must be 'application/json'."
            }
        }), 415

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON_BODY",
                "message": "Request body must be a valid JSON object."
            }
        }), 400

    question = body.get("question")
    if question is None:
        return jsonify({
            "error": {
                "code": "MISSING_QUESTION",
                "message": "Field 'question' is required."
            }
        }), 422

    if not isinstance(question, str):
        return jsonify({
            "error": {
                "code": "INVALID_QUESTION_TYPE",
                "message": "Field 'question' must be a string."
            }
        }), 422

    stripped_q = question.strip()
    if not stripped_q:
        return jsonify({
            "error": {
                "code": "EMPTY_QUESTION",
                "message": "Field 'question' cannot be empty or whitespace only."
            }
        }), 422

    if len(stripped_q) > MAX_QUESTION_LENGTH:
        return jsonify({
            "error": {
                "code": "QUESTION_TOO_LONG",
                "message": f"Question length ({len(stripped_q)}) exceeds maximum limit of {MAX_QUESTION_LENGTH} characters."
            }
        }), 422

    selected_entities = body.get("selected_entities")
    if selected_entities is not None and not isinstance(selected_entities, dict):
        return jsonify({
            "error": {
                "code": "INVALID_ENTITIES_FORMAT",
                "message": "Field 'selected_entities' must be a JSON object if provided."
            }
        }), 422

    top_n = body.get("top_n")
    if top_n is not None:
        try:
            top_n = int(top_n)
            if top_n < 1 or top_n > 20:
                top_n = 10
        except (ValueError, TypeError):
            top_n = 10

    # Privacy-preserving structured logging: hash + length only
    q_hash = hashlib.sha256(stripped_q.encode('utf-8')).hexdigest()[:8]
    logger.info("nlp_query_received", extra={"q_hash": q_hash, "q_len": len(stripped_q)})

    # Retrieve NLP service from app state
    nlp_service = current_app.config.get("NLP_SERVICE")
    if not nlp_service:
        return jsonify({
            "error": {
                "code": "NLP_SERVICE_UNAVAILABLE",
                "message": "Smart Insights NLP service is not configured."
            }
        }), 503

    try:
        response_payload = nlp_service.process_query(
            question=stripped_q,
            selected_entities=selected_entities,
            top_n=top_n
        )
        return jsonify(response_payload), 200

    except TextNormalizationError as e:
        return jsonify({
            "error": {
                "code": "NORMALIZATION_ERROR",
                "message": str(e)
            }
        }), 422
    except Exception as e:
        logger.error("nlp_processing_error", extra={"error": str(e), "q_hash": q_hash})
        return jsonify({
            "error": {
                "code": "PROCESSING_ERROR",
                "message": "An error occurred while evaluating your question."
            }
        }), 500


@insights_bp.route('/insights/examples', methods=['GET'])
def get_insights_examples():
    """
    Returns curated example questions derived dynamically from the intent catalog,
    along with descriptions of what the NLP engine can and cannot answer.
    """
    nlp_service = current_app.config.get("NLP_SERVICE")
    intents_meta = []
    sample_chips = []

    if nlp_service and hasattr(nlp_service, 'classifier') and nlp_service.classifier:
        meta_dict = nlp_service.classifier.intent_metadata
        for intent_name, info in meta_dict.items():
            if intent_name not in ("out_of_scope", "fallback"):
                intents_meta.append({
                    "intent": intent_name,
                    "description": info.get("description", "")
                })

    # Curated, diverse example questions across key intents
    curated_examples = [
        {"question": "What is the overall delay rate across Indian Railways?", "intent": "fleet_summary", "badge": "Overview"},
        {"question": "Which train category is most delayed?", "intent": "category_ranking", "badge": "Categories"},
        {"question": "How punctual are Suburban trains compared to Express?", "intent": "compare_categories", "badge": "Comparison"},
        {"question": "What are the worst stops for train 12951?", "intent": "train_worst_stops", "badge": "Train Timetable"},
        {"question": "Which stations are the worst delay hotspots?", "intent": "station_hotspots", "badge": "Hotspots"},
        {"question": "What time of day are trains most delayed?", "intent": "hour_pattern", "badge": "Temporal"},
        {"question": "How punctual is station NDLS?", "intent": "station_summary", "badge": "Stations"},
        {"question": "Sabse zyada late kaun si train hoti hai?", "intent": "train_hotspots", "badge": "Hinglish"},
        {"question": "Will train 12951 be delayed tomorrow?", "intent": "predict_redirect", "badge": "Prediction"},
        {"question": "Why are Indian trains always late?", "intent": "causal_refusal", "badge": "Non-Causal"}
    ]

    return jsonify({
        "examples": curated_examples,
        "capabilities": {
            "supported_topics": [
                "Fleet-level punctuality and delay summary",
                "Category delay rankings and comparisons (SUB, MEX, SUF, VNDB, etc.)",
                "Hourly arrival patterns (0-23 IST) and weekday variations",
                "Station delay hotspots with Wilson 95% confidence intervals",
                "Train timetable deep dive and worst-supported route stops",
                "Model transparency and evaluation metrics (AP, ROC-AUC, threshold)"
            ],
            "unsupported_topics": [
                "Ticket booking, PNR status, seat availability, or IRCTC accounts",
                "Live GPS train running tracking or real-time location",
                "Physical causality claims (fog, signaling failures, track maintenance)"
            ],
            "methodology": "Predefined parameterised templates matched via local TF-IDF (1-2 word + 3-5 char n-grams) and RapidFuzz over precomputed SQLite catalogs. No runtime LLMs or free-form SQL generation."
        },
        "supported_intents": intents_meta,
        "data_as_of": "2026-10-25"
    }), 200
