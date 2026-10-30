import PropTypes from 'prop-types';
import { formatPercent } from '../../utils/format';

/**
 * ProbabilityGauge — Accessible visual meter for model-estimated delay probability.
 * Displays filled probability meter, threshold indicator line, and calibrated vs raw readout.
 */
export function ProbabilityGauge({
  probability,
  rawProbability = null,
  threshold = 0.41,
  className = '',
}) {
  const probVal = Math.min(Math.max(Number(probability) || 0, 0), 1);
  const threshVal = Math.min(Math.max(Number(threshold) || 0.41, 0), 1);
  const probPct = probVal * 100;
  const threshPct = threshVal * 100;

  // Determine meter fill color based on threshold and severity
  let barColor = 'bg-emerald-500';
  if (probVal >= 0.65) {
    barColor = 'bg-rose-500';
  } else if (probVal >= threshVal) {
    barColor = 'bg-amber-500';
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Gauge Header */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatPercent(probVal)}
          </span>
          <span className="text-xs text-slate-500 ml-2 font-medium">
            estimated delay probability
          </span>
        </div>
        {rawProbability !== null && Math.abs(rawProbability - probVal) >= 0.005 && (
          <span className="text-xs text-slate-400 font-mono">
            (raw: {formatPercent(rawProbability)})
          </span>
        )}
      </div>

      {/* Meter Track */}
      <div
        role="meter"
        aria-valuenow={Math.round(probPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatPercent(probVal)} estimated delay probability`}
        className="relative h-4 w-full bg-slate-100 rounded-full overflow-visible border border-slate-200"
      >
        {/* Filled Probability Bar */}
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${probPct}%` }}
        />

        {/* Operational Threshold Marker Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10 -mt-1 -mb-1"
          style={{ left: `${threshPct}%` }}
          title={`Operational Threshold (${(threshVal * 100).toFixed(1)}%)`}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-slate-700 bg-white/90 px-1 rounded shadow-xs border border-slate-200 whitespace-nowrap">
            Threshold {(threshVal * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Sub-meter Scale */}
      <div className="flex justify-between items-center text-xs font-mono text-slate-400 mt-2">
        <span>0% (On-Time)</span>
        <span className="text-slate-500">
          Decision boundary: ≥{(threshVal * 100).toFixed(1)}% → Predicted Delayed
        </span>
        <span>100% (Delayed)</span>
      </div>
    </div>
  );
}

ProbabilityGauge.propTypes = {
  probability: PropTypes.number.isRequired,
  rawProbability: PropTypes.number,
  threshold: PropTypes.number,
  className: PropTypes.string,
};
