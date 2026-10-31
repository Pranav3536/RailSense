"""
RailSense — Post-Deployment Live Smoke Verification Suite (backend/scripts/smoke_deployed.py)
Validates a deployed RailSense backend and frontend in production:
1. Health & readiness probes (/api/health, /api/health/ready)
2. Security response headers (CSP, nosniff, DENY, etc.)
3. CORS configuration & headers
4. 422 input error envelope handling
5. 20 Reference predictions compared against docs/deploy_smoke_expected.json
6. Frontend connectivity and SPA routing check

Usage:
    python backend/scripts/smoke_deployed.py <DEPLOYED_API_URL> [<DEPLOYED_FRONTEND_URL>]
Example:
    python backend/scripts/smoke_deployed.py https://railsense-backend.onrender.com https://railsense.vercel.app
"""

import sys
import os
import json
import time
from pathlib import Path
import urllib.request
import urllib.error

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
FIXTURE_PATH = PROJECT_ROOT / "docs" / "deploy_smoke_expected.json"


def http_request(url: str, method: str = "GET", payload: dict = None, headers: dict = None) -> tuple:
    """Performs HTTP request using standard library urllib."""
    if headers is None:
        headers = {}
    
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    headers["User-Agent"] = "RailSense-SmokeVerifier/2.0"
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            res_headers = dict(resp.headers)
            try:
                body_json = json.loads(body)
            except Exception:
                body_json = None
            return status, body_json, body, res_headers, None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            body_json = json.loads(body)
        except Exception:
            body_json = None
        return e.code, body_json, body, dict(e.headers), None
    except Exception as e:
        return 0, None, "", {}, str(e)


def run_smoke_verification(api_url: str, frontend_url: str = None) -> bool:
    api_url = api_url.rstrip("/")
    if frontend_url:
        frontend_url = frontend_url.rstrip("/")

    print("=" * 80)
    print("RailSense Phase 11 — Post-Deployment Production Smoke Verification")
    print(f"Target API URL:      {api_url}")
    if frontend_url:
        print(f"Target Frontend URL: {frontend_url}")
    print("=" * 80)

    total_checks = 0
    passed_checks = 0
    failures = []

    def check(name: str, passed: bool, detail: str = ""):
        nonlocal total_checks, passed_checks
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"  [PASS] {name} {detail}")
        else:
            failures.append((name, detail))
            print(f"  [FAIL] {name} - {detail}")

    # 1. Health Probe
    print("\n1. Probing Health & Readiness Endpoints...")
    st, body, _, headers, err = http_request(f"{api_url}/api/health")
    check("GET /api/health", st == 200, f"(Status: {st})")
    
    st_r, body_r, _, _, err_r = http_request(f"{api_url}/api/health/ready")
    is_ready = bool(st_r == 200 and body_r and body_r.get("status") == "ready")
    check("GET /api/health/ready", is_ready, f"(Status: {st_r}, Catalog: {body_r.get('catalog_loaded') if body_r else False})")

    # 2. Security Headers on API
    print("\n2. Inspecting API Security Response Headers...")
    check("X-Content-Type-Options: nosniff", headers.get("x-content-type-options", "").lower() == "nosniff")
    check("X-Frame-Options: DENY", headers.get("x-frame-options", "").upper() == "DENY")
    check("Referrer-Policy Present", "referrer-policy" in [k.lower() for k in headers])
    check("Permissions-Policy Present", "permissions-policy" in [k.lower() for k in headers])
    check("Content-Security-Policy Present", "content-security-policy" in [k.lower() for k in headers])

    # 3. CORS Preflight & 422 Error Handling
    print("\n3. Testing CORS & Input Validation Envelopes...")
    st_opts, _, _, cors_headers, _ = http_request(
        f"{api_url}/api/predict",
        method="OPTIONS",
        headers={"Origin": frontend_url or "https://railsense.vercel.app", "Access-Control-Request-Method": "POST"}
    )
    check("CORS Preflight (OPTIONS /api/predict)", st_opts in [200, 204], f"(Status: {st_opts})")

    # 422 on Origin Stop (seq=1 has no arrival delay)
    st_422, body_422, _, _, _ = http_request(f"{api_url}/api/predict", method="POST", payload={
        "train_number": "12951",
        "station_code": "MMCT",
        "seq": 1,
        "date": "2026-10-15"
    })
    check("HTTP 422 Error Handling (Origin Stop seq=1)", st_422 == 422 and body_422 and "error" in body_422, f"(Status: {st_422})")

    # 4. 20 Reference Predictions Check
    print("\n4. Verifying 20 Reference Predictions against Ground Truth Fixture...")
    if not FIXTURE_PATH.exists():
        check("Load deploy_smoke_expected.json", False, "Fixture file not found!")
    else:
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            fixture = json.load(f)
        
        cases = fixture.get("reference_cases", [])
        prediction_matches = 0

        for case in cases:
            cid = case["id"]
            req = case["request"]
            exp_p = case["expected_probability"]
            exp_del = case["expected_predicted_delayed"]
            exp_band = case["expected_risk_band"]
            tol = case.get("tolerance", 0.02)

            st_pred, res_json, _, _, err_pred = http_request(f"{api_url}/api/predict", method="POST", payload=req)
            if st_pred != 200 or not res_json:
                check(f"Ref Case #{cid:02d} ({req['train_number']} -> {req['station_code']})", False, f"Status {st_pred}, err: {err_pred}")
                continue

            actual_p = res_json.get("probability_delayed", 0.0)
            actual_del = res_json.get("predicted_delayed")
            actual_band = res_json.get("risk_band")

            diff = abs(actual_p - exp_p)
            is_match = bool(diff <= tol and actual_del == exp_del and actual_band == exp_band)
            if is_match:
                prediction_matches += 1
            check(
                f"Ref #{cid:02d} ({req['train_number']} -> {req['station_code']})",
                is_match,
                f"p={actual_p:.4f} (exp: {exp_p:.4f}, diff: {diff:.4f}, band: {actual_band})"
            )

        check(f"All 20 Reference Predictions Match (Tol <= 0.02)", prediction_matches == len(cases), f"({prediction_matches}/{len(cases)} matched)")

    # 5. Frontend Check (if URL provided)
    if frontend_url:
        print("\n5. Checking Live Frontend SPA...")
        st_fe, _, fe_body, fe_headers, fe_err = http_request(frontend_url)
        check("GET Deployed Frontend Root", st_fe == 200, f"(Status: {st_fe})")
        check("Frontend HTML Contains RailSense Title", "<title>RailSense" in fe_body, "(HTML verified)")
        check("Frontend Content-Security-Policy", "content-security-policy" in [k.lower() for k in fe_headers])

    print("\n" + "=" * 80)
    print(f"VERIFICATION SUMMARY: {passed_checks}/{total_checks} Checks Passed")
    if failures:
        print(f"[FAILED] {len(failures)} checks failed:")
        for name, detail in failures:
            print(f"  - {name}: {detail}")
        print("=" * 80)
        return False
    else:
        print("[SUCCESS] All deployed smoke verification checks passed with 100% compliance!")
        print("=" * 80)
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python smoke_deployed.py <DEPLOYED_API_URL> [<DEPLOYED_FRONTEND_URL>]")
        print("Note: If URLs are not yet deployed, this script is ready to run once owner provides URLs.")
        sys.exit(1)
    
    api_arg = sys.argv[1]
    fe_arg = sys.argv[2] if len(sys.argv) > 2 else None
    success = run_smoke_verification(api_arg, fe_arg)
    sys.exit(0 if success else 1)
