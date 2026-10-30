"""
RailSense — WSGI Entrypoint (backend/wsgi.py)
Used by production WSGI servers (Waitress on Windows, Gunicorn on Linux).
"""

import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5000))
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    threads = int(os.environ.get("FLASK_THREADS", 4))
    try:
        from waitress import serve
        print(f"Starting RailSense API with Waitress ({threads} threads) on http://{host}:{port}")
        serve(app, host=host, port=port, threads=threads)
    except ImportError:
        debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
        print(f"Starting RailSense API with Flask dev server (threaded=True) on http://{host}:{port}")
        app.run(host=host, port=port, debug=debug, threaded=True)
