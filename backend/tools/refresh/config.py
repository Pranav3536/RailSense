"""
Database configuration loader and validator for RailSense.

Loads environment variables from backend/.env and system environment.
Validates required credentials, rejects placeholders, and guarantees
zero leakage of passwords in safe summaries, logs, or string representations.
"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# List of known placeholder patterns to reject
PLACEHOLDER_SUBSTRINGS = (
    "placeholder",
    "your_",
    "changeme",
    "password_here",
    "username_here",
    "example",
    "xxx",
)


class DatabaseConfigError(ValueError):
    """Raised when database configuration is missing, invalid, or contains placeholders."""
    pass


@dataclass(frozen=True)
class DBConfig:
    host: str
    port: int
    user: str
    password: str
    database: str
    ca_path: Optional[str] = None
    query_timeout: int = 30
    max_page_size: int = 100

    def __post_init__(self):
        # Validation on instance attributes
        if not self.host or not self.host.strip():
            raise DatabaseConfigError("TIDB_HOST must not be empty.")
        if not self.user or not self.user.strip():
            raise DatabaseConfigError("TIDB_USER must not be empty.")
        if not self.password or not self.password.strip():
            raise DatabaseConfigError("TIDB_PASSWORD must not be empty.")
        if not self.database or not self.database.strip():
            raise DatabaseConfigError("TIDB_DATABASE must not be empty.")

        # Check for placeholders
        for val, name in [
            (self.user, "TIDB_USER"),
            (self.password, "TIDB_PASSWORD"),
            (self.host, "TIDB_HOST"),
        ]:
            val_lower = val.lower()
            if any(p in val_lower for p in PLACEHOLDER_SUBSTRINGS):
                raise DatabaseConfigError(
                    f"{name} contains an invalid placeholder value and must be set to real credentials."
                )

        if self.port <= 0 or self.port > 65535:
            raise DatabaseConfigError(f"TIDB_PORT must be a valid port (1-65535), got: {self.port}")

        if self.query_timeout <= 0:
            raise DatabaseConfigError(f"DB_QUERY_TIMEOUT_SECONDS must be positive, got: {self.query_timeout}")

        if self.max_page_size <= 0:
            raise DatabaseConfigError(f"API_MAX_PAGE_SIZE must be positive, got: {self.max_page_size}")

        if self.ca_path and not os.path.exists(self.ca_path):
            raise DatabaseConfigError(f"TIDB_CA_PATH specified but file does not exist: {self.ca_path}")

    def safe_summary(self) -> Dict[str, Any]:
        """
        Return a safe dictionary representation of configuration.
        Password is never exposed, not even its length.
        Username is partially masked.
        """
        if len(self.user) <= 4:
            masked_user = self.user[0] + "***" if self.user else "***"
        else:
            masked_user = self.user[:3] + "***"

        return {
            "host": self.host,
            "port": self.port,
            "user": masked_user,
            "password": "[PROTECTED]",
            "database": self.database,
            "ca_path_set": bool(self.ca_path),
            "query_timeout_seconds": self.query_timeout,
            "max_page_size": self.max_page_size,
        }

    def __repr__(self) -> str:
        summary = self.safe_summary()
        return (
            f"DBConfig(host='{summary['host']}', port={summary['port']}, "
            f"user='{summary['user']}', database='{summary['database']}', "
            f"ca_path_set={summary['ca_path_set']}, password='[PROTECTED]')"
        )

    def __str__(self) -> str:
        return self.__repr__()


def load_db_config(env_path: Optional[str] = None) -> DBConfig:
    """
    Load and validate database configuration from .env file and environment.
    Searches backend/.env and current directory .env if env_path is not specified.
    """
    if env_path is not None:
        load_dotenv(env_path, override=True)
    else:
        # Search possible .env locations: backend/.env, .env
        base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
        backend_env = base_dir / ".env"
        root_env = base_dir.parent / ".env"

        if backend_env.exists():
            load_dotenv(backend_env, override=False)
        elif root_env.exists():
            load_dotenv(root_env, override=False)
        else:
            load_dotenv()  # Default dotenv search

    host = os.getenv("TIDB_HOST")
    port_raw = os.getenv("TIDB_PORT", "4000")
    user = os.getenv("TIDB_USER")
    password = os.getenv("TIDB_PASSWORD")
    database = os.getenv("TIDB_DATABASE", "railsense")
    ca_path = os.getenv("TIDB_CA_PATH", "").strip() or None
    timeout_raw = os.getenv("DB_QUERY_TIMEOUT_SECONDS", "30")
    page_size_raw = os.getenv("API_MAX_PAGE_SIZE", "100")

    missing = []
    if not host:
        missing.append("TIDB_HOST")
    if not user:
        missing.append("TIDB_USER")
    if not password:
        missing.append("TIDB_PASSWORD")
    if not database:
        missing.append("TIDB_DATABASE")

    if missing:
        raise DatabaseConfigError(f"Missing required database environment variables: {', '.join(missing)}")

    try:
        port = int(port_raw)
    except (ValueError, TypeError):
        raise DatabaseConfigError(f"TIDB_PORT must be an integer, got: {port_raw!r}")

    try:
        query_timeout = int(timeout_raw)
    except (ValueError, TypeError):
        raise DatabaseConfigError(f"DB_QUERY_TIMEOUT_SECONDS must be an integer, got: {timeout_raw!r}")

    try:
        max_page_size = int(page_size_raw)
    except (ValueError, TypeError):
        raise DatabaseConfigError(f"API_MAX_PAGE_SIZE must be an integer, got: {page_size_raw!r}")

    return DBConfig(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        ca_path=ca_path,
        query_timeout=query_timeout,
        max_page_size=max_page_size,
    )
