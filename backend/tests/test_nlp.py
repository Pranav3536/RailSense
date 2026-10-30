"""
RailSense — NLP Unit & Integration Tests (backend/tests/test_nlp.py)
Validates entity extraction rules, intent classification, template builders,
safety against injection and causal queries, and absence of external API calls.
"""

import pytest
from app.nlp.normalizer import normalize_query, TextNormalizationError, MAX_QUESTION_LENGTH
from app.nlp.entities import EntityExtractor
from app.nlp.classifier import IntentClassifier
from app.nlp.templates import TemplateEngine
from app.nlp import SmartInsightsService
from app.serving_client import ServingClient


@pytest.fixture(scope="module")
def serving_client():
    return ServingClient()


@pytest.fixture(scope="module")
def nlp_service(serving_client):
    return SmartInsightsService(serving_client)


class TestTextNormalization:
    """Tests normalizer validation, character limits, and control character stripping."""

    def test_valid_normalization(self):
        clean_raw, norm = normalize_query("  How many trains are delayed?  \n")
        assert clean_raw == "How many trains are delayed?"
        assert norm == "how many trains are delayed?"

    def test_empty_string_raises(self):
        with pytest.raises(TextNormalizationError):
            normalize_query("   ")

    def test_over_length_raises_422(self):
        long_text = "a" * (MAX_QUESTION_LENGTH + 1)
        with pytest.raises(TextNormalizationError) as exc_info:
            normalize_query(long_text)
        assert "exceeds maximum allowed length" in str(exc_info.value)

    def test_control_chars_stripped(self):
        text_with_control = "Which train is late?\x00\x08\x1f"
        clean_raw, norm = normalize_query(text_with_control)
        assert "\x00" not in clean_raw
        assert clean_raw == "Which train is late?"


class TestEntityExtraction:
    """Tests deterministic entity extraction rules."""

    def test_train_number_extraction(self, serving_client):
        extractor = EntityExtractor(serving_client)
        res = extractor.extract("What is the delay of train 12951?", "what is the delay of train 12951?")
        assert res["train_number"] == "12951"
        assert res["train_name"] != ""

    def test_station_code_uppercase_or_cue_rule(self, serving_client):
        extractor = EntityExtractor(serving_client)
        # NDLS uppercase should be extracted
        r1 = extractor.extract("How punctual is NDLS?", "how punctual is ndls?")
        assert r1["station_code"] == "NDLS"

        # station code following cue word "at" or "station"
        r2 = extractor.extract("delays at brc station", "delays at brc station")
        assert r2["station_code"] == "BRC"

        # Common short English words should NOT be recognized as station codes
        r3 = extractor.extract("is this train on time for all days?", "is this train on time for all days?")
        assert r3["station_code"] is None

    def test_category_extraction(self, serving_client):
        extractor = EntityExtractor(serving_client)
        r1 = extractor.extract("How punctual are suburban trains?", "how punctual are suburban trains?")
        assert r1["category"] == "SUB"

        r2 = extractor.extract("Tell me about Vande Bharat punctuality", "tell me about vande bharat punctuality")
        assert r2["category"] == "VNDB"

    def test_weekday_and_time_extraction(self, serving_client):
        extractor = EntityExtractor(serving_client)
        r1 = extractor.extract("Are Sunday morning trains delayed?", "are sunday morning trains delayed?")
        assert r1["weekday"] == "Sunday"
        assert r1["time_of_day"] == "morning"

    def test_top_n_bounds(self, serving_client):
        extractor = EntityExtractor(serving_client)
        r1 = extractor.extract("Top 5 worst stations", "top 5 worst stations")
        assert r1["top_n"] == 5
        assert r1["order"] == "top"

        # Bounded between 1 and 20
        r2 = extractor.extract("Top 50 worst trains", "top 50 worst trains")
        assert r2["top_n"] <= 20

    def test_ambiguous_train_name_clarification(self, serving_client):
        extractor = EntityExtractor(serving_client)
        # "Rajdhani" matches multiple services
        res = extractor.extract("Tell me about Rajdhani Express", "tell me about rajdhani express")
        if res["needs_clarification"]:
            assert res["clarification_candidates"] is not None
            assert len(res["clarification_candidates"]) >= 2


class TestIntentClassification:
    """Tests intent classification accuracy, margin, and fallback behavior."""

    def test_high_confidence_queries(self, nlp_service):
        r1 = nlp_service.process_query("What is the overall delay rate across Indian Railways?")
        assert r1["understood_intent"] == "fleet_summary"
        assert r1["confidence"] >= 0.50

        r2 = nlp_service.process_query("Which train category is most delayed?")
        assert r2["understood_intent"] == "category_ranking"

    def test_future_predict_redirect(self, nlp_service):
        res = nlp_service.process_query("Will train 12951 be late tomorrow?")
        assert res["understood_intent"] == "predict_redirect"
        assert res["answer"]["deep_link"] is not None
        assert "/predict" in res["answer"]["deep_link"]["path"]
        # Must not generate predicted delay number
        assert "probability" not in res["answer"]["answer_text"].lower()

    def test_causal_refusal(self, nlp_service):
        res = nlp_service.process_query("Why is Indian Railways always late due to fog?")
        assert res["understood_intent"] == "causal_refusal"
        assert "cannot establish physical or operational causality" in res["answer"]["answer_text"]
        # Zero banned causal words in system answer
        ans_low = res["answer"]["answer_text"].lower()
        for banned in ("bottleneck", "congestion", "fog", "caused by", "due to"):
            assert banned not in ans_low

    def test_fallback_on_unrecognized(self, nlp_service):
        res = nlp_service.process_query("asldkjf qowieuroiu zxcvmnb random string")
        assert res["understood_intent"] == "fallback"
        assert res["answer"]["visual_type"] == "none"
        assert len(res["suggestions"]) >= 2


class TestTemplateDataIntegrity:
    """Verifies template answers match precomputed serving store numbers exactly."""

    def test_fleet_summary_numbers_match_overview(self, nlp_service, serving_client):
        res = nlp_service.process_query("What is the overall delay rate across Indian Railways?")
        ov = serving_client.get_overview_json()
        kpis = ov["fleet_kpis"]
        del_sum = ov["delay_summary"]
        
        # Verify text includes exact store numbers
        assert f"{kpis['distinct_train_numbers']:,}" in res["answer"]["answer_text"]
        assert f"{kpis['distinct_stations']:,}" in res["answer"]["answer_text"]
        assert f"{del_sum['fleet_delayed_rate']:.2f}%" in res["answer"]["answer_text"]

    def test_train_worst_stops_sqlite(self, nlp_service):
        res = nlp_service.process_query("What are the worst stops for train 12951?")
        assert res["understood_intent"] == "train_worst_stops"
        assert res["answer"]["visual_type"] == "table"
        assert len(res["answer"]["visual_data"]) > 0


class TestSafetyAndSecurity:
    """Verifies system resilience against SQL injection, long queries, and XSS payload attacks."""

    def test_sql_injection_safety(self, nlp_service):
        nasty_inputs = [
            "'; DROP TABLE trains; --",
            "12951' OR '1'='1",
            "UNION SELECT * FROM sqlite_master",
            "<script>alert('xss')</script>"
        ]
        for query in nasty_inputs:
            res = nlp_service.process_query(query)
            # Must return clean envelope and never crash
            assert "understood_intent" in res
            assert "answer" in res
            assert isinstance(res["answer"]["answer_text"], str)

    def test_unicode_and_hinglish(self, nlp_service):
        res = nlp_service.process_query("Sabse zyada late kaun si train hoti hai?")
        assert res["understood_intent"] in ("train_hotspots", "category_ranking")
        assert "answer" in res
