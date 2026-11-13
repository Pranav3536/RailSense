import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Route,
  BarChart3,
  FlaskConical,
  MessageSquareText,
  LayoutDashboard,
  ArrowRight,
  Clock,
  Layers,
  MapPin,
  Calendar,
  RefreshCw,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard, Skeleton } from '../components/ui';
import { getOverview } from '../api/endpoints';
import { adaptOverview } from '../api/adapters';
import { formatCompact, formatNumber, formatDate } from '../utils/format';

export function WelcomePage() {
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getOverview();
      const adapted = adaptOverview(raw);
      setOverviewData(adapted);
    } catch (err) {
      setError(err?.message || 'Unable to load snapshot metrics');
      setOverviewData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const kpis = overviewData?.fleetKpis;

return (
  <div className="space-y-10">
    {/* Modern Light Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200/80">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Home
          </h1>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            Quick Guide
          </span>
        </div>

        <p className="text-base sm:text-lg text-slate-600 mt-2">
          Welcome to RailSense • Follow the guide below to forecast delays and explore network patterns.
        </p>
      </div>
    </div>

      {/* Hero Section */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <span>Machine Learning & Delay Analytics</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
            Understand Train Delays Before You Travel
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            RailSense helps you check whether your train is likely to be on time or delayed before you travel, showing you where delays usually build up along the route.
          </p>

          {/* 3 Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Link
              to="/trains"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm transition-colors min-h-[44px]"
            >
              <Route size={18} aria-hidden="true" />
              <span>Open Train Hub</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <Link
              to="/overview"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base transition-colors border border-slate-200 min-h-[44px]"
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>View Network Trends</span>
            </Link>

            <Link
              to="/model-lab"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base transition-colors border border-slate-200 min-h-[44px]"
            >
              <FlaskConical size={18} aria-hidden="true" />
              <span>Check Model Performance</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights Row (from API, hides cleanly on error, no hardcoded fallbacks) */}
      <section aria-labelledby="highlights-heading">
        <h2 id="highlights-heading" className="text-xl font-bold tracking-tight text-slate-900 mb-3">
          Live Dataset Highlights
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="highlights-skeleton">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">
            <span>Snapshot highlights currently unavailable.</span>
            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 min-h-[44px]"
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="highlights-grid">
            <StatCard
              label="Trains Observed"
              value={formatCompact(kpis.distinctTrainNumbers)}
              subtext={`${formatNumber(kpis.distinctTrainNumbers)} distinct train numbers`}
              icon={Route}
            />
            <StatCard
              label="Stations Analyzed"
              value={formatCompact(kpis.distinctStations)}
              subtext={`${formatNumber(kpis.distinctStations)} unique station codes`}
              icon={MapPin}
            />
            <StatCard
              label="Stop Records"
              value={formatCompact(kpis.totalStopsObserved)}
              subtext={`${formatNumber(kpis.totalStopsObserved)} total stop events`}
              icon={Layers}
            />
            <StatCard
              label="Snapshot Period"
              value={kpis.dateRange?.days ? `${kpis.dateRange.days} Days` : 'Observed Snapshot'}
              subtext={
                kpis.dateRange?.start && kpis.dateRange?.end
                  ? `${formatDate(kpis.dateRange.start)} – ${formatDate(kpis.dateRange.end)}`
                  : 'Historical recording'
              }
              icon={Calendar}
            />
          </div>
        ) : null}
      </section>


{/* 4-Step "How It Works" Guide */}
<section aria-labelledby="how-it-works-heading" className="space-y-6">
  <div>
    <h2
      id="how-it-works-heading"
      className="text-2xl font-bold tracking-tight text-slate-900"
    >
      How It Works
    </h2>
    <p className="text-base text-slate-600 mt-2">
      Follow the workflow from train selection to understanding delay risk and network patterns.
    </p>
  </div>

  <div className="relative space-y-4">

    {/* Vertical Timeline Line */}
    <div className="absolute left-[23px] top-10 bottom-10 w-px bg-slate-200 hidden sm:block" />

    {/* Step 1 */}
    <Card className="relative flex items-center gap-5 p-5 sm:p-6 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center">
        01
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Select Your Train
            </CardTitle>
            <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
              Search for a scheduled train and explore its route, stops and timetable.
            </p>
          </div>
          <Link
            to="/trains"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Find Trains <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="hidden md:flex w-11 h-11 rounded-xl bg-slate-50 items-center justify-center text-slate-600">
        <Search size={21} />
      </div>
    </Card>

    {/* Step 2 */}
    <Card className="relative flex items-center gap-5 p-5 sm:p-6 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center">
        02
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Explore the Route
            </CardTitle>
            <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
              Review stop sequences, scheduled timings and historical arrival patterns across the journey.
            </p>
          </div>
          <Link
            to="/trains"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Inspect Timetable <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="hidden md:flex w-11 h-11 rounded-xl bg-slate-50 items-center justify-center text-slate-600">
        <BarChart3 size={21} />
      </div>
    </Card>

    {/* Step 3 */}
    <Card className="relative flex items-center gap-5 p-5 sm:p-6 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center">
        03
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Estimate Delay Risk
            </CardTitle>
            <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
              Evaluate pre-departure arrival delay risk using the trained machine learning model and historical data.
            </p>
          </div>
          <Link
            to="/trains"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Estimate Risk <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="hidden md:flex w-11 h-11 rounded-xl bg-slate-50 items-center justify-center text-slate-600">
        <Clock size={21} />
      </div>
    </Card>

    {/* Step 4 */}
    <Card className="relative flex items-center gap-5 p-5 sm:p-6 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center">
        04
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Analyze Trends & Ask Questions
            </CardTitle>
            <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
              Explore network-wide delay patterns and query historical railway data through Smart Insights.
            </p>
          </div>
          <Link
            to="/insights"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Smart Insights <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="hidden md:flex w-11 h-11 rounded-xl bg-slate-50 items-center justify-center text-slate-600">
        <MessageSquareText size={21} />
      </div>
    </Card>

  </div>
</section>


      {/* Explore the Platform (Other Sections) */}
      <section aria-labelledby="platform-heading" className="space-y-4">
        <div>
          <h2 id="platform-heading" className="text-xl font-bold tracking-tight text-slate-900">
            Explore the Platform
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Browse all specialized analytics and model transparency tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/overview"
            className="group block p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutDashboard size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Railway at a Glance
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Fleet-level KPIs, macro delay distributions, category breakdown and daily delay rate trends.
            </p>
          </Link>

          <Link
            to="/trains"
            className="group block p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Route size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Train Hub
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Timetables, canonical stop sequences, stop-level delayed rates and schedule-time pre-departure estimates.
            </p>
          </Link>

          <Link
            to="/model-lab"
            className="group block p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FlaskConical size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Model Lab
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Transparent evaluation benchmark comparing 12 standard algorithms and baselines across PR-AUC, ROC-AUC, F1, prediction latency and model size.
            </p>
          </Link>

          <Link
            to="/patterns"
            className="group block p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BarChart3 size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Historical Delay Patterns
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Empirical delay patterns decomposed by scheduled hour, day of the week, journey sequence and station hotspots.
            </p>
          </Link>

          <Link
            to="/insights"
            className="group block p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MessageSquareText size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Smart Insights
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Natural language analytics interface answering delay questions with structured tabular evidence.
            </p>
          </Link>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-700 font-semibold text-sm">
                <CheckCircle2 size={18} className="text-emerald-500" aria-hidden="true" />
                <span>Built on observed railway data</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All metrics are derived directly from the observed historical database without fabrication. Calibration and uncertainty metrics are published in the Model Lab.
              </p>
              {kpis && (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Spanning {formatCompact(kpis.totalStopsObserved)} observed stop events across {formatNumber(kpis.distinctTrainNumbers)} trains ({kpis.dateRange?.start && kpis.dateRange?.end ? `${formatDate(kpis.dateRange.start)} – ${formatDate(kpis.dateRange.end)}` : '19-day snapshot'}).
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot Disclaimer Note */}
      <footer className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
        <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          Data is an observed 19-day snapshot (7 Oct – 25 Oct 2026); estimates are statistical associations, not guarantees. RailSense relies on historical records, not GPS tracking.
        </p>
      </footer>
    </div>
  );
}

export default WelcomePage;
