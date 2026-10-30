"""
RailSense — Phase 9 Fixture Capture Script (backend/scripts/capture_phase9_fixtures.py)
Hits real API endpoints and saves captured fixtures in frontend/src/test/fixtures/.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FIXTURES_DIR = PROJECT_ROOT / "frontend" / "src" / "test" / "fixtures"

import sys
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

def capture():
    app = create_app({"TESTING": True})
    client = app.test_client()

    targets = {
        "patternsHourFixture.json": "/api/patterns/hour",
        "patternsDowFixture.json": "/api/patterns/dow",
        "patternsCategoryFixture.json": "/api/patterns/category",
        "patternsPositionFixture.json": "/api/patterns/position",
        "patternsHotspotsStationFixture.json": "/api/patterns/hotspots?level=station&order=top&limit=5",
        "patternsHotspotsTrainFixture.json": "/api/patterns/hotspots?level=train&order=top&limit=5",
        "stationDetailFixture.json": "/api/stations/NDLS",
        "insightsExamplesFixture.json": "/api/insights/examples",
        "modelInfoFixture.json": "/api/model/info",
        "modelMetricsFixture.json": "/api/model/metrics"
    }

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    for filename, url in targets.items():
        res = client.get(url)
        assert res.status_code == 200, f"Failed {url}: {res.status_code}"
        data = res.get_json()
        with open(FIXTURES_DIR / filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Captured {filename} from {url}")

    # Capture a real query fixture for Smart Insights
    q_res = client.post("/api/insights/query", json={"question": "Which train category is most delayed?"})
    assert q_res.status_code == 200
    with open(FIXTURES_DIR / "insightsQueryFixture.json", "w", encoding="utf-8") as f:
        json.dump(q_res.get_json(), f, indent=2)
    print("Captured insightsQueryFixture.json from POST /api/insights/query")

    # Capture a clarification query fixture
    clarif_res = client.post("/api/insights/query", json={"question": "Tell me about Rajdhani Express"})
    assert clarif_res.status_code == 200
    with open(FIXTURES_DIR / "insightsClarificationFixture.json", "w", encoding="utf-8") as f:
        json.dump(clarif_res.get_json(), f, indent=2)
    print("Captured insightsClarificationFixture.json from POST /api/insights/query (clarification)")

if __name__ == "__main__":
    capture()
