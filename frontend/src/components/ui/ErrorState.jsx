import { AlertCircle, RotateCcw } from 'lucide-react';
import { Card } from './Card';

/**
 * ErrorState Component
 * Displays graceful error messages with status code, request_id, and retry callback.
 */
export function ErrorState({
  code,
  title = 'Unable to Load Data',
  message = 'An unexpected error occurred while communicating with the RailSense API.',
  requestId,
  onRetry,
  className = '',
  compact = false
}) {
  if (compact) {
    return (
      <div className={`p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-4 text-sm ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] px-3 inline-flex items-center gap-1.5 font-semibold text-red-700 hover:text-red-800 underline flex-shrink-0"
          >
            <RotateCcw size={16} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className={`text-center py-10 px-8 border-red-200 bg-red-50/30 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 text-red-600 mb-4">
        <AlertCircle size={28} aria-hidden="true" />
      </div>
      <h4 className="text-lg font-bold text-slate-900 mb-1">
        {title}
      </h4>
      <p className="text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
        {message}
      </p>

      {(code || requestId) && (
        <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono text-sm mb-5">
          {code && <span>HTTP {code}</span>}
          {code && requestId && <span>•</span>}
          {requestId && <span>Ref: {requestId}</span>}
        </div>
      )}

      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      )}
    </Card>
  );
}
