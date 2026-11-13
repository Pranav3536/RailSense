import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Train, Clock, Layers, Calendar } from 'lucide-react';
import { Card, CardHeader, CardContent, StatCard, RateBar, CategoryLabel, SupportBadge } from '../ui';
import { formatNumber, formatMinutes, pluralize } from '../../utils/format';
import { LOW_SUPPORT_THRESHOLD } from '../../config/constants';

/**
 * TrainHubHeader Component
 * Selected train header card with service metadata, route bounds, and key operational stats.
 */
export function TrainHubHeader({ train, onBack, className = '' }) {
  if (!train) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Back button */}
      <div>
        <Link
          to="/trains"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors min-h-[44px]"
        >
          <ArrowLeft size={16} className="text-slate-500" aria-hidden="true" />
          <span>Back to Train Search</span>
        </Link>
      </div>

      {/* Train Summary Card */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xl font-bold text-slate-900">{train.trainNumber}</span>
                <CategoryLabel category={train.category} />
                {train.isLowSupport && (
                  <SupportBadge count={train.eligibleStopsCount} threshold={LOW_SUPPORT_THRESHOLD} />
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {train.trainName || 'Express Service'}
              </h2>
              {/* Origin -> Terminus: CODES ONLY, no station names invented */}
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="font-mono bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                  {train.originStationCode}
                </span>
                <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
                <span className="font-mono bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                  {train.terminusStationCode}
                </span>
                <span className="text-xs text-slate-500 font-normal ml-2">
                  ({pluralize(train.stopsCount, 'scheduled halt', 'scheduled halts')})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
              <div>
                <div className="text-xs text-slate-500 font-medium">Overall Delayed Rate</div>
                <div className="mt-1">
                  <RateBar rate={train.delayedRate} showLabel isMuted={train.isLowSupport} />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <StatCard
              label="Observed Runs"
              value={formatNumber(train.runsCount)}
              icon={Train}
              subtext={`Across ${pluralize(train.daysObserved, 'calendar day', 'calendar days')}`}
            />
            <StatCard
              label="Mean Arrival Delay"
              value={formatMinutes(train.meanDelay)}
              icon={Clock}
              subtext="Average across eligible stops"
            />
            <StatCard
              label="Eligible Halts"
              value={formatNumber(train.eligibleStopsCount)}
              icon={Layers}
              subtext="Stops with reported arrivals"
            />
            <StatCard
              label="Dataset Span"
              value="19 Days"
              icon={Calendar}
              subtext="Oct 7 – Oct 25, 2026"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TrainHubHeader;
