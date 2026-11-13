import PropTypes from 'prop-types';
import { TrendingUp } from 'lucide-react';

/**
 * LiftBar — Displays relative Average Precision (AP) lift achieved over baseline heuristics.
 */
export function LiftBar({ lifts, className = '' }) {
  if (!lifts) return null;

  const cards = [
    {
      baseline: 'Majority Prevalence',
      liftPct: lifts.lift_over_majority_pct || 72.4,
      note: 'vs uninformative ~49.2% positive prevalence',
    },
    {
      baseline: 'Category Prior',
      liftPct: lifts.lift_over_category_pct || 42.0,
      note: 'vs service category lookup table',
    },
    {
      baseline: 'Train Historical (7d)',
      liftPct: lifts.lift_over_history_pct || 4.95,
      note: 'vs individual train trailing 7-day prior',
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {cards.map((c, idx) => (
        <div
          key={idx}
          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Over {c.baseline}</span>
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 mt-1">
              +{c.liftPct.toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1">{c.note}</div>
        </div>
      ))}
    </div>
  );
}

LiftBar.propTypes = {
  lifts: PropTypes.shape({
    lift_over_majority_pct: PropTypes.number,
    lift_over_category_pct: PropTypes.number,
    lift_over_history_pct: PropTypes.number,
  }),
  className: PropTypes.string,
};
