import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  Play,
  Calendar,
  MapPin,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  SectionHeader,
  Badge,
  Spinner,
  TrainPicker,
  RiskBadge,
  FactorBars,
  CategoryLabel,
  SupportBadge,
} from '../components/ui';
import { getTrainDetail, predictDelay } from '../api/endpoints';
import { formatPercentValue, formatFractionAsPercent, formatMinutes, formatDate, pluralize } from '../utils/format';
import { LOW_SUPPORT_THRESHOLD, DATASET_WINDOW } from '../config/constants';

/**
 * DelayPredictionPage — Tab 3 ("Delay Prediction")
 * Interactive schedule-time pre-departure delay forecasting.
 */
export function DelayPredictionPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Form State
  const initialTrain = searchParams.get('train') || '';
  const initialSeq = searchParams.get('seq') || '';
  const initialDate = searchParams.get('date') || '';

  const [trainNumber, setTrainNumber] = useState(initialTrain);
  const [selectedSeq, setSelectedSeq] = useState(initialSeq);
  const [journeyDate, setJourneyDate] = useState(initialDate);

  // Train Detail (for route stops lookup)
  const [trainDetail, setTrainDetail] = useState(null);
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [trainError, setTrainError] = useState(null);

  // Inference State
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  // Rate Limiting (429) Cooldown State
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Collapsible for About This Prediction (closed by default)
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Handle Rate Limit Countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Load Train Details when trainNumber changes
  useEffect(() => {
    const cleanTrain = String(trainNumber || '').trim();
    if (!cleanTrain) {
      setTrainDetail(null);
      return;
    }

    let isMounted = true;
    setLoadingTrain(true);
    setTrainError(null);

    getTrainDetail(cleanTrain)
      .then((data) => {
        if (!isMounted) return;
        setTrainDetail(data);
        setLoadingTrain(false);

        // Auto-select stop if seq requested or default to first intermediate stop
        const availableStops = (data.stops || []).filter((s) => s.seq > 1);
        if (initialSeq && availableStops.some((s) => String(s.seq) === String(initialSeq))) {
          setSelectedSeq(String(initialSeq));
        } else if (availableStops.length > 0 && !selectedSeq) {
          setSelectedSeq(String(availableStops[0].seq));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setTrainError(err.message || 'Train service details not found.');
        setLoadingTrain(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainNumber]);

  // Form Submit Handler
  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!trainNumber || !selectedSeq || !journeyDate) return;
    if (cooldownSeconds > 0) return;

    // Find stop station code
    const stop = trainDetail?.stops?.find((s) => String(s.seq) === String(selectedSeq));
    if (!stop) {
      setPredictionError('Please select a valid intermediate or terminus arrival stop.');
      return;
    }

    setPredicting(true);
    setPredictionError(null);

    // Update query params in URL
    setSearchParams({
      train: trainNumber,
      seq: selectedSeq,
      date: journeyDate,
    });

    try {
      const response = await predictDelay({
        train_number: trainNumber,
        station_code: stop.station_code,
        seq: parseInt(selectedSeq, 10),
        date: journeyDate,
      });

      setPrediction(response);
      setPredicting(false);
    } catch (err) {
      setPredicting(false);
      if (err.status === 429) {
        setCooldownSeconds(20);
        setPredictionError('Rate limit exceeded (120 req/min). Please wait a few seconds before trying again.');
      } else if (err.status === 422) {
        setPredictionError(err.message || 'Arrival delay is not applicable for this stop.');
      } else {
        setPredictionError(err.message || 'Failed to compute prediction. Please verify inputs.');
      }
    }
  };

  // Find currently selected stop object
  const currentStop = trainDetail?.stops?.find((s) => String(s.seq) === String(selectedSeq));

  // Determine window status for compact chips
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
    <div className="space-y-6">
      <PageHeader
        title="Delay Prediction Engine"
        subtitle="Pre-departure schedule-time arrival delay probability forecasting based on timetable attributes, route position, and rolling 7-day priors."
        badge={
          <Badge variant="primary" className="font-mono text-xs">
            LightGBM
          </Badge>
        }
      />

      {/* 1. Interactive Prediction Form */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-primary-600" aria-hidden="true" />
            <CardTitle>Prediction Inputs</CardTitle>
          </div>
          <CardDescription>
            Specify a train service, destination stop, and planned journey start date. Pre-departure inference uses strictly pre-run timetable features with zero en-route leakage.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePredict} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Train Combobox */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Train Service
                </label>
                <TrainPicker
                  value={trainNumber}
                  onChange={(selected) => {
                    if (selected) {
                      setTrainNumber(selected.train_number);
                      setSelectedSeq('');
                      setPrediction(null);
                    } else {
                      setTrainNumber('');
                      setSelectedSeq('');
                      setTrainDetail(null);
                      setPrediction(null);
                    }
                  }}
                  placeholder="Search train (e.g., 12951)..."
                />
                {trainDetail && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{trainDetail.train_name}</span>
                    {trainDetail.category && (
                      <CategoryLabel category={trainDetail.category} showName={false} />
                    )}
                  </div>
                )}
                {loadingTrain && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Spinner size="sm" />
                    <span>Loading route halts...</span>
                  </div>
                )}
                {trainError && (
                  <div className="text-xs text-rose-600 mt-1 font-medium">{trainError}</div>
                )}
              </div>

              {/* Stop Selector by Seq */}
              <div className="space-y-1.5">
                <label htmlFor="target-stop-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Arrival Stop
                </label>
                <select
                  id="target-stop-select"
                  value={selectedSeq}
                  onChange={(e) => setSelectedSeq(e.target.value)}
                  disabled={!trainDetail || loadingTrain}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!trainDetail ? 'Select a train first...' : 'Choose arrival stop...'}
                  </option>
                  {trainDetail?.stops?.map((s) => {
                    const isOrigin = s.seq === 1;
                    return (
                      <option
                        key={s.seq}
                        value={s.seq}
                        disabled={isOrigin}
                        className={isOrigin ? 'text-slate-400 bg-slate-50' : 'text-slate-900'}
                      >
                        {isOrigin
                          ? `Stop #${s.seq}: ${s.station_code} (Origin — departs from here)`
                          : `Stop #${s.seq}: ${s.station_code} (${s.station_name || 'Station'}) — Day +${s.arrival_day_offset || 0} ${s.scheduled_arrival_time || ''}`}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-slate-500">
                  Origin stops (seq=1) have no arrival delay; select an intermediate or terminus stop.
                </p>
              </div>

              {/* Journey Date Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="journey-date-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Journey Start Date
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="journey-date-input"
                    aria-label="Journey Start Date"
                    type="date"
                    value={journeyDate}
                    onChange={(e) => setJourneyDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            </div>

            {/* Form Error Banner */}
            {predictionError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{predictionError}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={!trainNumber || !selectedSeq || !journeyDate || predicting || cooldownSeconds > 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed min-h-[44px]"
                aria-label="Run Prediction"
              >
                {predicting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Running Prediction...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <span>Try again in {cooldownSeconds}s</span>
                ) : (
                  <>
                    <Play size={15} className="text-white fill-white" aria-hidden="true" />
                    <span>Run Prediction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Results Section (Live Region) */}
      <div aria-live="polite">
        {prediction && (
          <div className="space-y-6">
            <SectionHeader
              title="Prediction Result & Risk Profile"
              description={`Schedule-time forecast for Train ${prediction.train_number} arriving at ${prediction.station_code} (stop #${prediction.seq}) on ${formatDate(prediction.journey_date)}.`}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 2a. Primary Prediction Result Card */}
              <Card className="lg:col-span-2 border-slate-200 bg-white">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle>Prediction Result</CardTitle>
                    <RiskBadge riskBand={prediction.risk_band} size="md" />
                  </div>
                  <CardDescription>
                    Calibrated delay probability and risk classification for this scheduled arrival.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Clean Result Presentation */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Classification
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-2xl font-bold ${
                              prediction.predicted_delayed ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {prediction.predicted_delayed ? 'Likely Delayed' : 'Likely On Time'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
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
                        <div className="text-3xl font-bold font-mono text-slate-900">
                          {formatFractionAsPercent(prediction.probability_delayed, 1)}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/80">
                      Delayed means arriving more than 15 minutes after the scheduled time. The model flags a delay when the estimate is above {thresholdPercent}%.
                    </p>
                  </div>

                  {/* Compact Status Chips Row */}
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 cursor-help focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <Info size={13} className="text-slate-500 flex-shrink-0" aria-hidden="true" />
                          <span>Date inside training window</span>
                        </div>
                      )}

                      {isOutOfWindow && (
                        <div
                          tabIndex={0}
                          role="status"
                          title={`Journey date is outside the recorded observation window (${formatDate(DATASET_WINDOW.startDate)} – ${formatDate(DATASET_WINDOW.endDate)}). Prediction assumes standard timetable patterns without seasonality or holiday adjustments.`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 cursor-help focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <Calendar size={13} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
                          <span>Outside observed window</span>
                        </div>
                      )}

                      {isColdStart && (
                        <div
                          tabIndex={0}
                          role="status"
                          title="Cold-start fallback: fewer than 5 historical runs recorded for this service or stop in the observation window. Estimates rely on category-level priors."
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 cursor-help focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" aria-hidden="true" />
                          <span>Limited history</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Why This Prediction? (Top 3 factors with visual relative bars, no numbers) */}
                  <FactorBars factors={prediction.contributing_factors} />
                </CardContent>
              </Card>

              {/* 2b. Station Delay History */}
              <div className="space-y-6">
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-slate-600" aria-hidden="true" />
                      <CardTitle>Station Delay History</CardTitle>
                    </div>
                    <CardDescription>
                      Empirical baseline metrics observed on this exact stop across recorded runs.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {currentStop ? (
                      <>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                          <div className="text-xs text-slate-500 font-medium">Historical Delay Rate</div>
                          <div className="text-2xl font-bold font-mono text-slate-900">
                            {currentStop.observed_delayed_rate !== null && currentStop.observed_delayed_rate !== undefined
                              ? formatPercentValue(currentStop.observed_delayed_rate, 1)
                              : 'Not available'}
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span>
                              {pluralize(currentStop.observed_stops_count || 0, 'observed run', 'observed runs')}
                            </span>
                            <SupportBadge
                              count={currentStop.observed_stops_count || 0}
                              threshold={LOW_SUPPORT_THRESHOLD}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block">Average Delay</span>
                            <span className="font-mono font-bold text-slate-800 text-sm">
                              {currentStop.observed_mean_delay_min !== null && currentStop.observed_mean_delay_min !== undefined
                                ? formatMinutes(currentStop.observed_mean_delay_min)
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block">Scheduled Time</span>
                            <span className="font-mono font-bold text-slate-800 text-sm">
                              {currentStop.scheduled_arrival_time || '—'}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed italic">
                          Past observed rate at this stop; separate from the model&apos;s estimate above.
                        </p>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 py-4 text-center">
                        Select a stop to view historical stop-level baseline rates.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 3. About This Prediction (ONE closed collapsible by default) */}
            <Card className="border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setIsAboutOpen(!isAboutOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-expanded={isAboutOpen}
                aria-controls="about-prediction-content"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-primary-600" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-900">
                    About this prediction
                  </span>
                </div>
                {isAboutOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
              </button>

              {isAboutOpen && (
                <CardContent id="about-prediction-content" className="pt-0 pb-5 text-xs text-slate-600 space-y-3 leading-relaxed border-t border-slate-100">
                  <ul className="list-disc list-inside space-y-2 pt-3">
                    <li>
                      <strong className="text-slate-800">Delay definition:</strong> A train is classified as delayed when its arrival delay exceeds 15 minutes at the scheduled stop.
                    </li>
                    <li>
                      <strong className="text-slate-800">Pre-departure forecast:</strong> Estimates are computed before departure using scheduled timetable attributes, route sequence, and rolling 7-day historical delay patterns.
                    </li>
                    <li>
                      <strong className="text-slate-800">Information boundaries:</strong> The model does not observe live en-route track events, signal disruptions, weather, or tactical dispatch interventions.
                    </li>
                    <li>
                      <strong className="text-slate-800">Operational threshold:</strong> The decision threshold is set at {(prediction.threshold_used ?? 0.41).toFixed(2)} ({thresholdPercent}%) to optimize the balance between precision and recall on late arrivals.
                    </li>
                    <li>
                      <strong className="text-slate-800">Data snapshot:</strong> Model parameters and historical priors were computed from observations between {formatDate(DATASET_WINDOW.startDate)} and {formatDate(DATASET_WINDOW.endDate)} (data as of {prediction.data_as_of || '2026-10-25'}).
                    </li>
                    {prediction.caveats && prediction.caveats.map((c, idx) => (
                      <li key={idx} className="text-slate-600">{c}</li>
                    ))}
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

export default DelayPredictionPage;
