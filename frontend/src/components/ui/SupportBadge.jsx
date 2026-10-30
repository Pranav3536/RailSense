import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';
import { LOW_SUPPORT_THRESHOLD } from '../../config/constants.js';
import { formatNumber } from '../../utils/format.js';

/**
 * SupportBadge — Displays sample size / eligible observations with low-support warning.
 * Subsets with < 30 observations are visually muted with an explicit low-support badge.
 */
export function SupportBadge({ count, threshold = LOW_SUPPORT_THRESHOLD, unit = 'stops', className = '' }) {
  const isLow = typeof count === 'number' && count < threshold;
  const countStr = typeof count === 'number' ? formatNumber(count) : '0';

  if (isLow) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 ${className}`}
        title={`Sample size (${countStr} ${unit}) is below statistical reliability threshold (${threshold} ${unit}). Treat observed rate with caution.`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
        <span>{countStr} {unit}</span>
        <span className="text-xs font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">
          Low Support (&lt;{threshold})
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
      title={`Sample size: ${countStr} eligible ${unit}`}
    >
      <span>{countStr}</span>
      <span className="text-slate-500">{unit}</span>
    </span>
  );
}

SupportBadge.propTypes = {
  count: PropTypes.number,
  threshold: PropTypes.number,
  unit: PropTypes.string,
  className: PropTypes.string,
};
