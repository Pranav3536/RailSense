"""
RailSense — Smart Insights NLP Service (backend/app/nlp/__init__.py)
Unified pipeline coordinating normalizer, entity extractor, intent classifier, and template engine.
"""

from pathlib import Path
from typing import Dict, Any, Optional
import hashlib

from .normalizer import normalize_query, TextNormalizationError, MAX_QUESTION_LENGTH
from .entities import EntityExtractor
from .classifier import IntentClassifier
from .templates import TemplateEngine


class SmartInsightsService:
    """End-to-end local NLP query processing service."""

    def __init__(self, serving_client):
        self.client = serving_client
        self.extractor = EntityExtractor(serving_client)
        self.classifier = IntentClassifier()
        self.templates = TemplateEngine(serving_client)

    def process_query(
        self,
        question: str,
        selected_entities: Optional[Dict[str, Any]] = None,
        top_n: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes complete NLP pipeline on user question.
        
        Args:
            question: User natural language query string (max 300 chars).
            selected_entities: Optional dict of explicit entities from clarification resubmit.
            top_n: Optional limit (1 to 20).
            
        Returns:
            Dict conforming to the Smart Insights API contract.
        """
        # 1. Validation and Normalization
        clean_raw, norm_text = normalize_query(question)

        # Hash for structured privacy logging
        q_hash = hashlib.sha256(norm_text.encode('utf-8')).hexdigest()[:8]

        # 2. Entity Extraction
        entities = self.extractor.extract(clean_raw, norm_text)

        # Merge selected entities if user picked from clarification candidates
        if selected_entities and isinstance(selected_entities, dict):
            for k in ("train_number", "station_code", "category", "train_name"):
                if k in selected_entities and selected_entities[k]:
                    entities[k] = selected_entities[k]
            entities["needs_clarification"] = False
            entities["clarification_candidates"] = None

        if top_n is not None:
            try:
                entities["top_n"] = max(1, min(20, int(top_n)))
            except (ValueError, TypeError):
                pass

        # 3. Intent Classification
        clf_result = self.classifier.predict(norm_text)
        intent = clf_result["intent"]
        confidence = clf_result["confidence"]
        confidence_level = clf_result["confidence_level"]
        margin = clf_result["margin"]
        is_fallback = clf_result["is_fallback"]
        top_candidates = clf_result["top_candidates"]

        # Check for ambiguity clarification flow
        if entities.get("needs_clarification") and entities.get("clarification_candidates"):
            return {
                "query": clean_raw,
                "understood_intent": "clarification_needed",
                "confidence": confidence,
                "confidence_level": "MEDIUM",
                "margin": margin,
                "entities": {
                    "train_number": None,
                    "train_name": entities.get("train_name"),
                    "station_code": entities.get("station_code"),
                    "category": entities.get("category"),
                    "weekday": entities.get("weekday"),
                    "time_of_day": entities.get("time_of_day")
                },
                "needs_clarification": True,
                "clarification_options": entities.get("clarification_candidates"),
                "suggestions": [],
                "answer": {
                    "answer_text": f"I found multiple trains matching '{entities.get('train_name')}'. Which one did you mean?",
                    "visual_type": "none",
                    "visual_data": None,
                    "definition_note": "Select the exact train service from the list below to proceed.",
                    "support_badge": "Ambiguity Resolution",
                    "caveats": ["Fuzzy matching identified multiple close train service names."]
                },
                "explanation": {
                    "template_id": "clarification_needed",
                    "resolved_intent": intent,
                    "confidence_score": confidence,
                    "confidence_margin": margin,
                    "data_source": "Precomputed Serving SQLite Store",
                    "safety_note": "Deterministic candidate resolution; no SQL generated"
                },
                "data_as_of": "2026-10-25"
            }

        # Handle low-confidence fallback with suggestions
        if is_fallback:
            return {
                "query": clean_raw,
                "understood_intent": "fallback",
                "confidence": confidence,
                "confidence_level": confidence_level,
                "margin": margin,
                "entities": {
                    "train_number": entities.get("train_number"),
                    "station_code": entities.get("station_code"),
                    "category": entities.get("category"),
                    "weekday": entities.get("weekday"),
                    "time_of_day": entities.get("time_of_day")
                },
                "needs_clarification": False,
                "clarification_options": [],
                "suggestions": top_candidates,
                "answer": {
                    "answer_text": "I am not sure I understood your query. Here are a few related delay analytics questions you can ask:",
                    "visual_type": "none",
                    "visual_data": None,
                    "definition_note": "Natural query confidence below threshold. Suggesting closest classified intents.",
                    "support_badge": "Local Fallback",
                    "caveats": ["Try mentioning a specific 5-digit train number, station code, or service category."]
                },
                "explanation": {
                    "template_id": "fallback",
                    "resolved_intent": "fallback",
                    "confidence_score": confidence,
                    "confidence_margin": margin,
                    "data_source": "Local TF-IDF Classifier",
                    "safety_note": "Zero LLM guess work; truthful fallback provided"
                },
                "data_as_of": "2026-10-25"
            }

        # 4. Execute Template Builder
        answer_payload = self.templates.execute(intent, entities, clean_raw)

        return {
            "query": clean_raw,
            "understood_intent": intent,
            "confidence": confidence,
            "confidence_level": confidence_level,
            "margin": margin,
            "entities": {
                "train_number": entities.get("train_number"),
                "train_name": entities.get("train_name"),
                "station_code": entities.get("station_code"),
                "category": entities.get("category"),
                "weekday": entities.get("weekday"),
                "time_of_day": entities.get("time_of_day"),
                "order": entities.get("order"),
                "top_n": entities.get("top_n")
            },
            "needs_clarification": False,
            "clarification_options": [],
            "suggestions": [],
            "answer": answer_payload,
            "explanation": {
                "template_id": answer_payload.get("template_id", intent),
                "resolved_intent": intent,
                "confidence_score": confidence,
                "confidence_margin": margin,
                "data_source": "Precomputed Serving SQLite Store & Analytics JSON",
                "safety_note": "No runtime LLM, no user text concatenated into SQL"
            },
            "data_as_of": "2026-10-25"
        }
