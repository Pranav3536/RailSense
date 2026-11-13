import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Skeleton, ErrorState } from '../components/ui';
import {
  TrainHubSearch,
  TrainHubCatalog,
  TrainHubHeader,
  TrainHubTimetable,
  TrainHubCharts,
  TrainHubPredictionPanel,
} from '../components/trainhub';
import { usePagedSearch } from '../hooks/usePagedSearch';
import { useTrain } from '../hooks/useTrain';
import { predictDelay } from '../api/endpoints';

/**
 * TrainHubPage — Unified Train Intelligence & Prediction View ("Phase 11.7")
 * Combines route explorer, canonical stop timetables, delay analytics,
 * and schedule-time pre-departure delay forecasting into one cohesive workspace.
 */
export function TrainHubPage() {
  const { trainNumber: urlTrainNumber } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Document title sync
  useEffect(() => {
    if (urlTrainNumber) {
      document.title = `${urlTrainNumber} Train Intelligence | RailSense`;
    } else {
      document.title = 'Train Hub | RailSense';
    }
  }, [urlTrainNumber]);

  // --------------------------------------------------------------------------
  // Catalog Search State (when no train selected)
  // --------------------------------------------------------------------------
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const urlSort = searchParams.get('sort');
  const initialSort = (urlSort === 'number_asc' || urlSort === 'runs_desc' || urlSort === 'delayed_rate_desc' || urlSort === 'delayed_rate_asc' || urlSort === 'stops_desc')
    ? urlSort
    : 'runs_desc';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  const {
    query,
    setQuery,
    category,
    setCategory,
    sort,
    setSort,
    page,
    setPage,
    items: catalogItems,
    pagination,
    loading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = usePagedSearch({
    initialQuery,
    initialCategory,
    initialSort,
    initialPage,
    pageSize: 12,
  });

  // Sync catalog search params to URL when browsing catalog
  useEffect(() => {
    if (urlTrainNumber) return;
    const nextParams = new URLSearchParams();
    if (query.trim()) nextParams.set('q', query.trim());
    if (category) nextParams.set('category', category);
    if (sort) nextParams.set('sort', sort);
    if (page > 1) nextParams.set('page', String(page));
    setSearchParams(nextParams, { replace: true });
  }, [query, category, sort, page, urlTrainNumber, setSearchParams]);

  // --------------------------------------------------------------------------
  // Selected Train State (when :trainNumber is present)
  // --------------------------------------------------------------------------
  const {
    train,
    loading: trainLoading,
    error: trainError,
  } = useTrain(urlTrainNumber);

  // Prediction Form State
  const initialSeq = searchParams.get('seq') || '';
  const initialDate = searchParams.get('date') || '';

  const [selectedSeq, setSelectedSeq] = useState(initialSeq);
  const [journeyDate, setJourneyDate] = useState(initialDate);

  // Prediction Inference State
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Handle 429 Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // When train loads, initialize selectedSeq if not already set or invalid
  useEffect(() => {
    if (!train || !train.stops || train.stops.length === 0) return;

    const availableStops = train.stops.filter((s) => s.seq > 1);
    if (initialSeq && availableStops.some((s) => String(s.seq) === String(initialSeq))) {
      setSelectedSeq(String(initialSeq));
    } else if (availableStops.length > 0 && (!selectedSeq || selectedSeq === '1')) {
      setSelectedSeq(String(availableStops[0].seq));
    }
  }, [train, initialSeq, selectedSeq]);

  // Stop selection handler
  const handleSelectStop = useCallback((seq) => {
    const seqStr = String(seq);
    setSelectedSeq(seqStr);
    setPrediction(null); // Clear previous prediction when stop changes
    setPredictionError(null);

    // Update URL query param without auto-submitting
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('seq', seqStr);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Date change handler
  const handleDateChange = useCallback((newDate) => {
    setJourneyDate(newDate);
    setPrediction(null);
    setPredictionError(null);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newDate) {
        next.set('date', newDate);
      } else {
        next.delete('date');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Prediction execution (NO AUTO-SUBMIT — only on explicit user submit)
  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!urlTrainNumber || !selectedSeq || !journeyDate) return;
    if (cooldownSeconds > 0) return;

    const stop = train?.stops?.find((s) => String(s.seq) === String(selectedSeq));
    if (!stop) {
      setPredictionError('Please select a valid intermediate or terminus arrival stop.');
      return;
    }

    if (stop.seq === 1 || stop.isOrigin) {
      setPredictionError('Arrival delay estimation is not applicable for origin stops (seq=1).');
      return;
    }

    setPredicting(true);
    setPredictionError(null);

    try {
      const response = await predictDelay({
        train_number: urlTrainNumber,
        station_code: stop.stationCode || stop.station_code,
        seq: parseInt(selectedSeq, 10),
        date: journeyDate,
      });

      setPrediction(response);
    } catch (err) {
      if (err.status === 429) {
        setCooldownSeconds(20);
        setPredictionError('Rate limit exceeded (120 req/min). Please wait a few seconds before trying again.');
      } else if (err.status === 422) {
        setPredictionError(err.message || 'Arrival delay is not applicable for this stop.');
      } else {
        setPredictionError(err.message || 'Failed to compute prediction. Please verify inputs.');
      }
    } finally {
      setPredicting(false);
    }
  };

  const handleBackToSearch = () => {
    navigate('/trains');
  };

  // --------------------------------------------------------------------------
  // VIEW A: Single Train View (/trains/:trainNumber)
  // --------------------------------------------------------------------------
  if (urlTrainNumber) {
    if (trainLoading) {
      return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          <PageHeader
            title="Train Hub"
            subtitle={`Retrieving operational history for train #${urlTrainNumber}...`}
          />
          <Skeleton className="h-44 rounded-xl" />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-7 space-y-6">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
            <div className="xl:col-span-5">
              <Skeleton className="h-96 rounded-xl" />
            </div>
          </div>
        </div>
      );
    }

    if (trainError || !train) {
      return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          <PageHeader
            title="Train Hub"
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

    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Train Hub"
          subtitle="Train Intelligence & Prediction"
        />

        {/* Selected Train Header Card */}
        <TrainHubHeader
          train={train}
          onBack={handleBackToSearch}
        />

        {/* Main 2-Column Split: Timetable + Charts on Left, Prediction Panel on Right */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Route Timetable & Historical Charts */}
          <div className="xl:col-span-7 space-y-8">
            <TrainHubTimetable
              stops={train.stops || []}
              selectedSeq={selectedSeq}
              onSelectStop={handleSelectStop}
            />

            <TrainHubCharts
              train={train}
            />
          </div>

          {/* Right Column (5 cols): Pre-departure Delay Prediction Panel (Sticky) */}
          <div className="xl:col-span-5 xl:sticky xl:top-6">
            <TrainHubPredictionPanel
              train={train}
              selectedSeq={selectedSeq}
              onSeqChange={handleSelectStop}
              journeyDate={journeyDate}
              onDateChange={handleDateChange}
              prediction={prediction}
              predicting={predicting}
              predictionError={predictionError}
              cooldownSeconds={cooldownSeconds}
              onSubmit={handlePredict}
            />
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW B: Catalog Search View (/trains)
  // --------------------------------------------------------------------------
return (
  <div className="mx-auto max-w-7xl space-y-8 pb-12">
    <PageHeader
      title="Train Hub"
      badge={
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Route & Predictions
        </span>
      }
      subtitle="Search train routes, check stop delays and predict arrival times before you travel."
    />

      {/* Catalog Search & Filters */}
      <TrainHubSearch
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
        totalResults={pagination?.total ?? null}
      />

      {/* Paginated Train Catalog Grid */}
      <TrainHubCatalog
        items={catalogItems}
        pagination={pagination}
        loading={catalogLoading}
        error={catalogError}
        onPageChange={setPage}
        onRetry={refetchCatalog}
      />
    </div>
  );
}

export default TrainHubPage;
