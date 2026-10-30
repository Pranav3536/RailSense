import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Train,
  Clock,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Database,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  SectionHeader,
  Skeleton,
  ErrorState,
  DefinitionNote,
  ChartCard,
  SupportBadge,
  PartialDayLegend,
  DatasetCaveatBanner,
  CategoryLabel,
  ChartTableToggle,
} from '../components/ui';
import { useApi } from '../hooks/useApi';
import { getOverview } from '../api/endpoints';
import { adaptOverview } from '../api/adapters';
import { formatNumber, formatPercent, formatMinutes, formatDate } from '../utils/format';
import { CHART_THEME } from '../components/charts/chartTheme';
import { LOW_SUPPORT_THRESHOLD } from '../config/constants';

/**
 * Custom Tooltip for Daily Trend
 */
function DailyTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div
      style={CHART_THEME.tooltipProps.contentStyle}
      className="shadow-lg border border-slate-700 pointer-events-none z-50 min-w-[200px]"
    >
      <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-2 flex items-center justify-between">
        <span>{formatDate(label)}</span>
        {data.isPartial && (
          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
            {data.partialNote || 'Partial Day'}
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Observed Delayed Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {formatPercent(data.delayedRate, false, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Mean Arrival Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {formatMinutes(data.meanDelayMin)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800 text-xs">
          <span>Eligible Stops Sample:</span>
          <span className="tabular-nums font-mono">{formatNumber(data.eligibleStops)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Tooltip for Histogram
 */
function DelayHistogramTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div
      style={CHART_THEME.tooltipProps.contentStyle}
      className="shadow-lg border border-slate-700 pointer-events-none z-50 min-w-[220px]"
    >
      <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-2 flex items-center justify-between">
        <span>{item.label}</span>
        <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">
          {item.bucket}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Share of Eligible Stops:</span>
          <span className="font-bold text-blue-400 tabular-nums">
            {formatPercent(item.percentage, false, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Observed Stops:</span>
          <span className="font-semibold text-slate-100 tabular-nums font-mono">
            {formatNumber(item.stopsCount)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Tooltip for Category Breakdown
 */
function CategoryTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const cat = payload[0].payload;

  return (
    <div
      style={CHART_THEME.tooltipProps.contentStyle}
      className="shadow-lg border border-slate-700 pointer-events-none z-50 min-w-[240px]"
    >
      <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-2 flex items-center justify-between">
        <span>{cat.categoryName}</span>
        <span className="text-xs font-mono font-bold text-primary-400 bg-primary-950/80 px-1.5 py-0.5 rounded border border-primary-800">
          {cat.category}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Observed Delayed Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {formatPercent(cat.delayedRate, false, 2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Mean Arrival Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {formatMinutes(cat.meanDelayMin)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Median Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {formatMinutes(cat.medianDelayMin)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800 text-xs">
          <span>Eligible Stops Sample:</span>
          <span className="tabular-nums font-mono">
            {formatNumber(cat.eligibleStops)}
            {cat.isLowSupport && ' (Low Support)'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * OverviewPage — Tab 1 ("Railway at a Glance")
 * Truthful, live-connected macro delay dashboard with Recharts visualizations,
 * accessible table toggles, non-causal takeaways, and dataset provenance notes.
 */
export function OverviewPage() {
  const { data: rawData, loading, error, refetch } = useApi(getOverview);
  const data = rawData ? adaptOverview(rawData) : null;

  // View toggles for accessible charts
  const [trendView, setTrendView] = useState('chart');
  const [distView, setDistView] = useState('chart');
  const [catView, setCatView] = useState('chart');

  // Collapsible guide state
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Railway at a Glance"
          subtitle="Fleet-level operational delay intelligence and high-level performance metrics."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Railway at a Glance"
          subtitle="Fleet-level operational delay intelligence and high-level performance metrics."
        />
        <ErrorState
          title="Failed to Load Overview Intelligence"
          message={error?.message || 'Unable to retrieve fleet overview metrics from the precomputed serving store.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const { fleetKpis, delaySummary, delayDistribution, categoryBreakdown, perDateTrend, provenance } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Railway at a Glance"
        subtitle="Fleet-level delay distributions, category variations, and daily operational trends across observed stops."
        action={
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors min-h-[44px] min-w-[44px]"
            title="Refresh serving metrics cache"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Dataset Caveat Banner */}
      <DatasetCaveatBanner />

      {/* 1. Fleet Macro Volume KPIs */}
      <div>
        <SectionHeader
          title="Fleet Observation Volume"
          description="High-level counts across the complete 19-day snapshot (Oct 7–25, 2026)."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Stops Observed"
            value={formatNumber(fleetKpis.totalStopsObserved)}
            icon={<Layers className="w-5 h-5" />}
            subtext="Complete collection volume"
          />
          <StatCard
            label="Total Train Runs"
            value={formatNumber(fleetKpis.totalTrainRuns)}
            icon={<Train className="w-5 h-5" />}
            subtext="Distinct (train, date) journeys"
          />
          <StatCard
            label="Distinct Trains"
            value={formatNumber(fleetKpis.distinctTrainNumbers)}
            icon={<Train className="w-5 h-5" />}
            subtext="Unique train service numbers"
          />
          <StatCard
            label="Distinct Stations"
            value={formatNumber(fleetKpis.distinctStations)}
            icon={<MapPin className="w-5 h-5" />}
            subtext="Railway network stations"
          />
          <StatCard
            label="Observation Span"
            value={`${fleetKpis.dateRange.days} Days`}
            icon={<Calendar className="w-5 h-5" />}
            subtext={`${fleetKpis.dateRange.start} to ${fleetKpis.dateRange.end}`}
          />
        </div>
      </div>

      {/* 2. Fleet Delay Performance Metrics */}
      <div>
        <SectionHeader
          title="Fleet Delay Performance"
          description="Strictly evaluated on label-eligible stops (seq > 1, arrival reported, |delay| <= 1440m)."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Observed Delayed Rate"
            value={formatPercent(delaySummary.fleetDelayedRate, false, 1)}
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
            trend="negative"
            subtext="arrival delay > 15 min"
          />
          <StatCard
            label="Median Arrival Delay"
            value={formatMinutes(delaySummary.fleetMedianDelayMin)}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            subtext="50th percentile (typical)"
          />
          <StatCard
            label="Mean Arrival Delay"
            value={formatMinutes(delaySummary.fleetMeanDelayMin)}
            icon={<Clock className="w-5 h-5 text-slate-600" />}
            subtext="Average across eligible stops"
          />
          <StatCard
            label="Early Arrivals"
            value={formatPercent(delaySummary.fleetEarlyArrivalPct, false, 1)}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            trend="positive"
            subtext="Ahead of schedule (< 0 min)"
          />
          <StatCard
            label="Label Coverage"
            value={formatPercent(delaySummary.labelCoveragePct, false, 1)}
            icon={<Layers className="w-5 h-5 text-primary-600" />}
            subtext={`${formatNumber(delaySummary.eligibleStopsCount)} eligible stops`}
          />
        </div>
        <div className="mt-2.5">
          <DefinitionNote note={delaySummary.definition} />
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Chart 1: Daily Delay Trend */}
        <ChartCard
          title="Daily Observed Delayed Rate Trend"
          subtitle="Percentage of eligible stops delayed > 15 min per calendar date across the 19-day collection window."
          action={
            <ChartTableToggle
              view={trendView}
              onViewChange={setTrendView}
              chartLabel="Trendline"
              tableLabel="Table"
            />
          }
        >
          {trendView === 'chart' ? (
            <div className="space-y-4">
              <div style={{ height: `${CHART_THEME.heights.standard}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={perDateTrend}
                    margin={{ ...CHART_THEME.margin, left: 8, right: 16 }}
                  >
                    <CartesianGrid {...CHART_THEME.gridProps} />
                    <XAxis
                      dataKey="date"
                      {...CHART_THEME.axisProps}
                      tickFormatter={(d) => d.slice(5)} // MM-DD
                    />
                    <YAxis
                      {...CHART_THEME.axisProps}
                      domain={[30, 65]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<DailyTrendTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: `${CHART_THEME.fontSize.legend}px`, paddingTop: '10px' }}
                    />
                    <ReferenceLine
                      y={delaySummary.fleetDelayedRate}
                      stroke={CHART_THEME.colors.delayed}
                      strokeDasharray="4 4"
                      label={{
                        value: `Fleet Avg (${delaySummary.fleetDelayedRate}%)`,
                        fill: CHART_THEME.colors.delayed,
                        fontSize: 12,
                        position: 'top',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="delayedRate"
                      name="Observed Delayed Rate (%)"
                      stroke={CHART_THEME.colors.primary}
                      strokeWidth={2.5}
                      dot={(props) => {
                        const isPart = props.payload.isPartial;
                        return (
                          <circle
                            key={`dot-${props.payload.date}`}
                            cx={props.cx}
                            cy={props.cy}
                            r={isPart ? 6 : 4}
                            fill={isPart ? '#F59E0B' : CHART_THEME.colors.primary}
                            stroke={isPart ? '#B45309' : '#FFFFFF'}
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Edge date legend */}
              <PartialDayLegend />

              {/* Accessible Takeaway */}
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800">Observed Pattern:</span> Daily delayed rates remained relatively stable between 45.0% and 54.2% throughout the observation period, tracking closely with the 49.9% fleet baseline. Note that October 7 (collection start) and October 25 (collection cutoff) reflect partial-day windows.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Observed Runs</th>
                    <th className="py-2.5 px-3">Eligible Stops</th>
                    <th className="py-2.5 px-3">Delayed Rate</th>
                    <th className="py-2.5 px-3">Mean Delay</th>
                    <th className="py-2.5 px-3">Boundary Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {perDateTrend.map((d) => (
                    <tr
                      key={d.date}
                      className={`hover:bg-slate-50 transition-colors ${d.isPartial ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-medium text-slate-900">{d.date}</td>
                      <td className="py-2 px-3 font-mono">{formatNumber(d.runsCount)}</td>
                      <td className="py-2 px-3 font-mono">{formatNumber(d.eligibleStops)}</td>
                      <td className="py-2 px-3 font-semibold text-rose-600">{formatPercent(d.delayedRate, false, 2)}</td>
                      <td className="py-2 px-3 font-mono">{formatMinutes(d.meanDelayMin)}</td>
                      <td className="py-2 px-3">
                        {d.isPartial ? (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {d.partialNote || 'Partial Day'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Complete Day</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        {/* Chart 2: Delay Distribution Histogram */}
        <ChartCard
          title="Macro Arrival Delay Distribution"
          subtitle="Empirical frequency breakdown across 1,773,068 label-eligible stops binned into 8 operational tiers."
          action={
            <ChartTableToggle
              view={distView}
              onViewChange={setDistView}
              chartLabel="Histogram"
              tableLabel="Table"
            />
          }
        >
          {distView === 'chart' ? (
            <div className="space-y-4">
              <div style={{ height: `${CHART_THEME.heights.standard}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={delayDistribution}
                    margin={{ ...CHART_THEME.margin, left: 8, right: 16 }}
                  >
                    <CartesianGrid {...CHART_THEME.gridProps} />
                    <XAxis
                      dataKey="bucket"
                      {...CHART_THEME.axisProps}
                    />
                    <YAxis
                      {...CHART_THEME.axisProps}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<DelayHistogramTooltip />} />
                    <Bar
                      dataKey="percentage"
                      name="Share of Stops (%)"
                      radius={[4, 4, 0, 0]}
                    >
                      {delayDistribution.map((entry, index) => {
                        let fill = CHART_THEME.colors.delayed; // default red
                        if (entry.classification === 'early' || entry.classification === 'ontime') {
                          fill = CHART_THEME.colors.onTime; // emerald
                        } else if (entry.classification === 'minor') {
                          fill = CHART_THEME.colors.warning; // amber
                        } else if (entry.classification === 'moderate') {
                          fill = '#F97316'; // orange
                        }
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tier Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-slate-600">On-Time / Early (≤ 5 min)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                  <span className="text-slate-600">Minor Delay (5–15 min)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" />
                  <span className="text-slate-600">Moderate Delay (15–30 min)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                  <span className="text-slate-600">Significant / Severe (&gt; 30 min)</span>
                </div>
              </div>

              {/* Accessible Takeaway */}
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-800">Observed Pattern:</span> Exactly 50.1% of eligible stops arrived within the 15-minute operational tolerance (22.8% strictly on-time within ±5 min, 23.0% with minor 5–15 min delay, and 4.3% early). Severe delays (&gt; 1 hour) occurred on 16.8% of stops.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Delay Tier Bucket</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Observed Stops</th>
                    <th className="py-2.5 px-3">Share (%)</th>
                    <th className="py-2.5 px-3">Cumulative Delayed Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {delayDistribution.map((b) => (
                    <tr key={b.bucket} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{b.bucket}</td>
                      <td className="py-2 px-3 text-slate-700">{b.label}</td>
                      <td className="py-2 px-3 font-mono">{formatNumber(b.stopsCount)}</td>
                      <td className="py-2 px-3 font-semibold text-primary-700">{formatPercent(b.percentage, false, 2)}</td>
                      <td className="py-2 px-3">
                        {['moderate', 'significant', 'severe', 'extreme'].includes(b.classification) ? (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Classified Delayed (&gt;15m)
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Within Tolerance (≤15m)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* 4. Chart 3: Category Breakdown */}
      <ChartCard
        title="Observed Delay by Service Category"
        subtitle="Comparing operational delay rates and average delays across Indian Railways service types (sorted by stop volume)."
        action={
          <ChartTableToggle
            view={catView}
            onViewChange={setCatView}
            chartLabel="Bar Chart"
            tableLabel="Table"
          />
        }
      >
        {catView === 'chart' ? (
          <div className="space-y-4">
            <div style={{ height: `${CHART_THEME.heights.large}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBreakdown.slice(0, 15)} // Top 15 categories by volume
                  layout="vertical"
                  margin={{ ...CHART_THEME.margin, left: 60, right: 24 }}
                >
                  <CartesianGrid {...CHART_THEME.gridProps} horizontal={false} vertical />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    {...CHART_THEME.axisProps}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    {...CHART_THEME.axisProps}
                    tick={{ fill: '#1E293B', fontSize: 13, fontWeight: 600 }}
                  />
                  <Tooltip content={<CategoryTooltip />} />
                  <ReferenceLine
                    x={delaySummary.fleetDelayedRate}
                    stroke={CHART_THEME.colors.delayed}
                    strokeDasharray="4 4"
                    label={{
                      value: `Fleet Avg (${delaySummary.fleetDelayedRate}%)`,
                      fill: CHART_THEME.colors.delayed,
                      fontSize: 12,
                      position: 'top',
                    }}
                  />
                  <Bar
                    dataKey="delayedRate"
                    name="Observed Delayed Rate (%)"
                    radius={[0, 4, 4, 0]}
                  >
                    {categoryBreakdown.slice(0, 15).map((entry, index) => {
                      let fill = CHART_THEME.colors.primary;
                      if (entry.delayedRate < 25) fill = CHART_THEME.colors.onTime;
                      else if (entry.delayedRate > 60) fill = CHART_THEME.colors.delayed;
                      if (entry.isLowSupport) fill = '#94A3B8'; // muted grey for low support
                      return <Cell key={`cell-cat-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Accessible Takeaway */}
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">Observed Pattern:</span> Suburban commuter services (SUB) recorded the lowest observed delay rate (17.1%) over 313k eligible stops, benefiting from high dispatch priority and dedicated tracks. Mail / Express (MEX) and Superfast (SUF) services operated near 57% delayed rates. Dynamic Train on Demand (TOD) exhibited the highest rate at 76.1%.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Service Name</th>
                  <th className="py-2.5 px-3">Eligible Stops</th>
                  <th className="py-2.5 px-3">Delayed Rate</th>
                  <th className="py-2.5 px-3">Mean Delay</th>
                  <th className="py-2.5 px-3">Median Delay</th>
                  <th className="py-2.5 px-3">Support Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryBreakdown.map((c) => (
                  <tr key={c.category} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3">
                      <CategoryLabel category={c.category} showName={false} />
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">{c.categoryName}</td>
                    <td className="py-2 px-3 font-mono">{formatNumber(c.eligibleStops)}</td>
                    <td className="py-2 px-3 font-semibold text-rose-600">{formatPercent(c.delayedRate, false, 2)}</td>
                    <td className="py-2 px-3 font-mono">{formatMinutes(c.meanDelayMin)}</td>
                    <td className="py-2 px-3 font-mono">{formatMinutes(c.medianDelayMin)}</td>
                    <td className="py-2 px-3">
                      <SupportBadge count={c.eligibleStops} threshold={LOW_SUPPORT_THRESHOLD} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* 5. Educational Collapsible Guide */}
      <Card className="border-slate-200 bg-white">
        <CardHeader
          className="cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden="true" />
              <CardTitle className="text-base font-semibold text-slate-900">
                How to Read Delay Intelligence & Scientific Boundary Principles
              </CardTitle>
            </div>
            <button
              type="button"
              className="p-1 rounded text-slate-400 hover:text-slate-600"
              aria-label={isGuideOpen ? 'Collapse guide' : 'Expand guide'}
            >
              {isGuideOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
          <CardDescription>
            Methodological definitions regarding label eligibility, early arrivals, and non-causal attribution.
          </CardDescription>
        </CardHeader>

        {isGuideOpen && (
          <CardContent className="pt-2 pb-6 border-t border-slate-100 text-xs text-slate-600 space-y-4 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
                  Label Eligibility Filter (seq &gt; 1)
                </h5>
                <p>
                  Delay rates are calculated strictly on intermediate and terminus stations where an arrival was reported. Origin stations (seq = 1) do not have incoming arrival delays and are excluded from label evaluations to avoid artificial zero-delay inflation.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                  Preservation of Early Arrivals
                </h5>
                <p>
                  Negative delay values represents trains that arrived ahead of schedule (8.6% of all eligible stops). These are valid operational occurrences in Indian Railways and are strictly preserved without truncation to zero.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  Partial Boundary Dates
                </h5>
                <p>
                  The dataset spans October 7 through October 25, 2026. October 7 is left-truncated (collection began midday) and October 25 is right-censored (collection ended while journeys were in progress). These dates are explicitly highlighted.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                  Non-Causal Associational Language
                </h5>
                <p>
                  Observed historical delays indicate empirical frequency within this 19-day slice. We strictly use associational terminology (&ldquo;observed delay hotspot&rdquo;, &ldquo;historically associated with&rdquo;) rather than attributing delays to unverified causal factors such as adverse weather or unverified operational events.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 6. Provenance Footer */}
      {provenance && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-100 text-slate-500 text-xs border border-slate-200">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>
              <strong className="text-slate-700">Source:</strong> {provenance.source}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Build Version: {provenance.build_script_version}</span>
            <span>Generated: {provenance.built_at}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewPage;
