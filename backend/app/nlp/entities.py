"""
RailSense — Deterministic Entity Extractor (backend/app/nlp/entities.py)
Extracts train numbers, train names (RapidFuzz), station codes (cue word/uppercase rule),
categories, weekdays, time-of-day buckets, and top-N ranking directives.
"""

import re
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz, process

from .constants import TIME_OF_DAY_BUCKETS, WEEKDAY_KEYWORDS, CATEGORY_MAP


class EntityExtractor:
    """Extracts entities from user queries against serving store catalogs."""

    def __init__(self, serving_client):
        self.client = serving_client
        self._init_station_vocab()

    def _init_station_vocab(self):
        """Loads valid station codes into a set for O(1) membership checks."""
        self.station_codes = set()
        try:
            conn = self.client.get_connection()
            cur = conn.cursor()
            cur.execute("SELECT station_code FROM stations;")
            self.station_codes = {r[0] for r in cur.fetchall()}
            conn.close()
        except Exception:
            pass

    def extract(self, raw_text: str, norm_text: str) -> Dict[str, Any]:
        """
        Extracts structured entities from both raw (case-sensitive) and normalized text.
        
        Returns:
            Dictionary of extracted entities:
            - train_number: Optional[str]
            - train_name: Optional[str]
            - station_code: Optional[str]
            - category: Optional[str]
            - weekday: Optional[str]
            - time_of_day: Optional[str]
            - order: str ('top' or 'bottom')
            - top_n: int (1 to 20, default 10)
            - min_support: Optional[int]
            - clarification_candidates: Optional[List[Dict[str, Any]]]
            - needs_clarification: bool
        """
        entities: Dict[str, Any] = {
            "train_number": None,
            "train_name": None,
            "station_code": None,
            "category": None,
            "weekday": None,
            "time_of_day": None,
            "order": "top",
            "top_n": 10,
            "min_support": None,
            "clarification_candidates": None,
            "needs_clarification": False
        }

        # 1. Order direction (top = worst delay, bottom = most punctual)
        punctual_patterns = [
            r'\bpunctual\b', r'\bon[- ]time\b', r'\bbest\b', r'\blowest delay\b',
            r'\bleast late\b', r'\bmost punctual\b', r'\bbottom\b', r'\bsabse punctual\b',
            r'\bsabse time pe\b', r'\bsahi time\b'
        ]
        if any(re.search(pat, norm_text) for pat in punctual_patterns):
            entities["order"] = "bottom"
        else:
            entities["order"] = "top"

        # 2. Top-N bounds (1 to 20)
        n_match = re.search(r'\b(?:top|bottom|worst|best)\s+(\d{1,2})\b', norm_text)
        if not n_match:
            n_match = re.search(r'\b(\d{1,2})\s+(?:trains|stations|stops|hotspots)\b', norm_text)
        if n_match:
            try:
                val = int(n_match.group(1))
                entities["top_n"] = max(1, min(20, val))
            except ValueError:
                pass

        # 3. Minimum support directive
        sup_match = re.search(r'\b(?:min|minimum|at least)\s+(?:support\s+)?(\d{2,4})\b', norm_text)
        if sup_match:
            try:
                entities["min_support"] = int(sup_match.group(1))
            except ValueError:
                pass

        # 4. Train Number (5 digits validated against catalog)
        five_digit_matches = re.findall(r'\b(\d{5})\b', raw_text)
        for num in five_digit_matches:
            tr_info = self.client.get_train(num)
            if tr_info:
                entities["train_number"] = num
                entities["train_name"] = tr_info.get("train_name", "")
                if not entities["category"]:
                    entities["category"] = tr_info.get("category", "")
                break

        # 5. Station Code (Accept ONLY if in station_codes AND (appears uppercase in raw text OR follows a cue word))
        cue_patterns = [
            r'\b(?:station|at|from|to|in)\s+([a-zA-Z]{2,4})\b',
            r'\b([a-zA-Z]{2,4})\s+station\b'
        ]
        candidate_stns = []
        banned_codes = {'IS', 'IN', 'TO', 'AS', 'AT', 'ON', 'OR', 'BY', 'FOR', 'THE', 'AND', 'ALL', 'TOP', 'NOT', 'ARE', 'WAS', 'DAY', 'PM', 'AM', 'NLP', 'IST', 'EXP', 'SF', 'PAS', 'SUB', 'MEX'}
        for pat in cue_patterns:
            matches = re.findall(pat, raw_text, re.IGNORECASE)
            for m in matches:
                cand = m.upper().strip()
                if cand in self.station_codes and cand not in banned_codes:
                    candidate_stns.append(cand)

        # Also search for standalone uppercase tokens of length 2-4
        raw_tokens = re.findall(r'\b([A-Z]{2,4})\b', raw_text)
        for tok in raw_tokens:
            if tok in self.station_codes and tok not in banned_codes:
                candidate_stns.append(tok)

        if candidate_stns:
            entities["station_code"] = candidate_stns[0]

        # 6. Category mapping
        for kw, cat in sorted(CATEGORY_MAP.items(), key=lambda x: -len(x[0])):
            if re.search(r'\b' + re.escape(kw) + r'\b', norm_text):
                entities["category"] = cat
                break

        # 7. Weekday mapping
        for kw, day in WEEKDAY_KEYWORDS.items():
            if re.search(r'\b' + re.escape(kw) + r'\b', norm_text):
                entities["weekday"] = day
                break

        # 8. Time of day mapping
        for bucket_key, info in TIME_OF_DAY_BUCKETS.items():
            for kw in info["keywords"]:
                if re.search(r'\b' + re.escape(kw) + r'\b', norm_text):
                    entities["time_of_day"] = bucket_key
                    break
            if entities["time_of_day"]:
                break

        # 9. Train Name Fuzzy Match (only if train_number was not already resolved)
        if not entities["train_number"] and self.client and hasattr(self.client, '_trains_all') and self.client._trains_all:
            # Check for candidate train names using rapidfuzz
            # Extract names pool
            name_to_trains: Dict[str, List[Dict[str, Any]]] = {}
            for t in self.client._trains_all:
                nm = str(t.get("train_name", "")).strip()
                if len(nm) >= 3:
                    if nm not in name_to_trains:
                        name_to_trains[nm] = []
                    name_to_trains[nm].append(t)

            unique_names = list(name_to_trains.keys())
            
            # Remove filler query words before matching names
            cleaned_query_for_names = re.sub(
                r'\b(train|express|delay|delayed|status|late|schedule|details|info|about|timing|timetable|kya|hai|batao|kaun|si|sabse|kitna|kitni|chal|rahi)\b',
                '',
                norm_text
            ).strip()

            if len(cleaned_query_for_names) >= 4:
                matches = process.extract(
                    cleaned_query_for_names,
                    unique_names,
                    scorer=fuzz.token_set_ratio,
                    limit=5
                )
                valid_matches = [m for m in matches if m[1] >= 82]
                if valid_matches:
                    top_match = valid_matches[0]
                    # Check for ambiguity: multiple matches close to top score
                    close_matches = [m for m in valid_matches if top_match[1] - m[1] <= 4]
                    if len(close_matches) > 1:
                        candidates = []
                        for m in close_matches:
                            for tr in name_to_trains[m[0]][:2]:
                                candidates.append({
                                    "train_number": tr.get("train_number"),
                                    "train_name": tr.get("train_name"),
                                    "category": tr.get("category"),
                                    "match_score": round(float(m[1]), 1)
                                })
                        entities["clarification_candidates"] = candidates[:4]
                        entities["needs_clarification"] = True
                    else:
                        matched_train = name_to_trains[top_match[0]][0]
                        entities["train_number"] = matched_train.get("train_number")
                        entities["train_name"] = matched_train.get("train_name")
                        if not entities["category"]:
                            entities["category"] = matched_train.get("category")

        return entities
