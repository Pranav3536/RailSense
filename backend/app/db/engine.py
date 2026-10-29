"""
Database engine and read-only query guard for RailSense.

Provides:
- SQLAlchemy engine with TLS certificate verification, connection pooling, and timeouts.
- Read-only query guard strictly enforcing SELECT/SHOW/DESCRIBE/EXPLAIN and rejecting
  DDL, DML, multi-statement inputs, comment-based bypasses, and unauthorized queries.
"""

import re
from typing import Optional, Dict, Any, List, Tuple
from urllib.parse import quote_plus
import certifi
import sqlalchemy as sa
from sqlalchemy.engine import Engine, Connection
from sqlalchemy.sql import text
from app.db.config import DBConfig, load_db_config

HARD_ROW_CAP = 300_000


class ReadOnlyViolationError(ValueError):
    """Raised when a query violates read-only guard rules."""
    pass


# Disallowed DDL, DML, and administrative keywords
DISALLOWED_KEYWORDS = (
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bDELETE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bCREATE\b",
    r"\bTRUNCATE\b",
    r"\bREPLACE\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
    r"\bLOCK\s+TABLES\b",
    r"\bUNLOCK\s+TABLES\b",
    r"\bRENAME\b",
    r"\bFLUSH\b",
    r"\bKILL\b",
    r"\bLOAD\s+DATA\b",
    r"\bOUTFILE\b",
    r"\bDUMPFILE\b",
    r"\bCALL\b",
    r"\bEXECUTE\b",
    r"\bSET\b",
)


def _strip_sql_comments_and_strings(sql: str) -> str:
    """
    Remove SQL comments (-- ..., /* ... */, # ...) and string literals
    to safely inspect statements without false triggers from comment content
    or string values.
    """
    # Replace string literals '...' and "..." with ''
    no_strings = re.sub(r"'(?:''|[^'])*'", "''", sql)
    no_strings = re.sub(r'"(?:""|[^"])*"', '""', no_strings)

    # Remove multi-line comments /* ... */
    no_multi_comments = re.sub(r"/\*.*?\*/", " ", no_strings, flags=re.DOTALL)

    # Remove single-line comments -- ... and # ...
    no_single_comments = re.sub(r"(?:--|#)[^\r\n]*", " ", no_multi_comments)

    return no_single_comments


def validate_read_only_query(sql: str) -> str:
    """
    Validates that a SQL string is purely read-only and safe to execute.

    Permitted starting clauses:
    - SELECT
    - SHOW
    - DESCRIBE / DESC
    - EXPLAIN
    - WITH ... (Common Table Expressions leading to SELECT)

    Rejected:
    - Empty queries
    - Multi-statement execution (semicolons separating queries)
    - Any DDL/DML keywords (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, etc.)
    - Comment-based injection bypass attempts
    """
    if not sql or not sql.strip():
        raise ReadOnlyViolationError("Query string must not be empty.")

    cleaned_for_structure = _strip_sql_comments_and_strings(sql)
    tokens = cleaned_for_structure.strip().split()
    if not tokens:
        raise ReadOnlyViolationError("Query contains only comments or whitespace.")

    # 1. Multi-statement check:
    # Ensure that any semicolon appears only as the last non-whitespace character
    statements = [stmt.strip() for stmt in cleaned_for_structure.split(";") if stmt.strip()]
    if len(statements) > 1:
        raise ReadOnlyViolationError(
            "Multi-statement execution rejected. Only single queries are allowed."
        )

    # 2. Starting statement validation
    first_token = tokens[0].upper()
    allowed_start_tokens = {"SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN", "WITH"}
    if first_token not in allowed_start_tokens:
        raise ReadOnlyViolationError(
            f"Query must begin with one of {sorted(allowed_start_tokens)}, got: {first_token!r}"
        )

    # 3. If starting with WITH (CTE), ensure it contains a top-level SELECT
    if first_token == "WITH":
        has_select = re.search(r"\bSELECT\b", cleaned_for_structure, re.IGNORECASE)
        if not has_select:
            raise ReadOnlyViolationError("WITH CTE query must contain a SELECT statement.")

    # 4. Keyword check across entire structure (comments & strings removed)
    for pattern in DISALLOWED_KEYWORDS:
        if re.search(pattern, cleaned_for_structure, re.IGNORECASE):
            match = re.search(pattern, cleaned_for_structure, re.IGNORECASE).group(0)
            raise ReadOnlyViolationError(
                f"Disallowed keyword/statement detected in query: {match.upper()}"
            )

    return sql


def create_db_engine(config: Optional[DBConfig] = None) -> Engine:
    """
    Create a SQLAlchemy engine connected to TiDB Cloud with TLS verification.
    """
    if config is None:
        config = load_db_config()

    # TLS CA path: use configured path or certifi's bundle
    ca_cert = config.ca_path if config.ca_path else certifi.where()

    # URL-encode user and password
    encoded_user = quote_plus(config.user)
    encoded_password = quote_plus(config.password)

    db_url = (
        f"mysql+pymysql://{encoded_user}:{encoded_password}"
        f"@{config.host}:{config.port}/{config.database}"
        f"?charset=utf8mb4"
    )

    connect_args = {
        "ssl": {
            "ca": ca_cert,
            "check_hostname": True,
        },
        "connect_timeout": 15,
        "read_timeout": config.query_timeout,
        "write_timeout": config.query_timeout,
    }

    engine = sa.create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=5,
        pool_timeout=30,
        future=True,
    )

    return engine


def execute_read_only_query(
    engine: Engine,
    sql: str,
    params: Optional[Dict[str, Any]] = None,
    max_rows: Optional[int] = None,
) -> Tuple[List[str], List[Tuple[Any, ...]]]:
    """
    Execute a validated read-only SQL query and return (column_names, rows).
    Applies guard validation, row cap, and parameter binding.
    """
    validate_read_only_query(sql)

    effective_max_rows = HARD_ROW_CAP
    if max_rows is not None and max_rows > 0:
        effective_max_rows = min(max_rows, HARD_ROW_CAP)

    with engine.connect() as conn:
        stmt = text(sql)
        result = conn.execute(stmt, params or {})
        columns = list(result.keys()) if result.returns_rows else []
        rows = result.fetchmany(effective_max_rows) if result.returns_rows else []

    return columns, rows
