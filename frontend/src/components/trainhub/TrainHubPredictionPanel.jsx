import { useState } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Play,
  Info,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  RiskBadge,
  FactorBars,
  SupportBadge,
  Spinner,
} from '../ui';
import { formatFractionAsPercent, formatPercentValue, formatMinutes, formatDate, pluralize } from '../../utils/format';
import { DATASET_WINDOW, LOW_SUPPORT_THRESHOLD } from '../../config/constants';

/**
 * TrainHubPredictionPanel Component
 * Embedded schedule-time pre-departure delay forecasting panel.
 * Word "probability" is explicitly allowed here.
 * Prefills without auto-submitting.
 */
export function TrainHubPredictionPanel({
  train,
  selectedSeq,
  onSeqChange,
  journeyDate,
  onDateChange,
  prediction,
  predicting,
  predictionError,
  cooldownSeconds = 0,
  onSubmit,
  className = '',
}) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Find currently selected stop object
  const stops = train?.stops || [];
  const currentStop = stops.find((s) => String(s.seq) === String(selectedSeq));

  const isOriginSelected = selectedSeq === '1' || currentStop?.isOrigin;

  // Window status checks
  const isInWindow = Boolean(
    prediction?.journey_date &&
    prediction.journey_date >= DATASET_WINDOW.startDate &&
    prediction.journey_date <= DATASET_WINDOW.endDate
  );

  const isOutOfWindow = Boolean(
    prediction?.journey_date &&
    (prediction.journey_date < DATASET_WINDOW.startDate || prediction.journey_date > DATASET_WINDOW.endDate)
  );

  const isColdStart = Boolean(prediction?.historical_context?.is_cold_start);

  const thresholdPercent = prediction?.threshold_used
    ? Math.round(prediction.threshold_used * 100)
    : 41;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Prediction Inputs Form */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600" aria-hidden="true" />
              <CardTitle className="text-base font-bold text-slate-900">
                Estimate Delay Risk
              </CardTitle>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              LightGBM
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Pre-departure schedule-time forecast using timetable attributes and rolling historical priors.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Target Stop Selector */}
            <div className="space-y-1.5">
              <label htmlFor="hub-stop-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Target Arrival Stop
              </label>
              <select
                id="hub-stop-select"
                value={selectedSeq}
                onChange={(e) => onSeqChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                <option value="">Choose arrival stop...</option>
                {stops.map((s) => {
                  const isOrigin = s.seq === 1 || s.isOrigin;
                  return (
                    <option
                      key={s.seq}
                      value={s.seq}
                      disabled={isOrigin}
                      className={isOrigin ? 'text-slate-400 bg-slate-50' : 'text-slate-900'}
                    >
                      {isOrigin
                        ? `Stop #${s.seq}: ${s.stationCode} (Origin — departs from here)`
                        : `Stop #${s.seq}: ${s.stationCode} — Day +${s.arrivalDayOffset || 0} ${s.scheduledArrivalTime || ''}`}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500">
                Origin stops (seq=1) have no arrival delay; pick an intermediate or terminus stop.
              </p>
            </div>

            {/* Journey Date Input */}
            <div className="space-y-1.5">
              <label htmlFor="hub-date-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Journey Start Date
              </label>
              <div className="relative">
                <input
                  id="hub-date-input"
                  aria-label="Journey Start Date"
                  type="date"
                  value={journeyDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                />
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs text-slate-500">
                Observed snapshot: {formatDate(DATASET_WINDOW.startDate)} – {formatDate(DATASET_WINDOW.endDate)}.
              </p>
            </div>

            {/* Error Banner */}
            {predictionError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
              >
                <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{predictionError}</span>
              </div>
            )}

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={!selectedSeq || isOriginSelected || !journeyDate || predicting || cooldownSeconds > 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed min-h-[44px]"
              aria-label="Estimate Delay Risk"
            >
              {predicting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Estimating Risk...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <span>Try again in {cooldownSeconds}s</span>
              ) : (
                <>
                  <Play size={14} className="text-white fill-white" aria-hidden="true" />
                  <span>Estimate Delay Risk</span>
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* 2. Results Section (when prediction is available) */}
      <div aria-live="polite">
        {prediction && (
          <div className="space-y-6" data-testid="prediction-result-panel">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Prediction Result
                  </CardTitle>
                  <RiskBadge riskBand={prediction.risk_band} size="md" />
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Stop #{prediction.seq} ({prediction.station_code}) on {formatDate(prediction.journey_date)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Primary Metric Banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Classification
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xl font-bold ${
                            prediction.predicted_delayed ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {prediction.predicted_delayed ? 'Likely Delayed' : 'Likely On Time'}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {prediction.predicted_delayed
                            ? `Estimated above alert threshold (${(prediction.threshold_used ?? 0.41).toFixed(2)})`
                            : `Estimated below alert threshold (${(prediction.threshold_used ?? 0.41).toFixed(2)})`}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Estimated Delay Probability
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-900">
                        {formatFractionAsPercent(prediction.probability_delayed, 1)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/80">
                    Delayed means arriving more than 15 minutes after scheduled time. The model flags a delay when the estimate is above {thresholdPercent}%.
                  </p>
                </div>

                {/* Status Chips */}
                {(isInWindow || isOutOfWindow || isColdStart) && (
                  <div
                    className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100"
                    role="region"
                    aria-label="Prediction operational status"
                  >
                    {isInWindow && (
                      <div
                        tabIndex={0}
                        role="status"
                        title={`The model and rolling aggregates saw these dates (${formatDate(DATASET_WINDOW.startDate)} – ${formatDate(DATASET_WINDOW.endDate)}). Treat the result as an illustration of in-sample statistical associations.`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 cursor-help"
                      >
                        <Info size={13} className="text-slate-500 flex-shrink-0" aria-hidden="true" />
                        <span>Date inside training window</span>
                      </div>
                    )}

                    {isOutOfWindow && (
                      <div
                        tabIndex={0}
                        role="status"
                        title={`Journey date is outside the recorded observation window (${formatDate(DATASET_WINDOW.startDate)} – ${formatDate(DATASET_WINDOW.endDate)}). Prediction assumes standard timetable patterns.`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 cursor-help"
                      >
                        <Calendar size={13} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
                        <span>Outside observed window</span>
                      </div>
                    )}

                    {isColdStart && (
                      <div
                        tabIndex={0}
                        role="status"
                        title="Cold-start fallback: fewer than 5 historical runs recorded for this service or stop in the observation window. Estimates rely on category priors."
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 cursor-help"
                      >
                        <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
                        <span>Limited history</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Factor Bars */}
                <FactorBars factors={prediction.contributing_factors} />
              </CardContent>
            </Card>

            {/* Station Delay History Card */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-600" aria-hidden="true" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Station Delay History
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Empirical baseline metrics observed on Stop #{selectedSeq} ({prediction.station_code}) across recorded runs.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {currentStop ? (
                  <>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-xs text-slate-500 font-medium">Historical Delay Rate</div>
                      <div className="text-xl font-bold font-mono text-slate-900">
                        {currentStop.observedDelayedRate !== null && currentStop.observedDelayedRate !== undefined
                          ? formatPercentValue(currentStop.observedDelayedRate, 1)
                          : 'Not available'}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>
                          {pluralize(currentStop.observedStopsCount || 0, 'observed run', 'observed runs')}
                        </span>
                        <SupportBadge
                          count={currentStop.observedStopsCount || 0}
                          threshold={LOW_SUPPORT_THRESHOLD}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block">Average Delay</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {currentStop.observedMeanDelayMin !== null && currentStop.observedMeanDelayMin !== undefined
                            ? formatMinutes(currentStop.observedMeanDelayMin)
                            : '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block">Scheduled Time</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {currentStop.scheduledArrivalTime || '—'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 italic">
                      Past observed rate at this stop; separate from the model&apos;s estimate above.
                    </p>
                  </>
                ) : (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    Historical baseline metrics for this stop will appear here.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* About This Prediction Collapsible */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setIsAboutOpen(!isAboutOpen)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                aria-expanded={isAboutOpen}
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-600" aria-hidden="true" />
                  <span className="text-xs font-bold text-slate-900">About this prediction</span>
                </div>
                {isAboutOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </button>

              {isAboutOpen && (
                <CardContent className="pt-0 pb-4 text-xs text-slate-600 space-y-2 border-t border-slate-100">
                  <ul className="list-disc list-inside space-y-1.5 pt-3 leading-relaxed">
                    <li>
                      <strong>Delay definition:</strong> Arrival delay &gt; 15 minutes at the scheduled stop.
                    </li>
                    <li>
                      <strong>Pre-departure forecast:</strong> Computed before departure using scheduled timetable attributes, route sequence, and rolling historical delay patterns.
                    </li>
                    <li>
                      <strong>Information boundaries:</strong> The model does not observe live en-route track events, signal disruptions, or tactical dispatch interventions.
                    </li>
                    <li>
                      <strong>Operational threshold:</strong> The decision threshold is {(prediction.threshold_used ?? 0.41).toFixed(2)} ({thresholdPercent}%) to balance precision and recall.
                    </li>
                    <li>
                      <strong>Data snapshot:</strong> Model parameters and historical priors were computed from observations between {formatDate(DATASET_WINDOW.startDate)} and {formatDate(DATASET_WINDOW.endDate)}.
                    </li>
                  </ul>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainHubPredictionPanel;
