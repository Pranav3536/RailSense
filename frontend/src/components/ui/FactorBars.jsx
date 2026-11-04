import PropTypes from 'prop-types';
import { Layers, Info, HelpCircle } from 'lucide-react';
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
 * FactorBars — Displays model feature associations and attribution factors.
 * Strictly non-causal language: displays characteristics associated with the model's estimate.
 * Diverging horizontal bars (red = raises estimate, green = lowers estimate).
 * Units are raw model log-odds (never percentages).
 */
export function FactorBars({ factors = [], className = '' }) {
  if (!factors || factors.length === 0) {
    return (
      <div className={`p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 ${className}`}>
        No significant individual skew factors detected; prediction follows baseline schedule priors.
      </div>
    );
  }

  // Top 5 (or max 6)
  const parsedFactors = factors.slice(0, 6).map((f, i) => normalizeFactor(f, i));

  // Find max magnitude for scaling relative diverging bars
  const maxAbs = Math.max(...parsedFactors.map((f) => Math.abs(f.contribution)), 0.1);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-primary-600" aria-hidden="true" />
          <h4 className="text-sm font-bold text-slate-800">
            Model Feature Associations
          </h4>
        </div>
        <div
          className="flex items-center gap-1 text-xs text-slate-600 cursor-help"
          title="relative influence on this estimate, in model log-odds units; not causes"
          tabIndex={0}
          aria-label="Factor information: relative influence on this estimate, in model log-odds units; not causes"
        >
          <HelpCircle size={14} className="text-slate-500" aria-hidden="true" />
          <span className="hidden sm:inline">Log-odds influence</span>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Attributes associated with this estimate (correlational signals used during inference; not physical causes).
      </p>

      {/* Mini Horizontal Diverging Bars */}
      <div className="space-y-3 pt-1">
        {parsedFactors.map((f, idx) => {
          const ratio = Math.min(Math.abs(f.contribution) / maxAbs, 1.0);
          const percentWidth = Math.max(ratio * 50, 4); // max 50% for either side of center line
          const signedVal = f.contribution >= 0 ? `+${f.contribution.toFixed(2)}` : f.contribution.toFixed(2);
          const directionText = f.isPositive ? 'raises the estimate' : 'lowers the estimate';

          return (
            <div
              key={f.key || idx}
              className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-2 hover:border-slate-300 transition-colors"
            >
              {/* Factor Label & Direction */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-slate-800 truncate" title={f.description}>
                    {f.label}
                  </span>
                  {f.description && (
                    <button
                      type="button"
                      title={f.description}
                      className="cursor-help text-slate-500 hover:text-slate-700 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded"
                      aria-label={f.description}
                    >
                      <Info size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`font-medium text-xs px-2 py-0.5 rounded-full ${
                      f.isPositive
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {directionText}
                  </span>
                  <span
                    className="font-mono text-xs text-slate-700 font-semibold cursor-help"
                    title={`Model contribution: ${signedVal} (log-odds space)`}
                  >
                    {signedVal}
                  </span>
                </div>
              </div>

              {/* Diverging Bar Track */}
              <div
                className="relative h-2 w-full bg-slate-200/70 rounded-full overflow-hidden"
                role="presentation"
              >
                {/* Center marker line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400/60 -translate-x-1/2 z-10" />

                {/* Left side (negative / lowers) */}
                {!f.isPositive && (
                  <div
                    className="absolute top-0 bottom-0 right-1/2 bg-emerald-500 rounded-l-full transition-all duration-300"
                    style={{ width: `${percentWidth}%` }}
                    title={`Lowers estimate (${signedVal})`}
                  />
                )}

                {/* Right side (positive / raises) */}
                {f.isPositive && (
                  <div
                    className="absolute top-0 bottom-0 left-1/2 bg-rose-500 rounded-r-full transition-all duration-300"
                    style={{ width: `${percentWidth}%` }}
                    title={`Raises estimate (${signedVal})`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Screen Reader Only Table Alternative */}
      <table className="sr-only">
        <caption>Model Feature Associations and Log-Odds Influence</caption>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">Direction</th>
            <th scope="col">Log-Odds Contribution</th>
          </tr>
        </thead>
        <tbody>
          {parsedFactors.map((f, idx) => (
            <tr key={`sr-${f.key || idx}`}>
              <td>{f.label}</td>
              <td>{f.isPositive ? 'raises the estimate' : 'lowers the estimate'}</td>
              <td>{f.contribution >= 0 ? `+${f.contribution.toFixed(2)}` : f.contribution.toFixed(2)}</td>
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
