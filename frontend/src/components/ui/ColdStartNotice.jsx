import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';

/**
 * ColdStartNotice — Informs the user when a train or station has limited historical runs.
 */
export function ColdStartNotice({ isColdStart = false, className = '' }) {
  if (!isColdStart) return null;

  return (
    <div
      role="status"
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 ${className}`}
    >
      <AlertCircle size={18} className="text-sky-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1">
        <h5 className="text-xs font-bold uppercase tracking-wider text-sky-800">
          Cold-Start Prior Applied
        </h5>
        <p className="text-xs text-sky-900/90 leading-relaxed font-normal">
          This train service or station has fewer than 5 completed runs recorded in the 19-day historical window.
          The prediction relies on service category priors and network-wide empirical averages rather than individual historical tracking.
        </p>
      </div>
    </div>
  );
}

ColdStartNotice.propTypes = {
  isColdStart: PropTypes.bool,
  className: PropTypes.string,
};
