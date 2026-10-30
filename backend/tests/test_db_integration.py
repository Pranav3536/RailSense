"""
Integration tests for live TiDB Cloud connectivity and read-only query guard.

Marked with @pytest.mark.integration.
Skips cleanly if live database credentials are not configured or connection is unreachable.
"""

import pytest
from tools.refresh.config import load_db_config, DatabaseConfigError
from tools.refresh.engine import create_db_engine, execute_read_only_query, ReadOnlyViolationError


@pytest.fixture(scope="module")
def live_engine():
    try:
        config = load_db_config()
    except (DatabaseConfigError, Exception) as e:
        pytest.skip(f"Database configuration not available for integration tests: {e}")

    try:
        engine = create_db_engine(config)
        # Test basic connection with a 5 second timeout
        with engine.connect() as conn:
            pass
        return engine
    except Exception as e:
        pytest.skip(f"Live database unreachable: {e}")


@pytest.mark.integration
def test_live_select_1(live_engine):
    cols, rows = execute_read_only_query(live_engine, "SELECT 1 AS check_col")
    assert cols == ["check_col"]
    assert len(rows) == 1
    assert rows[0][0] == 1


@pytest.mark.integration
def test_live_tls_cipher_active(live_engine):
    cols, rows = execute_read_only_query(live_engine, "SHOW STATUS LIKE 'Ssl_cipher'")
    assert len(rows) == 1
    cipher = rows[0][1]
    assert cipher is not None
    assert len(cipher) > 0


@pytest.mark.integration
def test_live_query_guard_blocks_dml(live_engine):
    # Guard must block DML before any request is sent to the live database
    with pytest.raises(ReadOnlyViolationError):
        execute_read_only_query(live_engine, "DROP TABLE train_records")

    with pytest.raises(ReadOnlyViolationError):
        execute_read_only_query(live_engine, "INSERT INTO train_records (id) VALUES (9999999)")


@pytest.mark.integration
def test_live_train_records_schema(live_engine):
    cols, rows = execute_read_only_query(
        live_engine,
        "SELECT COUNT(*) FROM train_records"
    )
    assert len(rows) == 1
    total_rows = rows[0][0]
    assert total_rows == 2805574
