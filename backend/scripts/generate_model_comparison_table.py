"""
RailSense — Programmatic Benchmark Table Generator (backend/scripts/generate_model_comparison_table.py)
Reads directly from docs/experiments/final_test_results.json and docs/phase5_preflight.json
to generate a 100% faithful, non-hand-typed Markdown comparison table.
"""

import json
from pathlib import Path

DOCS_DIR = Path(__file__).resolve().parent.parent.parent / "docs"
EXP_PATH = DOCS_DIR / "experiments" / "final_test_results.json"
PREFLIGHT_PATH = DOCS_DIR / "phase5_preflight.json"


def generate_table():
    with open(EXP_PATH, "r", encoding="utf-8") as f:
        exp_data = json.load(f)["test_metrics"]

    with open(PREFLIGHT_PATH, "r", encoding="utf-8") as f:
        preflight_data = json.load(f)

    ap_map = {
        "majority_baseline": preflight_data["average_precision_recomputed"]["Majority Baseline"]["ap_test"],
        "category_prior_baseline": preflight_data["average_precision_recomputed"]["Category Prior"]["ap_test"],
        "train_history_baseline": preflight_data["average_precision_recomputed"]["Train Historical Prior"]["ap_test"],
        "logistic_regression": exp_data["logistic_regression"]["pr_auc"],
        "random_forest": exp_data["random_forest"]["pr_auc"],
        "lightgbm_raw": preflight_data["average_precision_recomputed"]["LightGBM (Raw)"]["ap_test"],
        "lightgbm_calibrated": preflight_data["average_precision_recomputed"]["LightGBM (Calibrated)"]["ap_test"],
        "en_route_lightgbm": preflight_data["average_precision_recomputed"]["En-Route LightGBM"]["ap_test"]
    }

    rows = [
        ("Majority Prevalence", "Baseline", ap_map["majority_baseline"], exp_data["majority_baseline"]),
        ("Category Prior Lookup", "Baseline", ap_map["category_prior_baseline"], exp_data["category_prior_baseline"]),
        ("Train Historical Prior", "Baseline", ap_map["train_history_baseline"], exp_data["train_history_baseline"]),
        ("Logistic Regression", "Schedule-Time", ap_map["logistic_regression"], exp_data["logistic_regression"]),
        ("Random Forest (Bounded)", "Schedule-Time", ap_map["random_forest"], exp_data["random_forest"]),
        ("LightGBM (Raw, Thresh 0.50)", "Schedule-Time", ap_map["lightgbm_raw"], exp_data["lightgbm_raw"]),
        ("LightGBM (Raw, Thresh 0.42)", "Schedule-Time", ap_map["lightgbm_raw"], exp_data["lightgbm_optimal_threshold"]),
        ("LightGBM + Calibrated (Thresh 0.42)", "Schedule-Time", ap_map["lightgbm_calibrated"], exp_data["lightgbm_calibrated"]),
        ("En-Route LightGBM (Formulation 2)", "En-Route Only", ap_map["en_route_lightgbm"], exp_data["en_route_lightgbm"]),
    ]

    # Add the Calibrated 0.410 row (validation-tuned threshold from Phase 5 preflight)
    calib_041 = {
        "roc_auc": exp_data["lightgbm_calibrated"]["roc_auc"],
        "f1_positive": preflight_data["calibrated_thresholds"]["test_f1_at_optimal"],
        "precision": preflight_data["calibrated_thresholds"]["test_precision_at_optimal"],
        "recall": preflight_data["calibrated_thresholds"]["test_recall_at_optimal"],
        "precision_at_recall_80": exp_data["lightgbm_calibrated"]["precision_at_recall_80"],
        "brier_score": preflight_data["calibration_audit"]["test_brier_calib"],
        "ece": preflight_data["calibration_audit"]["test_ece_calib"]
    }
    rows.append(("LightGBM + Calibrated (FINAL, Thresh 0.41)", "Schedule-Time", ap_map["lightgbm_calibrated"], calib_041))

    header = "| Model / Baseline | Paradigm | Average Precision (AP) | ROC-AUC | F1-Score | Precision | Recall | Prec @ Rec $\\ge$ 0.80 | Brier Score | ECE |"
    sep = "|---|---|---|---|---|---|---|---|---|---|"
    lines = [header, sep]

    for name, paradigm, ap, m in rows:
        lines.append(
            f"| **{name}** | {paradigm} | {ap:.4f} | {m['roc_auc']:.4f} | {m['f1_positive']:.4f} | "
            f"{m['precision']:.4f} | {m['recall']:.4f} | {m['precision_at_recall_80']:.4f} | {m['brier_score']:.4f} | {m['ece']:.4f} |"
        )

    table_md = "\n".join(lines)
    print(table_md)
    return table_md


if __name__ == "__main__":
    generate_table()
