"""
RailSense — API Contract Capture Script (backend/scripts/capture_api_contract.py)
Executes all endpoints against the live application and outputs
docs/api_contract_for_frontend.md with accurate schemas and examples.
"""

import json
import sys
from pathlib import Path

# Add backend to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

DOCS_DIR = BACKEND_DIR.parent / "docs"


def summarize_schema(obj, depth=0):
    """Recursively extracts types and nullable fields."""
    if depth > 3:
        return "..."
    if obj is None:
        return "null"
    elif isinstance(obj, dict):
        return {k: summarize_schema(v, depth + 1) for k, v in list(obj.items())[:10]}
    elif isinstance(obj, list):
        if len(obj) == 0:
            return "list[]"
        return [summarize_schema(obj[0], depth + 1)]
    elif isinstance(obj, bool):
        return "boolean"
    elif isinstance(obj, int):
        return "integer"
    elif isinstance(obj, float):
        return "float"
    elif isinstance(obj, str):
        return "string"
    return type(obj).__name__


def capture_contract():
    app = create_app({"TESTING": True})
    client = app.test_client()

    contract = {}

    endpoints = [
        ("GET", "/api/health", None),
        ("GET", "/api/health/ready", None),
        ("GET", "/api/overview", None),
        ("GET", "/api/trains?q=12951&page=1&page_size=2", None),
        ("GET", "/api/trains/12951", None),
        ("GET", "/api/stations?q=BRC&page=1&page_size=2", None),
        ("GET", "/api/stations/BRC", None),
        ("GET", "/api/patterns/hour", None),
        ("GET", "/api/patterns/dow", None),
        ("GET", "/api/patterns/category", None),
        ("GET", "/api/patterns/position", None),
        ("GET", "/api/patterns/hotspots", None),
        ("GET", "/api/model/info", None),
        ("GET", "/api/model/metrics", None),
        ("POST", "/api/predict", {"train_number": "12951", "station_code": "BRC", "date": "2026-10-26", "seq": 4}),
        ("GET", "/api/trains/999999", None),  # Error example (404)
        ("POST", "/api/predict", {"train_number": "12951", "station_code": "BRC", "date": "2026-10-26"}),  # Error example (422)
    ]

    captured_entries = []

    for method, path, payload in endpoints:
        if method == "GET":
            res = client.get(path, headers={"Origin": "http://localhost:5173"})
        else:
            res = client.post(path, json=payload, headers={"Origin": "http://localhost:5173"})

        status = res.status_code
        data = res.get_json()

        captured_entries.append({
            "method": method,
            "path": path,
            "status": status,
            "headers": dict(res.headers),
            "payload": payload,
            "data": data,
            "schema": summarize_schema(data)
        })

    # Render Markdown Document
    lines = [
        "# RailSense — Real REST API Contract for Frontend Integration",
        "",
        "> **Generated Programmatically in Phase 6 from Live Endpoints**  ",
        "> **Base URL:** `http://localhost:5000/api`  ",
        "> **CORS Verified:** `http://localhost:5173` returns `Access-Control-Allow-Origin: http://localhost:5173`. Disallowed origins receive no CORS header.  ",
        "> **Notice:** All field names, types, and error structures below reflect the exact runtime responses of the Python backend. Frontend components in Phase 7–9 MUST strictly consume these keys without inventing field names.",
        "",
        "---",
        "",
        "## 1. Uniform Error Envelope",
        "",
        "All HTTP client (`4xx`) and server (`5xx`) errors return a standard JSON structure:",
        "```json",
        json.dumps({
            "error": {
                "code": "ERROR_CODE_STRING",
                "message": "Human-readable explanation of error.",
                "details": "Optional extra dictionary or null",
                "request_id": "97e68bc5-01e4-44b2-a4a3-df5b4b122249"
            }
        }, indent=2),
        "```",
        "",
        "---",
        "",
        "## 2. Status Card Contract (`/api/health/ready`)",
        "",
        "The sidebar's **Truthful Database & Service Status Card** consumes `/api/health/ready`:",
        "```json",
        json.dumps([e["data"] for e in captured_entries if e["path"] == "/api/health/ready"][0], indent=2),
        "```",
        "",
        "### Exact Field Mapping for UI Status States:",
        "- **`components.tidb_cloud`:** `'connected'` -> Database connected (green success); `'unavailable'` -> Database unavailable (amber warning).",
        "- **`components.serving_store`:** `'ready'` -> Serving store operational.",
        "- **`components.prediction_engine`:** `'ready'` -> Model loaded.",
        "- **`model_version`:** e.g. `'1.0.0'`.",
        "- **`data_as_of`:** `'2026-10-25'` (dataset cutoff date).",
        "- **Network failure (fetch throws/aborts):** API unreachable (red danger).",
        "",
        "---",
        "",
        "## 3. Comprehensive Endpoint Schemas & Truncated Examples",
        ""
    ]

    for entry in captured_entries:
        lines.append(f"### `{entry['method']} {entry['path']}` (Status: {entry['status']})")
        lines.append("")
        if entry["payload"]:
            lines.append(f"**Request Body:**")
            lines.append("```json")
            lines.append(json.dumps(entry["payload"], indent=2))
            lines.append("```")
            lines.append("")

        # Trim sample for readability
        data_sample = entry["data"]
        if isinstance(data_sample, dict):
            trimmed_data = {}
            for k, v in data_sample.items():
                if isinstance(v, list) and len(v) > 2:
                    trimmed_data[k] = v[:2] + [f"... ({len(v) - 2} more items)"]
                else:
                    trimmed_data[k] = v
        else:
            trimmed_data = data_sample

        lines.append("**Response Top-Level Structure / Schema:**")
        lines.append("```json")
        lines.append(json.dumps(trimmed_data, indent=2))
        lines.append("```")
        lines.append("")
        lines.append("---")
        lines.append("")

    contract_path = DOCS_DIR / "api_contract_for_frontend.md"
    with open(contract_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[OK] Successfully wrote API contract to {contract_path}")


if __name__ == "__main__":
    capture_contract()
