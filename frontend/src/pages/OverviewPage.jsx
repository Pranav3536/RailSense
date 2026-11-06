
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
  LabelList,
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
  ChartCard,
  SupportBadge,
  DatasetCaveatBanner,
  CategoryLabel,
  ChartTableToggle,
} from '../components/ui';
import { useApi } from '../hooks/useApi';
import { getOverview } from '../api/endpoints';
import { adaptOverview } from '../api/adapters';
import {
  formatNumber,
  formatPercent,
  formatMinutes,
  formatDate,
} from '../utils/format';
import { CHART_THEME } from '../components/charts/chartTheme';
import { LOW_SUPPORT_THRESHOLD } from '../config/constants';

const DOCUMENTED_CATEGORIES = new Set([
  'MEX',
  'SUB',
  'MEMU',
  'PAS',
  'SUF',
  'TOD',
  'VNDB',
]);

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
          <span>Delayed Arrival Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {formatPercent(data.delayedRate, false, 2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span>Average Arrival Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {formatMinutes(data.meanDelayMin)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800 text-xs">
          <span>Recorded Stops:</span>
          <span className="tabular-nums font-mono">
            {formatNumber(data.eligibleStops)}
          </span>
        </div>
      </div>
    </div>
  );
}

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
          <span>Share of Stops:</span>
          <span className="font-bold text-blue-400 tabular-nums">
            {formatPercent(item.percentage, false, 2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span>Number of Stops:</span>
          <span className="font-semibold text-slate-100 tabular-nums font-mono">
            {formatNumber(item.stopsCount)}
          </span>
        </div>
      </div>
    </div>
  );
}

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
          <span>Delayed Arrival Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {formatPercent(cat.delayedRate, false, 2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span>Average Arrival Delay:</span>
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
          <span>Recorded Stops:</span>
          <span className="tabular-nums font-mono">
            {formatNumber(cat.eligibleStops)}
            {cat.isLowSupport && ' (Limited Data)'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { data: rawData, loading, error, refetch } = useApi(getOverview);
  const data = rawData ? adaptOverview(rawData) : null;

  const [trendView, setTrendView] = useState('chart');
  const [distView, setDistView] = useState('chart');
  const [catView, setCatView] = useState('chart');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Railway at a Glance"
          subtitle="Explore railway network coverage, arrival delays and historical operating patterns."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
          title="Railway Network Overview"
          subtitle="Explore railway network coverage, arrival delays and historical operating patterns."
        />

        <ErrorState
          code={error?.status}
          requestId={error?.requestId}
          title="Unable to Load Network Overview"
          message={error?.message || 'Unable to retrieve railway network data. Please try again.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const {
    fleetKpis,
    delaySummary,
    delayDistribution,
    categoryBreakdown,
    perDateTrend,
    provenance,
  } = data;

  const withinTolerancePct = delayDistribution
    .filter((b) => ['early', 'ontime', 'minor'].includes(b.classification))
    .reduce((sum, b) => sum + b.percentage, 0);

  const validCats = categoryBreakdown.filter(
    (c) => c.eligibleStops >= LOW_SUPPORT_THRESHOLD
  );

  const lowestCat = validCats.length > 0
    ? validCats.reduce(
        (min, c) => c.delayedRate < min.delayedRate ? c : min,
        validCats[0]
      )
    : null;

  const formattedCategories = categoryBreakdown.slice(0, 15).map((cat) => {
    const isDoc = DOCUMENTED_CATEGORIES.has(cat.category);

    return {
      ...cat,
      axisLabel: isDoc
        ? `${cat.category} (${cat.categoryName})`
        : cat.category,
    };
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Railway at a Glance"
        subtitle="An overview of railway network coverage, arrival delays, service categories and daily travel patterns."
        action={
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors min-h-[44px] min-w-[44px]"
            title="Refresh network data"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Data Period */}
      <DatasetCaveatBanner
        startDate={fleetKpis.dateRange.start}
        endDate={fleetKpis.dateRange.end}
        totalDays={fleetKpis.dateRange.days}
      />

      {/* 1. Network Coverage */}
      <div>
        <SectionHeader
          title="Network Coverage"
          subtitle={`Overview of recorded train journeys and stations across ${fleetKpis.dateRange.days} days of data.`}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Recorded Stops"
            value={formatNumber(fleetKpis.totalStopsObserved)}
            icon={<Layers className="w-5 h-5" />}
            subtext="Total observed stop records"
            definition="Total number of recorded train stops in the dataset."
          />

          <StatCard
            label="Train Journeys"
            value={formatNumber(fleetKpis.totalTrainRuns)}
            icon={<Train className="w-5 h-5" />}
            subtext="Distinct train journeys"
            definition="Distinct train journeys identified by train number and journey date."
          />

          <StatCard
            label="Train Services"
            value={formatNumber(fleetKpis.distinctTrainNumbers)}
            icon={<Train className="w-5 h-5" />}
            subtext="Unique train numbers"
            definition="Number of unique train service numbers in the dataset."
          />

          <StatCard
            label="Stations"
            value={formatNumber(fleetKpis.distinctStations)}
            icon={<MapPin className="w-5 h-5" />}
            subtext="Stations with recorded stops"
            definition="Distinct station codes found in the recorded train journeys."
          />

          <StatCard
            label="Data Period"
            value={`${fleetKpis.dateRange.days} Days`}
            icon={<Calendar className="w-5 h-5" />}
            subtext={`${fleetKpis.dateRange.start} to ${fleetKpis.dateRange.end}`}
            definition="Time period covered by the available railway dataset."
          />
        </div>
      </div>

      {/* 2. Network Delay Performance */}
      <div>
        <SectionHeader
          title="Delay Performance"
          subtitle="Arrival delay statistics calculated from valid reported station arrivals."
          info={delaySummary.definition}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Delay Rate"
            value={formatPercent(delaySummary.fleetDelayedRate, false, 1)}
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
            trend="negative"
            subtext="Arrivals delayed by over 15 min"
            definition="Percentage of valid recorded arrivals that were more than 15 minutes late."
          />

          <StatCard
            label="Median Delay"
            value={formatMinutes(delaySummary.fleetMedianDelayMin)}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            subtext="Middle value of arrival delays"
            definition="The middle arrival delay value when all valid arrival delays are arranged in order."
          />

          <StatCard
            label="Average Delay"
            value={formatMinutes(delaySummary.fleetMeanDelayMin)}
            icon={<Clock className="w-5 h-5 text-slate-600" />}
            subtext="Average across recorded arrivals"
            definition="Average arrival delay across valid recorded station arrivals."
          />

          <StatCard
            label="Early Arrivals"
            value={formatPercent(delaySummary.fleetEarlyArrivalPct, false, 1)}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            trend="positive"
            subtext="Arrived before scheduled time"
            definition="Percentage of valid arrivals that reached the station before their scheduled arrival time."
          />

          <StatCard
            label="Data Coverage"
            value={formatPercent(delaySummary.labelCoveragePct, false, 1)}
            icon={<Layers className="w-5 h-5 text-primary-600" />}
            subtext={`${formatNumber(delaySummary.eligibleStopsCount)} valid arrivals`}
            definition="Share of recorded stops that have usable arrival delay information for analysis."
          />
        </div>
      </div>

      {/* 3. Daily Delay Trend and Delay Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* Daily Delay Trend */}
        <ChartCard
          title="Daily Arrival Delay Trend"
          subtitle="Daily percentage of recorded arrivals delayed by more than 15 minutes."
          badge={
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Network Average: {formatPercent(delaySummary.fleetDelayedRate, false, 1)}
            </span>
          }
          action={
            <ChartTableToggle
              view={trendView}
              onViewChange={setTrendView}
              chartLabel="Chart"
              tableLabel="Table"
            />
          }
        >
          {trendView === 'chart' ? (
            <div className="space-y-3">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={perDateTrend}
                    margin={{ ...CHART_THEME.margin, left: 8, right: 16 }}
                  >
                    <CartesianGrid {...CHART_THEME.gridProps} />

                    <XAxis
                      dataKey="date"
                      {...CHART_THEME.axisProps}
                      tickFormatter={(d) => d.slice(5)}
                    />

                    <YAxis
                      {...CHART_THEME.axisProps}
                      domain={[30, 65]}
                      tickFormatter={(v) => `${v}%`}
                    />

                    <Tooltip content={<DailyTrendTooltip />} />

                    <Legend
                      wrapperStyle={{
                        fontSize: `${CHART_THEME.fontSize.legend}px`,
                        paddingTop: '8px',
                      }}
                    />

                    <ReferenceLine
                      y={delaySummary.fleetDelayedRate}
                      stroke={CHART_THEME.colors.delayed}
                      strokeDasharray="4 4"
                      label={{
                        value: `Network Average (${delaySummary.fleetDelayedRate}%)`,
                        fill: CHART_THEME.colors.delayed,
                        fontSize: 12,
                        position: 'top',
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="delayedRate"
                      name="Delayed Arrival Rate (%)"
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

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 text-slate-500">
                <div
                  className="flex items-center gap-1.5 cursor-help"
                  title="Partial days have fewer recorded observations than a complete day. Interpret their values with this limitation in mind."
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600 inline-block" />
                  <span className="font-medium text-slate-700">
                    Partial day
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0 border-t-2 border-dashed border-rose-500 inline-block" />
                  <span>
                    Network Average ({delaySummary.fleetDelayedRate}%)
                  </span>
                </div>
              </div>

              <p className="sr-only">
                This chart compares the daily delayed arrival rate with the overall network average. Partial collection days are highlighted separately.
              </p>
            </div>
          ) : (
            <div
              className="overflow-x-auto max-h-[380px] overflow-y-auto"
              tabIndex={0}
              role="region"
              aria-label="Daily Arrival Delay Trend Table"
            >
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Train Journeys</th>
                    <th className="py-2.5 px-3">Recorded Stops</th>
                    <th className="py-2.5 px-3">Delayed Rate</th>
                    <th className="py-2.5 px-3">Average Delay</th>
                    <th className="py-2.5 px-3">Day Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {perDateTrend.map((d) => (
                    <tr
                      key={d.date}
                      className={`hover:bg-slate-50 transition-colors ${d.isPartial ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-medium text-slate-900">
                        {d.date}
                      </td>

                      <td className="py-2 px-3 font-mono">
                        {formatNumber(d.runsCount)}
                      </td>

                      <td className="py-2 px-3 font-mono">
                        {formatNumber(d.eligibleStops)}
                      </td>

                      <td className="py-2 px-3 font-semibold text-rose-600">
                        {formatPercent(d.delayedRate, false, 2)}
                      </td>

                      <td className="py-2 px-3 font-mono">
                        {formatMinutes(d.meanDelayMin)}
                      </td>

                      <td className="py-2 px-3">
                        {d.isPartial ? (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {d.partialNote || 'Partial Day'}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            Complete Day
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

        {/* Arrival Delay Distribution */}
        <ChartCard
          title="Arrival Delay Distribution"
          subtitle="Breakdown of recorded arrivals by delay duration, from early arrivals to longer delays."
          badge={
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Within 15 min: {formatPercent(withinTolerancePct, false, 1)}
            </span>
          }
          action={
            <ChartTableToggle
              view={distView}
              onViewChange={setDistView}
              chartLabel="Chart"
              tableLabel="Table"
            />
          }
        >
          {distView === 'chart' ? (
            <div className="space-y-3">
              <div className="h-[340px] w-full">
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
                        let fill = CHART_THEME.colors.delayed;

                        if (
                          entry.classification === 'early' ||
                          entry.classification === 'ontime'
                        ) {
                          fill = CHART_THEME.colors.onTime;
                        } else if (entry.classification === 'minor') {
                          fill = CHART_THEME.colors.warning;
                        } else if (entry.classification === 'moderate') {
                          fill = '#F97316';
                        }

                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={fill}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-slate-600">
                    Early / On-Time (≤ 5 min)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  <span className="text-slate-600">
                    Minor Delay (5–15 min)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                  <span className="text-slate-600">
                    Moderate Delay (15–30 min)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  <span className="text-slate-600">
                    Significant / Severe (&gt; 30 min)
                  </span>
                </div>
              </div>

              <p className="sr-only">
                This chart shows how recorded station arrivals are distributed across different delay duration ranges.
              </p>
            </div>
          ) : (
            <div
              className="overflow-x-auto max-h-[380px] overflow-y-auto"
              tabIndex={0}
              role="region"
              aria-label="Arrival Delay Distribution Table"
            >
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Delay Range</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Recorded Stops</th>
                    <th className="py-2.5 px-3">Share (%)</th>
                    <th className="py-2.5 px-3">Delay Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {delayDistribution.map((b) => (
                    <tr
                      key={b.bucket}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {b.bucket}
                      </td>

                      <td className="py-2 px-3 text-slate-700">
                        {b.label}
                      </td>

                      <td className="py-2 px-3 font-mono">
                        {formatNumber(b.stopsCount)}
                      </td>

                      <td className="py-2 px-3 font-semibold text-primary-700">
                        {formatPercent(b.percentage, false, 2)}
                      </td>

                      <td className="py-2 px-3">
                        {[
                          'moderate',
                          'significant',
                          'severe',
                          'extreme',
                        ].includes(b.classification) ? (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Delayed (&gt;15 min)
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Within 15 min
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

      {/* 4. Train Category Comparison */}
      <ChartCard
        title="Delay by Train Category"
        subtitle="Compare arrival delay rates and average delays across different train service categories."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Lowest: {lowestCat
              ? `${lowestCat.category} ${formatPercent(lowestCat.delayedRate, false, 1)}`
              : 'N/A'}
          </span>
        }
        action={
          <ChartTableToggle
            view={catView}
            onViewChange={setCatView}
            chartLabel="Chart"
            tableLabel="Table"
          />
        }
      >
        {catView === 'chart' ? (
          <div className="space-y-3">
            <div style={{ height: `${CHART_THEME.heights.large}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formattedCategories}
                  layout="vertical"
                  margin={{ ...CHART_THEME.margin, left: 140, right: 54 }}
                >
                  <CartesianGrid
                    {...CHART_THEME.gridProps}
                    horizontal={false}
                    vertical
                  />

                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    {...CHART_THEME.axisProps}
                    tickFormatter={(v) => `${v}%`}
                  />

                  <YAxis
                    type="category"
                    dataKey="axisLabel"
                    width={130}
                    {...CHART_THEME.axisProps}
                    tick={{
                      fill: '#1E293B',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <Tooltip content={<CategoryTooltip />} />

                  <ReferenceLine
                    x={delaySummary.fleetDelayedRate}
                    stroke={CHART_THEME.colors.delayed}
                    strokeDasharray="4 4"
                    label={{
                      value: `Network Average (${delaySummary.fleetDelayedRate}%)`,
                      fill: CHART_THEME.colors.delayed,
                      fontSize: 12,
                      position: 'top',
                    }}
                  />

                  <Bar
                    dataKey="delayedRate"
                    name="Delayed Arrival Rate (%)"
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="delayedRate"
                      position="right"
                      formatter={(v) => `${Number(v).toFixed(1)}%`}
                      style={{
                        fill: '#334155',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />

                    {formattedCategories.map((entry, index) => {
                      let fill = CHART_THEME.colors.primary;

                      if (entry.delayedRate < 25) {
                        fill = CHART_THEME.colors.onTime;
                      } else if (entry.delayedRate > 60) {
                        fill = CHART_THEME.colors.delayed;
                      }

                      if (entry.isLowSupport) {
                        fill = '#94A3B8';
                      }

                      return (
                        <Cell
                          key={`cell-cat-${index}`}
                          fill={fill}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="sr-only">
              This chart compares observed arrival delay rates across train categories. Categories with fewer recorded stops should be interpreted with caution.
            </p>
          </div>
        ) : (
          <div
            className="overflow-x-auto max-h-[460px] overflow-y-auto"
            tabIndex={0}
            role="region"
            aria-label="Train Category Delay Table"
          >
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Service Name</th>
                  <th className="py-2.5 px-3">Recorded Stops</th>
                  <th className="py-2.5 px-3">Delayed Rate</th>
                  <th className="py-2.5 px-3">Average Delay</th>
                  <th className="py-2.5 px-3">Median Delay</th>
                  <th className="py-2.5 px-3">Data Support</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {categoryBreakdown.map((c) => (
                  <tr
                    key={c.category}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 px-3">
                      <CategoryLabel
                        category={c.category}
                        showName={false}
                      />
                    </td>

                    <td className="py-2 px-3 font-medium text-slate-900">
                      {c.categoryName}
                    </td>

                    <td className="py-2 px-3 font-mono">
                      {formatNumber(c.eligibleStops)}
                    </td>

                    <td className="py-2 px-3 font-semibold text-rose-600">
                      {formatPercent(c.delayedRate, false, 2)}
                    </td>

                    <td className="py-2 px-3 font-mono">
                      {formatMinutes(c.meanDelayMin)}
                    </td>

                    <td className="py-2 px-3 font-mono">
                      {formatMinutes(c.medianDelayMin)}
                    </td>

                    <td className="py-2 px-3">
                      <SupportBadge
                        count={c.eligibleStops}
                        threshold={LOW_SUPPORT_THRESHOLD}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {/* 5. Understanding the Data */}
      <Card className="border-slate-200 bg-white">
        <CardHeader
          className="cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HelpCircle
                className="w-5 h-5 text-primary-600 flex-shrink-0"
                aria-hidden="true"
              />

              <CardTitle className="text-base font-semibold text-slate-900">
                Understanding the Data
              </CardTitle>
            </div>

            <button
              type="button"
              className="p-1 rounded text-slate-400 hover:text-slate-600"
              aria-label={isGuideOpen ? 'Collapse guide' : 'Expand guide'}
            >
              {isGuideOpen
                ? <ChevronUp className="w-5 h-5" />
                : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          <CardDescription>
            A quick guide to how arrival delays are measured and how to interpret the results.
          </CardDescription>
        </CardHeader>

        {isGuideOpen && (
          <CardContent className="pt-2 pb-6 border-t border-slate-100 text-xs text-slate-600 space-y-4 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
                  How Delays Are Measured
                </h5>

                <p>
                  Arrival delay is calculated by comparing the actual arrival
                  time with the scheduled arrival time. The delay rate represents
                  the percentage of valid recorded arrivals that were more than
                  15 minutes late.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                  Early and On-Time Arrivals
                </h5>

                <p>
                  Negative delay values indicate that a train arrived before
                  its scheduled time. These records are retained in the analysis
                  instead of being changed to zero.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  Data Period and Coverage
                </h5>

                <p>
                  The analysis covers the period from {fleetKpis.dateRange.start}
                  {' '}to {fleetKpis.dateRange.end}. The first and last collection
                  dates may contain partial observations, so their results
                  should be interpreted carefully.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h5 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                  Understanding Historical Patterns
                </h5>

                <p>
                  These results describe patterns found in the available
                  historical records. They show associations in the data and
                  do not establish the actual causes of train delays.
                </p>
              </div>

            </div>
          </CardContent>
        )}
      </Card>

      {/* 6. Data Source */}
      {provenance && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-100 text-slate-600 text-xs border border-slate-200">
          <div className="flex items-center gap-2">
            <Database
              className="w-4 h-4 text-slate-400"
              aria-hidden="true"
            />

            <span>
              <strong className="text-slate-700">Data Source:</strong>{' '}
              {provenance.source}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span>Version: {provenance.build_script_version}</span>
            <span>Last Updated: {provenance.built_at}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewPage;
