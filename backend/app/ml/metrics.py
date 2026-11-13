"""
RailSense — Standardized Evaluation Metrics for Binary Delay Prediction.
Provides PR-AUC, ROC-AUC, F1, Precision@Recall>=0.80, Brier score, ECE,
and calibration/threshold optimization tools.
"""

from typing import Dict, Any, Tuple
import numpy as np
from sklearn.metrics import (
    precision_recall_curve,
    auc,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss,
    confusion_matrix
)


def compute_expected_calibration_error(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """
    Computes Expected Calibration Error (ECE) across uniform probability bins.
    ECE = sum_b (N_b / N) * |acc(b) - conf(b)|
    """
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        bin_mask = (y_prob >= bins[i]) & (y_prob < bins[i + 1]) if i < n_bins - 1 else (y_prob >= bins[i]) & (y_prob <= bins[i + 1])
        bin_size = np.sum(bin_mask)
        if bin_size > 0:
            bin_acc = np.mean(y_true[bin_mask])
            bin_conf = np.mean(y_prob[bin_mask])
            ece += (bin_size / n) * abs(bin_acc - bin_conf)

    return float(ece)


def compute_precision_at_recall(precision: np.ndarray, recall: np.ndarray, min_recall: float = 0.80) -> float:
    """Finds maximum precision achieved when recall >= min_recall."""
    valid_mask = recall >= min_recall
    if not np.any(valid_mask):
        return 0.0
    return float(np.max(precision[valid_mask]))


def compute_classification_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
    min_recall_target: float = 0.80
) -> Dict[str, Any]:
    """
    Computes the fixed Phase 4 evaluation metrics suite for binary classification.
    """
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    y_prob = np.clip(y_prob, 0.0, 1.0)

    # 1. PR-AUC & Curve
    prec_arr, rec_arr, thresholds_pr = precision_recall_curve(y_true, y_prob)
    pr_auc = float(auc(rec_arr, prec_arr))

    # 2. ROC-AUC
    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except ValueError:
        roc_auc = 0.5

    # 3. Decision threshold predictions
    y_pred = (y_prob >= threshold).astype(int)

    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1_pos = float(f1_score(y_true, y_pred, pos_label=1, zero_division=0))
    f1_macro = float(f1_score(y_true, y_pred, average='macro', zero_division=0))

    # 4. Precision at high recall constraint
    prec_at_high_recall = compute_precision_at_recall(prec_arr, rec_arr, min_recall_target)

    # 5. Probabilistic Quality (Brier & ECE)
    brier = float(brier_score_loss(y_true, y_prob))
    ece = compute_expected_calibration_error(y_true, y_prob, n_bins=10)

    # 6. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    return {
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "threshold": round(threshold, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_positive": round(f1_pos, 4),
        "f1_macro": round(f1_macro, 4),
        f"precision_at_recall_{int(min_recall_target*100)}": round(prec_at_high_recall, 4),
        "brier_score": round(brier, 4),
        "ece": round(ece, 4),
        "confusion_matrix": {
            "tn": tn, "fp": fp, "fn": fn, "tp": tp
        }
    }


def find_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray, metric: str = 'f1') -> float:
    """Finds the decision threshold in [0.05, 0.95] that maximizes F1 score."""
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)

    thresholds = np.linspace(0.1, 0.9, 81)
    best_score = -1.0
    best_thresh = 0.5

    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        score = f1_score(y_true, y_pred, pos_label=1, zero_division=0)
        if score > best_score:
            best_score = score
            best_thresh = float(t)

    return round(best_thresh, 3)


def find_threshold_at_recall(y_true: np.ndarray, y_prob: np.ndarray, target_recall: float = 0.80) -> float:
    """Finds decision threshold achieving recall >= target_recall with highest precision."""
    prec, rec, thresh = precision_recall_curve(y_true, y_prob)
    valid_idx = np.where(rec[:-1] >= target_recall)[0]
    if len(valid_idx) == 0:
        return 0.5
    # Among thresholds giving recall >= target_recall, pick the one with highest threshold (highest precision)
    best_idx = valid_idx[np.argmax(thresh[valid_idx])]
    return float(round(thresh[best_idx], 3))
