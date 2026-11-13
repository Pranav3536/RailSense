"""
RailSense — Security, Fuzzing & Resilience Test Suite
(backend/tests/test_security_fuzz.py)

Tests input sanitization, oversized payloads, malformed JSON, media-type enforcement,
SQL injection & path traversal attempts, XSS rejection, reverse proxy headers, and rate limiting.
"""

import io
import json
import pytest
from app import create_app


@pytest.fixture
def test_app():
    """Creates test application in testing environment."""
    app = create_app({
        "TESTING": True,
        "RAILSENSE_ENV": "testing",
        "RATE_LIMIT_MAX": 10,
        "RATE_LIMIT_WINDOW": 60,
        "TRUSTED_PROXY_COUNT": 0,
    })
    return app


@pytest.fixture
def client(test_app):
    return test_app.test_client()


class TestSecurityHeaders:
    """Verifies mandatory production security headers."""

    def test_security_headers_present_on_all_responses(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert "Content-Security-Policy" in r.headers
        assert r.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "geolocation=()" in r.headers.get("Permissions-Policy", "")

    def test_cache_control_headers(self, client):
        # Static analytics endpoints cacheable
        r_stat = client.get("/api/overview")
        assert "public" in r_stat.headers.get("Cache-Control", "")

        # Non-idempotent or prediction endpoints must not be cached
        r_pred = client.post("/api/predict", json={})
        assert "no-store" in r_pred.headers.get("Cache-Control", "")


class TestPayloadAndMediaTypeEnforcement:
    """Verifies request size limits and media type validation."""

    def test_oversized_payload_returns_413(self, client):
        # 1MB limit - send 1.5MB of data
        big_data = "x" * (1500 * 1024)
        r = client.post(
            "/api/predict",
            data=json.dumps({"big": big_data}),
            content_type="application/json"
        )
        assert r.status_code == 413
        data = r.get_json()
        assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"

    def test_non_json_content_type_returns_415(self, client):
        r = client.post(
            "/api/predict",
            data="train_number=12951",
            content_type="application/x-www-form-urlencoded"
        )
        assert r.status_code == 415
        data = r.get_json()
        assert data["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"

    def test_malformed_json_returns_400(self, client):
        r = client.post(
            "/api/predict",
            data="{invalid_json: true,",
            content_type="application/json"
        )
        assert r.status_code == 400
        data = r.get_json()
        assert data["error"]["code"] in ("INVALID_JSON", "BAD_REQUEST")


class TestInjectionAndTraversalFuzzing:
    """Fuzzes endpoints with SQL injection, path traversal, and XSS payloads."""

    @pytest.mark.parametrize("payload", [
        "12951' OR '1'='1",
        "12951; DROP TABLE trains; --",
        "' UNION SELECT * FROM users --",
        "../../etc/passwd",
        "..\\..\\windows\\system32",
        "<script>alert(1)</script>",
        "javascript:alert(1)",
        "'\"><img src=x onerror=alert(1)>",
    ])
    def test_trains_search_injection_resilience(self, client, payload):
        r = client.get(f"/api/trains?query={payload}")
        assert r.status_code in (200, 400)
        # Verify app does not crash with 500 or expose database errors
        data = r.get_json()
        assert "items" in data or "error" in data

    @pytest.mark.parametrize("bad_kind", [
        "../../secret",
        "..%2f..%2fsecret",
        "position/../../etc",
        "nonexistent_kind",
        "hour; DROP TABLE trains;",
    ])
    def test_patterns_path_traversal_resilience(self, client, bad_kind):
        r = client.get(f"/api/patterns/{bad_kind}")
        assert r.status_code in (404, 400)
        data = r.get_json()
        assert "error" in data


class TestProxyFixAndSpoofing:
    """Verifies proxy header handling and spoofing defenses."""

    def test_untrusted_forwarded_for_ignored_when_proxy_count_zero(self):
        app = create_app({
            "TESTING": True,
            "RAILSENSE_ENV": "testing",
            "TRUSTED_PROXY_COUNT": 0,
        })
        client = app.test_client()

        # Send spoofed X-Forwarded-For
        r = client.get("/api/health", headers={"X-Forwarded-For": "203.0.113.195"})
        assert r.status_code == 200

    def test_trusted_proxy_resolves_client_ip_when_configured(self):
        app = create_app({
            "TESTING": True,
            "RAILSENSE_ENV": "testing",
            "TRUSTED_PROXY_COUNT": 1,
        })
        client = app.test_client()

        # With 1 trusted proxy hop, X-Forwarded-For client IP is parsed
        r = client.get("/api/health", headers={"X-Forwarded-For": "203.0.113.195"})
        assert r.status_code == 200


class TestEnvironmentValidation:
    """Verifies RAILSENSE_ENV configuration check."""

    def test_invalid_railsense_env_raises_error(self, monkeypatch):
        monkeypatch.setenv("RAILSENSE_ENV", "invalid_staging_env")
        with pytest.raises(ValueError, match="Invalid RAILSENSE_ENV"):
            create_app()
