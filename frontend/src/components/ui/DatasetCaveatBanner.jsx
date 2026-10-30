import PropTypes from 'prop-types';
import { Calendar, ShieldAlert } from 'lucide-react';
import { DATASET_WINDOW } from '../../config/constants.js';

/**
 * DatasetCaveatBanner — Truthful dataset scope caveat banner.
 * Reminds users that metrics reflect a 19-day observational slice (Oct 7–25, 2026),
 * not an all-year average or live streaming GPS feed.
 */
export function DatasetCaveatBanner({ className = '' }) {
  return (
    <div className={`p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-slate-800 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900">
                19-Day Observational Window (Oct 7 – Oct 25, 2026)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                Single Snapshot
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {DATASET_WINDOW.note} Metrics on this page reflect historical observed frequencies strictly evaluated on label-eligible stops (arrival reported, seq &gt; 1, valid time delta).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap self-end sm:self-auto bg-white/70 px-2.5 py-1 rounded-md border border-blue-100">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Non-causal observational analytics</span>
        </div>
      </div>
    </div>
  );
}

DatasetCaveatBanner.propTypes = {
  className: PropTypes.string,
};
