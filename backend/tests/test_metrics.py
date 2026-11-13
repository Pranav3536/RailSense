"""
Unit tests for RailSense classification metrics, calibration error, and threshold optimization.
"""

import numpy as np
import pytest

from app.ml.metrics import (
    compute_classification_metrics,
    find_optimal_threshold,
    find_threshold_at_recall,
    compute_expected_calibration_error
)


def test_perfect_classification_metrics():
    y_true = np.array([0, 0, 1, 1])
    y_prob = np.array([0.05, 0.1, 0.9, 0.95])

    metrics = compute_classification_metrics(y_true, y_prob, threshold=0.5)

    assert metrics["pr_auc"] == 1.0
    assert metrics["roc_auc"] == 1.0
    assert metrics["f1_positive"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["brier_score"] < 0.02
    assert metrics["confusion_matrix"]["tp"] == 2
    assert metrics["confusion_matrix"]["tn"] == 2
    assert metrics["confusion_matrix"]["fp"] == 0
    assert metrics["confusion_matrix"]["fn"] == 0


def test_inverse_classification_metrics():
    y_true = np.array([0, 0, 1, 1])
    y_prob = np.array([0.9, 0.85, 0.1, 0.05])

    metrics = compute_classification_metrics(y_true, y_prob, threshold=0.5)

    assert metrics["f1_positive"] == 0.0
    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0
    assert metrics["confusion_matrix"]["fp"] == 2
    assert metrics["confusion_matrix"]["fn"] == 2


def test_expected_calibration_error_perfect():
    # Perfectly calibrated predictions: confidence equals true empirical accuracy
    # In bin [0.8, 1.0]: 2 samples, true accuracy 1.0, mean prob 1.0
    # In bin [0.0, 0.2]: 2 samples, true accuracy 0.0, mean prob 0.0
    y_true = np.array([0, 0, 1, 1])
    y_prob = np.array([0.0, 0.0, 1.0, 1.0])

    ece = compute_expected_calibration_error(y_true, y_prob, n_bins=10)
    assert ece == 0.0


def test_find_optimal_threshold():
    y_true = np.array([0, 0, 0, 1, 1, 1, 1, 1])
    # Skewed probabilities
    y_prob = np.array([0.1, 0.2, 0.35, 0.4, 0.6, 0.7, 0.8, 0.9])

    best_thresh = find_optimal_threshold(y_true, y_prob, metric='f1')
    assert 0.35 <= best_thresh <= 0.45


def test_find_threshold_at_recall():
    y_true = np.array([0, 0, 1, 1, 1, 1])
    y_prob = np.array([0.1, 0.3, 0.5, 0.6, 0.7, 0.85])

    # To get recall >= 0.80 (at least 3 out of 4 true positives)
    thresh = find_threshold_at_recall(y_true, y_prob, target_recall=0.80)
    assert thresh <= 0.61
