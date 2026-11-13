import PropTypes from 'prop-types';
import { AlertTriangle, Info, Calendar } from 'lucide-react';
import { DATASET_WINDOW } from '../../config/constants';

/**
 * WarningList — Renders operational caveats, data window notices, and model disclaimers.
 */
export function WarningList({
  caveats = [],
  journeyDate = null,
  className = '',
}) {
  // Check if date is in historical window
  const isInWindow =
    journeyDate &&
    journeyDate >= DATASET_WINDOW.startDate &&
    journeyDate <= DATASET_WINDOW.endDate;

  const isOutOfWindow =
    journeyDate &&
    (journeyDate < DATASET_WINDOW.startDate || journeyDate > DATASET_WINDOW.endDate);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* In-Window / In-Sample Education Note */}
      {isInWindow && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/80 border border-indigo-200/80 text-indigo-950 text-xs">
          <Info size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed font-normal">
            <strong className="font-semibold">In-Sample Demonstration:</strong> The deployment model was fitted on Oct 08–22, 2026 (Train + Validation partitions), and rolling historical lookup tables cover Oct 08–24, 2026. This journey date ({journeyDate}) is inside the observation window; treat the result as an illustration of in-sample statistical associations, not a prospective generalization check.
          </p>
        </div>
      )}

      {/* Out-of-Window Generalization Caveat */}
      {isOutOfWindow && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs">
          <Calendar size={16} className="text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed font-normal">
            <strong className="font-semibold">Prospective Date Notice:</strong> Journey date ({journeyDate}) is outside the recorded dataset observation window (Oct 07–25, 2026). Prediction assumes identical operating schedules and conditions without seasonality adjustments.
          </p>
        </div>
      )}

      {/* Caveat List from API */}
      {caveats && caveats.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-xs">
            <AlertTriangle size={13} className="text-slate-500" />
            Model Operating Caveats
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 font-normal">
            {caveats.map((c, idx) => (
              <li key={idx} className="leading-relaxed">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

WarningList.propTypes = {
  caveats: PropTypes.arrayOf(PropTypes.string),
  journeyDate: PropTypes.string,
  className: PropTypes.string,
};
