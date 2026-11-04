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
    num = num * 100;
  }
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
