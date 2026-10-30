import PropTypes from 'prop-types';
import { HelpCircle } from 'lucide-react';
import { getMetricGlossary } from '../../config/metricGlossary';

/**
 * MetricTooltip — Accessible contextual information for model evaluation metrics.
 */
export function MetricTooltip({ metricKey, label = null, showIcon = true, className = '' }) {
  const meta = getMetricGlossary(metricKey);
  const displayText = label || meta.short || meta.name;

  return (
    <span className={`inline-flex items-center gap-1 group relative cursor-help ${className}`}>
      <span className="font-medium text-slate-800 border-b border-dotted border-slate-400">
        {displayText}
      </span>
      {showIcon && (
        <HelpCircle
          size={14}
          className="text-slate-400 group-hover:text-primary-600 transition-colors flex-shrink-0"
          aria-hidden="true"
        />
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 text-left leading-relaxed hidden sm:block"
      >
        <span className="block font-bold text-white mb-1">{meta.name}</span>
        {meta.formula && (
          <span className="block font-mono text-xs text-primary-200 mb-1 bg-slate-800/80 p-1 rounded">
            {meta.formula}
          </span>
        )}
        <span className="block text-slate-300 font-normal">{meta.description}</span>
      </span>
    </span>
  );
}

MetricTooltip.propTypes = {
  metricKey: PropTypes.string.isRequired,
  label: PropTypes.string,
  showIcon: PropTypes.bool,
  className: PropTypes.string,
};
