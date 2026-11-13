"""
RailSense — Insights API Endpoint Integration Tests (backend/tests/test_insights_routes.py)
Tests POST /api/insights/query validation, 422, 415, 429 rate limit,
and GET /api/insights/examples structure.
"""

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app({"TESTING": True})
    return app.test_client()


def test_insights_examples_endpoint(client):
    res = client.get("/api/insights/examples")
    assert res.status_code == 200
    data = res.get_json()
    assert "examples" in data
    assert len(data["examples"]) >= 5
    assert "capabilities" in data
    assert "supported_topics" in data["capabilities"]
    assert "unsupported_topics" in data["capabilities"]


def test_insights_query_valid_kpi(client):
    res = client.post("/api/insights/query", json={"question": "What is the overall delay rate across Indian Railways?"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["understood_intent"] == "fleet_summary"
    assert "answer" in data
    assert data["answer"]["visual_type"] == "kpi"
    assert "explanation" in data


def test_insights_query_valid_table(client):
    res = client.post("/api/insights/query", json={"question": "Which train category is most delayed?"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["understood_intent"] == "category_ranking"
    assert data["answer"]["visual_type"] == "table"


def test_insights_query_content_type_required(client):
    res = client.post("/api/insights/query", data="plain text body")
    assert res.status_code == 415
    data = res.get_json()
    assert data["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_insights_query_missing_question(client):
    res = client.post("/api/insights/query", json={})
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"]["code"] == "MISSING_QUESTION"


def test_insights_query_empty_question(client):
    res = client.post("/api/insights/query", json={"question": "   "})
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"]["code"] == "EMPTY_QUESTION"


def test_insights_query_too_long(client):
    res = client.post("/api/insights/query", json={"question": "a" * 301})
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"]["code"] == "QUESTION_TOO_LONG"


def test_insights_rate_limiting(client):
    # Stricter 30/min rate limit
    for _ in range(30):
        res = client.post("/api/insights/query", json={"question": "What is the fleet delay?"})
        if res.status_code == 429:
            break
    # 31st request must trigger 429
    res = client.post("/api/insights/query", json={"question": "What is the fleet delay?"})
    assert res.status_code == 429
    data = res.get_json()
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
