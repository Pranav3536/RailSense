/**
 * RailSense — Data Formatting Utilities (src/utils/format.js)
 * 
 * Standards:
 * - Single source of truth for Indian numbering / date locale: 'en-IN'.
 * - Safe fallback for null, undefined, and NaN: "Not available".
 * - formatPercent documentation: accepts fraction (0.0 to 1.0) by default,
 *   or handles explicit percent values if fraction=false.
 */

export const DEFAULT_LOCALE = 'en-IN';
export const NOT_AVAILABLE = 'Not available';

/**
 * Checks if a numeric value is valid (non-null, defined, finite number).
 */
export function isValidNumber(val) {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !Number.isNaN(num) && Number.isFinite(num);
}

/**
 * Formats a number with standard commas (e.g., 2,805,574 or 28,05,574 in en-IN).
 * @param {number|string} val
 * @param {number} decimals
 * @returns {string}
 */
export function formatNumber(val, decimals = 0) {
  if (!isValidNumber(val)) return NOT_AVAILABLE;
  const num = Number(val);
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formats a large number into compact Indian / metric notation (e.g. 2.8M or 147K).
 * @param {number|string} val
 * @returns {string}
 */
export function formatCompact(val) {
  if (!isValidNumber(val)) return NOT_AVAILABLE;
  const num = Number(val);
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Formats a proportion or percentage.
 * PREFER using formatFractionAsPercent for values in [0, 1] (e.g. probabilities, metrics)
 * or formatPercentValue for values in [0, 100] (e.g. rates, percentages).
 *
 * @param {number|string} val
 * @param {boolean} isFraction If true, val is in [0, 1] (e.g. 0.492 -> "49.2%").
 *                             If false, val is already 0-100 (e.g. 49.2 -> "49.2%").
 * @param {number} decimals
 * @returns {string}
 */
export function formatPercent(val, isFraction = true, decimals = 1) {
  if (!isValidNumber(val)) return NOT_AVAILABLE;
  let num = Number(val);
  if (isFraction) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && num > 1.0) {
      console.warn(`[formatPercent] Value ${num} > 1.0 was treated as fraction and multiplied by 100. Use formatPercentValue if this is already a percentage.`);
    }
    num = num * 100;
  }
  return `${formatNumber(num, decimals)}%`;
}

/**
 * Formats a fraction strictly in [0, 1] as a percentage string (multiplies by 100).
 * E.g., 0.227 -> "22.7%", 0.0 -> "0.0%", 1.0 -> "100.0%".
 * Use for model probabilities, prevalence, classification metrics (precision, recall, AUC),
 * and confusion matrix proportions.
 *
 * @param {number|string} val
 * @param {number} decimals
 * @returns {string}
 */
export function formatFractionAsPercent(val, decimals = 1) {
  if (!isValidNumber(val)) return NOT_AVAILABLE;
  const num = Number(val);
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && (num < 0 || num > 1.0)) {
    console.warn(`[formatFractionAsPercent] Expected fraction in [0, 1], received: ${num}`);
  }
  return `${formatNumber(num * 100, decimals)}%`;
}

/**
 * Formats a number already expressed on the 0-100 percentage scale (does NOT multiply by 100).
 * E.g., 88.24 -> "88.2%", 49.91 -> "49.9%", 0 -> "0.0%".
 * Use for observed delay rates, fleet delayed rates, hotspot rates, category rates from API.
 *
 * @param {number|string} val
 * @param {number} decimals
 * @returns {string}
 */
export function formatPercentValue(val, decimals = 1) {
  if (!isValidNumber(val)) return NOT_AVAILABLE;
  const num = Number(val);
  return `${formatNumber(num, decimals)}%`;
}

/**
 * Formats delay minutes with sign and units (e.g. "+38 min", "-5 min", "0 min").
 * Negative delays represent early arrivals and are preserved.
 * @param {number|string} val
 * @returns {string}
 */
export function formatMinutes(val) {
  if (!isValidNumber(val)) return NOT_AVAILABLE;
  const num = Number(val);
  const rounded = Math.round(num);
  if (rounded > 0) return `+${rounded} min`;
  if (rounded < 0) return `${rounded} min`;
  return `0 min`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Indian standard localized date (e.g. "25 Oct 2026").
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return NOT_AVAILABLE;
  try {
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return NOT_AVAILABLE;
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return NOT_AVAILABLE;
  }
}

/**
 * Formats a count with appropriate singular or plural noun.
 * @param {number|string} count
 * @param {string} singular
 * @param {string|null} [plural=null]
 * @returns {string} e.g. "1 observed run", "19 observed runs", "1 stop", "5 stops"
 */
export function pluralize(count, singular, plural = null) {
  if (!isValidNumber(count)) return NOT_AVAILABLE;
  const num = Number(count);
  const word = Math.abs(num) === 1 ? singular : (plural || `${singular}s`);
  return `${formatNumber(num)} ${word}`;
}
