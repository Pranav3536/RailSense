"""
RailSense — API Blueprint Package (backend/app/api/__init__.py)
Combines all versioned REST API routes under the `/api` prefix.
"""

from flask import Blueprint

from app.api.health import health_bp
from app.api.overview import overview_bp
from app.api.trains import trains_bp
from app.api.stations import stations_bp
from app.api.patterns import patterns_bp
from app.api.model import model_bp
from app.api.predict import predict_bp
from app.api.docs import docs_bp
from app.api.insights import insights_bp

api_bp = Blueprint('api', __name__, url_prefix='/api')

api_bp.register_blueprint(health_bp)
api_bp.register_blueprint(overview_bp)
api_bp.register_blueprint(trains_bp)
api_bp.register_blueprint(stations_bp)
api_bp.register_blueprint(patterns_bp)
api_bp.register_blueprint(model_bp)
api_bp.register_blueprint(predict_bp)
api_bp.register_blueprint(docs_bp)
api_bp.register_blueprint(insights_bp)

__all__ = ['api_bp']
