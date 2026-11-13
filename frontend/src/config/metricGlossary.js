/**
 * RailSense — Model Metric Glossary & Tooltip Definitions (frontend/src/config/metricGlossary.js)
 * Sourced directly from docs/MODEL_CARD.md and docs/task_definition.md.
 * Strictly non-causal language; defines mathematical meaning and operational relevance.
 */

export const METRIC_GLOSSARY = {
  ap: {
    name: 'Average Precision (AP / PR-AUC)',
    short: 'Average Precision',
    formula: 'Area under Precision-Recall curve (Riemann sum of precision at each threshold)',
    description:
      'Evaluates the model\'s ranking quality across all possible operating thresholds. Higher is better (1.0 = perfect ranking; baseline is dataset prevalence ~0.492).',
  },
  roc_auc: {
    name: 'ROC-AUC',
    short: 'ROC-AUC',
    formula: 'Area under Receiver Operating Characteristic curve (True Positive Rate vs False Positive Rate)',
    description:
      'Measures the probability that a randomly chosen delayed stop is assigned a higher predicted probability than a randomly chosen on-time stop. 0.5 is random guessing.',
  },
  f1: {
    name: 'F1-Score (Positive Class)',
    short: 'F1-Score',
    formula: '2 × (Precision × Recall) / (Precision + Recall)',
    description:
      'Harmonic mean balancing precision and recall. Tuned on the validation split to select the optimal operational threshold (0.41).',
  },
  precision: {
    name: 'Precision',
    short: 'Precision',
    formula: 'True Positives / (True Positives + False Positives)',
    description:
      'When the model predicts a train will arrive delayed (>15 min late), the percentage of times it is correct.',
  },
  recall: {
    name: 'Recall (Sensitivity)',
    short: 'Recall',
    formula: 'True Positives / (True Positives + False Negatives)',
    description:
      'Out of all stops that actually arrived >15 minutes late, the percentage that the model successfully flagged.',
  },
  precision_at_recall_80: {
    name: 'Precision @ Recall ≥ 80%',
    short: 'Prec @ Rec ≥ 80%',
    formula: 'Precision achieved when the threshold is set so Recall is at least 0.80',
    description:
      'Evaluates operational utility for high-coverage alert systems: shows false-positive burden when catching 80% of all delays.',
  },
  brier_score: {
    name: 'Brier Score',
    short: 'Brier Score',
    formula: '(1 / N) × Σ (predicted_prob - actual_outcome)²',
    description:
      'Mean squared error of probabilistic predictions. Lower is better (0.0 = perfect prediction; 0.25 = uninformative uniform probability).',
  },
  ece: {
    name: 'Expected Calibration Error (ECE)',
    short: 'ECE',
    formula: 'Weighted average absolute gap between predicted probabilities and empirical fraction of delayed stops across bins',
    description:
      'Measures probability reliability. Lower is better. Low ECE indicates predicted 40% probability matches an empirical 40% historical delay rate.',
  },
  threshold: {
    name: 'Operational Decision Threshold',
    short: 'Threshold',
    formula: 'Cut-off value where predicted probability ≥ threshold produces a delayed prediction',
    description:
      'Selected on the validation split to maximize F1 score. Stops above this threshold are classified as delayed.',
  },
  lift: {
    name: 'Baseline Lift',
    short: 'Lift',
    formula: '(Metric_Model - Metric_Baseline) / Metric_Baseline × 100%',
    description:
      'Percentage improvement of the trained LightGBM model over simpler heuristics such as majority guessing or single-table priors.',
  },
  confusion_matrix: {
    name: 'Confusion Matrix (2×2)',
    short: 'Confusion Matrix',
    formula: 'Grid of True Negatives, False Positives, False Negatives, True Positives',
    description:
      'Counts of predictions versus observed outcomes on the untouched test partition at the selected operational threshold.',
  },
};

/**
 * Returns glossary metadata for a metric key.
 * @param {string} key
 * @returns {object}
 */
export function getMetricGlossary(key) {
  return METRIC_GLOSSARY[key] || {
    name: key,
    short: key,
    formula: '',
    description: 'Model evaluation metric.',
  };
}
