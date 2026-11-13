"""
RailSense — Production Inference & Prediction Service (backend/app/ml/predict.py)
Loads saved model artifacts and precomputed historical lookups to provide
real-time, schedule-time delay probability predictions with cold-start detection.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import numpy as np
import pandas as pd
import joblib

from app.ml.features import (
    ScheduleTimeFeatureExtractor,
    HistoricalPriorTransformer,
    KNOWN_CATEGORIES,
    GLOBAL_FALLBACK_DELAY_RATE,
    GLOBAL_FALLBACK_MEAN_DELAY
)

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
METADATA_PATH = MODELS_DIR / "model_metadata.json"
MODEL_PATH = MODELS_DIR / "deployment_model.joblib"
CALIBRATOR_PATH = MODELS_DIR / "calibrator.joblib"
HIST_TABLES_PATH = MODELS_DIR / "historical_tables.json"


class RailSensePredictor:
    """
    Thread-safe, lightweight prediction service for schedule-time delay inference.
    """

    def __init__(
        self,
        model_path: Optional[Path] = None,
        calibrator_path: Optional[Path] = None,
        metadata_path: Optional[Path] = None,
        hist_tables_path: Optional[Path] = None
    ):
        self.model_path = model_path or MODEL_PATH
        self.calibrator_path = calibrator_path or CALIBRATOR_PATH
        self.metadata_path = metadata_path or METADATA_PATH
        self.hist_tables_path = hist_tables_path or HIST_TABLES_PATH

        self.model = None
        self.calibrator = None
        self.metadata: Dict[str, Any] = {}
        self.hist_tables: Dict[str, Any] = {}
        self.feature_extractor = ScheduleTimeFeatureExtractor()
        self.is_loaded = False

    def load(self):
        """Loads model weights, calibrator, and precomputed lookups into memory."""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {self.model_path}")
        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Metadata not found at {self.metadata_path}")

        self.model = joblib.load(self.model_path)
        
        if self.calibrator_path.exists():
            self.calibrator = joblib.load(self.calibrator_path)
        else:
            self.calibrator = None

        with open(self.metadata_path, 'r', encoding='utf-8') as f:
            self.metadata = json.load(f)

        if self.hist_tables_path.exists():
            with open(self.hist_tables_path, 'r', encoding='utf-8') as f:
                self.hist_tables = json.load(f)
        else:
            self.hist_tables = {}

        self.is_loaded = True
        return self

    def predict_single(
        self,
        train_number: Union[int, str],
        station_code: str,
        scheduled_arrival: str,
        seq: int,
        category: str,
        start_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes calibrated delay probability for a single scheduled train stop.
        """
        if not self.is_loaded:
            self.load()

        df_row = pd.DataFrame([{
            'train_number': str(train_number),
            'station_code': str(station_code).upper().strip(),
            'scheduled_arrival': pd.to_datetime(scheduled_arrival),
            'seq': float(seq),
            'category': str(category).upper().strip()
        }])

        # 1. Extract Schedule-Time Features
        X_st = self.feature_extractor.fit_transform(df_row)

        # 2. Map Historical Rolling Priors from Precomputed Tables
        tr_key = str(train_number)
        stn_key = str(station_code).upper().strip()
        cat_key = str(category).upper().strip()

        cat_tables = self.hist_tables.get("categories", {})
        train_tables = self.hist_tables.get("trains", {})
        station_tables = self.hist_tables.get("stations", {})

        global_rate = self.hist_tables.get("global_delay_rate", GLOBAL_FALLBACK_DELAY_RATE)
        global_mean = self.hist_tables.get("global_mean_delay", GLOBAL_FALLBACK_MEAN_DELAY)

        # Category priors
        cat_p = cat_tables.get(cat_key, {"delay_rate": global_rate, "mean_delay": global_mean})
        cat_rate = float(cat_p["delay_rate"])
        cat_mean = float(cat_p["mean_delay"])

        # Train priors (cold-start fallback to category prior)
        train_p = train_tables.get(tr_key, None)
        is_train_cold = (train_p is None) or (train_p.get("count", 0) < 5)
        train_rate = float(train_p["smoothed_delay_rate"]) if train_p else cat_rate
        train_mean = float(train_p["smoothed_mean_delay"]) if train_p else cat_mean

        # Station priors (cold-start fallback to global prior)
        station_p = station_tables.get(stn_key, None)
        is_station_cold = (station_p is None) or (station_p.get("count", 0) < 5)
        station_rate = float(station_p["smoothed_delay_rate"]) if station_p else global_rate
        station_mean = float(station_p["smoothed_mean_delay"]) if station_p else global_mean

        is_cold_start = bool(is_train_cold or is_station_cold)

        # Combine into complete feature vector
        X_hist = pd.DataFrame([{
            'category_prior_rate': cat_rate,
            'category_prior_mean': cat_mean,
            'train_hist_delay_rate': train_rate,
            'train_hist_mean_delay': train_mean,
            'station_hist_delay_rate': station_rate,
            'station_hist_mean_delay': station_mean
        }])

        X_full = pd.concat([X_st, X_hist], axis=1)

        # Reorder to match model's expected feature names
        expected_cols = self.metadata.get("feature_names", list(X_full.columns))
        for col in expected_cols:
            if col not in X_full.columns:
                X_full[col] = 0.0
        X_full = X_full[expected_cols]

        # 3. Model Inference
        if hasattr(self.model, "predict_proba"):
            raw_prob = float(self.model.predict_proba(X_full)[0, 1])
        else:
            raw_prob = float(self.model.predict(X_full)[0])

        # 4. Optional Calibration
        if self.calibrator is not None:
            calib_prob = float(self.calibrator.predict(np.array([[raw_prob]]))[0])
            calib_prob = float(np.clip(calib_prob, 0.0, 1.0))
        else:
            calib_prob = raw_prob

        threshold = self.metadata.get("threshold", 0.50)
        is_delayed = bool(calib_prob >= threshold)

        # Identify key factors
        factors = []
        if cat_key == 'SUB':
            factors.append("Suburban track isolation reduces risk of network delay")
        elif cat_key == 'TOD':
            factors.append("Special/Holiday category trains have lower schedule path priority")

        if train_rate > 0.65:
            factors.append(f"Train {tr_key} exhibits elevated historical delay rate ({train_rate*100:.1f}%)")
        elif train_rate < 0.35:
            factors.append(f"Train {tr_key} exhibits high historical punctuality ({train_rate*100:.1f}% delay rate)")

        if station_rate > 0.65:
            factors.append(f"Station {stn_key} is an observed delay hotspot ({station_rate*100:.1f}% delay rate)")

        if seq >= 30:
            factors.append(f"Deep journey position (stop #{int(seq)}) accumulates route compounding delays")
        elif seq <= 3:
            factors.append(f"Early journey stop (stop #{int(seq)}) benefits from initial timetable buffer")

        return {
            "train_number": str(train_number),
            "station_code": str(station_code).upper(),
            "delay_probability": round(calib_prob, 4),
            "raw_probability": round(raw_prob, 4),
            "is_delayed_predicted": is_delayed,
            "threshold_used": round(threshold, 3),
            "is_cold_start": is_cold_start,
            "category": cat_key,
            "contributing_factors": factors
        }
