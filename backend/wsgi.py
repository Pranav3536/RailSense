"""
RailSense — WSGI Entrypoint (backend/wsgi.py)
Used by production WSGI servers (Gunicorn, Waitress) and local development.
"""

import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
