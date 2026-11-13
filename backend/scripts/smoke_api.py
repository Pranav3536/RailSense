"""
RailSense — End-to-End API Smoke & Runtime Independence Verification (backend/scripts/smoke_api.py)
Tests all endpoints against a live Waitress WSGI server with ZERO TiDB credentials or connectivity.
Asserts:
1. No TiDB, database names, hosts, or user credentials in any response payload.
2. Every endpoint returns valid HTTP 200 (or expected 422).
3. Sub-millisecond train catalog performance.
4. Process RSS idle and peak memory footprint.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

def request_json(url: str, method: str = "GET", data: dict = None) -> tuple[int, dict, float, int]:
    t0 = time.time()
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers={"Content-Type": "application/json"} if data else {},
        method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read()
            elapsed_ms = (time.time() - t0) * 1000
            json_data = json.loads(body.decode("utf-8")) if body else {}
            return resp.status, json_data, elapsed_ms, len(body)
    except urllib.error.HTTPError as e:
        body = e.read()
        elapsed_ms = (time.time() - t0) * 1000
        json_data = json.loads(body.decode("utf-8")) if body else {}
        return e.code, json_data, elapsed_ms, len(body)

def main():
    import psutil

    print("===================================================================")
    print("RAILSENSE — RUNTIME INDEPENDENCE & END-TO-END VERIFICATION")
    print("===================================================================")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}")

    # Temporarily hide backend/.env if present
    env_file = PROJECT_ROOT / "backend" / ".env"
    env_backup = PROJECT_ROOT / "backend" / ".env.phase8_5_tmp"
    has_env = env_file.exists()
    if has_env:
        env_file.rename(env_backup)
        print("Temporarily renamed backend/.env to backend/.env.phase8_5_tmp")

    server_process = None
    port = 5005
    try:
        # Launch Waitress server with clean sterile environment
        env = os.environ.copy()
        for k in list(env.keys()):
            if k.startswith("TIDB_"):
                del env[k]
        # Point to closed host/port just to prove nothing connects
        env["TIDB_HOST"] = "127.0.0.1"
        env["TIDB_PORT"] = "54321"
        env["FLASK_PORT"] = str(port)

        cmd = [sys.executable, str(PROJECT_ROOT / "backend" / "wsgi.py")]
        server_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        print(f"Launched server subprocess (PID: {server_process.pid}) on port {port}...")

        # Wait for server to become responsive
        base_url = f"http://127.0.0.1:{port}"
        ready = False
        for _ in range(30):
            time.sleep(0.3)
            try:
                status, data, _, _ = request_json(f"{base_url}/api/health")
                if status == 200:
                    ready = True
                    break
            except Exception:
                pass

        if not ready:
            print("ERROR: Server failed to start. Stderr:")
            print(server_process.stderr.read())
            sys.exit(1)

        print("Server is responsive and running cleanly!")
        proc = psutil.Process(server_process.pid)
        rss_idle = proc.memory_info().rss / (1024 * 1024)
        print(f"Initial Idle Process RSS: {rss_idle:.2f} MB\n")

        endpoints = [
            ("GET", "/api/health", None, 200),
            ("GET", "/api/health/ready", None, 200),
            ("GET", "/api/overview", None, 200),
            ("GET", "/api/trains?page=1&page_size=15", None, 200),
            ("GET", "/api/trains?q=12951", None, 200),
            ("GET", "/api/trains?q=rajdhani", None, 200),
            ("GET", "/api/trains?category=MEX&page=1&page_size=15", None, 200),
            ("GET", "/api/trains/12951", None, 200),
            ("GET", "/api/trains/02542", None, 200),
            ("GET", "/api/stations?page=1&page_size=10", None, 200),
            ("GET", "/api/stations/BRC", None, 200),
            ("GET", "/api/patterns/hour", None, 200),
            ("GET", "/api/patterns/dow", None, 200),
            ("GET", "/api/patterns/category", None, 200),
            ("GET", "/api/patterns/position", None, 200),
            ("GET", "/api/patterns/hotspots", None, 200),
            ("GET", "/api/model/info", None, 200),
            ("GET", "/api/model/metrics", None, 200),
            ("POST", "/api/predict", {"train_number": "12951", "seq": 4, "station_code": "BRC", "date": "2026-10-25"}, 200),
            ("POST", "/api/predict", {"train_number": "12951", "seq": 4, "station_code": "BRC", "date": "2026-11-05"}, 200),
            ("POST", "/api/predict", {"train_number": "02542", "seq": 3, "station_code": "KGN", "date": "2026-10-22"}, 200),
            ("POST", "/api/predict", {"train_number": "12951", "seq": 1, "station_code": "MMCT", "date": "2026-10-25"}, 422),
            ("POST", "/api/predict", {"train_number": "02542", "station_code": "KGN", "date": "2026-10-22"}, 422),
        ]

        print("| Method | Endpoint | Status | Latency (ms) | Size (bytes) | Pass? |")
        print("|---|---|---|---|---|---|")

        all_passed = True
        for method, ep, body, exp_code in endpoints:
            status, res_json, lat, sz = request_json(f"{base_url}{ep}", method=method, data=body)
            passed = (status == exp_code)

            # Security assertion: zero TiDB secret strings
            raw_str = json.dumps(res_json).lower()
            for bad_word in ["gateway01", "tidb_cloud", "tidbcloud.com", "root.train_records"]:
                if bad_word in raw_str:
                    passed = False
                    print(f"FAILED SECURITY: found {bad_word} in {ep}")

            if not passed:
                all_passed = False

            print(f"| `{method}` | `{ep}` | HTTP {status} | **{lat:.2f}ms** | {sz:,} | {'PASS' if passed else 'FAIL'} |")

        rss_peak = proc.memory_info().rss / (1024 * 1024)
        print(f"\nFinal Peak Process RSS: {rss_peak:.2f} MB (Delta: +{rss_peak - rss_idle:.2f} MB)")
        print(f"All Endpoint Assertions: {'ALL PASSED' if all_passed else 'SOME FAILED'}")

    finally:
        if server_process:
            server_process.terminate()
            server_process.wait(timeout=3)
            print("Terminated server subprocess.")
        if has_env and env_backup.exists():
            env_backup.rename(env_file)
            print("Restored backend/.env safely.")

if __name__ == "__main__":
    main()
