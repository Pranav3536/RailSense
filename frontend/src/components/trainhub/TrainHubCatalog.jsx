import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Route } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, RateBar, CategoryLabel, Skeleton, ErrorState, EmptyState } from '../ui';
import { pluralize, formatNumber } from '../../utils/format';

/**
 * TrainHubCatalog Component
 * Displays paginated catalog cards for trains with popular runs, route endpoints, and delay stats.
 */
export function TrainHubCatalog({
  items = [],
  pagination = null,
  loading = false,
  error = null,
  onPageChange,
  onRetry,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`} data-testid="catalog-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-1/2 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Load Train Catalog"
        message={error?.message || 'Failed to retrieve trains from the serving store.'}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No Trains Found"
        message="No train services match your active search filter or category. Try clearing the filter or entering a different train number."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((train) => (
          <Card
            key={train.trainNumber}
            className="flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all bg-white"
          >
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-slate-900">
                  {train.trainNumber}
                </span>
                <CategoryLabel category={train.category} />
              </div>
              <CardTitle className="text-base font-bold text-slate-800 line-clamp-1">
                {train.trainName || 'Express Service'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-0">
              <div className="space-y-3">
                {/* Route origin -> terminus (CODES ONLY) */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {train.originStationCode}
                  </span>
                  <ArrowRight size={14} className="text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {train.terminusStationCode}
                  </span>
                  <span className="text-slate-600 font-medium">
                    ({pluralize(train.stopsCount, 'halt')})
                  </span>
                </div>

                {/* Delay Rate Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Observed Delay Rate</span>
                    <span className="font-mono">{pluralize(train.runsCount, 'run')}</span>
                  </div>
                  <RateBar
                    rate={train.delayedRate}
                    showLabel
                    isMuted={train.isLowSupport}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <Link
                  to={`/trains/${encodeURIComponent(train.trainNumber)}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors min-h-[44px]"
                >
                  <Route size={16} aria-hidden="true" />
                  <span>View Route & Timetable</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-600">
            Showing page <span className="font-bold text-slate-900">{pagination.page}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.totalPages}</span> ({formatNumber(pagination.total)} total trains)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination.hasPrev}
              onClick={() => onPageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={!pagination.hasNext}
              onClick={() => onPageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainHubCatalog;
