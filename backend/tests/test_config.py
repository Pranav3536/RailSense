"""
Unit tests for database configuration loader and validator (app.db.config).
"""

import pytest
from app.db.config import DBConfig, DatabaseConfigError, load_db_config


def test_valid_db_config():
    cfg = DBConfig(
        host="test.gateway.tidbcloud.com",
        port=4000,
        user="test_user",
        password="RealSecretPassword123!",
        database="railsense",
        query_timeout=30,
        max_page_size=100,
    )
    assert cfg.host == "test.gateway.tidbcloud.com"
    assert cfg.port == 4000
    assert cfg.database == "railsense"
    assert cfg.query_timeout == 30


def test_missing_host_raises():
    with pytest.raises(DatabaseConfigError, match="TIDB_HOST must not be empty"):
        DBConfig(
            host="",
            port=4000,
            user="user",
            password="pass",
            database="railsense",
        )


def test_missing_user_raises():
    with pytest.raises(DatabaseConfigError, match="TIDB_USER must not be empty"):
        DBConfig(
            host="host",
            port=4000,
            user="",
            password="pass",
            database="railsense",
        )


def test_missing_password_raises():
    with pytest.raises(DatabaseConfigError, match="TIDB_PASSWORD must not be empty"):
        DBConfig(
            host="host",
            port=4000,
            user="user",
            password="",
            database="railsense",
        )


def test_placeholder_password_rejected():
    with pytest.raises(DatabaseConfigError, match="placeholder value"):
        DBConfig(
            host="host",
            port=4000,
            user="user",
            password="your_password_here",
            database="railsense",
        )


def test_placeholder_user_rejected():
    with pytest.raises(DatabaseConfigError, match="placeholder value"):
        DBConfig(
            host="host",
            port=4000,
            user="your_username_here",
            password="RealPassword123!",
            database="railsense",
        )


def test_invalid_port_rejected():
    with pytest.raises(DatabaseConfigError, match="valid port"):
        DBConfig(
            host="host",
            port=999999,
            user="user",
            password="RealPassword123!",
            database="railsense",
        )


def test_zero_or_negative_port_rejected():
    with pytest.raises(DatabaseConfigError, match="valid port"):
        DBConfig(
            host="host",
            port=0,
            user="user",
            password="RealPassword123!",
            database="railsense",
        )


def test_password_never_exposed():
    secret = "SuperSecretLiveTiDBPassword999"
    cfg = DBConfig(
        host="host.tidb.com",
        port=4000,
        user="my_admin_user",
        password=secret,
        database="railsense",
    )

    summary = cfg.safe_summary()
    assert secret not in str(summary)
    assert summary["password"] == "[PROTECTED]"
    assert len(summary["password"]) != len(secret)
    assert secret not in repr(cfg)
    assert secret not in str(cfg)

    # Check that username is partially masked
    assert summary["user"] == "my_***"
