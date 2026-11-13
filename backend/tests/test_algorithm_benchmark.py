"""
Unit tests for benchmark algorithm metrics, threshold finding, and leakage guards.
(Phase 11.10)
"""
import pytest
import numpy as np
from scripts.benchmark_algorithms import (
    optimize_threshold_f1,
    compute_metrics,
    SPLIT_DATES,
)


def test_optimize_threshold_f1_probability():
    y_true = np.array([0, 0, 1, 1, 1, 0, 1, 0, 1, 1])
    scores = np.array([0.1, 0.2, 0.7, 0.8, 0.9, 0.4, 0.65, 0.15, 0.85, 0.75])
    t = optimize_threshold_f1(y_true, scores, is_probability=True)
    assert 0.05 <= t <= 0.95
    pred = (scores >= t).astype(int)
    f1 = compute_metrics(y_true, scores, t)["f1"]
    assert f1 >= 0.8


def test_optimize_threshold_f1_continuous():
    y_true = np.array([0, 0, 0, 1, 1, 1])
    pred_minutes = np.array([-5.0, 2.0, 8.0, 18.0, 25.0, 40.0])
    t = optimize_threshold_f1(y_true, pred_minutes, is_probability=False)
    assert 8.0 <= t <= 18.0
    metrics = compute_metrics(y_true, pred_minutes, t)
    assert metrics["f1"] == 1.0


def test_temporal_split_guard_no_test_in_train():
    train_dates = set(SPLIT_DATES["train"])
    val_dates = set(SPLIT_DATES["val"])
    test_dates = set(SPLIT_DATES["test"])

    # Strict partition isolation
    assert train_dates.isdisjoint(val_dates), "Train and Val splits overlap!"
    assert train_dates.isdisjoint(test_dates), "Train and Test splits overlap!"
    assert val_dates.isdisjoint(test_dates), "Val and Test splits overlap!"

    # Temporal ordering: max(train) < min(val) <= max(val) < min(test)
    assert max(train_dates) < min(val_dates), "Train date occurs after or on Val start!"
    assert max(val_dates) < min(test_dates), "Val date occurs after or on Test start!"
