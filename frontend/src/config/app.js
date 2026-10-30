/**
 * RailSense — Application & Navigation Configuration
 * 
 * Strict Single Source of Truth for:
 * - App version pill: "v2.0.4 Community ML Edition"
 * - Dataset badge: "Observed Railway Dataset" (provenance unverified)
 * - Navigation tabs (fixed 6-tab order)
 * - Standard delay definition
 */

export const APP_CONFIG = {
  name: 'RailSense',
  versionPill: 'v2.0.4 Community ML Edition',
  datasetBadge: 'Observed Railway Dataset',
  delayDefinition: 'Delayed = arrival delay > 15 min on label-eligible stops (seq > 1, arrival_reported = 1). Early arrivals (negative delays) are valid operations and never clipped.',
};

export const NAV_ITEMS = [
  {
    path: '/overview',
    title: 'Railway at a Glance',
    label: 'Overview',
    iconName: 'LayoutDashboard',
    phase: 'Phase 7',
    endpoints: ['/api/overview', '/api/health/ready'],
    description: 'Fleet-level KPIs, macro delay distributions, category breakdown, and daily delay rate trends across the observed dataset.'
  },
  {
    path: '/explorer',
    title: 'Single Train Deep Dive',
    label: 'Train Explorer',
    iconName: 'Route',
    phase: 'Phase 7',
    endpoints: ['/api/trains', '/api/trains/<train_number>'],
    description: 'Interactive train route timetable explorer with canonical stops, sequence numbers, stop-level observed delayed rates, and historical run performance.'
  },
  {
    path: '/predict',
    title: 'ML Inference Engine',
    label: 'Delay Prediction',
    iconName: 'Clock',
    phase: 'Phase 8',
    endpoints: ['/api/predict'],
    description: 'Schedule-time pre-departure delay forecasting utilizing calibrated LightGBM GBDT models with risk band assignment and SHAP factor attribution.'
  },
  {
    path: '/model-lab',
    title: 'Model Evaluation & Transparency',
    label: 'Model Lab',
    iconName: 'FlaskConical',
    phase: 'Phase 8',
    endpoints: ['/api/model/info', '/api/model/metrics'],
    description: 'Interactive evaluation benchmark comparing 8 models/baselines across PR-AUC, ROC-AUC, Brier score, ECE, calibration curves, and feature importance rankings.'
  },
  {
    path: '/patterns',
    title: 'Historical Analytics',
    label: 'Delay Patterns',
    iconName: 'BarChart3',
    phase: 'Phase 9',
    endpoints: ['/api/patterns/<kind>', '/api/stations'],
    description: 'Empirical delay patterns decomposed by scheduled hour, day of week, train category, journey sequence depth, and observed station hotspots.'
  },
  {
    path: '/insights',
    title: 'Natural Language Analytics',
    label: 'Smart Insights',
    iconName: 'MessageSquareText',
    phase: 'Phase 9',
    endpoints: ['/api/insights/query'],
    description: 'Local parameterised NLP query interface (TF-IDF + RapidFuzz) answering structured delay intelligence queries without runtime LLM dependencies.'
  }
];
