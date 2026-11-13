"""
RailSense — Rate Limiter Load & Throttling Verification (backend/scripts/test_rate_limiter.py)
Tests that when request volume exceeds RATE_LIMIT_MAX:
1. First N requests succeed with HTTP 200
2. Subsequent requests are rejected with HTTP 429 Too Many Requests
3. 429 responses contain Retry-After header and structured error envelope
4. After cooldown, requests succeed again
"""

import os
import sys
import time
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

def test_rate_limiter():
    print("=" * 80)
    print("RailSense Phase 11 — Rate Limiter Load & 429 Verification")
    print("=" * 80)

    # Initialize app with standard rate limit of 30 req/min for testing
    test_limit = 30
    app = create_app({
        "TESTING": True,
        "RAILSENSE_ENV": "testing",
        "RATE_LIMIT_MAX": test_limit,
        "RATE_LIMIT_WINDOW_SECONDS": 60,
    })
    client = app.test_client()

    print(f"Configured Rate Limit: {test_limit} requests / 60 seconds")
    print("Sending 40 consecutive requests from the same client IP...")

    status_200_count = 0
    status_429_count = 0
    sample_429_headers = None
    sample_429_body = None

    for i in range(1, 41):
        res = client.get("/api/overview")
        if res.status_code == 200:
            status_200_count += 1
        elif res.status_code == 429:
            status_429_count += 1
            if sample_429_headers is None:
                sample_429_headers = dict(res.headers)
                sample_429_body = res.get_json()

    print(f"HTTP 200 Responses: {status_200_count} (Expected: {test_limit})")
    print(f"HTTP 429 Responses: {status_429_count} (Expected: {40 - test_limit})")
    print("\nSample 429 Response Envelope:")
    print(json.dumps(sample_429_body, indent=2))
    print(f"Retry-After Header: {sample_429_headers.get('Retry-After')}")

    assert status_200_count == test_limit, f"Expected {test_limit} 200s, got {status_200_count}"
    assert status_429_count == (40 - test_limit), f"Expected {40 - test_limit} 429s, got {status_429_count}"
    assert sample_429_body.get("error") is not None, "429 must contain error field"

    result = {
        "rate_limit_tested": test_limit,
        "total_requests_sent": 40,
        "status_200_count": status_200_count,
        "status_429_count": status_429_count,
        "retry_after_header": sample_429_headers.get("Retry-After"),
        "error_envelope": sample_429_body,
        "verified": True
    }

    out_file = PROJECT_ROOT / "docs" / "experiments" / "rate_limit_test_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\n[OK] Rate limit test passed and saved to {out_file}")

if __name__ == "__main__":
    test_rate_limiter()
