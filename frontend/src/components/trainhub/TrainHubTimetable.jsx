import { useState, useMemo } from 'react';
import { Search, Gauge } from 'lucide-react';
import { Card, SectionHeader, RateBar } from '../ui';
import { formatMinutes } from '../../utils/format';

/**
 * TrainHubTimetable Component
 * Canonical route timetable keyed strictly by seq.
 * Displays station CODES ONLY (strictly no fabricated names).
 * Allows user to pick a stop to estimate pre-departure delay risk.
 */
export function TrainHubTimetable({
  stops = [],
  selectedSeq = '',
  onSelectStop,
  className = '',
}) {
  const [stationFilter, setStationFilter] = useState('');
  const [showAllStops, setShowAllStops] = useState(false);

  const filteredStops = useMemo(() => {
    if (!stationFilter.trim()) return stops;
    const clean = stationFilter.trim().toUpperCase();
    return stops.filter((s) => s.stationCode?.toUpperCase().includes(clean));
  }, [stops, stationFilter]);

  const stopsToDisplay = useMemo(() => {
    if (showAllStops || filteredStops.length <= 25) {
      return filteredStops;
    }
    return filteredStops.slice(0, 25);
  }, [filteredStops, showAllStops]);

  const hasMoreStops = !showAllStops && filteredStops.length > 25;

  return (
    <div className={`space-y-4 ${className}`}>
      <SectionHeader
        title="Canonical Timetable & Stop Delay Rates"
        description="Route halts ordered strictly by sequence number (seq). Keyed to preserve exact circular routes and repeated station visits."
      />

      <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Quick filter by station code */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              placeholder="Filter by station code (e.g. BVI)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[38px]"
              aria-label="Filter timetable stops by station code"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {stopsToDisplay.length} of {filteredStops.length} stops
          </div>
        </div>

        {/* Timetable Table */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Route timetable"
          className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-100 py-2.5 px-3 w-12 text-center border-r border-slate-200 shadow-sm">
                  #
                </th>
                <th className="py-2.5 px-3 font-semibold">Station Code</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Scheduled Arrival</th>
                <th className="py-2.5 px-3">Scheduled Departure</th>
                <th className="py-2.5 px-3 min-w-[130px]">Observed Delay Rate</th>
                <th className="py-2.5 px-3">Avg Delay</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stopsToDisplay.map((stop) => {
                const isSelected = String(stop.seq) === String(selectedSeq);
                const isOrigin = stop.seq === 1 || stop.isOrigin;

                return (
                  <tr
                    key={stop.seq} // Strictly keyed by seq
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 font-medium'
                        : isOrigin
                        ? 'bg-blue-50/20'
                        : stop.isTerminus
                        ? 'bg-purple-50/20'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Seq */}
                    <td
                      className={`sticky left-0 z-10 py-2.5 px-3 font-mono font-bold text-slate-600 text-center border-r border-slate-200 ${
                        isSelected
                          ? 'bg-blue-100/95 text-blue-900'
                          : isOrigin
                          ? 'bg-blue-50/90'
                          : stop.isTerminus
                          ? 'bg-purple-50/90'
                          : 'bg-white'
                      }`}
                    >
                      {stop.seq}
                    </td>

                    {/* Station CODE ONLY (no invented station names!) */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-sm">
                      {stop.stationCode}
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-3">
                      {isOrigin ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          Origin
                        </span>
                      ) : stop.isTerminus ? (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Terminus
                        </span>
                      ) : (
                        <span className={isSelected ? 'text-blue-900 font-semibold' : 'text-slate-600'}>Intermediate</span>
                      )}
                    </td>

                    {/* Scheduled Arrival */}
                    <td className="py-2.5 px-3 font-mono">
                      {stop.scheduledArrivalTime ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{stop.scheduledArrivalTime}</span>
                          {stop.arrivalDayOffset > 0 && (
                            <span className="text-xs font-bold text-slate-800 bg-slate-200 px-1 rounded">
                              +{stop.arrivalDayOffset}d
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">—</span>
                      )}
                    </td>

                    {/* Scheduled Departure */}
                    <td className="py-2.5 px-3 font-mono">
                      {stop.scheduledDepartureTime ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{stop.scheduledDepartureTime}</span>
                          {stop.departureDayOffset > 0 && (
                            <span className="text-xs font-bold text-slate-800 bg-slate-200 px-1 rounded">
                              +{stop.departureDayOffset}d
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">—</span>
                      )}
                    </td>

                    {/* Observed Delayed Rate */}
                    <td className="py-2.5 px-3">
                      {isOrigin ? (
                        <span className="text-xs text-slate-500 italic">
                          Not applicable (origin)
                        </span>
                      ) : (
                        <RateBar
                          rate={stop.observedDelayedRate}
                          showLabel
                          isMuted={stop.isLowSupport}
                        />
                      )}
                    </td>

                    {/* Average Delay */}
                    <td className="py-2.5 px-3 font-mono">
                      {isOrigin ? (
                        <span className="text-slate-500">—</span>
                      ) : stop.observedMeanDelayMin !== null && stop.observedMeanDelayMin !== undefined ? (
                        <span
                          className={
                            stop.observedMeanDelayMin > 15
                              ? 'text-rose-600 font-semibold'
                              : 'text-slate-700'
                          }
                        >
                          {formatMinutes(stop.observedMeanDelayMin)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Action: Estimate this stop */}
                    <td className="py-2 px-3 text-right">
                      {isOrigin ? (
                        <span
                          className="text-xs text-slate-300 cursor-not-allowed select-none px-2 py-1"
                          title="Origin stops cannot be predicted (pre-departure only applies to arrival stops)"
                        >
                          Origin
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectStop && onSelectStop(stop.seq)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
                          }`}
                          aria-label={`Estimate delay risk for stop ${stop.seq} at ${stop.stationCode}`}
                        >
                          <Gauge size={13} aria-hidden="true" />
                          <span>{isSelected ? 'Selected' : 'Estimate'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expand / Collapse buttons if long timetable */}
        {hasMoreStops && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => setShowAllStops(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1.5 px-3 rounded hover:bg-white min-h-[44px]"
            >
              Show All {filteredStops.length} Stops (Showing first 25)
            </button>
          </div>
        )}

        {showAllStops && filteredStops.length > 25 && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => setShowAllStops(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1.5 px-3 rounded hover:bg-white min-h-[44px]"
            >
              Show Fewer Stops (First 25)
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TrainHubTimetable;
