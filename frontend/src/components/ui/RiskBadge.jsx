import PropTypes from 'prop-types';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

/**
 * RiskBadge — Visual categorization badge for model-estimated delay probability risk bands.
 * Follows the 3-tier risk rubric:
 * - Low: Probability < 0.35
 * - Medium: 0.35 <= Probability < 0.65
 * - High: Probability >= 0.65
 */
export function RiskBadge({ riskBand, className = '', size = 'md' }) {
  const band = (riskBand || '').toLowerCase();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5 font-semibold';

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  }[size] || 15;

  if (band === 'low') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses} ${className}`}
      >
        <ShieldCheck size={iconSizes} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
        <span>Low Risk</span>
      </span>
    );
  }

  if (band === 'medium') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses} ${className}`}
      >
        <AlertTriangle size={iconSizes} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
        <span>Medium Risk</span>
      </span>
    );
  }

  if (band === 'high') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses} ${className}`}
      >
        <AlertOctagon size={iconSizes} className="text-rose-600 flex-shrink-0" aria-hidden="true" />
        <span>High Risk</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}
    >
      <span>{riskBand || 'Unknown'}</span>
    </span>
  );
}

RiskBadge.propTypes = {
  riskBand: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};
