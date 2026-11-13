
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Clock,
  Calendar,
  Layers,
  Milestone,
  Flame,
  Info,
  ChevronRight,
  X,
  ExternalLink,
  Filter,
  ChevronDown,
} from 'lucide-react';

import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  SectionHeader,
  Skeleton,
  ErrorState,
  ChartCard,
  SupportBadge,
  CategoryLabel,
  ChartTableToggle,
  Badge,
} from '../components/ui';

import { getPatterns, getStationDetail } from '../api/endpoints';
import {
  adaptPatternsHour,
  adaptPatternsDow,
  adaptPatternsCategory,
  adaptPatternsPosition,
  adaptPatternsHotspots,
  adaptStationDetail,
} from '../api/adapters';

import {
  formatNumber,
  formatPercentValue,
  formatMinutes,
  formatConfidenceInterval,
  formatDate,
} from '../utils/format';
import { LOW_SUPPORT_THRESHOLD } from '../config/constants';

import { sortPositionBuckets } from '../utils/positionSort';
import { CHART_THEME } from '../components/charts/chartTheme';


/* ---------------------------------------------------------
   Helper Functions
--------------------------------------------------------- */

const getAverageRate = (data = []) => {
  const validValues = data
    .map((item) => Number(item.delayedRate))
    .filter((value) => Number.isFinite(value));

  if (!validValues.length) return null;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const getHighestRate = (data = []) => {
  if (!data.length) return null;

  return [...data].sort(
    (a, b) => (Number(b.delayedRate) || 0) - (Number(a.delayedRate) || 0)
  )[0];
};

const getLowestRate = (data = []) => {
  if (!data.length) return null;

  return [...data].sort(
    (a, b) => (Number(a.delayedRate) || 0) - (Number(b.delayedRate) || 0)
  )[0];
};


/* ---------------------------------------------------------
   Custom Tooltips
--------------------------------------------------------- */

function HourTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-sm">
      <p className="font-bold text-slate-900 mb-1 font-mono">
        {label} IST
      </p>

      <div className="space-y-1">
        <p className="text-blue-700 font-semibold">
          Delayed Rate:{' '}
          <span className="font-mono">
            {formatPercentValue(d.delayedRate)}
          </span>
        </p>

        <p className="text-slate-600">
          Average Delay:{' '}
          <span className="font-mono font-medium">
            {formatMinutes(d.meanDelayMin)}
          </span>
        </p>

        <p className="text-slate-500 text-xs">
          Recorded Stops:{' '}
          <span className="font-mono">
            {formatNumber(d.stopsCount)}
          </span>
        </p>

        {d.isLowSupport && (
          <p className="text-amber-700 text-xs font-semibold pt-1">
            Limited observations
          </p>
        )}
      </div>
    </div>
  );
}


function DowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-sm">
      <p className="font-bold text-slate-900 mb-1">{label}</p>

      <div className="space-y-1">
        <p className="text-blue-700 font-semibold">
          Delayed Rate:{' '}
          <span className="font-mono">
            {formatPercentValue(d.delayedRate)}
          </span>
        </p>

        <p className="text-slate-600">
          Average Delay:{' '}
          <span className="font-mono font-medium">
            {formatMinutes(d.meanDelayMin)}
          </span>
        </p>

        <p className="text-slate-500 text-xs">
          Days in Dataset:{' '}
          <span className="font-mono">{d.calendarDaysCount}</span>
        </p>

        <p className="text-slate-500 text-xs">
          Recorded Stops:{' '}
          <span className="font-mono">
            {formatNumber(d.stopsCount)}
          </span>
        </p>
      </div>
    </div>
  );
}


function PositionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-sm">
      <p className="font-bold text-slate-900 mb-1">{label}</p>

      <div className="space-y-1">
        <p className="text-blue-700 font-semibold">
          Delayed Rate:{' '}
          <span className="font-mono">
            {formatPercentValue(d.delayedRate)}
          </span>
        </p>

        <p className="text-slate-600">
          Average Delay:{' '}
          <span className="font-mono font-medium">
            {formatMinutes(d.meanDelayMin)}
          </span>
        </p>

        <p className="text-slate-500 text-xs">
          Recorded Stops:{' '}
          <span className="font-mono">
            {formatNumber(d.stopsCount)}
          </span>
        </p>
      </div>
    </div>
  );
}


/* ---------------------------------------------------------
   Main Page
--------------------------------------------------------- */

export function DelayPatternsPage() {
  const navigate = useNavigate();



  // Hourly Pattern
  const [hourData, setHourData] = useState([]);
  const [hourLoading, setHourLoading] = useState(true);
  const [hourError, setHourError] = useState(null);
  const [hourView, setHourView] = useState('chart');

  // Day of Week Pattern
  const [dowData, setDowData] = useState([]);
  const [dowLoading, setDowLoading] = useState(true);
  const [dowError, setDowError] = useState(null);
  const [dowView, setDowView] = useState('chart');

  // Train Category Pattern
  const [catData, setCatData] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(null);
  const [catView, setCatView] = useState('chart');

  // Journey Position Pattern
  const [posData, setPosData] = useState([]);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState(null);
  const [posView, setPosView] = useState('chart');

  // Hotspots
  const [hotspotLevel, setHotspotLevel] = useState('station');
  const [hotspotOrder, setHotspotOrder] = useState('top');
  const [minSupportInput, setMinSupportInput] = useState(100);
  const [limitInput, setLimitInput] = useState(10);
  const [hotspotData, setHotspotData] = useState(null);
  const [hotspotLoading, setHotspotLoading] = useState(true);
  const [hotspotError, setHotspotError] = useState(null);

  // Station Details
  const [selectedStationCode, setSelectedStationCode] = useState(null);
  const [stationDetail, setStationDetail] = useState(null);
  const [stationLoading, setStationLoading] = useState(false);
  const [stationError, setStationError] = useState(null);


  /* -------------------------------------------------------
     API Calls
  ------------------------------------------------------- */

  const fetchHour = useCallback(async () => {
    setHourLoading(true);
    setHourError(null);

    try {
      const raw = await getPatterns('hour');
      setHourData(adaptPatternsHour(raw));
    } catch (err) {
      setHourError(err);
    } finally {
      setHourLoading(false);
    }
  }, []);


  const fetchDow = useCallback(async () => {
    setDowLoading(true);
    setDowError(null);

    try {
      const raw = await getPatterns('dow');
      setDowData(adaptPatternsDow(raw));
    } catch (err) {
      setDowError(err);
    } finally {
      setDowLoading(false);
    }
  }, []);


  const fetchCategory = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);

    try {
      const raw = await getPatterns('category');
      setCatData(adaptPatternsCategory(raw));
    } catch (err) {
      setCatError(err);
    } finally {
      setCatLoading(false);
    }
  }, []);


  const fetchPosition = useCallback(async () => {
    setPosLoading(true);
    setPosError(null);

    try {
      const raw = await getPatterns('position');
      setPosData(sortPositionBuckets(adaptPatternsPosition(raw)));
    } catch (err) {
      setPosError(err);
    } finally {
      setPosLoading(false);
    }
  }, []);


  const fetchHotspots = useCallback(async (level, order, minSup, limit) => {
    setHotspotLoading(true);
    setHotspotError(null);

    try {
      const raw = await getPatterns('hotspots', {
        level,
        order,
        min_support: minSup,
        limit,
      });

      setHotspotData(adaptPatternsHotspots(raw));
    } catch (err) {
      setHotspotError(err);
    } finally {
      setHotspotLoading(false);
    }
  }, []);


  const fetchStationInfo = useCallback(async (code) => {
    if (!code) return;

    setStationLoading(true);
    setStationError(null);
    setStationDetail(null);

    try {
      const raw = await getStationDetail(code);
      setStationDetail(adaptStationDetail(raw));
    } catch (err) {
      setStationError(err);
    } finally {
      setStationLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchHour();
    fetchDow();
    fetchCategory();
    fetchPosition();
    fetchHotspots('station', 'top', 100, 10);
  }, [
    fetchHour,
    fetchDow,
    fetchCategory,
    fetchPosition,
    fetchHotspots,
  ]);


  /* -------------------------------------------------------
     Dynamic Summary Values
  ------------------------------------------------------- */

  const hourlyAverage = useMemo(() => {
    const apiAverage = hourData?.fleetDelayedRate;

    if (Number.isFinite(Number(apiAverage)) && apiAverage !== null) {
      return Number(apiAverage);
    }

    return null;
  }, [hourData]);

  const calculatedDowAverage = useMemo(
    () => getAverageRate(dowData),
    [dowData]
  );

  const highestHour = useMemo(
    () => getHighestRate(hourData),
    [hourData]
  );

  const lowestHour = useMemo(
    () => getLowestRate(hourData),
    [hourData]
  );

  const highestCategory = useMemo(
    () => getHighestRate(catData),
    [catData]
  );

  const lowestCategory = useMemo(
    () => getLowestRate(catData),
    [catData]
  );

  const firstPosition = posData?.[0];
  const lastPosition = posData?.[posData.length - 1];

  const dataAsOf = hourData?.dataAsOf || dowData?.dataAsOf || catData?.dataAsOf || hotspotData?.dataAsOf || '2026-10-25';


  /* -------------------------------------------------------
     Handlers
  ------------------------------------------------------- */

  const handleApplyHotspots = () => {
    const minBound = hotspotLevel === 'station' ? 100 : 50;

    const cleanMin = Math.max(
      minBound,
      Number(minSupportInput) || minBound
    );

    const cleanLimit = Math.max(
      1,
      Math.min(50, Number(limitInput) || 10)
    );

    fetchHotspots(
      hotspotLevel,
      hotspotOrder,
      cleanMin,
      cleanLimit
    );
  };


  const handleLevelChange = (newLevel) => {
    setHotspotLevel(newLevel);

    if (newLevel === 'train' && Number(minSupportInput) < 50) {
      setMinSupportInput(50);
    } else if (
      newLevel === 'station' &&
      Number(minSupportInput) < 100
    ) {
      setMinSupportInput(100);
    }
  };


  const handleStationClick = (code) => {
    setSelectedStationCode(code);
    fetchStationInfo(code);
  };


  return (
    <div className="space-y-8 pb-12">

      {/* Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>Delay Patterns</span>
            <span
              tabIndex={0}
              role="img"
              aria-label="Delayed = arrival more than 15 minutes late on label-eligible stops."
              title="Delayed = arrival more than 15 minutes late on label-eligible stops."
              className="inline-flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden focus:text-slate-700 cursor-help"
            >
              <Info className="w-5 h-5" />
            </span>
          </div>
        }
        subtitle="Delay patterns by scheduled hour, day of week, category and journey position."
        badge={<Badge variant="primary">Historical Data</Badge>}
      />

      {/* How to Read This Page Collapsible */}
      <details className="group border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
        <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-sm text-slate-800 flex items-center justify-between hover:bg-slate-50 transition-colors list-none">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" aria-hidden="true" />
            <span>How to read this page</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-slate-800 font-medium">19-day snapshot:</strong> Evaluated over a fixed historical observational window from October 7 to October 25, 2026 (~2.8M recorded stops).
            </li>
            <li>
              <strong className="text-slate-800 font-medium">Weekday sample counts:</strong> Each day of the week is observed across 2–3 calendar days, reflecting snapshot patterns rather than annualized seasonal trends.
            </li>
            <li>
              <strong className="text-slate-800 font-medium">Boundary collection days:</strong> October 7 is left-truncated (data collection started midday) and October 25 is right-censored (collection concluded with journeys in progress).
            </li>
            <li>
              <strong className="text-slate-800 font-medium">Observed patterns, not causal:</strong> Percentages indicate historical delay frequency in the dataset and describe empirical associations rather than physical causes.
            </li>
          </ul>
        </div>
      </details>


      {/* ---------------------------------------------------
          1. Hourly Delay Pattern
      --------------------------------------------------- */}

      <section
        aria-labelledby="section-hourly-pattern"
        className="space-y-4"
      >
        <SectionHeader
          id="section-hourly-pattern"
          title="Delays by Hour of Day"
          description="Compare how frequently trains were delayed at different scheduled arrival hours (IST)."
          icon={Clock}
        />

        {hourError ? (
          <ErrorState
            title="Unable to load hourly patterns"
            message={hourError.message}
            requestId={hourError.requestId}
            onRetry={fetchHour}
          />
        ) : hourLoading ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : (
          <ChartCard
            title="Hourly Delay Rate"
            subtitle={
              hourlyAverage !== null
                ? `Percentage of delayed arrivals by scheduled hour. Overall average: ${formatPercentValue(hourlyAverage)}.`
                : 'Percentage of delayed arrivals by scheduled hour.'
            }
            action={
              <ChartTableToggle
                view={hourView}
                onViewChange={setHourView}
              />
            }
            footer={
              <p className="text-xs text-slate-500">
                {highestHour && lowestHour ? (
                  <>
                    Highest recorded delay rate:{' '}
                    <span className="font-semibold text-slate-800">
                      {highestHour.hourLabel} ({formatPercentValue(highestHour.delayedRate)})
                    </span>
                    {' '}and lowest recorded delay rate:{' '}
                    <span className="font-semibold text-slate-800">
                      {lowestHour.hourLabel} ({formatPercentValue(lowestHour.delayedRate)}).
                    </span>
                  </>
                ) : (
                  'Hourly comparison is based on the available historical records.'
                )}
              </p>
            }
          >
            {hourView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_THEME.gridColor}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="hourLabel"
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      interval={2}
                    />

                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 80]}
                    />

                    <Tooltip content={<HourTooltip />} />

                    {hourlyAverage !== null && (
                      <ReferenceLine
                        y={hourlyAverage}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Average (${hourlyAverage.toFixed(1)}%)`,
                          position: 'top',
                          fill: '#64748b',
                          fontSize: 12,
                        }}
                      />
                    )}

                    <Bar
                      dataKey="delayedRate"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    >
                      {hourData.map((entry) => (
                        <Cell
                          key={`hour-bar-${entry.hour}`}
                          fill={
                            entry.isLowSupport
                              ? '#cbd5e1'
                              : entry.delayedRate >= 55
                                ? '#ef4444'
                                : '#3b82f6'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Hour (IST)</th>
                      <th className="py-2.5 px-3">Delayed Rate</th>
                      <th className="py-2.5 px-3">Average Delay</th>
                      <th className="py-2.5 px-3">Recorded Stops</th>
                      <th className="py-2.5 px-3">Data Support</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {hourData.map((h) => (
                      <tr
                        key={`table-hour-${h.hour}`}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {h.hourLabel}
                        </td>

                        <td className="py-2 px-3 font-semibold text-blue-700">
                          {formatPercentValue(h.delayedRate)}
                        </td>

                        <td className="py-2 px-3 text-slate-700">
                          {formatMinutes(h.meanDelayMin)}
                        </td>

                        <td className="py-2 px-3 text-slate-600">
                          {formatNumber(h.stopsCount)}
                        </td>

                        <td className="py-2 px-3 font-sans">
                          {h.isLowSupport || h.stopsCount < LOW_SUPPORT_THRESHOLD ? (
                            <span className="text-amber-700 font-medium">
                              few samples
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">
                              Good
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
        )}
      </section>


      {/* ---------------------------------------------------
          2. Day of Week Pattern
      --------------------------------------------------- */}

      <section
        aria-labelledby="section-dow-pattern"
        className="space-y-4"
      >
        <SectionHeader
          id="section-dow-pattern"
          title="Delays by Day of Week"
          description="Compare historical arrival delays across different days of the week."
          icon={Calendar}
        />

        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          Note: Weekdays reflect 2–3 calendar days each in this 19-day snapshot.
        </p>

        {dowError ? (
          <ErrorState
            title="Unable to load weekday patterns"
            message={dowError.message}
            requestId={dowError.requestId}
            onRetry={fetchDow}
          />
        ) : dowLoading ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : (
          <ChartCard
            title="Weekday Delay Comparison"
            subtitle="Compare the recorded delayed arrival percentage for each weekday."
            action={
              <ChartTableToggle
                view={dowView}
                onViewChange={setDowView}
              />
            }
            footer={
              <p className="text-xs text-slate-500">
                {(() => {
                  const high = getHighestRate(dowData);
                  const low = getLowestRate(dowData);

                  if (!high || !low) {
                    return 'Weekday comparison is based on the available historical records.';
                  }

                  return (
                    <>
                      Highest recorded rate:{' '}
                      <span className="font-semibold text-slate-800">
                        {high.dayOfWeek} ({formatPercentValue(high.delayedRate)})
                      </span>
                      {' '}and lowest recorded rate:{' '}
                      <span className="font-semibold text-slate-800">
                        {low.dayOfWeek} ({formatPercentValue(low.delayedRate)}).
                      </span>
                    </>
                  );
                })()}
              </p>
            }
          >
            {dowView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dowData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_THEME.gridColor}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="dayOfWeek"
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                    />

                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[40, 60]}
                    />

                    <Tooltip content={<DowTooltip />} />

                    {calculatedDowAverage !== null && (
                      <ReferenceLine
                        y={calculatedDowAverage}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Average (${calculatedDowAverage.toFixed(1)}%)`,
                          position: 'top',
                          fill: '#64748b',
                          fontSize: 12,
                        }}
                      />
                    )}

                    <Bar
                      dataKey="delayedRate"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    >
                      {dowData.map((d) => (
                        <Cell
                          key={`dow-bar-${d.dayOfWeek}`}
                          fill={d.isLowSupport || d.stopsCount < LOW_SUPPORT_THRESHOLD ? '#cbd5e1' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3">Days in Dataset</th>
                      <th className="py-2.5 px-3">Delayed Rate</th>
                      <th className="py-2.5 px-3">Average Delay</th>
                      <th className="py-2.5 px-3">Recorded Stops</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {dowData.map((d) => (
                      <tr
                        key={`table-dow-${d.dayOfWeek}`}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                          {d.dayOfWeek}
                        </td>

                        <td className="py-2.5 px-3">
                          {d.calendarDaysCount} days
                          {d.calendarDaysCount === 2 && (
                            <span className="text-amber-700 text-xs ml-1 font-sans">
                              (limited)
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-blue-700">
                          {formatPercentValue(d.delayedRate)}
                        </td>

                        <td className="py-2.5 px-3 text-slate-700">
                          {formatMinutes(d.meanDelayMin)}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600">
                          {formatNumber(d.stopsCount)}
                          {(d.isLowSupport || d.stopsCount < LOW_SUPPORT_THRESHOLD) && (
                            <span className="text-amber-700 text-xs ml-1 font-sans font-medium">
                              (few samples)
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
        )}
      </section>


      {/* ---------------------------------------------------
          3. Train Category Pattern
      --------------------------------------------------- */}

      <section
        aria-labelledby="section-category-pattern"
        className="space-y-4"
      >
        <SectionHeader
          id="section-category-pattern"
          title="Delays by Train Category"
          description="Compare delay frequency across different train service categories."
          icon={Layers}
        />

        {catError ? (
          <ErrorState
            title="Unable to load category patterns"
            message={catError.message}
            requestId={catError.requestId}
            onRetry={fetchCategory}
          />
        ) : catLoading ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : (
          <ChartCard
            title="Train Category Comparison"
            subtitle="Compare delayed arrival rates across service categories. Categories with fewer observations are shown in a muted color."
            action={
              <ChartTableToggle
                view={catView}
                onViewChange={setCatView}
              />
            }
            footer={
              <p className="text-xs text-slate-500">
                {lowestCategory && highestCategory ? (
                  <>
                    Lowest recorded delay rate:{' '}
                    <span className="font-semibold text-slate-800">
                      {lowestCategory.categoryName || lowestCategory.category}
                      {' '}({formatPercentValue(lowestCategory.delayedRate)})
                    </span>
                    . Highest recorded delay rate:{' '}
                    <span className="font-semibold text-slate-800">
                      {highestCategory.categoryName || highestCategory.category}
                      {' '}({formatPercentValue(highestCategory.delayedRate)}).
                    </span>
                  </>
                ) : (
                  'Category comparison is based on the available historical records.'
                )}
              </p>
            }
          >
            {catView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={catData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_THEME.gridColor}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="category"
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                    />

                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 90]}
                    />

                    <Tooltip
                      formatter={(val, name, item) => [
                        `${formatPercentValue(val)} (${formatMinutes(item.payload.meanDelayMin)} average delay)`,
                        'Delayed Rate',
                      ]}
                    />

                    <Bar
                      dataKey="delayedRate"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    >
                      {catData.map((c) => (
                        <Cell
                          key={`cat-bar-${c.category}`}
                          fill={
                            (c.isLowSupport || c.eligibleStops < LOW_SUPPORT_THRESHOLD)
                              ? '#cbd5e1'
                              : c.delayedRate >= 60
                                ? '#f97316'
                                : '#2563eb'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Category Code</th>
                      <th className="py-2.5 px-3">Train Category</th>
                      <th className="py-2.5 px-3">Delayed Rate</th>
                      <th className="py-2.5 px-3">Average Delay</th>
                      <th className="py-2.5 px-3">Median Delay</th>
                      <th className="py-2.5 px-3">Recorded Stops</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {catData.map((c) => (
                      <tr
                        key={`table-cat-${c.category}`}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <CategoryLabel category={c.category} />
                        </td>

                        <td className="py-2 px-3 text-slate-700 font-sans">
                          {c.categoryName}
                        </td>

                        <td className="py-2 px-3 font-semibold text-blue-700">
                          {formatPercentValue(c.delayedRate)}
                        </td>

                        <td className="py-2 px-3 text-slate-700">
                          {formatMinutes(c.meanDelayMin)}
                        </td>

                        <td className="py-2 px-3 text-slate-600">
                          {formatMinutes(c.medianDelayMin)}
                        </td>

                        <td className="py-2 px-3 text-slate-600">
                          {formatNumber(c.eligibleStops)}
                          {(c.isLowSupport || c.eligibleStops < LOW_SUPPORT_THRESHOLD) && (
                            <span className="text-amber-700 text-xs ml-1 font-sans font-medium">
                              (few samples)
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
        )}
      </section>


      {/* ---------------------------------------------------
          4. Journey Position Pattern
      --------------------------------------------------- */}

      <section
        aria-labelledby="section-position-pattern"
        className="space-y-4"
      >
        <SectionHeader
          id="section-position-pattern"
          title="Delays Across Journey Positions"
          subtitle="How the observed delay rate changes along a train's route."
          icon={Milestone}
        />

        {posError ? (
          <ErrorState
            title="Unable to load journey position patterns"
            message={posError.message}
            requestId={posError.requestId}
            onRetry={fetchPosition}
          />
        ) : posLoading ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : (
          <ChartCard
            title="Delay Rate by Journey Position"
            subtitle="How the observed delay rate changes along a train's route."
            action={
              <ChartTableToggle
                view={posView}
                onViewChange={setPosView}
              />
            }
            footer={
              <p className="text-xs text-slate-500">
                {firstPosition && lastPosition ? (
                  <>
                    {firstPosition.positionBucket} has a recorded delay rate of{' '}
                    <span className="font-semibold text-slate-800">
                      {formatPercentValue(firstPosition.delayedRate)}
                    </span>
                    , compared with{' '}
                    <span className="font-semibold text-slate-800">
                      {formatPercentValue(lastPosition.delayedRate)}
                    </span>
                    {' '}for {lastPosition.positionBucket}.
                  </>
                ) : (
                  'Journey position comparison is based on the available historical records.'
                )}
              </p>
            }
          >
            {posView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={posData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_THEME.gridColor}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="positionBucket"
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                    />

                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 90]}
                    />

                    <Tooltip content={<PositionTooltip />} />

                    <Bar
                      dataKey="delayedRate"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    >
                      {posData.map((p, idx) => (
                        <Cell
                          key={`pos-bar-${p.positionBucket}`}
                          fill={
                            (p.isLowSupport || p.stopsCount < LOW_SUPPORT_THRESHOLD)
                              ? '#cbd5e1'
                              : idx >= 3
                                ? '#ea580c'
                                : '#2563eb'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Journey Position</th>
                      <th className="py-2.5 px-3">Delayed Rate</th>
                      <th className="py-2.5 px-3">Average Delay</th>
                      <th className="py-2.5 px-3">Recorded Stops</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {posData.map((p) => (
                      <tr
                        key={`table-pos-${p.positionBucket}`}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                          {p.positionBucket}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-blue-700">
                          {formatPercentValue(p.delayedRate)}
                        </td>

                        <td className="py-2.5 px-3 text-slate-700">
                          {formatMinutes(p.meanDelayMin)}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600">
                          {formatNumber(p.stopsCount)}
                          {(p.isLowSupport || p.stopsCount < LOW_SUPPORT_THRESHOLD) && (
                            <span className="text-amber-700 text-xs ml-1 font-sans font-medium">
                              (few samples)
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
        )}
      </section>


      {/* ---------------------------------------------------
          5. Delay Hotspots Explorer
      --------------------------------------------------- */}

      <section
        aria-labelledby="section-hotspots-explorer"
        className="space-y-4"
      >
        <SectionHeader
          id="section-hotspots-explorer"
          title="Delay Hotspots Explorer"
          description="Find stations and trains with higher or lower historical delay rates using recorded observations."
          icon={Flame}
          badge={<Badge variant="default">Interactive Explorer</Badge>}
        />

        {/* Filters */}
        <Card className="bg-slate-50/80 border-slate-200">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-wrap items-end gap-4 sm:gap-6">

              {/* Entity Level */}
              <div className="space-y-1.5 min-w-[130px]">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Explore By
                </label>

                <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => handleLevelChange('station')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      hotspotLevel === 'station'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Stations
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLevelChange('train')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      hotspotLevel === 'train'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Trains
                  </button>
                </div>
              </div>


              {/* Ranking Order */}
              <div className="space-y-1.5 min-w-[150px]">
                <label
                  htmlFor="hotspot-order-select"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
                >
                  Sort By
                </label>

                <select
                  id="hotspot-order-select"
                  aria-label="Ranking Order"
                  value={hotspotOrder}
                  onChange={(e) => setHotspotOrder(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top">Most Delayed</option>
                  <option value="bottom">Least Delayed</option>
                </select>
              </div>


              {/* Minimum Observations */}
              <div className="space-y-1.5 min-w-[120px]">
                <label
                  htmlFor="hotspot-min-support-input"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
                >
                  Minimum Stops ({hotspotLevel === 'station' ? '100+' : '50+'})
                </label>

                <input
                  id="hotspot-min-support-input"
                  aria-label="Minimum recorded stops"
                  type="number"
                  min={hotspotLevel === 'station' ? 100 : 50}
                  max={2000}
                  step={25}
                  value={minSupportInput}
                  onChange={(e) => setMinSupportInput(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>


              {/* Result Limit */}
              <div className="space-y-1.5 min-w-[90px]">
                <label
                  htmlFor="hotspot-limit-select"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
                >
                  Results
                </label>

                <select
                  id="hotspot-limit-select"
                  aria-label="Result limit"
                  value={limitInput}
                  onChange={(e) => setLimitInput(Number(e.target.value))}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                </select>
              </div>


              {/* Apply */}
              <button
                type="button"
                onClick={handleApplyHotspots}
                disabled={hotspotLoading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Filter size={14} />
                Apply Filters
              </button>
            </div>
          </CardContent>
        </Card>


        {/* Results */}
        {hotspotError ? (
          <ErrorState
            title="Unable to load delay hotspots"
            message={hotspotError.message}
            requestId={hotspotError.requestId}
            onRetry={handleApplyHotspots}
          />
        ) : hotspotLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  {hotspotOrder === 'top'
                    ? 'Most Delayed'
                    : 'Least Delayed'}{' '}
                  {hotspotLevel === 'station' ? 'Stations' : 'Trains'}
                </CardTitle>

                <CardDescription className="text-xs">
                  Showing {hotspotData?.items?.length || 0} results.
                  Minimum recorded stops:{' '}
                  {formatNumber(hotspotData?.minSupport)}
                </CardDescription>
              </div>

              <span className="text-xs font-mono text-slate-600">
                Historical Records
              </span>
            </CardHeader>

            <CardContent className="p-0">
              <div
                tabIndex={0}
                role="region"
                aria-label="Delay hotspots table"
                className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">#</th>

                      <th className="py-2.5 px-4">
                        {hotspotLevel === 'station' ? 'Station' : 'Train'}
                      </th>

                      <th className="py-2.5 px-4">Delayed Rate</th>

                      <th scope="col" className="py-2.5 px-4">95% interval</th>

                      <th className="py-2.5 px-4">Average Delay</th>

                      <th className="py-2.5 px-4">Recorded Stops</th>

                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {hotspotData?.items?.map((item) => (
                      <tr
                        key={item.stationCode || item.trainNumber}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-center text-slate-600 font-bold">
                          {item.rank}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {hotspotLevel === 'station' ? (
                            <button
                              type="button"
                              onClick={() => handleStationClick(item.stationCode)}
                              className="text-blue-700 hover:text-blue-900 hover:underline font-bold font-mono inline-flex items-center gap-1"
                              title={`View details for station ${item.stationCode}`}
                            >
                              {item.stationCode}
                              <ChevronRight size={13} />
                            </button>
                          ) : (
                            <div className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => navigate(`/trains/${item.trainNumber}`)}
                                className="text-blue-700 hover:text-blue-900 hover:underline font-bold font-mono inline-flex items-center gap-1"
                                title={`Open train ${item.trainNumber}`}
                              >
                                {item.trainNumber}
                                <ExternalLink size={12} />
                              </button>

                              {item.trainName && (
                                <p className="text-xs text-slate-500 font-sans font-normal truncate max-w-[220px]">
                                  {item.trainName}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              item.delayedRate >= 75
                                ? 'text-rose-600'
                                : item.delayedRate >= 50
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                            }`}
                          >
                            {formatPercentValue(item.delayedRate)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">
                          {formatConfidenceInterval(item.wilsonText)}
                        </td>

                        <td className="py-3 px-4 text-slate-700">
                          {formatMinutes(item.meanDelay)}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {formatNumber(item.stopsCount)}
                        </td>

                        <td className="py-3 px-4 text-right font-sans">
                          {hotspotLevel === 'station' ? (
                            <button
                              type="button"
                              onClick={() => handleStationClick(item.stationCode)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Details
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/trains/${item.trainNumber}`)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Explore
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!hotspotData?.items?.length && (
                  <div className="py-10 text-center text-sm text-slate-500">
                    No results found for the selected filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Station Detail */}
        {selectedStationCode && (
          <Card className="border-blue-200 bg-blue-50/20 shadow-md">
            <CardHeader className="pb-3 border-b border-blue-100 flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold text-blue-900 font-mono">
                  {selectedStationCode}
                </span>

                <Badge variant="primary">
                  Station Details
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedStationCode(null);
                  setStationDetail(null);
                  setStationError(null);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close station details"
                title="Close station details"
              >
                <X size={18} />
              </button>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {stationLoading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : stationError ? (
                <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">
                  Unable to load details for {selectedStationCode}:{' '}
                  {stationError.message}
                </div>
              ) : stationDetail ? (
                <div className="space-y-4">

                  {/* Station KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">
                        Delayed Rate
                      </span>

                      <span className="text-lg font-bold font-mono text-blue-700">
                        {formatPercentValue(stationDetail.delayedRate)}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">
                        Average Arrival Delay
                      </span>

                      <span className="text-lg font-bold font-mono text-slate-800">
                        {formatMinutes(stationDetail.meanDelay)}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">
                        95% interval
                      </span>

                      <span className="text-sm font-semibold font-mono tabular-nums text-slate-700 pt-1 block">
                        {formatConfidenceInterval(stationDetail.wilsonText)}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">
                        Trains / Recorded Stops
                      </span>

                      <span className="text-sm font-semibold font-mono text-slate-800 pt-1 block">
                        {formatNumber(stationDetail.trainsCount)} trains
                        ({formatNumber(stationDetail.stopsCount)} stops)
                      </span>
                    </div>
                  </div>


                  {/* Trains at Station */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Trains at This Station ({stationDetail.callingTrainsSample.length})
                    </h4>

                    <div className="overflow-x-auto overflow-y-auto max-h-52 border border-slate-200 rounded-xl bg-white overscroll-contain">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-600 sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Train</th>
                            <th className="py-2 px-3">Train Name</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3">Delayed Rate</th>
                            <th className="py-2 px-3">Average Delay</th>
                            <th className="py-2 px-3">Recorded Stops</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-mono">
                          {stationDetail.callingTrainsSample.map((tr) => (
                            <tr
                              key={`calling-${tr.trainNumber}`}
                              className="hover:bg-slate-50"
                            >
                              <td className="py-1.5 px-3 font-bold text-blue-700">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/trains/${tr.trainNumber}`)}
                                  className="hover:underline font-bold"
                                >
                                  {tr.trainNumber}
                                </button>
                              </td>

                              <td className="py-1.5 px-3 text-slate-800 font-sans">
                                {tr.trainName || '—'}
                              </td>

                              <td className="py-1.5 px-3 font-sans">
                                <CategoryLabel category={tr.category} />
                              </td>

                              <td className="py-1.5 px-3 font-semibold text-slate-800">
                                {formatPercentValue(tr.delayedRate)}
                              </td>

                              <td className="py-1.5 px-3 text-slate-600">
                                {formatMinutes(tr.meanDelay)}
                              </td>

                              <td className="py-1.5 px-3 text-slate-500 font-mono">
                                {tr.observedStops < 30 ? (
                                  <span className="inline-flex items-center gap-1">
                                    {tr.observedStops}
                                    <SupportBadge
                                      count={tr.observedStops}
                                      threshold={30}
                                      label="stops"
                                    />
                                  </span>
                                ) : (
                                  tr.observedStops
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>


      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200 text-xs text-slate-500">
        <p>
          Data as of {formatDate(dataAsOf)} - Observed Railway Dataset
        </p>
      </footer>
    </div>
  );
}

export default DelayPatternsPage;
