import PropTypes from 'prop-types';
import { formatPercent, isValidNumber } from '../../utils/format.js';

/**
 * RateBar — Compact horizontal rate indicator for observed delay percentages.
 * Color scales:
 * - < 25%: emerald (reliable / low observed delay)
 * - 25% - 50%: amber (moderate observed delay)
 * - > 50%: rose (high observed delay)
 */
export function RateBar({
  rate,
  showLabel = true,
  isMuted = false,
  className = '',
  barClassName = '',
}) {
  if (!isValidNumber(rate)) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-slate-400 italic ${className}`}>
        <span>—</span>
        {showLabel && <span>Unobserved</span>}
      </div>
    );
  }

  const num = Math.max(0, Math.min(100, Number(rate)));
  let colorBg = 'bg-emerald-500';
  let textColor = 'text-emerald-700';

  if (num >= 50) {
    colorBg = 'bg-rose-500';
    textColor = 'text-rose-700';
  } else if (num >= 25) {
    colorBg = 'bg-amber-500';
    textColor = 'text-amber-700';
  }

  if (isMuted) {
    colorBg = 'bg-slate-400';
    textColor = 'text-slate-500';
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      role="progressbar"
      aria-valuenow={num}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Observed delayed rate: ${num.toFixed(1)}%`}
    >
      <div className={`w-20 sm:w-24 h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80 ${barClassName}`}>
        <div
          className={`h-full transition-all duration-300 rounded-full ${colorBg}`}
          style={{ width: `${num}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
          {formatPercent(num, false, 1)}
        </span>
      )}
    </div>
  );
}

RateBar.propTypes = {
  rate: PropTypes.number,
  showLabel: PropTypes.bool,
  isMuted: PropTypes.bool,
  className: PropTypes.string,
  barClassName: PropTypes.string,
};
