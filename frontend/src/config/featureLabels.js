/**
 * RailSense — Model Feature Metadata & Plain-English Labels (frontend/src/config/featureLabels.js)
 * Sourced directly from docs/feature_catalog.md.
 * Provides accessible, plain-language descriptions and fallbacks for all engineered features.
 */

export const FEATURE_LABELS = {
  train_hist_delay_rate: {
    label: "Train's past delay rate",
    shortLabel: "Train's past delay rate",
    category: 'Historical Rolling Prior',
    description: 'Empirical Bayesian smoothed delay rate of this train over the trailing 7 days prior to journey date.',
  },
  train_hist_mean_delay: {
    label: "Train's past average delay",
    shortLabel: "Train's past average delay",
    category: 'Historical Rolling Prior',
    description: 'Smoothed average arrival delay in minutes for this train over the trailing 7 days.',
  },
  station_hist_delay_rate: {
    label: "Station's past delay rate",
    shortLabel: "Station's past delay rate",
    category: 'Historical Rolling Prior',
    description: 'Empirical delay rate recorded across all arrivals at this station over the trailing 7 days.',
  },
  seq: {
    label: 'Journey stop number',
    shortLabel: 'Journey stop number',
    category: 'Schedule-Time Geometry',
    description: 'Ordinal position of the station along the canonical route (1 = origin). Compounding delay accumulates with sequence.',
  },
  station_hist_mean_delay: {
    label: "Station's past average delay",
    shortLabel: "Station's past average delay",
    category: 'Historical Rolling Prior',
    description: 'Smoothed average delay in minutes observed at this station over the trailing 7 days.',
  },
  log_seq: {
    label: 'Position of this stop on the route',
    shortLabel: 'Position of this stop on the route',
    category: 'Schedule-Time Geometry',
    description: 'Logarithm of stop sequence, capturing sub-linear compounding of en-route delay.',
  },
  category_prior_rate: {
    label: 'Past delay pattern of this train category',
    shortLabel: 'Past delay pattern of this train category',
    category: 'Empirical Baseline Prior',
    description: 'Historical delay rate for this service category across all completed trips in the training partition.',
  },
  scheduled_hour: {
    label: 'Scheduled arrival hour',
    shortLabel: 'Arrival hour',
    category: 'Temporal Timetable',
    description: 'Hour of scheduled arrival in Indian Standard Time (0–23).',
  },
  sin_hour: {
    label: 'Diurnal Cycle (Sine Component)',
    shortLabel: 'Hour (Sin)',
    category: 'Temporal Cyclical',
    description: 'Trigonometric sine transformation of 24-hour diurnal arrival time.',
  },
  cos_hour: {
    label: 'Diurnal Cycle (Cosine Component)',
    shortLabel: 'Hour (Cos)',
    category: 'Temporal Cyclical',
    description: 'Trigonometric cosine transformation of 24-hour diurnal arrival time.',
  },
  category_prior_mean: {
    label: 'Category Prior Mean Delay',
    shortLabel: 'Category Prior Mean',
    category: 'Empirical Baseline Prior',
    description: 'Historical average delay in minutes for this train category.',
  },
  day_of_week: {
    label: 'Day of Week',
    shortLabel: 'Day of Week',
    category: 'Temporal Timetable',
    description: 'Day of week for scheduled arrival.',
  },
  sin_dow: {
    label: 'Weekly Cycle (Sine Component)',
    shortLabel: 'Day of Week (Sin)',
    category: 'Temporal Cyclical',
    description: 'Trigonometric sine transformation of 7-day weekly schedule cycle.',
  },
  cos_dow: {
    label: 'Weekly Cycle (Cosine Component)',
    shortLabel: 'Day of Week (Cos)',
    category: 'Temporal Cyclical',
    description: 'Trigonometric cosine transformation of 7-day weekly schedule cycle.',
  },
  is_weekend: {
    label: 'Weekend Arrival Flag',
    shortLabel: 'Weekend',
    category: 'Temporal Timetable',
    description: 'Binary indicator for Saturday or Sunday scheduled arrival.',
  },
  is_night: {
    label: 'Night Arrival Flag (22:00–06:00)',
    shortLabel: 'Night Arrival',
    category: 'Temporal Timetable',
    description: 'Binary indicator for late night or early morning scheduled arrival.',
  },
  is_origin_adjacent: {
    label: 'Origin-Adjacent Stop (seq ≤ 3)',
    shortLabel: 'Origin Adjacent',
    category: 'Schedule-Time Geometry',
    description: 'Early journey stops that benefit from fresh rake departure and initial schedule buffer.',
  },
  is_deep_journey: {
    label: 'Deep Journey Stop (seq ≥ 25)',
    shortLabel: 'Deep Journey',
    category: 'Schedule-Time Geometry',
    description: 'Stops deep along the journey route where network propagation delays frequently compound.',
  },
  cat_MEX: {
    label: 'Category: Mail / Express',
    shortLabel: 'Cat: Mail/Express',
    category: 'Service Class One-Hot',
    description: 'Indicator for long-distance Mail or Express service.',
  },
  cat_SUB: {
    label: 'Category: Suburban',
    shortLabel: 'Cat: Suburban',
    category: 'Service Class One-Hot',
    description: 'Indicator for suburban commuter network services operating on isolated tracks.',
  },
  cat_SUF: {
    label: 'Category: Superfast Express',
    shortLabel: 'Cat: Superfast',
    category: 'Service Class One-Hot',
    description: 'Indicator for prioritized Superfast intercity trains.',
  },
  cat_PAS: {
    label: 'Category: Passenger Service',
    shortLabel: 'Cat: Passenger',
    category: 'Service Class One-Hot',
    description: 'Indicator for stopping all-station regional passenger transit.',
  },
  cat_MEMU: {
    label: 'Category: Mainline EMU',
    shortLabel: 'Cat: MEMU',
    category: 'Service Class One-Hot',
    description: 'Indicator for Mainline Electric Multiple Unit services.',
  },
  cat_DMU: {
    label: 'Category: Diesel Multiple Unit',
    shortLabel: 'Cat: DMU',
    category: 'Service Class One-Hot',
    description: 'Indicator for non-electrified regional DMU services.',
  },
  cat_VNDB: {
    label: 'Category: Vande Bharat Express',
    shortLabel: 'Cat: Vande Bharat',
    category: 'Service Class One-Hot',
    description: 'Indicator for modern semi-high-speed distributed-traction premium trains.',
  },
  cat_SHT: {
    label: 'Category: Shatabdi Express',
    shortLabel: 'Cat: Shatabdi',
    category: 'Service Class One-Hot',
    description: 'Indicator for premium daytime intercity chair car services.',
  },
  cat_TOD: {
    label: 'Category: Train on Demand / Special',
    shortLabel: 'Cat: Train on Demand',
    category: 'Service Class One-Hot',
    description: 'Indicator for dynamic festival and holiday special trains.',
  },
  cat_OTHER: {
    label: 'Category: Other / Unclassified',
    shortLabel: 'Cat: Other',
    category: 'Service Class One-Hot',
    description: 'Indicator for rare or unclassified service codes.',
  },
};

/**
 * Returns plain-English label for a feature name, falling back to raw name.
 * @param {string} rawName - Raw column or feature identifier
 * @returns {string} Plain-English human-readable label
 */
export function getFeatureLabel(rawName) {
  if (!rawName) return 'Unknown Feature';
  return FEATURE_LABELS[rawName]?.label || rawName;
}

/**
 * Returns short label for chart axis or table headers.
 * @param {string} rawName
 * @returns {string}
 */
export function getFeatureShortLabel(rawName) {
  if (!rawName) return 'Unknown';
  return FEATURE_LABELS[rawName]?.shortLabel || rawName;
}

/**
 * Returns detailed tooltip description for a feature.
 * @param {string} rawName
 * @returns {string}
 */
export function getFeatureDescription(rawName) {
  if (!rawName) return '';
  return FEATURE_LABELS[rawName]?.description || `Raw dataset feature: ${rawName}`;
}
