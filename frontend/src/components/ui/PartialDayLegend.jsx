import PropTypes from 'prop-types';
import { Info } from 'lucide-react';
import { PARTIAL_DATES, PARTIAL_DATE_DETAILS } from '../../config/constants.js';

/**
 * PartialDayLegend — Explanatory legend and badge for left-truncated and right-censored collection edge dates.
 */
export function PartialDayLegend({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 ${className}`}>
      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
        <Info className="w-4 h-4 text-primary-600 flex-shrink-0" aria-hidden="true" />
        <span>Boundary Days Notice:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {PARTIAL_DATES.map((date) => {
          const info = PARTIAL_DATE_DETAILS[date];
          return (
            <span
              key={date}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono text-xs"
              title={`${info.label}: ${info.description} (Ref: ${info.citation})`}
            >
              <span className="font-bold underline decoration-amber-400 decoration-wavy underline-offset-2">{date}</span>
              <span className="text-amber-700 font-sans font-medium">({info.shortLabel})</span>
            </span>
          );
        })}
      </div>
      <span className="text-slate-500 italic text-xs">
        Edge dates have partial temporal collection; do not treat rate spikes on these days as secular operational shifts.
      </span>
    </div>
  );
}

PartialDayLegend.propTypes = {
  className: PropTypes.string,
};
