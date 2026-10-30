import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { DefinitionNote } from './DefinitionNote';
import { AlertTriangle } from 'lucide-react';

/**
 * StatCard Component
 * Displays single-metric key performance indicator with definitions, units,
 * and graceful loading/error/empty states.
 */
export function StatCard({
  label,
  value,
  unit,
  delta,
  definition,
  definitionTitle,
  icon: Icon,
  loading = false,
  error = null,
  empty = false,
  className = '',
  ...props
}) {
  const isValueEmpty = empty || value === null || value === undefined || value === 'Not available';

  return (
    <Card className={`relative overflow-hidden ${className}`} {...props}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {label}
          </span>
          {definition && (
            <DefinitionNote title={definitionTitle || label}>
              {definition}
            </DefinitionNote>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 flex-shrink-0">
            <Icon size={16} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-2 text-red-600 text-xs">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span className="truncate">{typeof error === 'string' ? error : 'Failed to load metric'}</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-2xl font-bold tracking-tight ${isValueEmpty ? 'text-slate-400 font-normal text-lg' : 'text-slate-900'}`}>
              {isValueEmpty ? 'Not available' : value}
            </span>
            {unit && !isValueEmpty && (
              <span className="text-xs font-medium text-slate-500">{unit}</span>
            )}
          </div>
        )}
      </div>

      {delta && !loading && !error && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {delta}
        </div>
      )}
    </Card>
  );
}
