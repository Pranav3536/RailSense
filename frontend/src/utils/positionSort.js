/**
 * RailSense — Stop Position Sorting Helper (frontend/src/utils/positionSort.js)
 * Sorts stop position bucket entries into chronological journey order:
 * Early (2-3) -> Mid-Early (4-10) -> Mid (11-25) -> Late (26-50) -> Deep (>50)
 *
 * Dynamically parses the lower bound from the bucket label or numeric field
 * rather than hardcoding static names as the sole mechanism.
 */

/**
 * Parses the numerical lower bound from a position bucket label.
 * Handles ranges "2-3", "(4-10)", "Deep (>50)", ">50", etc.
 *
 * @param {string|number} label
 * @returns {number} Lower bound for sorting, or Infinity if unparseable
 */
export function parsePositionBucketOrder(label) {
  if (typeof label === 'number') return label;
  if (typeof label !== 'string') return Infinity;

  const trimmed = label.trim();
  if (!trimmed) return Infinity;

  // Handle direct numeric strings
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // Handle ">X" or "(>X)" pattern (e.g. "Deep (>50)" -> 51)
  const gtMatch = trimmed.match(/>\s*(\d+)/);
  if (gtMatch) {
    return parseInt(gtMatch[1], 10) + 1;
  }

  // Handle "X-Y" or "(X-Y)" pattern (e.g. "Early (2-3)" -> 2, "4-10" -> 4)
  const rangeMatch = trimmed.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    return parseInt(rangeMatch[1], 10);
  }

  // Fallback: match any first standalone number
  const firstNum = trimmed.match(/\d+/);
  if (firstNum) {
    return parseInt(firstNum[0], 10);
  }

  return Infinity;
}

/**
 * Sorts an array of position items or [key, value] entries in journey progression order.
 *
 * @param {Array} items - Array of objects or entries to sort
 * @param {Function} [getLabel] - Optional accessor returning the bucket string
 * @returns {Array} New sorted array
 */
export function sortPositionBuckets(items, getLabel = null) {
  if (!Array.isArray(items)) return [];

  const defaultExtractor = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item[0]; // [key, val] entry
    return item.positionBucket || item.binName || item.label || item.category || '';
  };

  const extractor = getLabel || defaultExtractor;

  return [...items].sort((a, b) => {
    const valA = parsePositionBucketOrder(extractor(a));
    const valB = parsePositionBucketOrder(extractor(b));

    if (valA === Infinity && valB === Infinity) return 0;
    return valA - valB;
  });
}
