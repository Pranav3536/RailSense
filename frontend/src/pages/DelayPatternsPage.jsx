import { useState, useEffect, useCallback } from 'react';
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
  ChevronUp,
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
import { formatNumber, formatPercentValue, formatMinutes, formatConfidenceInterval } from '../utils/format';
import { sortPositionBuckets } from '../utils/positionSort';
import { CHART_THEME } from '../components/charts/chartTheme';

/**
 * Custom Tooltip for Hour Pattern
 */
function HourTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-sm">
      <p className="font-bold text-slate-900 mb-1 font-mono">{label} IST</p>
      <div className="space-y-1">
        <p className="text-blue-700 font-semibold">
          Delayed Rate: <span className="font-mono">{formatPercentValue(d.delayedRate)}</span>
        </p>
        <p className="text-slate-600">
          Mean Delay: <span className="font-mono font-medium">{formatMinutes(d.meanDelayMin)}</span>
        </p>
        <p className="text-slate-500 text-xs">
          Eligible Stops: <span className="font-mono">{formatNumber(d.stopsCount)}</span>
        </p>
        {d.isLowSupport && (
          <p className="text-amber-700 text-xs font-semibold pt-1">
            Low stop support ({formatNumber(d.stopsCount)} stops)
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Custom Tooltip for Day of Week Pattern
 */
function DowTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-sm">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      <div className="space-y-1">
        <p className="text-blue-700 font-semibold">
          Delayed Rate: <span className="font-mono">{formatPercentValue(d.delayedRate)}</span>
        </p>
        <p className="text-slate-600">
          Mean Delay: <span className="font-mono font-medium">{formatMinutes(d.meanDelayMin)}</span>
        </p>
        <p className="text-slate-500 text-xs">
          Calendar Days: <span className="font-mono font-medium">{d.calendarDaysCount} days in window</span>
        </p>
        <p className="text-slate-500 text-xs">
          Stops Monitored: <span className="font-mono">{formatNumber(d.stopsCount)}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Custom Tooltip for Route Position Pattern
 */
function PositionTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-sm">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      <div className="space-y-1">
        <p className="text-blue-700 font-semibold">
          Delayed Rate: <span className="font-mono">{formatPercentValue(d.delayedRate)}</span>
        </p>
        <p className="text-slate-600">
          Mean Delay: <span className="font-mono font-medium">{formatMinutes(d.meanDelayMin)}</span>
        </p>
        <p className="text-slate-500 text-xs">
          Stops Count: <span className="font-mono">{formatNumber(d.stopsCount)}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * DelayPatternsPage — Tab 5 Historical Analytics (Phase 9)
 * Multi-dimensional empirical delay distributions with isolated per-section state.
 * Strictly non-causal: zero causal terminology across all sections.
 */
export function DelayPatternsPage() {
  const navigate = useNavigate();

  // Collapsible guide state
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Section 1: Hourly Pattern State
  const [hourData, setHourData] = useState([]);
  const [hourLoading, setHourLoading] = useState(true);
  const [hourError, setHourError] = useState(null);
  const [hourView, setHourView] = useState('chart');

  // Section 2: Day of Week Pattern State
  const [dowData, setDowData] = useState([]);
  const [dowLoading, setDowLoading] = useState(true);
  const [dowError, setDowError] = useState(null);
  const [dowView, setDowView] = useState('chart');

  // Section 3: Category Pattern State
  const [catData, setCatData] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(null);
  const [catView, setCatView] = useState('chart');

  // Section 4: Journey Position Pattern State
  const [posData, setPosData] = useState([]);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState(null);
  const [posView, setPosView] = useState('chart');

  // Section 5: Hotspots Explorer State
  const [hotspotLevel, setHotspotLevel] = useState('station');
  const [hotspotOrder, setHotspotOrder] = useState('top');
  const [minSupportInput, setMinSupportInput] = useState(100);
  const [limitInput, setLimitInput] = useState(10);
  const [hotspotData, setHotspotData] = useState(null);
  const [hotspotLoading, setHotspotLoading] = useState(true);
  const [hotspotError, setHotspotError] = useState(null);

  // Station Detail Modal / Inline Drawer State
  const [selectedStationCode, setSelectedStationCode] = useState(null);
  const [stationDetail, setStationDetail] = useState(null);
  const [stationLoading, setStationLoading] = useState(false);
  const [stationError, setStationError] = useState(null);

  // Fetch Hourly Pattern
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

  // Fetch Day of Week Pattern
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

  // Fetch Category Pattern
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

  // Fetch Journey Position Pattern
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

  // Fetch Hotspots with applied parameters
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

  // Fetch Station Detail for drawer
  const fetchStationInfo = useCallback(async (code) => {
    if (!code) return;
    setStationLoading(true);
    setStationError(null);
    try {
      const raw = await getStationDetail(code);
      setStationDetail(adaptStationDetail(raw));
    } catch (err) {
      setStationError(err);
    } finally {
      setStationLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHour();
    fetchDow();
    fetchCategory();
    fetchPosition();
    fetchHotspots('station', 'top', 100, 10);
  }, [fetchHour, fetchDow, fetchCategory, fetchPosition, fetchHotspots]);

  // Handle Hotspots Apply Button
  const handleApplyHotspots = () => {
    const minBound = hotspotLevel === 'station' ? 100 : 50;
    const cleanMin = Math.max(minBound, Number(minSupportInput) || minBound);
    const cleanLimit = Math.max(1, Math.min(50, Number(limitInput) || 10));
    fetchHotspots(hotspotLevel, hotspotOrder, cleanMin, cleanLimit);
  };

  // Switch hotspot level handler
  const handleLevelChange = (newLevel) => {
    setHotspotLevel(newLevel);
    if (newLevel === 'train' && minSupportInput < 50) {
      setMinSupportInput(50);
    } else if (newLevel === 'station' && minSupportInput < 100) {
      setMinSupportInput(100);
    }
  };

  // Handle station click in hotspot table
  const handleStationClick = (code) => {
    setSelectedStationCode(code);
    fetchStationInfo(code);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Historical Analytics"
        subtitle="Fleet-wide delay distributions evaluated across 17.7L label-eligible halts (Oct 7–25, 2026)."
        badge={<Badge variant="primary">Observed Dataset</Badge>}
      />

      {/* 2. Educational Collapsible Guide */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader
          className="cursor-pointer select-none hover:bg-slate-50/70 transition-colors py-3 px-4"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-600 flex-shrink-0" aria-hidden="true" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                Methodological Scope & Boundary Principles
              </CardTitle>
            </div>
            <button
              type="button"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={isGuideOpen ? 'Collapse methodology guide' : 'Expand methodology guide'}
              aria-expanded={isGuideOpen}
            >
              {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </CardHeader>
        {isGuideOpen && (
          <CardContent className="pt-2 pb-5 px-4 border-t border-slate-100 text-xs text-slate-600 space-y-3 leading-relaxed">
            <p>
              All metrics represent empirical frequency calculations across{' '}
              <span className="font-semibold text-slate-800 font-mono">1,773,068</span> label-eligible stop arrivals recorded between{' '}
              <span className="font-semibold text-slate-800 font-mono">2026-10-07</span> and{' '}
              <span className="font-semibold text-slate-800 font-mono">2026-10-25</span>.
              Distributions demonstrate observed historical patterns, not forward journey predictions or operational causation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Standard Delay Threshold</span>
                <span>Arrival delay &gt; 15 min on label-eligible stops (seq &gt; 1, arrival_reported = 1).</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Early Arrivals Preserved</span>
                <span>Negative delays represent valid operational outcomes and are never truncated to zero.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Non-Causal Association</span>
                <span>Observational distributions indicate statistical association, not physical dispatch causes.</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 3. Section 1: By Hour of Day */}
      <section aria-labelledby="section-hourly-pattern" className="space-y-4">
        <SectionHeader
          id="section-hourly-pattern"
          title="Observed Delays by Scheduled Hour of Day"
          description="Empirical delay rate progression across the 24-hour cycle based on scheduled arrival hour in Indian Standard Time (IST)."
          icon={Clock}
          badge={<SupportBadge count={1773068} label="arrivals" />}
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
            title="Hourly Delayed Arrival Frequency"
            subtitle={`Scheduled arrival hour (IST). Dotted line marks fleet average (${(hourData?.fleetDelayedRate || 49.91).toFixed(1)}%).`}
            action={<ChartTableToggle view={hourView} onViewChange={setHourView} />}
            footer={
              <p className="text-xs text-slate-500">
                Key takeaway: Peak observed delayed rate occurs at{' '}
                <span className="font-semibold text-slate-800 font-mono">02:00 IST (62.2%)</span>, while minimum observed rate is recorded at{' '}
                <span className="font-semibold text-slate-800 font-mono">11:00 IST (38.8%)</span>.
              </p>
            }
          >
            {hourView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} vertical={false} />
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
                    <ReferenceLine
                      y={hourData?.fleetDelayedRate || 49.91}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ value: `Fleet Avg (${(hourData?.fleetDelayedRate || 49.91).toFixed(1)}%)`, position: 'top', fill: '#64748b', fontSize: 12 }}
                    />
                    <Bar dataKey="delayedRate" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {hourData.map((entry) => (
                        <Cell
                          key={`hour-bar-${entry.hour}`}
                          fill={entry.isLowSupport ? '#cbd5e1' : entry.delayedRate >= 55 ? '#ef4444' : '#3b82f6'}
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
                      <th className="py-2.5 px-3">Observed Delayed Rate</th>
                      <th className="py-2.5 px-3">Mean Delay</th>
                      <th className="py-2.5 px-3">Eligible Stops Volume</th>
                      <th className="py-2.5 px-3">Support Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {hourData.map((h) => (
                      <tr key={`table-hour-${h.hour}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-bold text-slate-900">{h.hourLabel}</td>
                        <td className="py-2 px-3 font-semibold text-blue-700">{formatPercentValue(h.delayedRate)}</td>
                        <td className="py-2 px-3 text-slate-700">{formatMinutes(h.meanDelayMin)}</td>
                        <td className="py-2 px-3 text-slate-600">{formatNumber(h.stopsCount)}</td>
                        <td className="py-2 px-3 font-sans">
                          {h.isLowSupport ? (
                            <span className="text-amber-700 font-medium">Low Support</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Robust</span>
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

      {/* 4. Section 2: By Day of Week */}
      <section aria-labelledby="section-dow-pattern" className="space-y-4">
        <SectionHeader
          id="section-dow-pattern"
          title="Observed Delays by Day of Week"
          description="Empirical delay frequencies across weekdays based on scheduled arrival date."
          icon={Calendar}
          badge={<SupportBadge count={7} label="weekdays" />}
        />

        {dowError ? (
          <ErrorState
            title="Unable to load day-of-week patterns"
            message={dowError.message}
            requestId={dowError.requestId}
            onRetry={fetchDow}
          />
        ) : dowLoading ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : (
          <ChartCard
            title="Weekday Punctuality Comparison"
            subtitle="Caution: Each weekday rests on only 2-3 calendar days in the 19-day window. Evidence for weekday variance is weak."
            action={<ChartTableToggle view={dowView} onViewChange={setDowView} />}
            footer={
              <p className="text-xs text-slate-500">
                Key takeaway: Observed delay rates range narrowly between{' '}
                <span className="font-semibold text-slate-800 font-mono">48.4% (Tuesday)</span> and{' '}
                <span className="font-semibold text-slate-800 font-mono">51.6% (Friday)</span>. Subtle variance reflects limited calendar sample depth.
              </p>
            }
          >
            {dowView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} vertical={false} />
                    <XAxis dataKey="dayOfWeek" stroke={CHART_THEME.textColor} fontSize={CHART_THEME.axisFontSize} tickLine={false} />
                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[40, 60]}
                    />
                    <Tooltip content={<DowTooltip />} />
                    <ReferenceLine y={50.44} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Bar dataKey="delayedRate" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Day of Week</th>
                      <th className="py-2.5 px-3">Calendar Days in Window</th>
                      <th className="py-2.5 px-3">Observed Delayed Rate</th>
                      <th className="py-2.5 px-3">Mean Delay</th>
                      <th className="py-2.5 px-3">Total Stops Monitored</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {dowData.map((d) => (
                      <tr key={`table-dow-${d.dayOfWeek}`} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">{d.dayOfWeek}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{d.calendarDaysCount} days</span>
                          {d.calendarDaysCount === 2 && <span className="text-amber-700 text-xs ml-1 font-sans">(partial sample)</span>}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">{formatPercentValue(d.delayedRate)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatMinutes(d.meanDelayMin)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatNumber(d.stopsCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        )}
      </section>

      {/* 5. Section 3: By Train Category */}
      <section aria-labelledby="section-category-pattern" className="space-y-4">
        <SectionHeader
          id="section-category-pattern"
          title="Observed Delays by Service Category"
          description="Delayed arrival frequency across train operational service classifications."
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
            title="Category Delay Comparison"
            subtitle="Sorted by eligible stop volume. Low-support service classes (<500 stops) are muted."
            action={<ChartTableToggle view={catView} onViewChange={setCatView} />}
            footer={
              <p className="text-xs text-slate-500">
                Key takeaway: Suburban (<span className="font-semibold text-slate-800 font-mono">SUB</span>) records the lowest delay rate at{' '}
                <span className="font-semibold text-slate-800 font-mono">17.1%</span>, whereas Holiday Specials (
                <span className="font-semibold text-slate-800 font-mono">TOD</span>) record the highest rate at{' '}
                <span className="font-semibold text-slate-800 font-mono">76.1%</span>.
              </p>
            }
          >
            {catView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} vertical={false} />
                    <XAxis dataKey="category" stroke={CHART_THEME.textColor} fontSize={CHART_THEME.axisFontSize} tickLine={false} />
                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 90]}
                    />
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${formatPercentValue(val)} (${formatMinutes(item.payload.meanDelayMin)} mean)`,
                        'Delayed Rate',
                      ]}
                    />
                    <Bar dataKey="delayedRate" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {catData.map((c) => (
                        <Cell
                          key={`cat-bar-${c.category}`}
                          fill={c.isLowSupport ? '#cbd5e1' : c.delayedRate >= 60 ? '#f97316' : '#2563eb'}
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
                      <th className="py-2.5 px-3">Service Code</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Observed Delayed Rate</th>
                      <th className="py-2.5 px-3">Mean Delay</th>
                      <th className="py-2.5 px-3">Median Delay</th>
                      <th className="py-2.5 px-3">Eligible Stops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {catData.map((c) => (
                      <tr key={`table-cat-${c.category}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <CategoryLabel category={c.category} />
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-sans">{c.categoryName}</td>
                        <td className="py-2 px-3 font-semibold text-blue-700">{formatPercentValue(c.delayedRate)}</td>
                        <td className="py-2 px-3 text-slate-700">{formatMinutes(c.meanDelayMin)}</td>
                        <td className="py-2 px-3 text-slate-600">{formatMinutes(c.medianDelayMin)}</td>
                        <td className="py-2 px-3 text-slate-600">{formatNumber(c.eligibleStops)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        )}
      </section>

      {/* 6. Section 4: By Journey Position */}
      <section aria-labelledby="section-position-pattern" className="space-y-4">
        <SectionHeader
          id="section-position-pattern"
          title="Observed Delays by Journey Sequence Position"
          description="Delayed arrival frequency as trains progress from origin departure to terminal destination."
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
            title="Delay Evolution Along Journey Route"
            subtitle="Delay accumulation across sequential halt intervals from origin to terminus."
            action={<ChartTableToggle view={posView} onViewChange={setPosView} />}
            footer={
              <p className="text-xs text-slate-500">
                Key takeaway: Observed delay rate increases monotonically from{' '}
                <span className="font-semibold text-slate-800 font-mono">26.3%</span> at early route stops (seq 2-3) to{' '}
                <span className="font-semibold text-slate-800 font-mono">73.9%</span> on deep journey terminal stops (seq &gt; 50).
              </p>
            }
          >
            {posView === 'chart' ? (
              <div className="h-80 min-h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={posData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} vertical={false} />
                    <XAxis dataKey="positionBucket" stroke={CHART_THEME.textColor} fontSize={CHART_THEME.axisFontSize} tickLine={false} />
                    <YAxis
                      stroke={CHART_THEME.textColor}
                      fontSize={CHART_THEME.axisFontSize}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 90]}
                    />
                    <Tooltip content={<PositionTooltip />} />
                    <Bar dataKey="delayedRate" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {posData.map((p, idx) => (
                        <Cell
                          key={`pos-bar-${p.positionBucket}`}
                          fill={idx >= 3 ? '#ea580c' : '#2563eb'}
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
                      <th className="py-2.5 px-3">Position Bucket</th>
                      <th className="py-2.5 px-3">Observed Delayed Rate</th>
                      <th className="py-2.5 px-3">Mean Delay</th>
                      <th className="py-2.5 px-3">Eligible Stops Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {posData.map((p) => (
                      <tr key={`table-pos-${p.positionBucket}`} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">{p.positionBucket}</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">{formatPercentValue(p.delayedRate)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatMinutes(p.meanDelayMin)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatNumber(p.stopsCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        )}
      </section>

      {/* 7. Section 5: Observed Delay Hotspots Explorer */}
      <section aria-labelledby="section-hotspots-explorer" className="space-y-4">
        <SectionHeader
          id="section-hotspots-explorer"
          title="Observed Delay Hotspots Explorer"
          description="Interactive ranking of high-delay network hotspots and punctual services with Wilson 95% confidence intervals."
          icon={Flame}
          badge={<Badge variant="default">Interactive Explorer</Badge>}
        />

        {/* Explorer Filter Bar */}
        <Card className="bg-slate-50/80 border-slate-200">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-wrap items-end gap-4 sm:gap-6">
              {/* Level Control */}
              <div className="space-y-1.5 min-w-[130px]">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Entity Level
                </label>
                <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => handleLevelChange('station')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      hotspotLevel === 'station' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Stations
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLevelChange('train')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      hotspotLevel === 'train' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Trains
                  </button>
                </div>
              </div>

              {/* Order Control */}
              <div className="space-y-1.5 min-w-[150px]">
                <label htmlFor="hotspot-order-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Ranking Order
                </label>
                <select
                  id="hotspot-order-select"
                  aria-label="Ranking Order"
                  value={hotspotOrder}
                  onChange={(e) => setHotspotOrder(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top">Top Hotspots (Most Delayed)</option>
                  <option value="bottom">Top Punctual (Least Delayed)</option>
                </select>
              </div>

              {/* Min Support Input */}
              <div className="space-y-1.5 min-w-[120px]">
                <label htmlFor="hotspot-min-support-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Min Support ({hotspotLevel === 'station' ? '>=100' : '>=50'})
                </label>
                <input
                  id="hotspot-min-support-input"
                  aria-label="Minimum observation support"
                  type="number"
                  min={hotspotLevel === 'station' ? 100 : 50}
                  max={2000}
                  step={25}
                  value={minSupportInput}
                  onChange={(e) => setMinSupportInput(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Limit Input */}
              <div className="space-y-1.5 min-w-[90px]">
                <label htmlFor="hotspot-limit-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Limit
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

              {/* Apply Button */}
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

        {/* Hotspots Results Table */}
        {hotspotError ? (
          <ErrorState
            title="Failed to load delay hotspots"
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
                  {hotspotOrder === 'top' ? 'Observed Delay Hotspots' : 'Observed Punctual Services'} (
                  {hotspotLevel === 'station' ? 'Stations' : 'Trains'})
                </CardTitle>
                <CardDescription className="text-xs">
                  Showing {hotspotData?.items?.length || 0} entries with at least {hotspotData?.minSupport} recorded stops.
                  Ranked by Wilson 95% confidence interval bounds.
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-slate-600">
                Window: 2026-10-07 to 2026-10-25
              </span>
            </CardHeader>

            <CardContent className="p-0">
              <div tabIndex={0} role="region" aria-label="Hotspots data table" className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-blue-400">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th scope="col" className="py-2.5 px-4">
                        {hotspotLevel === 'station' ? 'Station Code' : 'Train'}
                      </th>
                      <th className="py-2.5 px-4">Observed Delayed Rate</th>
                      <th className="py-2.5 px-4">Wilson 95% CI</th>
                      <th className="py-2.5 px-4">Mean Delay</th>
                      <th className="py-2.5 px-4">Stops Monitored</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {hotspotData?.items?.map((item) => (
                      <tr
                        key={item.stationCode || item.trainNumber}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-center text-slate-600 font-bold">{item.rank}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {hotspotLevel === 'station' ? (
                            <button
                              type="button"
                              onClick={() => handleStationClick(item.stationCode)}
                              className="text-blue-700 hover:text-blue-900 hover:underline font-bold font-mono inline-flex items-center gap-1"
                              title={`View stop details for station ${item.stationCode}`}
                            >
                              {item.stationCode}
                              <ChevronRight size={13} />
                            </button>
                          ) : (
                            <div className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => navigate(`/explorer/${item.trainNumber}`)}
                                className="text-blue-700 hover:text-blue-900 hover:underline font-bold font-mono inline-flex items-center gap-1"
                                title={`Open train ${item.trainNumber} in Train Explorer`}
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
                        <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">{formatConfidenceInterval(item.wilsonText)}</td>
                        <td className="py-3 px-4 text-slate-700">{formatMinutes(item.meanDelay)}</td>
                        <td className="py-3 px-4 text-slate-600">{formatNumber(item.stopsCount)}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          {hotspotLevel === 'station' ? (
                            <button
                              type="button"
                              onClick={() => handleStationClick(item.stationCode)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
                            >
                              Details
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/explorer/${item.trainNumber}`)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
                            >
                              Explore
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inline Station Detail Drawer Card */}
        {selectedStationCode && (
          <Card className="border-blue-200 bg-blue-50/20 shadow-md">
            <CardHeader className="pb-3 border-b border-blue-100 flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold text-blue-900 font-mono">
                  {selectedStationCode}
                </span>
                <Badge variant="primary">Station Historical Profile</Badge>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStationCode(null)}
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
                  Failed to load station profile for {selectedStationCode}: {stationError.message}
                </div>
              ) : stationDetail ? (
                <div className="space-y-4">
                  {/* Station KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">Observed Delayed Rate</span>
                      <span className="text-lg font-bold font-mono text-blue-700">
                        {formatPercentValue(stationDetail.delayedRate)}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">Mean Arrival Delay</span>
                      <span className="text-lg font-bold font-mono text-slate-800">
                        {formatMinutes(stationDetail.meanDelay)}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">Wilson 95% Confidence</span>
                      <span className="text-sm font-semibold font-mono tabular-nums text-slate-700 pt-1 block">
                        {formatConfidenceInterval(stationDetail.wilsonText)}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block">Calling Trains / Stops</span>
                      <span className="text-sm font-semibold font-mono text-slate-800 pt-1 block">
                        {formatNumber(stationDetail.trainsCount)} trains ({formatNumber(stationDetail.stopsCount)} stops)
                      </span>
                    </div>
                  </div>

                  {/* Calling Trains Sample */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Calling Trains Sample ({stationDetail.callingTrainsSample.length} services)
                    </h4>
                    <div className="overflow-x-auto overflow-y-auto max-h-52 border border-slate-200 rounded-xl bg-white overscroll-contain">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-600 sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Train</th>
                            <th className="py-2 px-3">Service Name</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3">Delayed Rate</th>
                            <th className="py-2 px-3">Mean Delay</th>
                            <th className="py-2 px-3">Observed Stops</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {stationDetail.callingTrainsSample.map((tr) => (
                            <tr key={`calling-${tr.trainNumber}`} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-bold text-blue-700">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/explorer/${tr.trainNumber}`)}
                                  className="hover:underline font-bold"
                                >
                                  {tr.trainNumber}
                                </button>
                              </td>
                              <td className="py-1.5 px-3 text-slate-800 font-sans">{tr.trainName || '—'}</td>
                              <td className="py-1.5 px-3 font-sans">
                                <CategoryLabel category={tr.category} />
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800">
                                {formatPercentValue(tr.delayedRate)}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600">{formatMinutes(tr.meanDelay)}</td>
                              <td className="py-1.5 px-3 text-slate-500 font-mono">{tr.observedStops < 30 ? <span className="inline-flex items-center gap-1">{tr.observedStops} <SupportBadge count={tr.observedStops} threshold={30} label="stops" /></span> : tr.observedStops}</td>
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

      {/* 8. Footer */}
      <footer className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          <span>Data snapshot: </span>
          <span className="font-medium text-slate-700">Oct 25, 2026</span>
          <span className="mx-2">•</span>
          <span>Source: </span>
          <span className="font-medium text-slate-700">Observed Railway Dataset</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Query Engine: In-Memory Indexed Cache</span>
        </div>
      </footer>
    </div>
  );
}

export default DelayPatternsPage;
