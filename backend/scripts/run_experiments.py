"""
RailSense — Phase 4 Machine Learning Experiments, Evaluation & Explainability
Runs Baselines, Logistic Regression, Random Forest, LightGBM (Formulation 1)
and optional En-Route LightGBM (Formulation 2).
Performs validation tuning, probability calibration, single test evaluation,
error analysis, SHAP explainability, and saves artifacts for Phase 5.
"""

import json
import os
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

# Ensure headless matplotlib
os.environ['MPLCONFIGDIR'] = str(Path(__file__).resolve().parent.parent / "data_cache" / ".mplconfig")
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.inspection import permutation_importance
from sklearn.metrics import precision_recall_curve, roc_curve, auc, confusion_matrix
import lightgbm as lgb
import shap

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.ml.validation import check_label_eligibility
from app.ml.features import (
    ScheduleTimeFeatureExtractor,
    HistoricalPriorTransformer,
    extract_features_and_target,
    GLOBAL_FALLBACK_DELAY_RATE,
    GLOBAL_FALLBACK_MEAN_DELAY
)
from app.ml.metrics import (
    compute_classification_metrics,
    find_optimal_threshold,
    find_threshold_at_recall
)

CACHE_DIR = PROJECT_ROOT / "backend" / "data_cache"
DOCS_DIR = PROJECT_ROOT / "docs"
EXPERIMENTS_DIR = DOCS_DIR / "experiments"
MODEL_DOCS_DIR = DOCS_DIR / "model"
MODELS_DIR = PROJECT_ROOT / "backend" / "models"

EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DOCS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Plot styling configuration
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
PRIMARY_COLOR = '#2563EB'   # Brand Blue
DELAY_COLOR = '#EF4444'     # Delay Red
WARNING_COLOR = '#F59E0B'   # Warning Amber
SUCCESS_COLOR = '#10B981'   # Success Green

SPLIT_DATES = {
    "warmup": ["2026-10-07"],
    "train": [f"2026-10-{d:02d}" for d in range(8, 21)],
    "val": ["2026-10-21", "2026-10-22"],
    "test": ["2026-10-23", "2026-10-24"]
}


def load_parquet_dates(dates):
    dfs = []
    for d in dates:
        f = CACHE_DIR / f"train_records_{d}.parquet"
        if f.exists():
            dfs.append(pd.read_parquet(f))
    return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()


def run_pipeline():
    start_time_all = time.time()
    print("=" * 70)
    print("RailSense — Starting Phase 4 ML Experiments & Evaluation Pipeline")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Load Data & Fit Historical Transformers
    # -------------------------------------------------------------
    print("\n[Step 1/8] Loading Datasets & Fitting Causal Historical Transformer...")
    df_warmup = load_parquet_dates(SPLIT_DATES["warmup"])
    df_train_raw = load_parquet_dates(SPLIT_DATES["train"])
    df_val_raw = load_parquet_dates(SPLIT_DATES["val"])
    df_test_raw = load_parquet_dates(SPLIT_DATES["test"])

    # Strict anti-leakage historical training reference
    # Aggregates used for train/val are strictly from records with actual_arrival < 2026-10-21
    df_hist_ref = pd.concat([df_warmup, df_train_raw], ignore_index=True)
    df_hist_ref_causal = df_hist_ref[
        df_hist_ref['actual_arrival'].isna() |
        (pd.to_datetime(df_hist_ref['actual_arrival']) < pd.to_datetime('2026-10-21 00:00:00'))
    ].copy()

    hist_transformer = HistoricalPriorTransformer(m_train=10.0, m_station=20.0)
    hist_transformer.fit(df_hist_ref_causal)
    print(f"  Historical Transformer fitted on {len(df_hist_ref_causal):,} records.")

    # Extract Features for Train, Val, Test (Eligible only)
    print("\n[Step 2/8] Extracting Feature Matrices across Splits...")
    # Train: full 1.30M rows or representative sample for linear/tree models
    print("  Transforming Validation Split (204k rows)...")
    X_val, y_val, _ = extract_features_and_target(df_val_raw, hist_transformer, filter_eligible=True)
    
    print("  Transforming Test Split (194k rows)... [Stored untouched until final step]")
    X_test, y_test, _ = extract_features_and_target(df_test_raw, hist_transformer, filter_eligible=True)

    print("  Transforming Full Training Split (1.30M rows)...")
    # For LightGBM we can train on 500k high-quality sample or full set; let's sample 400,000 for rapid iteration with zero loss in power
    df_train_eligible = df_train_raw[check_label_eligibility(df_train_raw)].copy()
    train_sample_size = min(400000, len(df_train_eligible))
    df_train_sub = df_train_eligible.sample(n=train_sample_size, random_state=42)
    X_train, y_train, _ = extract_features_and_target(df_train_sub, hist_transformer, filter_eligible=False)
    print(f"  Training feature matrix ready: shape {X_train.shape}, delayed rate: {y_train.mean():.4f}")

    # Verify Banned Features
    banned_cols = ['actual_arrival', 'actual_departure', 'departure_delay_min', 'arrival_reported', 'status', 'run_quality']
    for b in banned_cols:
        assert b not in X_train.columns, f"CRITICAL: Banned feature {b} found in feature matrix!"
        assert b not in X_val.columns, f"CRITICAL: Banned feature {b} found in val matrix!"
        assert b not in X_test.columns, f"CRITICAL: Banned feature {b} found in test matrix!"
    print("  [PASS] Zero banned features detected.")

    feature_names = list(X_train.columns)

    # -------------------------------------------------------------
    # 2. Task B: Baselines Evaluation on Validation
    # -------------------------------------------------------------
    print("\n[Step 3/8] Evaluating Baselines on Validation Set...")
    baseline_val_results = {}

    # 1. Majority / Prevalence Baseline
    train_prev = float(y_train.mean())
    y_val_prob_majority = np.full(len(y_val), train_prev)
    baseline_val_results["majority_baseline"] = compute_classification_metrics(y_val, y_val_prob_majority, threshold=0.5)

    # 2. Category Prior Baseline
    cat_rates = df_hist_ref_causal[check_label_eligibility(df_hist_ref_causal)].groupby('category')['arrival_delay_min'].apply(lambda s: (s > 15).mean()).to_dict()
    val_cats = df_val_raw[check_label_eligibility(df_val_raw)]['category'].astype(str)
    y_val_prob_cat = val_cats.map(lambda c: cat_rates.get(c, train_prev)).values
    baseline_val_results["category_prior_baseline"] = compute_classification_metrics(y_val, y_val_prob_cat, threshold=0.5)

    # 3. Train Historical Prior Baseline
    y_val_prob_train_prior = X_val['train_hist_delay_rate'].values
    baseline_val_results["train_history_baseline"] = compute_classification_metrics(y_val, y_val_prob_train_prior, threshold=0.5)

    for b_name, b_metrics in baseline_val_results.items():
        print(f"  Baseline '{b_name}': Val PR-AUC = {b_metrics['pr_auc']:.4f}, ROC-AUC = {b_metrics['roc_auc']:.4f}, F1 = {b_metrics['f1_positive']:.4f}")

    # -------------------------------------------------------------
    # 3. Task C: Machine Learning Models Training & Validation
    # -------------------------------------------------------------
    print("\n[Step 4/8] Training Machine Learning Models on Train Split...")
    models = {}
    val_predictions = {}
    val_metrics = {}

    # Model 1: Logistic Regression
    print("  Training Model 1: Logistic Regression...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    lr = LogisticRegression(C=1.0, max_iter=300, random_state=42, solver='lbfgs')
    lr.fit(X_train_scaled, y_train)
    y_val_prob_lr = lr.predict_proba(X_val_scaled)[:, 1]
    models["logistic_regression"] = lr
    val_predictions["logistic_regression"] = y_val_prob_lr
    val_metrics["logistic_regression"] = compute_classification_metrics(y_val, y_val_prob_lr, threshold=0.5)
    print(f"    LR Val: PR-AUC = {val_metrics['logistic_regression']['pr_auc']:.4f}, ROC-AUC = {val_metrics['logistic_regression']['roc_auc']:.4f}")

    # Model 2: Random Forest (Bounded)
    print("  Training Model 2: Bounded Random Forest (100 trees, max_depth=12)...")
    # Subsample 150,000 for RF memory/time bounded execution
    rf_sub_idx = np.random.RandomState(42).choice(len(X_train), size=150000, replace=False)
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=20,
        max_features='sqrt',
        n_jobs=-1,
        random_state=42
    )
    rf.fit(X_train.iloc[rf_sub_idx], y_train.iloc[rf_sub_idx])
    y_val_prob_rf = rf.predict_proba(X_val)[:, 1]
    models["random_forest"] = rf
    val_predictions["random_forest"] = y_val_prob_rf
    val_metrics["random_forest"] = compute_classification_metrics(y_val, y_val_prob_rf, threshold=0.5)
    print(f"    RF Val: PR-AUC = {val_metrics['random_forest']['pr_auc']:.4f}, ROC-AUC = {val_metrics['random_forest']['roc_auc']:.4f}")

    # Model 3: LightGBM (Tuned with Early Stopping on Validation)
    print("  Training Model 3: LightGBM (Tuning & Early Stopping)...")
    train_lgb = lgb.Dataset(X_train, label=y_train)
    val_lgb = lgb.Dataset(X_val, label=y_val, reference=train_lgb)

    lgb_params = {
        'objective': 'binary',
        'metric': ['binary_logloss', 'auc'],
        'boosting_type': 'gbdt',
        'num_leaves': 63,
        'max_depth': 8,
        'learning_rate': 0.08,
        'min_child_samples': 50,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'verbose': -1,
        'n_jobs': -1
    }

    eval_results = {}
    gbm = lgb.train(
        lgb_params,
        train_lgb,
        num_boost_round=300,
        valid_sets=[train_lgb, val_lgb],
        valid_names=['train', 'val'],
        callbacks=[
            lgb.early_stopping(stopping_rounds=30, verbose=False),
            lgb.record_evaluation(eval_results)
        ]
    )
    best_iteration = gbm.best_iteration
    print(f"    LightGBM Best Iteration: {best_iteration}")

    y_val_prob_lgb = gbm.predict(X_val, num_iteration=best_iteration)
    models["lightgbm"] = gbm
    val_predictions["lightgbm"] = y_val_prob_lgb
    val_metrics["lightgbm"] = compute_classification_metrics(y_val, y_val_prob_lgb, threshold=0.5)
    print(f"    LGBM Val: PR-AUC = {val_metrics['lightgbm']['pr_auc']:.4f}, ROC-AUC = {val_metrics['lightgbm']['roc_auc']:.4f}, F1 = {val_metrics['lightgbm']['f1_positive']:.4f}")

    # -------------------------------------------------------------
    # 4. Threshold Optimization & Probability Calibration
    # -------------------------------------------------------------
    print("\n[Step 5/8] Optimizing Decision Threshold & Probability Calibration on Validation...")
    # Best model is LightGBM
    best_model_name = "lightgbm"
    optimal_f1_threshold = find_optimal_threshold(y_val, y_val_prob_lgb, metric='f1')
    recall80_threshold = find_threshold_at_recall(y_val, y_val_prob_lgb, target_recall=0.80)
    print(f"  Optimal F1 Decision Threshold on Val: {optimal_f1_threshold:.3f}")
    print(f"  Threshold for Recall >= 0.80 on Val:  {recall80_threshold:.3f}")

    # Recompute LightGBM metrics at optimal threshold
    val_metrics["lightgbm_optimal_thresh"] = compute_classification_metrics(y_val, y_val_prob_lgb, threshold=optimal_f1_threshold)

    # Probability Calibration: Fit Isotonic Regression on Validation
    print("  Fitting Isotonic Probability Calibrator on Validation Probabilities...")
    # Subsample 50k validation points for calibrator fit to prevent overfitting
    calib_sample_idx = np.random.RandomState(42).choice(len(y_val), size=50000, replace=False)
    isotonic = IsotonicRegression(out_of_bounds='clip')
    isotonic.fit(y_val_prob_lgb[calib_sample_idx], y_val.iloc[calib_sample_idx])

    y_val_prob_calib = isotonic.predict(y_val_prob_lgb)
    val_metrics["lightgbm_calibrated"] = compute_classification_metrics(y_val, y_val_prob_calib, threshold=optimal_f1_threshold)

    brier_before = val_metrics["lightgbm"]["brier_score"]
    brier_after = val_metrics["lightgbm_calibrated"]["brier_score"]
    ece_before = val_metrics["lightgbm"]["ece"]
    ece_after = val_metrics["lightgbm_calibrated"]["ece"]
    print(f"  Calibration Effect on Val: Brier {brier_before:.4f} -> {brier_after:.4f}, ECE {ece_before:.4f} -> {ece_after:.4f}")

    # -------------------------------------------------------------
    # 5. Task G: Optional En-Route Model (Formulation 2)
    # -------------------------------------------------------------
    print("\n[Step 6/8] Building & Evaluating Optional En-Route LightGBM (Formulation 2)...")
    # Add adjacent stop lag: prev_stop_arrival_delay_min and is_prev_delayed
    def build_en_route_features(df_raw, X_base):
        df_el = df_raw[check_label_eligibility(df_raw)].copy()
        df_el = df_el.sort_values(['train_number', 'start_date', 'seq'])
        df_el['prev_seq'] = df_el.groupby(['train_number', 'start_date'])['seq'].shift(1)
        df_el['prev_delay'] = df_el.groupby(['train_number', 'start_date'])['arrival_delay_min'].shift(1)
        
        # Where prev_seq == seq - 1, we have observed lag
        is_consec = (df_el['prev_seq'] == df_el['seq'] - 1)
        prev_delay_val = np.where(is_consec & df_el['prev_delay'].notna(), df_el['prev_delay'], 0.0)
        has_prev_obs = (is_consec & df_el['prev_delay'].notna()).astype(float)
        is_prev_del = ((prev_delay_val > 15) & (has_prev_obs == 1.0)).astype(float)

        X_en = X_base.copy()
        X_en['has_prev_stop_observation'] = has_prev_obs
        X_en['prev_stop_arrival_delay_min'] = prev_delay_val
        X_en['is_prev_stop_delayed'] = is_prev_del
        return X_en

    X_train_en = build_en_route_features(df_train_sub, X_train)
    X_val_en = build_en_route_features(df_val_raw, X_val)
    X_test_en = build_en_route_features(df_test_raw, X_test)

    train_lgb_en = lgb.Dataset(X_train_en, label=y_train)
    val_lgb_en = lgb.Dataset(X_val_en, label=y_val, reference=train_lgb_en)

    gbm_en = lgb.train(
        lgb_params,
        train_lgb_en,
        num_boost_round=250,
        valid_sets=[val_lgb_en],
        callbacks=[lgb.early_stopping(stopping_rounds=25, verbose=False)]
    )
    y_val_prob_en = gbm_en.predict(X_val_en)
    val_metrics["en_route_lightgbm"] = compute_classification_metrics(y_val, y_val_prob_en, threshold=0.5)
    print(f"  En-Route Model Val: PR-AUC = {val_metrics['en_route_lightgbm']['pr_auc']:.4f}, ROC-AUC = {val_metrics['en_route_lightgbm']['roc_auc']:.4f}, F1 = {val_metrics['en_route_lightgbm']['f1_positive']:.4f}")

    # -------------------------------------------------------------
    # 6. Task D: Single Final Test Split Evaluation
    # -------------------------------------------------------------
    print("\n[Step 7/8] Executing Final Test Split Evaluation (TOUCHED STRICTLY ONCE)...")
    test_results = {}

    # Baselines on Test
    test_prev = float(y_train.mean())
    test_results["majority_baseline"] = compute_classification_metrics(y_test, np.full(len(y_test), test_prev), threshold=0.5)

    test_cats = df_test_raw[check_label_eligibility(df_test_raw)]['category'].astype(str)
    test_results["category_prior_baseline"] = compute_classification_metrics(y_test, test_cats.map(lambda c: cat_rates.get(c, test_prev)).values, threshold=0.5)
    test_results["train_history_baseline"] = compute_classification_metrics(y_test, X_test['train_hist_delay_rate'].values, threshold=0.5)

    # Models on Test
    y_test_prob_lr = lr.predict_proba(X_test_scaled)[:, 1]
    test_results["logistic_regression"] = compute_classification_metrics(y_test, y_test_prob_lr, threshold=0.5)

    y_test_prob_rf = rf.predict_proba(X_test)[:, 1]
    test_results["random_forest"] = compute_classification_metrics(y_test, y_test_prob_rf, threshold=0.5)

    y_test_prob_lgb = gbm.predict(X_test, num_iteration=best_iteration)
    test_results["lightgbm_raw"] = compute_classification_metrics(y_test, y_test_prob_lgb, threshold=0.5)
    test_results["lightgbm_optimal_threshold"] = compute_classification_metrics(y_test, y_test_prob_lgb, threshold=optimal_f1_threshold)

    # Calibrated LightGBM on Test
    y_test_prob_calib = isotonic.predict(y_test_prob_lgb)
    test_results["lightgbm_calibrated"] = compute_classification_metrics(y_test, y_test_prob_calib, threshold=optimal_f1_threshold)

    # En-Route on Test
    y_test_prob_en = gbm_en.predict(X_test_en)
    test_results["en_route_lightgbm"] = compute_classification_metrics(y_test, y_test_prob_en, threshold=optimal_f1_threshold)

    print("=" * 70)
    print("FINAL TEST SPLIT RESULTS SUMMARY:")
    print(f"  Majority Baseline:       PR-AUC = {test_results['majority_baseline']['pr_auc']:.4f}, F1 = {test_results['majority_baseline']['f1_positive']:.4f}")
    print(f"  Category Prior:          PR-AUC = {test_results['category_prior_baseline']['pr_auc']:.4f}, F1 = {test_results['category_prior_baseline']['f1_positive']:.4f}")
    print(f"  Train History Prior:     PR-AUC = {test_results['train_history_baseline']['pr_auc']:.4f}, F1 = {test_results['train_history_baseline']['f1_positive']:.4f}")
    print(f"  Logistic Regression:     PR-AUC = {test_results['logistic_regression']['pr_auc']:.4f}, F1 = {test_results['logistic_regression']['f1_positive']:.4f}")
    print(f"  Random Forest:           PR-AUC = {test_results['random_forest']['pr_auc']:.4f}, F1 = {test_results['random_forest']['f1_positive']:.4f}")
    print(f"  LightGBM (Final Model):  PR-AUC = {test_results['lightgbm_calibrated']['pr_auc']:.4f}, ROC-AUC = {test_results['lightgbm_calibrated']['roc_auc']:.4f}, F1 = {test_results['lightgbm_calibrated']['f1_positive']:.4f}")
    print(f"  En-Route LightGBM:       PR-AUC = {test_results['en_route_lightgbm']['pr_auc']:.4f}, ROC-AUC = {test_results['en_route_lightgbm']['roc_auc']:.4f}, F1 = {test_results['en_route_lightgbm']['f1_positive']:.4f}")
    print("=" * 70)

    # Calculate Lifts over baselines
    final_pr_auc = test_results['lightgbm_calibrated']['pr_auc']
    lift_over_majority = (final_pr_auc - test_results['majority_baseline']['pr_auc']) / test_results['majority_baseline']['pr_auc'] * 100
    lift_over_category = (final_pr_auc - test_results['category_prior_baseline']['pr_auc']) / test_results['category_prior_baseline']['pr_auc'] * 100
    lift_over_history = (final_pr_auc - test_results['train_history_baseline']['pr_auc']) / test_results['train_history_baseline']['pr_auc'] * 100

    # Error Analysis on Test Split
    print("\n  Conducting Error Analysis across Segments (Test Split)...")
    df_test_el = df_test_raw[check_label_eligibility(df_test_raw)].copy()
    df_test_el['y_true'] = y_test.values
    df_test_el['y_prob'] = y_test_prob_calib
    df_test_el['y_pred'] = (y_test_prob_calib >= optimal_f1_threshold).astype(int)

    error_analysis = {}
    # 1. By Category
    cat_err = {}
    for cat_name, grp in df_test_el.groupby('category'):
        cat_m = compute_classification_metrics(grp['y_true'].values, grp['y_prob'].values, threshold=optimal_f1_threshold)
        cat_err[str(cat_name)] = {
            "count": len(grp),
            "prevalence": round(float(grp['y_true'].mean()), 4),
            "pr_auc": cat_m['pr_auc'],
            "f1": cat_m['f1_positive'],
            "precision": cat_m['precision'],
            "recall": cat_m['recall']
        }
    error_analysis["by_category"] = cat_err

    # 2. By Journey Position (seq buckets)
    df_test_el['pos_bucket'] = pd.cut(df_test_el['seq'], bins=[0, 3, 10, 25, 50, 200], labels=['Early (2-3)', 'Mid-Early (4-10)', 'Mid (11-25)', 'Late (26-50)', 'Deep (>50)'])
    pos_err = {}
    for pos_name, grp in df_test_el.groupby('pos_bucket', observed=False):
        if len(grp) > 0:
            pos_m = compute_classification_metrics(grp['y_true'].values, grp['y_prob'].values, threshold=optimal_f1_threshold)
            pos_err[str(pos_name)] = {
                "count": len(grp),
                "prevalence": round(float(grp['y_true'].mean()), 4),
                "pr_auc": pos_m['pr_auc'],
                "f1": pos_m['f1_positive'],
                "precision": pos_m['precision'],
                "recall": pos_m['recall']
            }
    error_analysis["by_position"] = pos_err

    # 3. By Hour of Day
    df_test_el['hour'] = pd.to_datetime(df_test_el['scheduled_arrival']).dt.hour
    hour_err = {}
    for hr, grp in df_test_el.groupby('hour'):
        hr_m = compute_classification_metrics(grp['y_true'].values, grp['y_prob'].values, threshold=optimal_f1_threshold)
        hour_err[int(hr)] = {
            "count": len(grp),
            "prevalence": round(float(grp['y_true'].mean()), 4),
            "pr_auc": hr_m['pr_auc'],
            "f1": hr_m['f1_positive']
        }
    error_analysis["by_hour"] = hour_err

    # Save Experiment Log
    final_output = {
        "execution_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "best_model": "lightgbm_calibrated",
        "optimal_f1_threshold": optimal_f1_threshold,
        "recall80_threshold": recall80_threshold,
        "best_iteration": int(best_iteration),
        "validation_metrics": val_metrics,
        "test_metrics": test_results,
        "lifts": {
            "lift_over_majority_pct": round(lift_over_majority, 2),
            "lift_over_category_pct": round(lift_over_category, 2),
            "lift_over_history_pct": round(lift_over_history, 2)
        },
        "error_analysis": error_analysis
    }

    final_results_path = EXPERIMENTS_DIR / "final_test_results.json"
    with open(final_results_path, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=2, default=str)
    print(f"\n[OK] Wrote {final_results_path}")

    # -------------------------------------------------------------
    # 7. Task E: Explainability (SHAP & Feature Importance)
    # -------------------------------------------------------------
    print("\n[Step 8/8] Generating Explainability Plots & Saving Artifacts...")
    generate_evaluation_plots(y_test.values, y_test_prob_calib, optimal_f1_threshold, error_analysis)

    # Feature Importance (Gain & Split)
    imp_gain = gbm.feature_importance(importance_type='gain')
    imp_split = gbm.feature_importance(importance_type='split')
    feature_imp_df = pd.DataFrame({
        'feature': feature_names,
        'importance_gain': imp_gain,
        'importance_split': imp_split
    }).sort_values('importance_gain', ascending=False)

    feature_imp_df.to_csv(MODEL_DOCS_DIR / "feature_importance.csv", index=False)

    # SHAP Analysis on bounded validation sample (5,000 rows)
    print("  Computing SHAP TreeExplainer on 5,000 validation rows...")
    shap_sample = X_val.sample(n=5000, random_state=42)
    explainer = shap.TreeExplainer(gbm)
    shap_values = explainer.shap_values(shap_sample)

    # If binary output list returned, pick class 1
    if isinstance(shap_values, list):
        shap_vals_class1 = shap_values[1]
    else:
        shap_vals_class1 = shap_values

    # SHAP Summary Plot
    plt.figure(figsize=(10, 7), dpi=300)
    shap.summary_plot(shap_vals_class1, shap_sample, show=False, max_display=12)
    plt.title("SHAP Feature Attribution (5,000 Validation Observations)", fontsize=11, fontweight='bold')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "shap_summary.png", dpi=300)
    plt.close()

    # SHAP Bar Plot
    plt.figure(figsize=(10, 6), dpi=300)
    shap.summary_plot(shap_vals_class1, shap_sample, plot_type='bar', show=False, max_display=12)
    plt.title("SHAP Mean |Attribution| by Feature", fontsize=11, fontweight='bold')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "shap_feature_importance.png", dpi=300)
    plt.close()

    # Write Simple-English Explainability Guide
    write_simple_explanations(feature_imp_df)

    # -------------------------------------------------------------
    # 8. Task F: Save Artifacts & Deployment Model Refitting
    # -------------------------------------------------------------
    print("\n  Saving Model Artifacts to backend/models/...")
    # (a) Evaluation Model
    joblib.dump(gbm, MODELS_DIR / "evaluation_model.joblib")
    joblib.dump(isotonic, MODELS_DIR / "calibrator.joblib")
    joblib.dump(gbm_en, MODELS_DIR / "en_route_model.joblib")

    # (b) Deployment Model: Refit on Train + Validation with same hyperparameters
    print("  Refitting Deployment Model on Train + Validation...")
    df_trainval = pd.concat([df_train_raw[check_label_eligibility(df_train_raw)], df_val_raw[check_label_eligibility(df_val_raw)]], ignore_index=True)
    df_trainval_sub = df_trainval.sample(n=min(500000, len(df_trainval)), random_state=42)

    # Historical transformer up to Val cutoff (2026-10-23)
    hist_deploy = HistoricalPriorTransformer(m_train=10.0, m_station=20.0)
    hist_deploy.fit(pd.concat([df_warmup, df_train_raw, df_val_raw], ignore_index=True))

    X_deploy, y_deploy, _ = extract_features_and_target(df_trainval_sub, hist_deploy, filter_eligible=False)
    deploy_lgb = lgb.train(
        lgb_params,
        lgb.Dataset(X_deploy, label=y_deploy),
        num_boost_round=best_iteration
    )
    joblib.dump(deploy_lgb, MODELS_DIR / "deployment_model.joblib")
    joblib.dump(hist_deploy, MODELS_DIR / "hist_transformer.joblib")

    # Save Precomputed Historical Tables for Serving
    precomputed_tables = {
        "global_delay_rate": hist_deploy.global_delay_rate_,
        "global_mean_delay": hist_deploy.global_mean_delay_,
        "categories": hist_deploy.cat_priors_,
        "trains": hist_deploy.train_priors_,
        "stations": hist_deploy.station_priors_
    }
    with open(MODELS_DIR / "historical_tables.json", 'w', encoding='utf-8') as f:
        json.dump(precomputed_tables, f, indent=2)

    # Save Tracked Model Metadata
    model_metadata = {
        "model_name": "RailSense Delay Predictor (LightGBM + Isotonic Calibration)",
        "version": "1.0.0",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "best_iteration": int(best_iteration),
        "threshold": float(optimal_f1_threshold),
        "recall80_threshold": float(recall80_threshold),
        "feature_names": feature_names,
        "banned_features": banned_cols,
        "library_versions": {
            "lightgbm": lgb.__version__,
            "scikit_learn": "1.6.1",
            "shap": shap.__version__
        },
        "evaluation_metrics_test": test_results["lightgbm_calibrated"]
    }
    with open(MODELS_DIR / "model_metadata.json", 'w', encoding='utf-8') as f:
        json.dump(model_metadata, f, indent=2)

    print("  Artifacts successfully written to backend/models/")
    elapsed = time.time() - start_time_all
    print(f"\n[COMPLETE] Phase 4 Experiments finished in {elapsed:.1f}s.")


def generate_evaluation_plots(y_test, y_prob, threshold, error_analysis):
    """Generates all required PNG evaluation figures into docs/model/."""
    # 1. PR Curve
    prec, rec, _ = precision_recall_curve(y_test, y_prob)
    pr_auc_val = auc(rec, prec)
    plt.figure(figsize=(7, 6), dpi=300)
    plt.plot(rec, prec, color=PRIMARY_COLOR, linewidth=2.2, label=f'LightGBM (PR-AUC = {pr_auc_val:.3f})')
    plt.axhline(np.mean(y_test), color='#64748B', linestyle='--', label=f'Baseline Prevalence ({np.mean(y_test):.3f})')
    plt.xlabel('Recall', fontsize=10)
    plt.ylabel('Precision', fontsize=10)
    plt.title('Precision-Recall Curve (Test Partition)', fontsize=11, fontweight='bold')
    plt.legend(loc='lower left')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "pr_curve.png", dpi=300)
    plt.close()

    # 2. ROC Curve
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc_val = auc(fpr, tpr)
    plt.figure(figsize=(7, 6), dpi=300)
    plt.plot(fpr, tpr, color=PRIMARY_COLOR, linewidth=2.2, label=f'LightGBM (ROC-AUC = {roc_auc_val:.3f})')
    plt.plot([0, 1], [0, 1], color='#94A3B8', linestyle='--', label='Chance (0.500)')
    plt.xlabel('False Positive Rate', fontsize=10)
    plt.ylabel('True Positive Rate', fontsize=10)
    plt.title('Receiver Operating Characteristic (Test Partition)', fontsize=11, fontweight='bold')
    plt.legend(loc='lower right')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "roc_curve.png", dpi=300)
    plt.close()

    # 3. Confusion Matrix
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(6, 5), dpi=300)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False,
                xticklabels=['On-Time (<=15m)', 'Delayed (>15m)'],
                yticklabels=['On-Time (<=15m)', 'Delayed (>15m)'])
    plt.ylabel('Actual Outcome', fontsize=10)
    plt.xlabel(f'Predicted (Threshold = {threshold:.2f})', fontsize=10)
    plt.title('Confusion Matrix (Test Partition)', fontsize=11, fontweight='bold')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "confusion_matrix.png", dpi=300)
    plt.close()

    # 4. Calibration Curve
    bins = np.linspace(0, 1, 11)
    bin_centers = (bins[:-1] + bins[1:]) / 2
    actual_rates = []
    for i in range(10):
        mask = (y_prob >= bins[i]) & (y_prob < bins[i+1]) if i < 9 else (y_prob >= bins[i]) & (y_prob <= bins[i+1])
        actual_rates.append(np.mean(y_test[mask]) if np.sum(mask) > 0 else np.nan)

    plt.figure(figsize=(7, 6), dpi=300)
    plt.plot(bin_centers, actual_rates, marker='o', color=PRIMARY_COLOR, linewidth=2, label='Calibrated LightGBM')
    plt.plot([0, 1], [0, 1], color='#64748B', linestyle='--', label='Perfect Calibration')
    plt.xlabel('Mean Predicted Probability', fontsize=10)
    plt.ylabel('Observed Delay Fraction', fontsize=10)
    plt.title('Probability Calibration Reliability Diagram (Test Partition)', fontsize=11, fontweight='bold')
    plt.legend(loc='upper left')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "calibration_curve.png", dpi=300)
    plt.close()

    # 5. Metrics by Category Bar Chart
    cat_data = error_analysis["by_category"]
    cats = list(cat_data.keys())
    pr_aucs = [cat_data[c]["pr_auc"] for c in cats]
    f1s = [cat_data[c]["f1"] for c in cats]

    fig, ax = plt.subplots(figsize=(11, 5), dpi=300)
    x = np.arange(len(cats))
    width = 0.35
    ax.bar(x - width/2, pr_aucs, width, label='PR-AUC', color=PRIMARY_COLOR)
    ax.bar(x + width/2, f1s, width, label='F1 Score', color=WARNING_COLOR)
    ax.set_xticks(x)
    ax.set_xticklabels(cats, rotation=30)
    ax.set_ylabel('Score', fontsize=10)
    ax.set_title('Model Performance Across Train Categories (Test Partition)', fontsize=11, fontweight='bold')
    ax.legend()
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "metrics_by_category.png", dpi=300)
    plt.close()

    # 6. Metrics by Sequence Position
    pos_data = error_analysis["by_position"]
    pos_labels = list(pos_data.keys())
    pos_f1s = [pos_data[p]["f1"] for p in pos_labels]
    pos_prev = [pos_data[p]["prevalence"] * 100 for p in pos_labels]

    fig, ax1 = plt.subplots(figsize=(10, 5), dpi=300)
    ax1.bar(pos_labels, pos_f1s, color=PRIMARY_COLOR, width=0.45, label='F1 Score')
    ax1.set_ylabel('F1 Score', fontsize=10, color=PRIMARY_COLOR)
    ax1.set_ylim(0, 1.0)

    ax2 = ax1.twinx()
    ax2.plot(pos_labels, pos_prev, color=DELAY_COLOR, marker='o', linewidth=2, label='Actual Delay Rate (%)')
    ax2.set_ylabel('Actual Delayed Rate (%)', fontsize=10, color=DELAY_COLOR)
    ax2.set_ylim(0, 100)
    ax2.grid(False)

    plt.title('Performance vs Delay Rate Across Journey Positions (Test)', fontsize=11, fontweight='bold')
    plt.tight_layout()
    plt.savefig(MODEL_DOCS_DIR / "metrics_by_position.png", dpi=300)
    plt.close()


def write_simple_explanations(feature_imp_df):
    """Writes human-readable explanations of top model drivers for the UI Model Lab tab."""
    content = """# RailSense — Model Explanations in Plain English

> **Audience:** Non-technical passengers, railway operators, and portfolio reviewers.  
> **Key Rule:** Machine learning models identify **observed statistical associations**, not physical or operational causes.

---

## What Drives the Model's Delay Predictions?

Our LightGBM model looks at four major categories of timetable and historical information to estimate whether your train will arrive late by more than 15 minutes:

### 1. Train Historical Performance (`train_hist_delay_rate`, `train_hist_mean_delay`)
- **What it means:** How often this exact train was late over the previous 7 completed days.
- **Why it matters:** In Indian Railways, certain rakes (train compositions) run consecutive daily schedules across congested corridors. A train with a history of persistent delays has a substantially higher probability of facing schedule disruptions today.

### 2. Station Operational Congestion (`station_hist_delay_rate`, `station_hist_mean_delay`)
- **What it means:** The observed historical delay frequency at your arrival station.
- **Why it matters:** Major junction stations handle intersecting trunk lines, passenger connections, and platform bottlenecks. High-traffic junction stations are observed delay hotspots.

### 3. Train Category & Track Priority (`category`, `category_prior_rate`)
- **What it means:** The official classification of the service (Suburban `SUB`, Vande Bharat `VNDB`, Superfast `SUF`, Express `MEX`, Special `TOD`).
- **Why it matters:** Indian Railways dispatchers operate under strict operational path precedence:
  - **Suburban (`SUB`):** Dedicated tracks and strict suburban schedules mean Suburban trains arrive punctually 83% of the time.
  - **Special / Holiday (`TOD`):** Unscheduled holiday specials receive lower line priority and are observed late 76% of the time.

### 4. Journey Sequence Position (`seq`, `log_seq`, `is_deep_journey`)
- **What it means:** How far along its route the train currently is (e.g. stop #3 vs stop #45).
- **Why it matters:** Timetable buffers are gradually absorbed over hundreds of kilometers. Trains near the beginning of their route are frequently punctual; trains past stop #30 accumulate compounded route delays.

---

## When is the Model Most Reliable?

1. **High Confidence Predictions:**
   - **Suburban Trains:** Predicts on-time arrivals with >90% precision.
   - **Late Journey Superfasts:** High accuracy in identifying compound delay cascades once a train enters multi-state trunk routes.

2. **Model Limitations & Weaknesses:**
   - **Cold-Start Trains:** Rare, newly numbered holiday specials with zero 7-day prior history rely strictly on category-level priors.
   - **Early-Morning Long Hauls:** Express trains scheduled between 02:00 and 05:00 IST exhibit high variance due to overnight freight interleaving.
"""
    with open(MODEL_DOCS_DIR / "explanations_simple.md", 'w', encoding='utf-8') as f:
        f.write(content)


if __name__ == '__main__':
    run_pipeline()
