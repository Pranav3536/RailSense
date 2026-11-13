import PropTypes from 'prop-types';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { FEATURE_LABELS } from '../../config/featureLabels';

/**
 * Normalizes any factor input (string or object) into structured data with plain-English labels.
 */
function normalizeFactor(factor, idx) {
  if (typeof factor === 'object' && factor !== null) {
    const key = factor.feature || factor.name || factor.feature_name || '';
    const rawVal = typeof factor.contribution === 'number'
      ? factor.contribution
      : typeof factor.value === 'number'
      ? factor.value
      : 0;
    const meta = FEATURE_LABELS[key] || {};
    const label = meta.label || meta.shortLabel || factor.label || key || `Factor ${idx + 1}`;
    const description = meta.description || factor.description || '';
    return {
      key: key || `factor-${idx}`,
      label,
      description,
      rawText: factor.text || label,
      contribution: rawVal,
      isPositive: rawVal >= 0,
    };
  }

  const str = String(factor || '');
  let key = `factor-${idx}`;
  let contribution = 0.35;
  let isPositive = true;

  const lower = str.toLowerCase();
  if (
    lower.includes('reduces risk') ||
    lower.includes('punctuality') ||
    lower.includes('initial timetable buffer') ||
    lower.includes('benefits') ||
    lower.includes('early journey') ||
    lower.includes('suburban') ||
    lower.includes('low delay')
  ) {
    isPositive = false;
    contribution = -0.38;
  } else if (
    lower.includes('accumulates') ||
    lower.includes('delay hotspot') ||
    lower.includes('elevated') ||
    lower.includes('deep journey') ||
    lower.includes('lower schedule path priority')
  ) {
    isPositive = true;
    contribution = 0.42;
  }

  if (lower.includes('train') && (lower.includes('punctuality') || lower.includes('delay rate') || lower.includes('exhibits'))) {
    key = 'train_hist_delay_rate';
  } else if (lower.includes('station') && (lower.includes('hotspot') || lower.includes('delay rate'))) {
    key = 'station_hist_delay_rate';
  } else if (lower.includes('stop #') || lower.includes('journey position') || lower.includes('early journey')) {
    key = 'seq';
  } else if (lower.includes('suburban') || lower.includes('category') || lower.includes('holiday') || lower.includes('special')) {
    key = 'category_prior_rate';
  }

  const meta = FEATURE_LABELS[key] || {};
  const label = meta.label || meta.shortLabel || str;
  const description = meta.description || str;

  return {
    key,
    label,
    description: str !== label ? `${str} — ${description}` : description,
    rawText: str,
    contribution,
    isPositive,
  };
}

/**
 * FactorBars — "Why This Prediction?"
 * Displays top 3 factors associated with the model's delay estimate.
 * Plain-English labels + direction phrases ("Raised the delay estimate" / "Lowered the delay estimate")
 * with visual mini bars WITHOUT any numbers.
 */
export function FactorBars({ factors = [], className = '' }) {
  if (!factors || factors.length === 0) {
    return (
      <div className={`p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 ${className}`}>
        Explanation not available for this prediction.
      </div>
    );
  }

  // Top 3 factors strictly
  const parsedFactors = factors.slice(0, 3).map((f, i) => normalizeFactor(f, i));

  // Find max magnitude for scaling relative bar widths
  const maxAbs = Math.max(...parsedFactors.map((f) => Math.abs(f.contribution)), 0.1);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800">
          Why This Prediction?
        </h4>
        <button
          type="button"
          className="cursor-help text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded p-0.5"
          title="Factors the model associated with this estimate; not proven causes of delay."
          aria-label="Factors the model associated with this estimate; not proven causes of delay."
        >
          <HelpCircle size={15} aria-hidden="true" />
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Factors the model associated with this estimate; not proven causes of delay.
      </p>

      {/* Top 3 Factor Items with Visual Mini Bars (No numbers) */}
      <div className="space-y-3 pt-1">
        {parsedFactors.map((f, idx) => {
          const ratio = Math.min(Math.abs(f.contribution) / maxAbs, 1.0);
          const percentWidth = Math.max(Math.round(ratio * 100), 12);
          const directionText = f.isPositive ? 'Raised the delay estimate' : 'Lowered the delay estimate';

          return (
            <div
              key={f.key || idx}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 hover:border-slate-300 transition-colors"
            >
              {/* Factor Label & Direction with icon */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800 truncate" title={f.description || f.label}>
                  {f.label}
                </span>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {f.isPositive ? (
                    <TrendingUp size={14} className="text-rose-600" aria-hidden="true" />
                  ) : (
                    <TrendingDown size={14} className="text-emerald-600" aria-hidden="true" />
                  )}
                  <span
                    className={`font-medium text-xs px-2 py-0.5 rounded-full ${
                      f.isPositive
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {directionText}
                  </span>
                </div>
              </div>

              {/* Visual relative bar WITHOUT numbers */}
              <div
                className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"
                role="presentation"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    f.isPositive ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Screen Reader Only Accessible Alternative */}
      <table className="sr-only">
        <caption>Key factors associated with this prediction</caption>
        <thead>
          <tr>
            <th scope="col">Factor</th>
            <th scope="col">Direction</th>
          </tr>
        </thead>
        <tbody>
          {parsedFactors.map((f, idx) => (
            <tr key={`sr-${f.key || idx}`}>
              <td>{f.label}</td>
              <td>{f.isPositive ? 'Raised the delay estimate' : 'Lowered the delay estimate'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

FactorBars.propTypes = {
  factors: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        feature: PropTypes.string,
        contribution: PropTypes.number,
        label: PropTypes.string,
        description: PropTypes.string,
      }),
    ])
  ),
  className: PropTypes.string,
};
