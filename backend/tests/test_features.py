"""
Unit tests for RailSense feature engineering pipeline (backend/app/ml/features.py).
"""

import numpy as np
import pandas as pd
import pytest

from app.ml.features import (
    ScheduleTimeFeatureExtractor,
    HistoricalPriorTransformer,
    extract_features_and_target,
    GLOBAL_FALLBACK_DELAY_RATE
)


def test_schedule_time_feature_extractor():
    df = pd.DataFrame({
        'scheduled_arrival': pd.to_datetime(['2026-10-10 08:30:00', '2026-10-11 23:15:00']),
        'seq': [2, 35],
        'category': ['SUB', 'UNKNOWN_CAT']
    })
    extractor = ScheduleTimeFeatureExtractor()
    X = extractor.fit_transform(df)

    # Verify column presence
    assert 'scheduled_hour' in X.columns
    assert 'sin_hour' in X.columns
    assert 'cos_hour' in X.columns
    assert 'is_weekend' in X.columns
    assert 'is_night' in X.columns
    assert 'seq' in X.columns
    assert 'log_seq' in X.columns
    assert 'cat_SUB' in X.columns
    assert 'cat_OTHER' in X.columns

    # Verify bounds
    assert np.all(X['sin_hour'] >= -1.0) and np.all(X['sin_hour'] <= 1.0)
    assert np.all(X['cos_hour'] >= -1.0) and np.all(X['cos_hour'] <= 1.0)

    # First row: 08:30, not night, seq 2 is origin adjacent, SUB=1
    assert X.loc[0, 'is_night'] == 0.0
    assert X.loc[0, 'is_origin_adjacent'] == 1.0
    assert X.loc[0, 'cat_SUB'] == 1.0

    # Second row: 23:15, night, seq 35 is deep journey, cat_OTHER=1
    assert X.loc[1, 'is_night'] == 1.0
    assert X.loc[1, 'is_deep_journey'] == 1.0
    assert X.loc[1, 'cat_OTHER'] == 1.0


def test_historical_prior_transformer_smoothing_and_cold_start():
    # Historical training dataset
    train_df = pd.DataFrame({
        'train_number': ['12301', '12301', '12302'],
        'station_code': ['HWH', 'ASN', 'HWH'],
        'category': ['SUF', 'SUF', 'SUB'],
        'arrival_delay_min': [30.0, 45.0, 0.0],
        'arrival_reported': [1, 1, 1],
        'seq': [2, 3, 2]
    })
    transformer = HistoricalPriorTransformer(m_train=2.0, m_station=2.0)
    transformer.fit(train_df)

    # Test dataset with a known train and an unseen cold-start train & station
    test_df = pd.DataFrame({
        'train_number': ['12301', '99999'],  # 99999 is brand new
        'station_code': ['HWH', 'ZZZZ'],     # ZZZZ is brand new
        'category': ['SUF', 'PAS'],
        'seq': [2, 2]
    })
    X_test = transformer.transform(test_df)

    # Assert no NaNs generated even on cold-start items
    assert X_test.isna().sum().sum() == 0

    # Known train '12301' should have high delay rate
    assert X_test.loc[0, 'train_hist_delay_rate'] > 0.5

    # Cold-start train '99999' falls back gracefully to category prior
    assert np.isfinite(X_test.loc[1, 'train_hist_delay_rate'])
    assert np.isfinite(X_test.loc[1, 'station_hist_delay_rate'])


def test_extract_features_and_target_integration():
    df = pd.DataFrame({
        'scheduled_arrival': pd.to_datetime(['2026-10-10 10:00:00', '2026-10-10 14:00:00']),
        'seq': [2, 10],
        'category': ['MEX', 'MEX'],
        'train_number': ['12001', '12001'],
        'station_code': ['NDLS', 'CNB'],
        'arrival_delay_min': [-5.0, 35.0],
        'arrival_reported': [1, 1]
    })
    X, y_bin, y_cont = extract_features_and_target(df, filter_eligible=True)

    assert len(X) == 2
    assert len(y_bin) == 2
    # -5 min is <= 15 -> 0
    assert y_bin.iloc[0] == 0
    # 35 min is > 15 -> 1
    assert y_bin.iloc[1] == 1
    assert y_cont.iloc[0] == -5.0
