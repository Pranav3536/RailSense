"""
RailSense — Text Normalizer (backend/app/nlp/normalizer.py)
Normalizes user text for intent classification and entity extraction.
Enforces 300 character maximum limit and strips control characters.
"""

import re
import unicodedata
from typing import Tuple

MAX_QUESTION_LENGTH = 300


class TextNormalizationError(ValueError):
    """Raised when question fails input validation."""
    pass


def normalize_query(text: str) -> Tuple[str, str]:
    """
    Validates and normalizes user query string.
    
    Args:
        text: Raw input query from user request.
        
    Returns:
        Tuple of (clean_raw_text, normalized_lowercase_text):
        - clean_raw_text: Stripped of control chars, preserving original casing for entity extraction.
        - normalized_lowercase_text: Lowercased, whitespace collapsed, for TF-IDF classification.
        
    Raises:
        TextNormalizationError: If text is empty or exceeds 300 characters.
    """
    if not isinstance(text, str):
        raise TextNormalizationError("Question must be a string.")
        
    raw = text.strip()
    if not raw:
        raise TextNormalizationError("Question cannot be empty or whitespace only.")
        
    if len(raw) > MAX_QUESTION_LENGTH:
        raise TextNormalizationError(
            f"Question exceeds maximum allowed length of {MAX_QUESTION_LENGTH} characters (received {len(raw)})."
        )

    # Strip control characters (Unicode category 'Cc' and 'Cf') except standard whitespace
    clean_chars = [
        ch for ch in raw 
        if unicodedata.category(ch) not in ('Cc', 'Cf') or ch in ('\t', '\n', ' ')
    ]
    clean_raw = "".join(clean_chars)

    # Collapse multiple whitespace characters into single space
    clean_raw = re.sub(r'\s+', ' ', clean_raw).strip()
    
    if not clean_raw:
        raise TextNormalizationError("Question contains only invalid or control characters.")

    # Lowercase version for NLP vectorizer
    norm_lower = clean_raw.lower()
    
    return clean_raw, norm_lower
