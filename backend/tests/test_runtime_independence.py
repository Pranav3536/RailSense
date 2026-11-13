"""
RailSense — Runtime Independence & Concurrency Tests (backend/tests/test_runtime_independence.py)
Enforces:
1. Complete runtime independence from TiDB, SQLAlchemy, and PyMySQL.
2. Source-level verification that backend/app never imports refresh tools or reads TIDB_* env vars.
3. Truthful local /api/health/ready reporting without remote database keys.
4. Sub-50ms in-memory train catalog performance without per-request rebuilds.
"""

import os
import sys
import time
import json
import tempfile
from pathlib import Path
import pytest
from app import create_app
from app.serving_client import ServingClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_source_no_tidb_in_app():
    """Verify that nothing under backend/app imports tools.refresh or reads TIDB_ env names."""
    app_dir = PROJECT_ROOT / "backend" / "app"
    forbidden_terms = ["tools.refresh", "TIDB_", "create_engine", "pymysql", "app.db"]

    violations = []
    for root, _, files in os.walk(app_dir):
        for f in files:
            if f.endswith(".py"):
                path = Path(root) / f
                with open(path, "r", encoding="utf-8") as fp:
                    for line_num, line in enumerate(fp, 1):
                        for term in forbidden_terms:
                            if term in line:
                                violations.append(f"{path.name}:{line_num} -> {line.strip()}")

    assert not violations, f"Forbidden references found in backend/app:\n" + "\n".join(violations)


def test_app_starts_without_db_drivers(monkeypatch):
    """
    Ensure the Flask application starts and serves core endpoints even when
    sqlalchemy and pymysql imports are completely blocked.
    """
    # Block pymysql and sqlalchemy from being imported
    for mod in ["pymysql", "sqlalchemy", "sqlalchemy.engine", "sqlalchemy.sql"]:
        monkeypatch.setitem(sys.modules, mod, None)

    # Clear any TIDB_* env vars
    for k in list(os.environ.keys()):
        if k.startswith("TIDB_"):
            monkeypatch.delenv(k, raising=False)

    app = create_app({"TESTING": True})
    client = app.test_client()

    # Liveness
    res = client.get("/api/health")
    assert res.status_code == 200

    # Readiness
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ready"
    assert "tidb_cloud" not in data["components"]
    assert data["data_source"] == "precomputed_local"

    # Train catalog
    res = client.get("/api/trains?page=1&page_size=5")
    assert res.status_code == 200

    # Model info
    res = client.get("/api/model/info")
    assert res.status_code == 200


def test_readiness_reports_truthfully_on_missing_store(tmp_path):
    """Verify /api/health/ready reports degraded/not_ready truthfully when serving store is missing."""
    empty_serving = ServingClient(serving_dir=tmp_path)
    app = create_app({"TESTING": True, "SERVING_CLIENT": empty_serving})
    client = app.test_client()

    res = client.get("/api/health/ready")
    assert res.status_code in (200, 503)
    data = res.get_json()
    assert data["components"]["serving_store"] == "unavailable"
    assert "tidb" not in json.dumps(data).lower()
    assert "host" not in data
    assert "user" not in data
    assert "password" not in data


def test_train_catalog_cached_and_fast():
    """Verify train catalog is loaded once in memory and responds in < 50ms without per-request rebuilds."""
    sc = ServingClient()
    assert sc._catalog_loaded is True
    assert len(sc._trains_all) == 10743

    # Warm run
    sc.get_trains(page=1, page_size=15)

    # 1. Empty query (p50 target < 50ms)
    t0 = time.time()
    for _ in range(5):
        res = sc.get_trains(page=1, page_size=15)
    elapsed_ms = ((time.time() - t0) / 5) * 1000
    assert elapsed_ms < 50.0
    assert len(res["items"]) == 15
    assert res["pagination"]["total"] == 10743

    # 2. Category filter
    t0 = time.time()
    res_cat = sc.get_trains(category="MEX", page=1, page_size=15)
    elapsed_ms = (time.time() - t0) * 1000
    assert elapsed_ms < 50.0
    assert len(res_cat["items"]) == 15
    assert res_cat["pagination"]["total"] == 2032

    # 3. Number prefix search
    t0 = time.time()
    res_num = sc.get_trains(query="12951", page=1, page_size=15)
    elapsed_ms = (time.time() - t0) * 1000
    assert elapsed_ms < 50.0
    assert any(t["train_number"] == "12951" for t in res_num["items"])

    # 4. Text search
    t0 = time.time()
    res_text = sc.get_trains(query="rajdhani", page=1, page_size=15)
    elapsed_ms = (time.time() - t0) * 1000
    assert elapsed_ms < 100.0
    assert len(res_text["items"]) > 0
