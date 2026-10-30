import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Train,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardContent,
  StatCard,
  SectionHeader,
  Skeleton,
  ErrorState,
  EmptyState,
  DefinitionNote,
  ChartCard,
  SupportBadge,
  PartialDayLegend,
  CategoryLabel,
  ChartTableToggle,
  RateBar,
} from '../components/ui';
import { usePagedSearch } from '../hooks/usePagedSearch';
import { useTrain } from '../hooks/useTrain';
import { formatNumber, formatPercent, formatMinutes, formatDate } from '../utils/format';
import { CHART_THEME } from '../components/charts/chartTheme';
import { CATEGORY_OPTIONS, LOW_SUPPORT_THRESHOLD } from '../config/constants';

/**
 * Custom Tooltip for Stop Progression Chart
 */
function StopProgressionTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const stop = payload[0].payload;

  return (
    <div
      style={CHART_THEME.tooltipProps.contentStyle}
      className="shadow-lg border border-slate-700 pointer-events-none z-50 min-w-[200px]"
    >
      <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-2 flex items-center justify-between">
        <span className="font-mono text-primary-400 font-bold">Stop #{stop.seq}: {stop.stationCode}</span>
        {stop.isOrigin && <span className="text-xs bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">Origin</span>}
        {stop.isTerminus && <span className="text-xs bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded">Terminus</span>}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Observed Delayed Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {stop.observedDelayedRate !== null ? formatPercent(stop.observedDelayedRate, false, 1) : 'Unobserved'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Mean Arrival Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {stop.observedMeanDelayMin !== null ? formatMinutes(stop.observedMeanDelayMin) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800 text-xs">
          <span>Observed Stops:</span>
          <span className="tabular-nums font-mono">{formatNumber(stop.observedStopsCount)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Tooltip for History by Date Chart
 */
function DateHistoryTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const hist = payload[0].payload;

  return (
    <div
      style={CHART_THEME.tooltipProps.contentStyle}
      className="shadow-lg border border-slate-700 pointer-events-none z-50 min-w-[200px]"
    >
      <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-2 flex items-center justify-between">
        <span>{formatDate(label)}</span>
        {hist.isPartial && (
          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
            {hist.partialNote || 'Partial'}
          </span>
        )}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Observed Delayed Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {formatPercent(hist.delayedRate, false, 1)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Mean Arrival Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {formatMinutes(hist.meanDelay)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800 text-xs">
          <span>Stops Observed:</span>
          <span className="tabular-nums font-mono">{formatNumber(hist.stopsCount)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * TrainExplorerPage — Tab 2 ("Single Train Deep Dive")
 */
export function TrainExplorerPage() {
  const { trainNumber: urlTrainNumber } = useParams();
  const navigate = useNavigate();

  // Search hook for catalog browsing
  const {
    query,
    setQuery,
    category,
    setCategory,
    page,
    setPage,
    items,
    pagination,
    loading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = usePagedSearch({ pageSize: 15 });

  // Single train detail hook when a train is selected
  const {
    train,
    loading: trainLoading,
    error: trainError,
  } = useTrain(urlTrainNumber);

  // View state toggles
  const [progressionView, setProgressionView] = useState('chart');
  const [historyView, setHistoryView] = useState('chart');
  const [showAllStops, setShowAllStops] = useState(false);

  // Select train handler
  const handleSelectTrain = (num) => {
    navigate(`/explorer/${encodeURIComponent(num)}`);
  };

  const handleBackToSearch = () => {
    navigate('/explorer');
  };

  // -------------------------------------------------------------
  // VIEW A: Single Train Deep Dive (when URL has :trainNumber)
  // -------------------------------------------------------------
  if (urlTrainNumber) {
    if (trainLoading) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Train Route Timetable & Delay Profile"
            subtitle={`Retrieving operational history for train #${urlTrainNumber}...`}
          />
          <Skeleton className="h-44 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      );
    }

    if (trainError || !train) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Train Deep Dive"
            subtitle={`Operational profile for train #${urlTrainNumber}`}
          />
          <ErrorState
            title="Train Not Found or Unreachable"
            message={trainError?.message || `Train #${urlTrainNumber} was not found in the serving store catalog.`}
            onRetry={handleBackToSearch}
          />
        </div>
      );
    }

    // Filtered or full stops
    const stopsToDisplay = showAllStops ? train.stops : train.stops.slice(0, 25);
    const hasMoreStops = train.stops.length > 25;

    return (
      <div className="space-y-8">
        {/* Navigation & Header */}
        <div>
          <button
            type="button"
            onClick={handleBackToSearch}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors mb-4 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Back to Train Search</span>
          </button>

          <PageHeader
            title={`${train.trainNumber} — ${train.trainName || 'Express Service'}`}
            subtitle={`Timetable, intermediate halts, and observed delay intelligence across ${train.runsCount} observed runs.`}
            action={
              <button
                type="button"
                onClick={() => navigate(`/predict?train=${train.trainNumber}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors min-h-[44px]"
                title="Open schedule-time ML delay prediction for this service"
              >
                <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
                <span>Predict Delay</span>
              </button>
            }
          />
        </div>

        {/* 1. Train Header Summary Card */}
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
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{train.originStationCode}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{train.terminusStationCode}</span>
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    ({train.stopsCount} scheduled halts)
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
                icon={<Train className="w-4 h-4" />}
                subtext={`Across ${train.daysObserved} calendar days`}
              />
              <StatCard
                label="Mean Arrival Delay"
                value={formatMinutes(train.meanDelay)}
                icon={<Clock className="w-4 h-4" />}
                subtext="Average across eligible stops"
              />
              <StatCard
                label="Eligible Halts"
                value={formatNumber(train.eligibleStopsCount)}
                icon={<Layers className="w-4 h-4" />}
                subtext="Stops with reported arrivals"
              />
              <StatCard
                label="Dataset Span"
                value="19 Days"
                icon={<Calendar className="w-4 h-4" />}
                subtext="Oct 7 – Oct 25, 2026"
              />
            </div>
            {train.definition && (
              <div className="mt-3">
                <DefinitionNote note={train.definition} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Stop Timetable Table (Strictly keyed by seq) */}
        <div>
          <SectionHeader
            title="Canonical Timetable & Stop Delay Rates"
            description="Route stops ordered strictly by sequence number (seq). Keyed to preserve exact circular and repeating station halts."
          />

          <Card className="border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Station Code</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Scheduled Arrival</th>
                    <th className="py-2.5 px-3">Scheduled Departure</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Observed Delayed Rate</th>
                    <th className="py-2.5 px-3">Mean Delay</th>
                    <th className="py-2.5 px-3">Sample Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stopsToDisplay.map((stop) => (
                    <tr
                      key={stop.seq} // Keyed strictly by seq to handle circular routes
                      className={`hover:bg-slate-50 transition-colors ${
                        stop.isOrigin ? 'bg-blue-50/30' : stop.isTerminus ? 'bg-purple-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-center">
                        {stop.seq}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-sm">
                        {stop.stationCode}
                      </td>
                      <td className="py-2.5 px-3">
                        {stop.isOrigin ? (
                          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Origin</span>
                        ) : stop.isTerminus ? (
                          <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Terminus</span>
                        ) : (
                          <span className="text-slate-400">Intermediate</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {stop.scheduledArrivalTime ? (
                          <span className="inline-flex items-center gap-1">
                            <span>{stop.scheduledArrivalTime}</span>
                            {stop.arrivalDayOffset > 0 && (
                              <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-1 rounded">
                                +{stop.arrivalDayOffset}d
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {stop.scheduledDepartureTime ? (
                          <span className="inline-flex items-center gap-1">
                            <span>{stop.scheduledDepartureTime}</span>
                            {stop.departureDayOffset > 0 && (
                              <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-1 rounded">
                                +{stop.departureDayOffset}d
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <RateBar
                          rate={stop.observedDelayedRate}
                          showLabel
                          isMuted={stop.isLowSupport}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {stop.observedMeanDelayMin !== null ? (
                          <span className={stop.observedMeanDelayMin > 15 ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                            {formatMinutes(stop.observedMeanDelayMin)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <SupportBadge count={stop.observedStopsCount} threshold={LOW_SUPPORT_THRESHOLD} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMoreStops && (
              <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowAllStops(!showAllStops)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors py-1 px-3 rounded hover:bg-white"
                >
                  {showAllStops
                    ? `Show Fewer Stops (First 25 of ${train.stops.length})`
                    : `Show All ${train.stops.length} Stops (Showing 25)`}
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* 3. Route Stop Progression & Date History Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Progression along route */}
          <ChartCard
            title="Stop Delay Rate Progression"
            subtitle="Observed delayed rate along the sequence of intermediate halts from origin to terminus."
            action={
              <ChartTableToggle
                view={progressionView}
                onViewChange={setProgressionView}
                chartLabel="Profile"
                tableLabel="Table"
              />
            }
          >
            {progressionView === 'chart' ? (
              <div className="space-y-4">
                <div style={{ height: `${CHART_THEME.heights.standard}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={train.stops.filter((s) => s.observedDelayedRate !== null)}
                      margin={{ ...CHART_THEME.margin, left: 8, right: 16 }}
                    >
                      <CartesianGrid {...CHART_THEME.gridProps} />
                      <XAxis
                        dataKey="stationCode"
                        {...CHART_THEME.axisProps}
                        tick={{ fill: '#475569', fontSize: 11, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        {...CHART_THEME.axisProps}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip content={<StopProgressionTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: `${CHART_THEME.fontSize.legend}px`, paddingTop: '10px' }}
                      />
                      <ReferenceLine
                        y={train.delayedRate}
                        stroke={CHART_THEME.colors.delayed}
                        strokeDasharray="4 4"
                        label={{
                          value: `Train Avg (${train.delayedRate}%)`,
                          fill: CHART_THEME.colors.delayed,
                          fontSize: 12,
                          position: 'top',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="observedDelayedRate"
                        name="Observed Delayed Rate (%)"
                        stroke={CHART_THEME.colors.primary}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: CHART_THEME.colors.primary }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">Route Progression:</span> Tracks delay accumulation or recovery along the journey. Stations showing steep upward slopes reflect observed hotspot halts where delay increases relative to prior halts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Station</th>
                      <th className="py-2.5 px-3">Delayed Rate</th>
                      <th className="py-2.5 px-3">Mean Delay</th>
                      <th className="py-2.5 px-3">Support</th>
                      <th className="py-2.5 px-3 text-right">Inference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {train.stops.map((s) => (
                      <tr key={s.seq} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-semibold">{s.seq}</td>
                        <td className="py-2 px-3 font-mono">{s.stationCode}</td>
                        <td className="py-2 px-3 text-rose-600 font-semibold">
                          {s.observedDelayedRate !== null ? formatPercent(s.observedDelayedRate, false, 1) : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {s.observedMeanDelayMin !== null ? formatMinutes(s.observedMeanDelayMin) : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <SupportBadge count={s.observedStopsCount} threshold={LOW_SUPPORT_THRESHOLD} />
                        </td>
                        <td className="py-2 px-3 text-right">
                          {s.seq > 1 ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/predict?train=${train.trainNumber}&seq=${s.seq}&station=${s.stationCode}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
                              title={`Open delay prediction for stop #${s.seq} (${s.stationCode})`}
                            >
                              Predict
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Origin</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>

          {/* History by Date */}
          <ChartCard
            title="Performance Across Dates"
            subtitle="Observed delayed rate across calendar run dates in the 19-day snapshot."
            action={
              <ChartTableToggle
                view={historyView}
                onViewChange={setHistoryView}
                chartLabel="Runs"
                tableLabel="Table"
              />
            }
          >
            {historyView === 'chart' ? (
              <div className="space-y-4">
                <div style={{ height: `${CHART_THEME.heights.standard}px` }}>
                  {train.historyByDate.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={train.historyByDate}
                        margin={{ ...CHART_THEME.margin, left: 8, right: 16 }}
                      >
                        <CartesianGrid {...CHART_THEME.gridProps} />
                        <XAxis
                          dataKey="startDate"
                          {...CHART_THEME.axisProps}
                          tickFormatter={(d) => d.slice(5)}
                        />
                        <YAxis
                          {...CHART_THEME.axisProps}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<DateHistoryTooltip />} />
                        <Bar
                          dataKey="delayedRate"
                          name="Run Delayed Rate (%)"
                          radius={[4, 4, 0, 0]}
                        >
                          {train.historyByDate.map((entry, index) => {
                            let fill = CHART_THEME.colors.primary;
                            if (entry.isPartial) fill = '#F59E0B'; // amber for partial dates
                            else if (entry.delayedRate < 20) fill = CHART_THEME.colors.onTime;
                            else if (entry.delayedRate > 50) fill = CHART_THEME.colors.delayed;
                            return <Cell key={`cell-date-${index}`} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                      No run-level date history available for this train service.
                    </div>
                  )}
                </div>

                <PartialDayLegend />

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">Operational Consistency:</span> Shows day-to-day fluctuations in on-time arrival. Highlighted boundary dates (Oct 7 &amp; Oct 25) have partial temporal coverage.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Stops Recorded</th>
                      <th className="py-2.5 px-3">Delayed Rate</th>
                      <th className="py-2.5 px-3">Mean Delay</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {train.historyByDate.map((h) => (
                      <tr key={h.startDate} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-semibold">{h.startDate}</td>
                        <td className="py-2 px-3 font-mono">{h.stopsCount}</td>
                        <td className="py-2 px-3 text-rose-600 font-semibold">{formatPercent(h.delayedRate, false, 1)}</td>
                        <td className="py-2 px-3 font-mono">{formatMinutes(h.meanDelay)}</td>
                        <td className="py-2 px-3">
                          {h.isPartial ? (
                            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              {h.partialNote || 'Partial Day'}
                            </span>
                          ) : (
                            <span className="text-slate-400">Complete Day</span>
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

        {/* 4. Non-Causal Caveats Card */}
        <Card className="border-slate-200 bg-slate-50/70">
          <CardContent className="pt-4 pb-4 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Methodological Note on Observed Stop Rates:</span> Stop-level delay rates represent historical empirical proportions calculated from journeys observed between Oct 7 and Oct 25, 2026. They do not constitute forward-looking predictions (which are generated via pre-departure ML inference in Phase 8) and make no causal claims regarding track conditions, operational impediments, or weather.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: Train Search & Catalog View (when no train selected)
  // -------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Single Train Deep Dive"
        subtitle="Search and explore canonical timetables, sequence numbers, and observed delay intelligence across registered train services."
      />

      {/* Search & Filter Toolbar */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search train number (e.g. 12951) or name (e.g. Rajdhani)..."
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-900 min-h-[44px]"
                aria-label="Search trains by number or name"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            <div className="w-full md:w-64">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-2.5 px-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-900 min-h-[44px]"
                aria-label="Filter by train service category"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Results Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader
            title="Train Service Directory"
            description={
              pagination
                ? `Showing ${items.length} of ${formatNumber(pagination.total)} registered train services`
                : 'Loading train directory...'
            }
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={!pagination.hasPrev || catalogLoading}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!pagination.hasNext || catalogLoading}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {catalogLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : catalogError ? (
          <ErrorState
            title="Failed to Search Trains"
            message={catalogError?.message || 'Could not query the train catalog from the serving store.'}
            onRetry={refetchCatalog}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No Trains Match Your Search"
            message={`No train records found matching "${query}"${category ? ` in category ${category}` : ''}. Try searching by train number prefix (e.g. 12) or clearing filters.`}
            actionLabel="Reset Search"
            onAction={() => {
              setQuery('');
              setCategory('');
            }}
          />
        ) : (
          <Card className="border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Train Number</th>
                    <th className="py-2.5 px-3">Train Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Route (Origin → Terminus)</th>
                    <th className="py-2.5 px-3">Stops</th>
                    <th className="py-2.5 px-3">Observed Runs</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Observed Delayed Rate</th>
                    <th className="py-2.5 px-3">Mean Delay</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((tr) => (
                    <tr
                      key={tr.trainNumber}
                      onClick={() => handleSelectTrain(tr.trainNumber)}
                      className="hover:bg-primary-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-primary-700 text-sm">
                        {tr.trainNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[220px] truncate">
                        {tr.trainName || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <CategoryLabel category={tr.category} showName={false} />
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        <span className="font-semibold">{tr.originStationCode}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-semibold">{tr.terminusStationCode}</span>
                      </td>
                      <td className="py-3 px-3 font-mono">{tr.stopsCount}</td>
                      <td className="py-3 px-3 font-mono">{tr.runsCount}</td>
                      <td className="py-3 px-3">
                        <RateBar rate={tr.delayedRate} showLabel isMuted={tr.isLowSupport} />
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {formatMinutes(tr.meanDelay)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-primary-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs text-slate-500 font-mono">
                  Showing page {pagination.page} of {pagination.totalPages} ({formatNumber(pagination.total)} trains)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!pagination.hasPrev || catalogLoading}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.hasNext || catalogLoading}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default TrainExplorerPage;
