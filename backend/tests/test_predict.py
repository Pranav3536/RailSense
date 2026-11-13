"""
Unit and smoke tests for RailSense real-time prediction service (backend/app/ml/predict.py).
"""

from pathlib import Path
import pytest
from app.ml.predict import RailSensePredictor

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def test_predictor_cold_start_handling():
    """Verify that an unknown train number / station is handled gracefully with cold-start flag."""
    predictor = RailSensePredictor()
    
    # Check if model artifacts are already saved
    if not (MODELS_DIR / "deployment_model.joblib").exists():
        pytest.skip("Deployment model not yet built, skipping smoke test")

    predictor.load()

    # Predict for a brand new hypothetical train
    res = predictor.predict_single(
        train_number="99999",
        station_code="ZZZZ",
        scheduled_arrival="2026-10-25 15:30:00",
        seq=5,
        category="PAS"
    )

    assert "delay_probability" in res
    assert 0.0 <= res["delay_probability"] <= 1.0
    assert "is_delayed_predicted" in res
    assert isinstance(res["is_delayed_predicted"], bool)
    assert res["is_cold_start"] is True


def test_predictor_suburban_train_factors():
    """Verify that suburban train prediction includes track isolation factors."""
    predictor = RailSensePredictor()
    
    if not (MODELS_DIR / "deployment_model.joblib").exists():
        pytest.skip("Deployment model not yet built, skipping smoke test")

    predictor.load()

    res = predictor.predict_single(
        train_number="38412",
        station_code="HWH",
        scheduled_arrival="2026-10-25 09:00:00",
        seq=2,
        category="SUB"
    )

    assert "delay_probability" in res
    assert 0.0 <= res["delay_probability"] <= 1.0
    assert any("Suburban" in f for f in res["contributing_factors"])
