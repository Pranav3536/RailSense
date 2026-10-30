/**
 * RailSense — Domain & Metric Constants
 * 
 * Centralized Single Source of Truth for:
 * - Statistical support thresholds (low-support warnings)
 * - Dataset temporal boundaries and partial dates
 * - Train service categories mapped from docs/data_dictionary.md
 */

/**
 * Statistical Support Threshold:
 * Minimum eligible stop observations required to consider an empirical delay rate reliable.
 * Subsets with fewer than 30 observations are visually muted and marked with a low-support indicator.
 */
export const LOW_SUPPORT_THRESHOLD = 30;

/**
 * Wake-Up Notice Constants:
 * Render free tier spins down after inactivity; initial requests take up to a minute.
 * If a readiness or data request is pending after WAKE_UP_TIMEOUT_MS, a neutral notice is displayed.
 */
export const WAKE_UP_TIMEOUT_MS = 4000;
export const WAKE_UP_NOTICE_MESSAGE =
  'The server may be waking up (free hosting). This can take up to a minute.';

/**
 * Dataset Collection Boundaries (19-Day Observational Window)
 * Source: docs/validation_report.md
 */
export const DATASET_WINDOW = {
  startDate: '2026-10-07',
  endDate: '2026-10-25',
  totalDays: 19,
  note: 'Observational window covers 19 consecutive calendar days (October 7–25, 2026). No weather or seasonality claims are made.',
};

/**
 * Boundary dates with incomplete collection coverage:
 * - 2026-10-07: Left-truncated (collection began midday; early morning runs not captured)
 * - 2026-10-25: Right-censored (collection halted; journeys in progress uncompleted)
 */
export const PARTIAL_DATES = ['2026-10-07', '2026-10-25'];

export const PARTIAL_DATE_DETAILS = {
  '2026-10-07': {
    type: 'left_truncated',
    shortLabel: 'Partial Day (Start)',
    label: 'Collection Start (Left-Truncated)',
    description: 'Data collection began on this date. Early morning departures and runs initiated before collection started are missing.',
    citation: 'docs/validation_report.md § 2.1',
  },
  '2026-10-25': {
    type: 'right_censored',
    shortLabel: 'Partial Day (End)',
    label: 'Collection Cutoff (Right-Censored)',
    description: 'Data collection ceased on this date. Multi-day journeys arriving after collection cutoff are right-censored.',
    citation: 'docs/validation_report.md § 2.1',
  },
};

/**
 * Canonical Train Service Categories
 * Source: docs/data_dictionary.md & Phase 2 Data Audit
 */
export const CATEGORY_MAP = {
  MEX: { code: 'MEX', name: 'Mail / Express', description: 'Long-distance intercity services with limited halts' },
  SUB: { code: 'SUB', name: 'Suburban', description: 'High-frequency commuter suburban networks (e.g. Mumbai, Chennai)' },
  MEMU: { code: 'MEMU', name: 'Mainline Electric Multiple Unit', description: 'Short to medium distance high-acceleration regional trains' },
  PAS: { code: 'PAS', name: 'Passenger', description: 'All-stations stopping regional passenger services' },
  SUF: { code: 'SUF', name: 'Superfast Express', description: 'Priority intercity express services with average speed >= 55 km/h' },
  DMU: { code: 'DMU', name: 'Diesel Multiple Unit', description: 'Non-electrified regional passenger transit' },
  TOD: { code: 'TOD', name: 'Train on Demand / Special', description: 'Seasonal, holiday, or festival special dynamic services' },
  VNDB: { code: 'VNDB', name: 'Vande Bharat Express', description: 'Semi-high speed distributed traction premium chair cars' },
  EMU: { code: 'EMU', name: 'Electric Multiple Unit', description: 'Metropolitan electric commuter transit' },
  JSH: { code: 'JSH', name: 'Jan Shatabdi Express', description: 'Economical daytime intercity express connectivity' },
  AMTB: { code: 'AMTB', name: 'Amrit Bharat Express', description: 'High-speed non-AC push-pull long-distance express' },
  RAJ: { code: 'RAJ', name: 'Rajdhani Express', description: 'Premier fully air-conditioned national capital expresses' },
  SHT: { code: 'SHT', name: 'Shatabdi Express', description: 'Premier daytime high-speed intercity connectivity' },
  GBR: { code: 'GBR', name: 'Garib Rath Express', description: 'Affordable air-conditioned long-distance express' },
  DRNT: { code: 'DRNT', name: 'Duronto Express', description: 'Point-to-point non-stop long-distance expresses' },
  VNDM: { code: 'VNDM', name: 'Vande Metro', description: 'Urban rapid transit variant of Vande Bharat' },
  TEJ: { code: 'TEJ', name: 'Tejas Express', description: 'Semi-high speed privately operated premium intercity express' },
  VNDS: { code: 'VNDS', name: 'Vande Sadharan', description: 'Non-AC variant of distributed power trainsets' },
  PEXP: { code: 'PEXP', name: 'Parcel Express', description: 'Dedicated high-speed freight / parcel express movements' },
  TRST: { code: 'TRST', name: 'Tourist / Heritage Special', description: 'Specialized heritage line services and tourist trains' },
};

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'MEX', label: 'MEX — Mail / Express' },
  { value: 'SUB', label: 'SUB — Suburban' },
  { value: 'MEMU', label: 'MEMU — Mainline EMU' },
  { value: 'PAS', label: 'PAS — Passenger' },
  { value: 'SUF', label: 'SUF — Superfast Express' },
  { value: 'DMU', label: 'DMU — Diesel Multiple Unit' },
  { value: 'TOD', label: 'TOD — Train on Demand' },
  { value: 'VNDB', label: 'VNDB — Vande Bharat' },
  { value: 'RAJ', label: 'RAJ — Rajdhani' },
  { value: 'SHT', label: 'SHT — Shatabdi' },
  { value: 'DRNT', label: 'DRNT — Duronto' },
  { value: 'EMU', label: 'EMU — Electric Multiple Unit' },
  { value: 'JSH', label: 'JSH — Jan Shatabdi' },
  { value: 'GBR', label: 'GBR — Garib Rath' },
];
