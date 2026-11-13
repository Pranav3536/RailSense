"""
Connection verification script for TiDB Cloud.

Verifies:
1. Environment configuration loading and validity.
2. TLS connection establishment with certificate verification.
3. Execution of SELECT 1, VERSION(), DATABASE().
4. Verification of active SSL/TLS cipher.
5. Verification that table 'train_records' exists in database.

Never prints or leaks credentials.
"""

import sys
import os
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from tools.refresh.config import load_db_config, DatabaseConfigError
from tools.refresh.engine import create_db_engine, execute_read_only_query


def diagnose_connection_error(e: Exception) -> str:
    """Diagnose common connection errors without printing sensitive data."""
    err_str = str(e).lower()
    if "access denied" in err_str:
        return "Authentication failure: TIDB_USER or TIDB_PASSWORD incorrect."
    if "unknown database" in err_str:
        return "Database not found: TIDB_DATABASE does not exist."
    if "ssl" in err_str or "certificate" in err_str or "tls" in err_str:
        return "TLS/Certificate error: Certificate verification failed or CA bundle invalid."
    if "timed out" in err_str or "timeout" in err_str:
        return "Connection timeout: Host unreachable. Check TiDB Cloud IP Access List or port 4000."
    if "getaddrinfo failed" in err_str or "name or service not known" in err_str:
        return "DNS resolution failure: TIDB_HOST cannot be resolved."
    if "connection refused" in err_str:
        return "Connection refused: Host is reachable but port 4000 rejected the connection."
    return f"Database error ({type(e).__name__}): {e}"


def check_connection() -> bool:
    print("=" * 60)
    print("RailSense — TiDB Connectivity & TLS Check")
    print("=" * 60)

    # 1. Load Config
    try:
        config = load_db_config()
        print("[OK] Configuration loaded successfully.")
        print(f"     Target Host: {config.host}")
        print(f"     Port:        {config.port}")
        print(f"     Database:    {config.database}")
        print(f"     User:        {config.safe_summary()['user']}")
        print(f"     CA Cert:     {config.ca_path or 'system/certifi default'}")
    except DatabaseConfigError as e:
        print(f"[BLOCKED] Configuration validation failed: {e}")
        return False
    except Exception as e:
        print(f"[BLOCKED] Unexpected configuration error: {e}")
        return False

    # 2. Test Connection & Queries
    try:
        print("\nConnecting to TiDB Cloud with TLS verification...")
        engine = create_db_engine(config)

        # Test SELECT 1
        cols, rows = execute_read_only_query(engine, "SELECT 1 AS check_col")
        if not rows or rows[0][0] != 1:
            print("[BLOCKED] SELECT 1 query did not return expected value.")
            return False
        print("[OK] SELECT 1 succeeded.")

        # Test VERSION() and DATABASE()
        cols, rows = execute_read_only_query(engine, "SELECT VERSION() AS ver, DATABASE() AS db_name")
        version_str = rows[0][0]
        db_name = rows[0][1]
        print(f"[OK] TiDB Version: {version_str}")
        print(f"[OK] Active Database: {db_name}")

        # Check SSL Cipher
        cols, rows = execute_read_only_query(engine, "SHOW STATUS LIKE 'Ssl_cipher'")
        ssl_cipher = rows[0][1] if rows else None
        if not ssl_cipher:
            print("[BLOCKED] TLS is not active! Ssl_cipher returned empty.")
            return False
        print(f"[OK] TLS Encryption Active: Cipher = {ssl_cipher}")

        # Check table train_records existence
        cols, rows = execute_read_only_query(
            engine,
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = :db AND table_name = 'train_records'",
            {"db": config.database},
        )
        table_exists = rows[0][0] > 0
        if not table_exists:
            print(f"[WARNING] Table 'train_records' not found in database '{config.database}'.")
        else:
            print("[OK] Verified table 'train_records' exists in database.")

        print("\n[SUCCESS] TiDB connection and TLS verification fully PASSED.")
        print("=" * 60)
        return True

    except Exception as e:
        diagnosis = diagnose_connection_error(e)
        print(f"\n[BLOCKED] Connection failed: {diagnosis}")
        print(f"Details: {e}")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = check_connection()
    sys.exit(0 if success else 1)
