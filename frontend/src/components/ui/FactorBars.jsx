import { useState } from 'react';
import PropTypes from 'prop-types';
import { Layers, List, Table as TableIcon } from 'lucide-react';

/**
 * FactorBars — Displays contributing factors and feature attributions for a single prediction.
 * Strictly non-causal language: displays characteristics associated with the model's estimate.
 */
export function FactorBars({ factors = [], className = '' }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'table'

  if (!factors || factors.length === 0) {
    return (
      <div className={`p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 ${className}`}>
        No significant individual skew factors detected; prediction follows baseline schedule priors.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-primary-600" aria-hidden="true" />
          <h4 className="text-sm font-bold text-slate-800">
            Model Feature Associations
          </h4>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List size={12} />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
              viewMode === 'table' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={12} />
            Table
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Factors associated with the model&apos;s output for this scheduled stop (correlational signals used during inference).
      </p>

      {viewMode === 'list' ? (
        <div className="space-y-2">
          {factors.map((factor, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
            >
              <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary-100 text-primary-800 text-xs font-mono font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                {factor}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2 px-3 w-12 text-center">#</th>
                <th className="py-2 px-3">Associated Factor Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {factors.map((factor, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-2 px-3 text-slate-700 font-medium">{factor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

FactorBars.propTypes = {
  factors: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
};
