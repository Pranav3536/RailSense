"""
RailSense — Application Factory (backend/app/__init__.py)
Initializes Flask REST API, security middleware, in-memory rate limiting,
uniform error handlers, read-only serving store, and prediction engine singletons.
"""

import os
import time
import uuid
from collections import defaultdict
from threading import Lock
from typing import Optional

from flask import Flask, request, jsonify, g
from flask_cors import CORS

from app.api import api_bp
from app.serving_client import ServingClient
from app.ml.predict import RailSensePredictor


class InMemoryRateLimiter:
    """
    Thread-safe, sliding-window rate limiter per client IP.
    Default limit: 120 requests per minute per IP.
    """

    def __init__(self, max_requests: int = 120, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history = defaultdict(list)
        self.lock = Lock()

    def is_allowed(self, client_ip: str) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds

        with self.lock:
            timestamps = self.history[client_ip]
            # Prune old timestamps
            valid_timestamps = [t for t in timestamps if t > cutoff]
            if len(valid_timestamps) >= self.max_requests:
                self.history[client_ip] = valid_timestamps
                remaining = 0
                return False, remaining

            valid_timestamps.append(now)
            self.history[client_ip] = valid_timestamps
            remaining = self.max_requests - len(valid_timestamps)
            return True, remaining


def create_app(config: Optional[dict] = None) -> Flask:
    """
    Creates and configures the Flask application instance.
    """
    app = Flask(__name__)

    # Validate environment mode
    railsense_env = os.environ.get("RAILSENSE_ENV", "development").strip().lower()
    if railsense_env not in ("development", "production", "testing"):
        raise ValueError(
            f"Invalid RAILSENSE_ENV='{railsense_env}'. Must be one of: 'development', 'production', 'testing'."
        )

    # Default configuration from environment
    app.config.update({
        "RAILSENSE_ENV": railsense_env,
        "MAX_CONTENT_LENGTH": 1 * 1024 * 1024,  # 1MB max payload
        "JSON_SORT_KEYS": False,
        "API_MAX_PAGE_SIZE": int(os.environ.get("API_MAX_PAGE_SIZE", "100")),
        "RATE_LIMIT_MAX": int(os.environ.get("RATE_LIMIT_MAX", "120")),
        "RATE_LIMIT_WINDOW": int(os.environ.get("RATE_LIMIT_WINDOW", "60")),
        "TRUSTED_PROXY_COUNT": int(os.environ.get("TRUSTED_PROXY_COUNT", "0")),
    })

    if config:
        app.config.update(config)

    # Reverse proxy middleware for secure client IP handling
    trusted_proxies = app.config.get("TRUSTED_PROXY_COUNT", 0)
    if trusted_proxies > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=trusted_proxies,
            x_proto=trusted_proxies,
            x_host=trusted_proxies,
            x_port=trusted_proxies
        )

# 1. CORS Configuration
    cors_origins_raw = os.environ.get(
        "CORS_ORIGINS",
        "https://railsense-app.vercel.app,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    )
    origins = [orig.strip() for orig in cors_origins_raw.split(",") if orig.strip()]
    
    # Agar * set ho ya origins list ho
    CORS(
        app,
        resources={r"/api/*": {"origins": "*" if "*" in origins else origins}},
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"]
    )

    # 2. In-Memory Rate Limiter
    limiter = InMemoryRateLimiter(
        max_requests=app.config["RATE_LIMIT_MAX"],
        window_seconds=app.config["RATE_LIMIT_WINDOW"]
    )
    insights_limiter = InMemoryRateLimiter(
        max_requests=int(os.environ.get("INSIGHTS_RATE_LIMIT_MAX", "30")),
        window_seconds=60
    )
    app.config["RATE_LIMITER"] = limiter
    app.config["INSIGHTS_RATE_LIMITER"] = insights_limiter

    # 3. Singletons: Serving Client, Predictor, NLP Service
    if "SERVING_CLIENT" not in app.config:
        try:
            serving_client = ServingClient()
            app.config["SERVING_CLIENT"] = serving_client
        except Exception as e:
            app.logger.warning(f"Serving store client init deferred: {e}")
            app.config["SERVING_CLIENT"] = None

    if "PREDICTOR" not in app.config:
        try:
            predictor = RailSensePredictor().load()
            app.config["PREDICTOR"] = predictor
        except Exception as e:
            app.logger.warning(f"Predictor model loading deferred: {e}")
            app.config["PREDICTOR"] = None

    if "NLP_SERVICE" not in app.config and app.config.get("SERVING_CLIENT"):
        try:
            from app.nlp import SmartInsightsService
            nlp_service = SmartInsightsService(app.config["SERVING_CLIENT"])
            app.config["NLP_SERVICE"] = nlp_service
        except Exception as e:
            app.logger.warning(f"NLP service init deferred: {e}")
            app.config["NLP_SERVICE"] = None

    # 4. Request Lifecycle Middlewares
    @app.before_request
    def before_request_hook():
        g.start_time = time.time()
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Skip rate limit for health probes
        if request.path in ("/api/health", "/api/health/ready", "/health"):
            return None

        # Rate limiting check (using remote_addr securely resolved via ProxyFix if configured)
        client_ip = request.remote_addr or "127.0.0.1"

        # Stricter rate limit for /api/insights
        if request.path.startswith("/api/insights"):
            allowed, remaining = insights_limiter.is_allowed(client_ip)
            g.rate_limit_remaining = remaining
            if not allowed:
                return jsonify({
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many insights requests. Rate limit is 30 requests per minute.",
                        "details": None,
                        "request_id": g.request_id
                    }
                }), 429
            return None

        allowed, remaining = limiter.is_allowed(client_ip)
        g.rate_limit_remaining = remaining
        if not allowed:
            return jsonify({
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Rate limit is 120 requests per minute.",
                    "details": None,
                    "request_id": g.request_id
                }
            }), 429

    @app.after_request
    def after_request_hook(response):
        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:;"

        # HSTS (RFC 6797): only delivered over HTTPS (or when behind TLS-terminating reverse proxy via ProxyFix)
        if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Cache-Control Headers
        if request.path in ("/api/predict", "/api/insights/query"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        elif request.path.startswith("/api/") and request.method == "GET":
            if not response.headers.get("Cache-Control"):
                response.headers["Cache-Control"] = "public, max-age=3600"

        # Performance & Tracking Headers
        duration_ms = round((time.time() - getattr(g, "start_time", time.time())) * 1000, 2)
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")
        if hasattr(g, "rate_limit_remaining"):
            response.headers["X-RateLimit-Limit"] = str(app.config["RATE_LIMIT_MAX"])
            response.headers["X-RateLimit-Remaining"] = str(g.rate_limit_remaining)
        if response.status_code == 429 and "Retry-After" not in response.headers:
            response.headers["Retry-After"] = str(app.config.get("RATE_LIMIT_WINDOW_SECONDS", 60))

        return response

    # 5. Uniform Error Handlers
    def uniform_error(code_name: str, message: str, status_code: int, details=None):
        return jsonify({
            "error": {
                "code": code_name,
                "message": message,
                "details": details,
                "request_id": getattr(g, "request_id", "")
            }
        }), status_code

    @app.errorhandler(400)
    def bad_request(e):
        return uniform_error("BAD_REQUEST", str(e.description) if hasattr(e, 'description') else "Bad request.", 400)

    @app.errorhandler(404)
    def not_found(e):
        return uniform_error("NOT_FOUND", "The requested API resource does not exist.", 404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return uniform_error("METHOD_NOT_ALLOWED", f"HTTP {request.method} method is not allowed on this endpoint.", 405)

    @app.errorhandler(413)
    def payload_too_large(e):
        return uniform_error("PAYLOAD_TOO_LARGE", "Request payload exceeds the maximum 1MB limit.", 413)

    @app.errorhandler(422)
    def unprocessable_entity(e):
        return uniform_error("UNPROCESSABLE_ENTITY", str(e.description) if hasattr(e, 'description') else "Unprocessable request entity.", 422)

    @app.errorhandler(500)
    def internal_server_error(e):
        return uniform_error("INTERNAL_SERVER_ERROR", "An unexpected internal server error occurred.", 500)

    # 6. Register Blueprints
    app.register_blueprint(api_bp)

    # 7. Root Health Redirect / Landing
    @app.route('/', methods=['GET'])
    def root_landing():
        return jsonify({
            "service": "RailSense API",
            "version": "1.0.0",
            "documentation": "/api/docs",
            "openapi_spec": "/api/openapi.json",
            "health": "/api/health"
        }), 200

    return app
