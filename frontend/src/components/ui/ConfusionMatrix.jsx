import PropTypes from 'prop-types';
import { formatNumber, formatFractionAsPercent } from '../../utils/format';

/**
 * ConfusionMatrix — Accessible 2x2 contingency table displaying classification counts and rates.
 * Plain-English categories:
 * - True Positive: Delays correctly identified
 * - False Positive: False delay alerts
 * - True Negative: On-time correctly identified
 * - False Negative: Missed delays
 */
export function ConfusionMatrix({ matrix, className = '' }) {
  if (!matrix) return null;

  const { tn = 0, fp = 0, fn = 0, tp = 0 } = matrix;
  const total = tn + fp + fn + tp;

  const tnPct = total > 0 ? tn / total : 0;
  const fpPct = total > 0 ? fp / total : 0;
  const fnPct = total > 0 ? fn / total : 0;
  const tpPct = total > 0 ? tp / total : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-medium text-left">
                Predicted \ Actual
              </th>
              <th className="p-2.5 border border-slate-200 bg-slate-100 font-bold text-slate-800 text-center w-1/3">
                Actual On-Time (≤15m)
              </th>
              <th className="p-2.5 border border-slate-200 bg-slate-100 font-bold text-slate-800 text-center w-1/3">
                Actual Delayed (&gt;15m)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="p-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-left">
                Predicted On-Time
              </th>
              {/* True Negative */}
              <td className="p-3 border border-slate-200 bg-emerald-50/60 text-center">
                <div className="font-mono text-base font-bold text-emerald-900">
                  {formatNumber(tn)}
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                  On-time correctly identified
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatFractionAsPercent(tnPct, 1)}
                </div>
              </td>
              {/* False Negative */}
              <td className="p-3 border border-slate-200 bg-rose-50/60 text-center">
                <div className="font-mono text-base font-bold text-rose-900">
                  {formatNumber(fn)}
                </div>
                <div className="text-xs font-semibold text-rose-700 mt-0.5">
                  Missed delays
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatFractionAsPercent(fnPct, 1)}
                </div>
              </td>
            </tr>
            <tr>
              <th className="p-2.5 border border-slate-200 bg-slate-50 font-bold text-slate-800 text-left">
                Predicted Delayed
              </th>
              {/* False Positive */}
              <td className="p-3 border border-slate-200 bg-amber-50/60 text-center">
                <div className="font-mono text-base font-bold text-amber-900">
                  {formatNumber(fp)}
                </div>
                <div className="text-xs font-semibold text-amber-700 mt-0.5">
                  False delay alerts
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatFractionAsPercent(fpPct, 1)}
                </div>
              </td>
              {/* True Positive */}
              <td className="p-3 border border-slate-200 bg-emerald-50/60 text-center">
                <div className="font-mono text-base font-bold text-emerald-900">
                  {formatNumber(tp)}
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                  Delays correctly identified
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatFractionAsPercent(tpPct, 1)}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
        <span>
          <strong className="text-slate-700">Total test evaluations:</strong>{' '}
          <span className="font-mono">{formatNumber(total)}</span> stops
        </span>
        <span className="text-slate-500">
          Held-out test split
        </span>
      </div>
    </div>
  );
}

ConfusionMatrix.propTypes = {
  matrix: PropTypes.shape({
    tn: PropTypes.number,
    fp: PropTypes.number,
    fn: PropTypes.number,
    tp: PropTypes.number,
  }),
  className: PropTypes.string,
};
