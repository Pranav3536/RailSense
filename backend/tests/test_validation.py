"""
Unit tests for RailSense data validation suite (backend/app/ml/validation.py).
"""

from datetime import datetime, timedelta
import pandas as pd
import pytest

from app.ml.validation import (
    check_stop_key_duplicates,
    check_repeated_station_visits,
    check_label_eligibility,
    flag_delay_outliers,
    check_timestamp_sanity,
    flag_sequence_anomalies
)


def test_stop_key_uniqueness_valid():
    df = pd.DataFrame({
        'train_number': [12301, 12301, 12302],
        'start_date': ['2026-10-10', '2026-10-10', '2026-10-10'],
        'seq': [1, 2, 1],
        'station_code': ['HWH', 'ASN', 'NDLS']
    })
    is_unique, dup_count, mask = check_stop_key_duplicates(df)
    assert is_unique is True
    assert dup_count == 0


def test_repeated_station_visits_detected_without_error():
    # Circular route calling at same station twice
    df = pd.DataFrame({
        'train_number': [12301, 12301, 12301],
        'start_date': ['2026-10-10', '2026-10-10', '2026-10-10'],
        'seq': [1, 2, 3],
        'station_code': ['HWH', 'ASN', 'HWH']
    })
    rep_count, rep_mask = check_repeated_station_visits(df)
    assert rep_count == 2
    assert rep_mask.sum() == 2


def test_label_eligibility_masking():
    df = pd.DataFrame({
        'train_number': [101, 101, 101, 101, 101],
        'start_date': ['2026-10-10'] * 5,
        'seq': [1, 2, 3, 4, 5],
        'arrival_delay_min': [None, 20.0, None, -5.0, 1500.0],
        'arrival_reported': [None, 1.0, 0.0, 1.0, 1.0]
    })
    mask = check_label_eligibility(df)
    
    # seq 1 (origin, null delay) -> False
    assert not mask.iloc[0]
    # seq 2 (valid positive delay > 15m) -> True
    assert mask.iloc[1]
    # seq 3 (unreported, null delay) -> False
    assert not mask.iloc[2]
    # seq 4 (early arrival -5m, valid negative delay) -> True (NEVER clip)
    assert mask.iloc[3]
    # seq 5 (outlier > 1440m) -> False
    assert not mask.iloc[4]


def test_timestamp_sanity():
    base = datetime(2026, 10, 10, 12, 0, 0)
    df = pd.DataFrame({
        'scheduled_arrival': [base, base, base],
        'actual_arrival': [
            base + timedelta(minutes=25),  # +25 min
            base - timedelta(minutes=10),  # -10 min (early)
            base + timedelta(minutes=15)   # +15 min
        ],
        'scheduled_departure': [base + timedelta(minutes=5), base + timedelta(minutes=5), base + timedelta(minutes=5)],
        'actual_departure': [base + timedelta(minutes=30), base, base + timedelta(minutes=20)],
        'arrival_delay_min': [25.0, -10.0, 15.0]
    })
    res = check_timestamp_sanity(df)
    assert res['exact_match_pct'] == 100.0
    assert res['max_abs_diff'] == 0.0


def test_flag_extreme_delay_outliers():
    df = pd.DataFrame({
        'arrival_delay_min': [-2000.0, -10.0, 0.0, 50.0, 2000.0]
    })
    early_flag, late_flag = flag_delay_outliers(df)
    assert int(early_flag.sum()) == 1
    assert int(late_flag.sum()) == 1


def test_flag_sequence_anomalies():
    df = pd.DataFrame({'seq': [1, 50, 180, 1071]})
    flag = flag_sequence_anomalies(df)
    assert int(flag.sum()) == 1
    assert bool(flag.iloc[3]) is True
