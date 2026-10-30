import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
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
  ProbabilityGauge,
  RiskBadge,
  FactorBars,
  ColdStartNotice,
  WarningList,
  CategoryLabel,
  SupportBadge,
} from '../components/ui';
import { getTrainDetail, predictDelay } from '../api/endpoints';
import { formatPercent, formatMinutes, formatDate } from '../utils/format';
import { LOW_SUPPORT_THRESHOLD } from '../config/constants';

/**
 * DelayPredictionPage — Tab 3 ("ML Inference Engine")
 * Interactive schedule-time pre-departure delay probability forecasting.
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

  // Explanatory Collapsible
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delay Prediction Engine"
        subtitle="Pre-departure schedule-time arrival delay probability forecasting based on timetable attributes, route position, and rolling 7-day priors."
        badge={
          <Badge variant="primary" className="font-mono text-xs">
            LightGBM + Isotonic Calibration
          </Badge>
        }
      />

      {/* 1. Interactive Prediction Form */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-600" aria-hidden="true" />
            <CardTitle>Schedule-Time Prediction Parameters</CardTitle>
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
                  Historical window: Oct 7–25, 2026. Dates outside this range test prospective generalization.
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
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Rate limited to 120 requests/minute. Model threshold: <span className="font-mono font-semibold">{prediction?.threshold_used?.toFixed(3) || "0.410"}</span>.
              </div>

              <button
                type="submit"
                disabled={!trainNumber || !selectedSeq || !journeyDate || predicting || cooldownSeconds > 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed min-h-[44px]"
              >
                {predicting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Computing Inference...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <span>Cooldown ({cooldownSeconds}s)...</span>
                ) : (
                  <>
                    <Sparkles size={16} className="text-white" aria-hidden="true" />
                    <span>Predict Delay Probability</span>
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
              {/* 2a. Primary Gauge & Decision Card */}
              <Card className="lg:col-span-2 border-slate-200 bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-primary-600" aria-hidden="true" />
                      <CardTitle>Delay Risk Estimation</CardTitle>
                    </div>
                    <RiskBadge riskBand={prediction.risk_band} size="md" />
                  </div>
                  <CardDescription>
                    Calibrated probability that this train arrives more than 15 minutes late at this stop.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Gauge */}
                  <ProbabilityGauge
                    probability={prediction.probability_delayed}
                    rawProbability={prediction.probability_raw || prediction.raw_probability}
                    threshold={prediction.threshold_used || 0.41}
                  />

                  {/* Decision Text in Plain Words */}
                  <div
                    className={`p-4 rounded-xl border ${
                      prediction.predicted_delayed
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {prediction.predicted_delayed ? (
                        <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-wider">
                          Decision at Operational Threshold ({(prediction.threshold_used * 100).toFixed(1)}%)
                        </div>
                        <p className="text-sm font-semibold leading-relaxed">
                          {prediction.predicted_delayed
                            ? `At the operational decision threshold of ${(prediction.threshold_used * 100).toFixed(1)}%, this stop is classified as Predicted Delayed (>15 minutes arrival delay).`
                            : `At the operational decision threshold of ${(prediction.threshold_used * 100).toFixed(1)}%, this stop is classified as Predicted On-Time / Minor Delay (≤15 minutes).`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cold-Start Callout */}
                  <ColdStartNotice
                    isColdStart={prediction.historical_context?.is_cold_start}
                  />

                  {/* Associated Factors */}
                  <FactorBars factors={prediction.contributing_factors} />

                  {/* Warnings, In-Sample Note, and API Caveats */}
                  <WarningList
                    caveats={prediction.caveats}
                    journeyDate={prediction.journey_date}
                  />
                </CardContent>
              </Card>

              {/* 2b. Context & Empirical Baseline Card */}
              <div className="space-y-6">
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-slate-600" aria-hidden="true" />
                      <CardTitle>Historical Observed Context</CardTitle>
                    </div>
                    <CardDescription>
                      Empirical baseline metrics observed on this exact stop across recorded runs.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {currentStop ? (
                      <>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                          <div className="text-xs text-slate-500 font-medium">Observed Delayed Rate</div>
                          <div className="text-2xl font-bold font-mono text-slate-900">
                            {currentStop.observed_delayed_rate !== null && currentStop.observed_delayed_rate !== undefined
                              ? formatPercent(currentStop.observed_delayed_rate)
                              : 'Not available'}
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span>Empirical historical rate</span>
                            <SupportBadge
                              count={currentStop.observed_stops_count || 0}
                              threshold={LOW_SUPPORT_THRESHOLD}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block">Mean Observed Delay</span>
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
                          * Note: Observed rate represents historical empirical proportion in the 19-day dataset. It is distinct from the model&apos;s forward-looking probability prediction.
                        </p>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 py-4 text-center">
                        Select a stop to view historical stop-level baseline rates.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Model Metadata Snapshot */}
                <Card className="border-slate-200 bg-slate-50/70">
                  <CardContent className="pt-4 pb-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Model Version:</span>
                      <span className="font-mono font-medium">{prediction.model_version || '1.0.0'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Dataset Baseline As Of:</span>
                      <span className="font-mono font-medium">{prediction.data_as_of || '2026-10-25'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Calibration Method:</span>
                      <span>Isotonic Regression</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80">
                      <Link
                        to="/model-lab"
                        className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-900 font-semibold transition-colors"
                      >
                        <span>Inspect Evaluation & Curves in Model Lab</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 3. About This Prediction Educational Collapsible */}
            <Card className="border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setIsExplainerOpen(!isExplainerOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl"
                aria-expanded={isExplainerOpen}
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-primary-600" aria-hidden="true" />
                  <span className="text-sm font-bold text-slate-900">
                    Methodology: How to interpret this delay probability
                  </span>
                </div>
                {isExplainerOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
              </button>

              {isExplainerOpen && (
                <CardContent className="pt-0 pb-5 text-xs text-slate-600 space-y-3 leading-relaxed border-t border-slate-100">
                  <p>
                    <strong>Estimated Delay Probability:</strong> Represents the model&apos;s statistical estimation that this service arrives &gt;15 minutes behind schedule at the target stop. The raw tree probability is calibrated via Isotonic Regression on held-out validation data so that a predicted 40% probability corresponds closely to an observed 40% historical delay frequency.
                  </p>
                  <p>
                    <strong>Operational Threshold (0.410):</strong> The binary decision cut-off was tuned to maximize the F1-score on the validation split. Because arrival delay is slightly imbalanced and false negatives are costly in passenger planning, the balanced F1 threshold (0.410) catches 82.0% of all late arrivals with 74.0% precision on the untouched test split.
                  </p>
                  <p>
                    <strong>Non-Causal Attribute Association:</strong> Factors shown above are features the model uses to compute the probability (e.g. stop sequence, scheduled arrival time of day, and trailing 7-day priors). They do not represent causal physical explanations (such as external disruptions or infrastructure events), which are unobserved in timetable data.
                  </p>
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
