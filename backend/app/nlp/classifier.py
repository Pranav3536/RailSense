"""
RailSense — Local NLP Intent Classifier (backend/app/nlp/classifier.py)
Uses TF-IDF (word 1-2 grams + character 3-5 grams) and LogisticRegression
to classify user natural language questions into predefined parameterised intents.
Zero external APIs, zero LLMs, 100% free and local.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import LogisticRegression

from .constants import CONFIDENCE_MED, MARGIN_MIN


class IntentClassifier:
    """Classifies user queries into discrete parameters intents with confidence scores."""

    def __init__(self, intents_path: Optional[Path] = None):
        if intents_path is None:
            intents_path = Path(__file__).resolve().parent / "intents.json"
        self.intents_path = Path(intents_path)
        self.vectorizer = None
        self.model = None
        self.intent_labels = []
        self.intent_metadata = {}
        self._train()

    def _train(self):
        """Loads training examples from intents.json and fits the TF-IDF + Logistic Regression pipeline."""
        with open(self.intents_path, "r", encoding="utf-8") as f:
            intents_data = json.load(f)

        corpus = []
        labels = []
        self.intent_metadata = {}

        for item in intents_data:
            intent_name = item["intent"]
            self.intent_metadata[intent_name] = {
                "description": item.get("description", ""),
                "template_id": item.get("template_id", intent_name),
                "required_entities": item.get("required_entities", []),
                "optional_entities": item.get("optional_entities", [])
            }
            for ex in item.get("examples", []):
                corpus.append(ex.lower().strip())
                labels.append(intent_name)

        self.intent_labels = sorted(list(self.intent_metadata.keys()))

        # Combined Word + Char TF-IDF feature extractor
        word_vec = TfidfVectorizer(ngram_range=(1, 2), analyzer="word", min_df=1, sublinear_tf=True)
        char_vec = TfidfVectorizer(ngram_range=(3, 5), analyzer="char_wb", min_df=1, sublinear_tf=True)
        self.vectorizer = FeatureUnion([
            ("word", word_vec),
            ("char", char_vec)
        ])

        X = self.vectorizer.fit_transform(corpus)
        y = np.array(labels)

        self.model = LogisticRegression(
            C=5.0,
            max_iter=1000,
            random_state=42,
            solver="lbfgs"
        )
        self.model.fit(X, y)

    def predict(self, norm_text: str) -> Dict[str, Any]:
        """
        Predicts intent for normalized query text.
        
        Returns:
            Dictionary containing:
            - intent: str (predicted intent or 'fallback')
            - confidence: float (0.0 to 1.0)
            - margin: float (confidence - second_highest)
            - is_fallback: bool
            - top_candidates: List[Dict[str, Any]] (top 3 candidate intents with scores)
            - confidence_level: str ('HIGH', 'MEDIUM', 'LOW')
        """
        X_vec = self.vectorizer.transform([norm_text])
        probs = self.model.predict_proba(X_vec)[0]
        classes = self.model.classes_

        # Sort classes by probability descending
        sorted_indices = np.argsort(probs)[::-1]
        top_idx = sorted_indices[0]
        second_idx = sorted_indices[1] if len(sorted_indices) > 1 else top_idx

        top_confidence = float(probs[top_idx])
        second_confidence = float(probs[second_idx]) if top_idx != second_idx else 0.0
        margin = float(top_confidence - second_confidence)
        predicted_class = str(classes[top_idx])

        # Top 3 candidates for suggestion chips
        top_candidates = []
        for i in sorted_indices[:3]:
            c_name = str(classes[i])
            top_candidates.append({
                "intent": c_name,
                "score": round(float(probs[i]), 4),
                "description": self.intent_metadata.get(c_name, {}).get("description", "")
            })

        # Confidence level assignment
        if top_confidence >= 0.60 and margin >= 0.15:
            conf_level = "HIGH"
        elif top_confidence >= CONFIDENCE_MED and margin >= MARGIN_MIN:
            conf_level = "MEDIUM"
        else:
            conf_level = "LOW"

        # Fallback check
        is_fallback = bool(top_confidence < CONFIDENCE_MED or margin < MARGIN_MIN)
        final_intent = "fallback" if is_fallback else predicted_class

        return {
            "intent": final_intent,
            "raw_predicted_intent": predicted_class,
            "confidence": round(top_confidence, 4),
            "margin": round(margin, 4),
            "is_fallback": is_fallback,
            "confidence_level": conf_level,
            "top_candidates": top_candidates,
            "description": self.intent_metadata.get(predicted_class, {}).get("description", "")
        }
