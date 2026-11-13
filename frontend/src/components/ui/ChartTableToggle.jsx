import PropTypes from 'prop-types';
import { BarChart2, Table } from 'lucide-react';

/**
 * ChartTableToggle — Accessible view switcher for charts and data tables.
 */
export function ChartTableToggle({ view, onViewChange, chartLabel = 'Chart', tableLabel = 'Table' }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200" role="group" aria-label="Display mode">
      <button
        type="button"
        role="radio"
        aria-checked={view === 'chart'}
        onClick={() => onViewChange('chart')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'chart'
            ? 'bg-white text-primary-700 shadow-sm font-semibold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <BarChart2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{chartLabel}</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={view === 'table'}
        onClick={() => onViewChange('table')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'table'
            ? 'bg-white text-primary-700 shadow-sm font-semibold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Table className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{tableLabel}</span>
      </button>
    </div>
  );
}

ChartTableToggle.propTypes = {
  view: PropTypes.oneOf(['chart', 'table']).isRequired,
  onViewChange: PropTypes.func.isRequired,
  chartLabel: PropTypes.string,
  tableLabel: PropTypes.string,
};
