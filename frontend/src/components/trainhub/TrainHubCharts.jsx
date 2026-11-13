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
  ReferenceLine,
  Cell,
} from 'recharts';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Card, CardContent, ChartCard, PartialDayLegend } from '../ui';
import { formatNumber, formatPercent, formatMinutes, formatDate } from '../../utils/format';
import { CHART_THEME } from '../charts/chartTheme';
import { PARTIAL_DATES } from '../../config/constants';

function ProgressionTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const stop = payload[0].payload;

  return (
    <div
      style={CHART_THEME.tooltipProps.contentStyle}
      className="shadow-lg border border-slate-700 pointer-events-none z-50 min-w-[200px]"
    >
      <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-2 flex items-center justify-between">
        <span className="font-mono text-blue-400 font-bold">Stop #{stop.seq}: {stop.stationCode}</span>
        {stop.isOrigin && <span className="text-xs bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">Origin</span>}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Observed Delayed Rate:</span>
          <span className="font-bold text-rose-400 tabular-nums">
            {formatPercent(stop.delayedRate, false, 1)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Mean Arrival Delay:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {formatMinutes(stop.meanDelay)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800 text-xs">
          <span>Stops Observed:</span>
          <span className="tabular-nums font-mono">{formatNumber(stop.stopsCount)}</span>
        </div>
      </div>
    </div>
  );
}

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
 * TrainHubCharts Component
 * Stop progression profile & daily performance history charts for selected train.
 */
export function TrainHubCharts({ train, className = '' }) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  if (!train) return null;

  // Progression chart data (exclude origin seq=1 since arrival delay is not applicable)
  const progressionData = (train.stops || [])
    .filter((s) => !s.isOrigin && s.seq > 1)
    .map((s) => ({
      seq: s.seq,
      stationCode: s.stationCode,
      delayedRate: s.observedDelayedRate !== null ? s.observedDelayedRate : 0,
      meanDelay: s.observedMeanDelayMin !== null ? s.observedMeanDelayMin : 0,
      stopsCount: s.observedStopsCount || 0,
      isLowSupport: s.isLowSupport,
    }));

  // Date history data
  const historyData = (train.historyByDate || []).map((h) => ({
    date: h.startDate,
    delayedRate: h.delayedRate !== null ? h.delayedRate : 0,
    meanDelay: h.meanDelay !== null ? h.meanDelay : 0,
    stopsCount: h.stopsCount || 0,
    isPartial: Boolean(h.isPartial),
    partialNote: h.partialNote,
  }));

  const hasBoundaryDates = historyData.some((h) => PARTIAL_DATES.includes(h.date));

  // Find stop where delays build up highest
  const maxDelayStop = progressionData.reduce((max, cur) => {
    return cur.delayedRate > (max?.delayedRate || 0) ? cur : max;
  }, null);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Route Stop Progression Chart */}
      <ChartCard
        title="Stop Delay Progression Along Route"
        subtitle="Where delays build up (observed) along the sequence of intermediate halts from origin to terminus."
      >
        {maxDelayStop && maxDelayStop.delayedRate > 0 && (
          <div className="mb-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span>Peak observed halt: Stop #{maxDelayStop.seq} ({maxDelayStop.stationCode}) at {formatPercent(maxDelayStop.delayedRate, false, 1)}</span>
          </div>
        )}

        <div style={{ height: `${CHART_THEME.heights.standard}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={progressionData}
              margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid {...CHART_THEME.gridProps} />
              <XAxis
                dataKey="seq"
                tickFormatter={(seq) => `#${seq}`}
                {...CHART_THEME.axisProps}
                label={{
                  value: 'Stop Sequence (#)',
                  position: 'insideBottom',
                  offset: -15,
                  style: { fill: CHART_THEME.colors.textMuted, fontSize: 12 },
                }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                {...CHART_THEME.axisProps}
              />
              <Tooltip content={<ProgressionTooltip />} />
              {train.delayedRate !== null && train.delayedRate !== undefined && (
                <ReferenceLine
                  y={train.delayedRate}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg: ${formatPercent(train.delayedRate, false, 1)}`,
                    position: 'insideTopRight',
                    fill: '#64748B',
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="delayedRate"
                stroke={CHART_THEME.colors.primary}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_THEME.colors.primary }}
                activeDot={{ r: 6 }}
                name="Delayed Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 2. Daily Performance Bar Chart */}
      {historyData.length > 0 && (
        <ChartCard
          title="Daily Performance History"
          subtitle="Observed delay rate by journey start date across the 19-day snapshot."
        >
          {hasBoundaryDates && (
            <div className="mb-3">
              <PartialDayLegend />
            </div>
          )}

          <div style={{ height: `${CHART_THEME.heights.standard}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={historyData}
                margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
              >
                <CartesianGrid {...CHART_THEME.gridProps} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => {
                    if (!d) return '';
                    const parts = d.split('-');
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
                  }}
                  {...CHART_THEME.axisProps}
                  label={{
                    value: 'Journey Date',
                    position: 'insideBottom',
                    offset: -15,
                    style: { fill: CHART_THEME.colors.textMuted, fontSize: 12 },
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                  {...CHART_THEME.axisProps}
                />
                <Tooltip content={<DateHistoryTooltip />} />
                <Bar dataKey="delayedRate" radius={[4, 4, 0, 0]} name="Delayed Rate (%)">
                  {historyData.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={
                        entry.isPartial
                          ? CHART_THEME.colors.warning
                          : entry.delayedRate > 50
                          ? CHART_THEME.colors.delayed
                          : CHART_THEME.colors.primary
                      }
                      fillOpacity={entry.isPartial ? 0.75 : 0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* 3. About These Numbers Collapsible */}
      <Card className="border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setIsAboutOpen(!isAboutOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          aria-expanded={isAboutOpen}
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-blue-600" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-900">About these numbers</span>
          </div>
          {isAboutOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </button>

        {isAboutOpen && (
          <CardContent className="pt-0 pb-4 text-xs text-slate-600 space-y-2 border-t border-slate-100">
            <ul className="list-disc list-inside space-y-1.5 pt-3">
              <li>
                <strong>Delayed stop definition:</strong> An arrival delayed by more than 15 minutes on stops where sequence &gt; 1 and arrival was recorded.
              </li>
              <li>
                <strong>Sequence integrity:</strong> All stops are ordered strictly by sequence number (<code className="font-mono">seq</code>) to preserve circular and repeating halts accurately.
              </li>
              <li>
                <strong>Snapshot coverage:</strong> Based on the observed 19-day snapshot (Oct 7 – Oct 25, 2026).
              </li>
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default TrainHubCharts;
