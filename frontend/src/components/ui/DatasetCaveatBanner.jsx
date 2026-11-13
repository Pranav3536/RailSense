import PropTypes from 'prop-types';
import { Calendar } from 'lucide-react';
import { formatDate } from '../../utils/format';

/**
 * DatasetCaveatBanner — Slim observational context bar.
 * Displays date-range pill from API without bulky alert frame or non-causal badge.
 */
export function DatasetCaveatBanner({
  startDate = '2026-10-07',
  endDate = '2026-10-25',
  totalDays = 19,
  className = '',
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm text-sm text-slate-600 ${className}`}
      role="region"
      aria-label="Dataset observational context"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-primary-600 flex-shrink-0" aria-hidden="true" />
        <span className="font-semibold text-slate-800">
          Observational Snapshot:
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {formatDate(startDate)} – {formatDate(endDate)} · {totalDays} days snapshot
        </span>
      </div>
      <span className="text-xs text-slate-500">
      </span>
    </div>
  );
}

DatasetCaveatBanner.propTypes = {
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  totalDays: PropTypes.number,
  className: PropTypes.string,
};
