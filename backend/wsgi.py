"""
RailSense — WSGI Entrypoint (backend/wsgi.py)
Used by production WSGI servers (Waitress on Windows/Linux, Gunicorn on Linux).
Binds to 0.0.0.0 and reads PORT (standard Render / cloud port convention).
"""

import os
import sys
from pathlib import Path

# Ensure backend directory is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Production serving artifact integrity check
is_production = os.environ.get("RAILSENSE_ENV") == "production" or os.environ.get("FLASK_ENV") == "production"
if is_production:
    from scripts.verify_artifacts import verify_artifacts
    if not verify_artifacts():
        print("[CRITICAL] Production serving artifacts verification failed! Halting startup.", file=sys.stderr)
        sys.exit(1)

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Render sets PORT, default to 5000 if unset
    port = int(os.environ.get("PORT", os.environ.get("FLASK_PORT", 5000)))
    # In production on cloud hosts (Render), bind 0.0.0.0; locally bind 127.0.0.1
    default_host = "0.0.0.0" if is_production else "127.0.0.1"
    host = os.environ.get("FLASK_HOST", default_host)
    # Single-process with fixed threads to strictly stay under 512 MB Render free tier
    threads = int(os.environ.get("FLASK_THREADS", 4))

    try:
        from waitress import serve
        print(f"Starting RailSense API with Waitress ({threads} threads) on http://{host}:{port}")
        serve(app, host=host, port=port, threads=threads)
    except ImportError:
        debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
        print(f"Starting RailSense API with Flask dev server on http://{host}:{port}")
        app.run(host=host, port=port, debug=debug, threaded=True)
