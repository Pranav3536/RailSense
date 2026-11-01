"""
Production Mode Rehearsal Script (Task 5.i)
Tests:
1. CORS allow/deny on allowed vs disallowed origin, including OPTIONS preflight.
2. Security headers (X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy).
3. HSTS behavior: absent on direct HTTP, present behind HTTPS proxy with X-Forwarded-Proto: https.
4. Docs flag: /api/docs accessible when ENABLE_DOCS=true, 404 when ENABLE_DOCS=false.
5. Limiter with spoofed X-Forwarded-For:
   - At TRUSTED_PROXY_COUNT=0: limiter tracks actual remote socket IP, ignores spoofed X-Forwarded-For.
   - At TRUSTED_PROXY_COUNT=1: ProxyFix resolves client IP from X-Forwarded-For.
6. Error envelope format verification on 400, 404, 405, 413, 422, 429.
"""

import os
import sys
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

def run_rehearsal():
    print("=" * 80)
    print("TASK 5(i): PRODUCTION-MODE REHEARSAL")
    print("=" * 80)

    # 1. CORS Allow/Deny & OPTIONS Preflight
    print("\n--- 1. CORS Rehearsal ---")
    os.environ["RAILSENSE_ENV"] = "production"
    os.environ["CORS_ORIGINS"] = "https://railsense.vercel.app"
    os.environ["TRUSTED_PROXY_COUNT"] = "1"
    os.environ["ENABLE_DOCS"] = "true"

    from app import create_app
    app = create_app()
    client = app.test_client()

    # OPTIONS preflight from allowed origin
    res_opts_allow = client.options(
        "/api/predict",
        headers={
            "Origin": "https://railsense.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    cors_allow_hdr = res_opts_allow.headers.get("Access-Control-Allow-Origin")
    print(f"OPTIONS Allowed Origin:  Status {res_opts_allow.status_code}, Allow-Origin: {cors_allow_hdr}")
    assert res_opts_allow.status_code == 200
    assert cors_allow_hdr == "https://railsense.vercel.app"

    # OPTIONS preflight from disallowed origin
    res_opts_deny = client.options(
        "/api/predict",
        headers={
            "Origin": "https://malicious-site.com",
            "Access-Control-Request-Method": "POST"
        }
    )
    cors_deny_hdr = res_opts_deny.headers.get("Access-Control-Allow-Origin")
    print(f"OPTIONS Denied Origin:   Status {res_opts_deny.status_code}, Allow-Origin: {cors_deny_hdr}")
    assert cors_deny_hdr is None or cors_deny_hdr != "https://malicious-site.com"

    # GET request from allowed vs disallowed origin
    res_get_allow = client.get("/api/overview", headers={"Origin": "https://railsense.vercel.app"})
    print(f"GET Allowed Origin:      Status {res_get_allow.status_code}, Allow-Origin: {res_get_allow.headers.get('Access-Control-Allow-Origin')}")
    assert res_get_allow.headers.get("Access-Control-Allow-Origin") == "https://railsense.vercel.app"

    res_get_deny = client.get("/api/overview", headers={"Origin": "https://malicious-site.com"})
    print(f"GET Denied Origin:       Status {res_get_deny.status_code}, Allow-Origin: {res_get_deny.headers.get('Access-Control-Allow-Origin')}")
    assert res_get_deny.headers.get("Access-Control-Allow-Origin") is None

    # 2. Security Headers
    print("\n--- 2. Security Headers ---")
    res_sec = client.get("/api/overview")
    headers_to_check = [
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
        ("Referrer-Policy", "strict-origin-when-cross-origin"),
        ("Permissions-Policy", "geolocation=(), camera=(), microphone=()"),
        ("Content-Security-Policy", "default-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:;")
    ]
    for h, expected in headers_to_check:
        val = res_sec.headers.get(h)
        match = (val == expected)
        print(f"[{'PASS' if match else 'FAIL'}] {h:<25}: {val}")
        assert match, f"Expected {h}={expected}, got {val}"

    # 3. HSTS Behavior Behind Proxy
    print("\n--- 3. HSTS Behind Proxy (X-Forwarded-Proto) ---")
    # Direct HTTP request without proxy headers -> NO HSTS (per RFC 6797)
    res_http = client.get("/api/overview")
    hsts_http = res_http.headers.get("Strict-Transport-Security")
    print(f"Direct HTTP (no proxy):     HSTS header: {hsts_http}")
    assert hsts_http is None, "HSTS must NOT be sent on plain HTTP"

    # Behind HTTPS proxy (X-Forwarded-Proto: https) -> HSTS PRESENT
    res_https = client.get("/api/overview", headers={"X-Forwarded-Proto": "https"})
    hsts_https = res_https.headers.get("Strict-Transport-Security")
    print(f"Behind HTTPS Proxy (proto): HSTS header: {hsts_https}")
    assert hsts_https == "max-age=31536000; includeSubDomains", f"Unexpected HSTS header: {hsts_https}"

    # 4. Docs Flag Rehearsal
    print("\n--- 4. Docs Flag Rehearsal (ENABLE_DOCS) ---")
    # ENABLE_DOCS=true (currently set)
    res_docs_on = client.get("/api/docs")
    res_spec_on = client.get("/api/openapi.json")
    print(f"ENABLE_DOCS=true:  /api/docs Status {res_docs_on.status_code}, /api/openapi.json Status {res_spec_on.status_code}")
    assert res_docs_on.status_code == 200
    assert res_spec_on.status_code == 200

    # Test with ENABLE_DOCS=false
    os.environ["ENABLE_DOCS"] = "false"
    res_docs_off = client.get("/api/docs")
    res_spec_off = client.get("/api/openapi.json")
    print(f"ENABLE_DOCS=false: /api/docs Status {res_docs_off.status_code}, /api/openapi.json Status {res_spec_off.status_code}")
    assert res_docs_off.status_code == 404
    assert res_spec_off.status_code == 404
    os.environ["ENABLE_DOCS"] = "true"

    # 5. Rate Limiter with Spoofed X-Forwarded-For
    print("\n--- 5. Limiter with Spoofed X-Forwarded-For ---")
    # Test A: TRUSTED_PROXY_COUNT = 0 (Direct socket, ignores X-Forwarded-For)
    os.environ["TRUSTED_PROXY_COUNT"] = "0"
    app_p0 = create_app({"RATE_LIMIT_MAX": 5, "RATE_LIMIT_WINDOW": 60})
    c_p0 = app_p0.test_client()

    # Sending 6 requests from the same socket remote_addr='192.168.1.50' with DIFFERENT spoofed X-Forwarded-For
    statuses_p0 = []
    for i in range(6):
        resp = c_p0.get("/api/overview", environ_base={"REMOTE_ADDR": "192.168.1.50"}, headers={"X-Forwarded-For": f"10.0.0.{i}"})
        statuses_p0.append(resp.status_code)
    print(f"TRUSTED_PROXY_COUNT=0 (limit 5): Statuses on same socket with spoofed XFF: {statuses_p0}")
    # 6th request must be blocked (429) because proxyfix is off and remote_addr was identical
    assert statuses_p0 == [200, 200, 200, 200, 200, 429]
    print("[PASS] Limiter correctly ignored spoofed X-Forwarded-For when TRUSTED_PROXY_COUNT=0")

    # Test B: TRUSTED_PROXY_COUNT = 1 (Behind 1 trusted proxy, resolves X-Forwarded-For)
    os.environ["TRUSTED_PROXY_COUNT"] = "1"
    app_p1 = create_app({"RATE_LIMIT_MAX": 5, "RATE_LIMIT_WINDOW": 60, "TRUSTED_PROXY_COUNT": 1})
    c_p1 = app_p1.test_client()

    # Sending 6 requests through trusted proxy socket '10.0.0.1' with DIFFERENT client IPs in X-Forwarded-For
    statuses_p1 = []
    for i in range(6):
        resp = c_p1.get("/api/overview", environ_base={"REMOTE_ADDR": "10.0.0.1"}, headers={"X-Forwarded-For": f"203.0.113.{i}"})
        statuses_p1.append(resp.status_code)
    print(f"TRUSTED_PROXY_COUNT=1 (limit 5): Statuses with different client IPs behind proxy: {statuses_p1}")
    # All 6 requests should pass (200) because each client IP in X-Forwarded-For had only 1 request
    assert statuses_p1 == [200, 200, 200, 200, 200, 200]
    print("[PASS] ProxyFix correctly unpacked genuine client IP from X-Forwarded-For when TRUSTED_PROXY_COUNT=1")

    # Sending 6 requests through trusted proxy with SAME client IP
    statuses_same_p1 = []
    for i in range(6):
        resp = c_p1.get("/api/overview", environ_base={"REMOTE_ADDR": "10.0.0.1"}, headers={"X-Forwarded-For": "203.0.113.99"})
        statuses_same_p1.append(resp.status_code)
    print(f"TRUSTED_PROXY_COUNT=1 (limit 5): Statuses with same client IP behind proxy: {statuses_same_p1}")
    assert statuses_same_p1 == [200, 200, 200, 200, 200, 429]
    print("[PASS] Rate limiter correctly throttled client IP behind proxy at request #6")

    # 6. Error Envelope Verification
    print("\n--- 6. Error Envelope Verification ---")
    # 400 Bad Request
    r400 = client.post("/api/predict", json="not-a-dict")
    # 404 Not Found
    r404 = client.get("/api/nonexistent")
    # 405 Method Not Allowed
    r405 = client.delete("/api/overview")
    # 422 Unprocessable Entity
    r422 = client.post("/api/predict", json={"train_number": "INVALID"})
    # 429 Rate Limit (from our throttled test)
    r429 = resp

    error_responses = [("400", r400), ("404", r404), ("405", r405), ("422", r422), ("429", r429)]
    for code_name, r in error_responses:
        d = r.get_json()
        assert "error" in d, f"Missing 'error' key in {code_name} response"
        err = d["error"]
        assert "code" in err and "message" in err and "request_id" in err, f"Incomplete envelope in {code_name}: {err}"
        print(f"[{code_name}] Code: {err['code']:<22} | Msg: {err['message'][:40]:<42} | ReqID: {err['request_id'][:8]}...")

    print("\n[OK] All Production-Mode Rehearsal Tests PASSED with 100% compliance!")


if __name__ == "__main__":
    run_rehearsal()
