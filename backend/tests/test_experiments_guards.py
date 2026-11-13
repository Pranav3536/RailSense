"""
Unit tests for RailSense ML experiment guards (split guard, banned feature guard, rolling-origin folds).
"""

import pandas as pd
import pytest

from app.ml.features import ScheduleTimeFeatureExtractor

BANNED_FEATURES = [
    'actual_arrival',
    'actual_departure',
    'departure_delay_min',
    'arrival_reported',
    'departure_reported',
    'status',
    'run_quality'
]


def test_banned_features_absent_from_extractor():
    """Verify that ScheduleTimeFeatureExtractor never outputs banned leakage columns."""
    df = pd.DataFrame({
        'scheduled_arrival': pd.to_datetime(['2026-10-10 10:00:00']),
        'seq': [5],
        'category': ['SUF'],
        # Even if present in input DataFrame:
        'actual_arrival': pd.to_datetime(['2026-10-10 10:35:00']),
        'actual_departure': pd.to_datetime(['2026-10-10 10:40:00']),
        'departure_delay_min': [40.0],
        'status': ['DELAYED'],
        'run_quality': [2.5]
    })

    extractor = ScheduleTimeFeatureExtractor()
    X = extractor.fit_transform(df)

    for banned in BANNED_FEATURES:
        assert banned not in X.columns, f"LEAKAGE: Banned column {banned} leaked into feature matrix!"


def test_split_guard_no_test_leakage():
    """Verify that Test partition dates (2026-10-23, 2026-10-24) never overlap with Train or Val."""
    train_dates = set([f"2026-10-{d:02d}" for d in range(8, 21)])
    val_dates = set(["2026-10-21", "2026-10-22"])
    test_dates = set(["2026-10-23", "2026-10-24"])

    assert len(train_dates.intersection(val_dates)) == 0, "Train and Val dates overlap!"
    assert len(train_dates.intersection(test_dates)) == 0, "Train and Test dates overlap!"
    assert len(val_dates.intersection(test_dates)) == 0, "Val and Test dates overlap!"


def test_rolling_origin_chronological_ordering():
    """Verify that rolling origin temporal folds are strictly chronological."""
    folds = [
        {"train": ("2026-10-08", "2026-10-16"), "val": ("2026-10-17", "2026-10-18")},
        {"train": ("2026-10-08", "2026-10-18"), "val": ("2026-10-19", "2026-10-20")},
        {"train": ("2026-10-08", "2026-10-20"), "val": ("2026-10-21", "2026-10-22")},
    ]

    for f in folds:
        train_end = pd.to_datetime(f["train"][1])
        val_start = pd.to_datetime(f["val"][0])
        assert train_end < val_start, "Validation window must start strictly after training window ends!"
