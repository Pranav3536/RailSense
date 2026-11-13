import { isValidElement } from 'react';
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
  subtext,
  subtitle,
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
        <div className="flex items-center gap-1.5 min-w-0 flex-1 min-h-[2.5rem]">
          <span className="text-sm font-semibold tracking-wide text-slate-500 leading-snug">
            {label}
          </span>
          {definition && (
            <DefinitionNote title={definitionTitle || label}>
              {definition}
            </DefinitionNote>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex-shrink-0">
            {isValidElement(Icon) ? (
              Icon
            ) : (
              <Icon size={20} aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-5 w-20" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-2 text-red-600 text-sm">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="truncate">{typeof error === 'string' ? error : 'Failed to load metric'}</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-4xl font-bold tracking-tight tabular-nums ${isValueEmpty ? 'text-slate-400 font-normal text-xl' : 'text-slate-900'}`}>
              {isValueEmpty ? 'Not available' : value}
            </span>
            {unit && !isValueEmpty && (
              <span className="text-sm font-medium text-slate-500">{unit}</span>
            )}
          </div>
        )}
        {(subtext || subtitle) && !loading && !error && (
          <p className="mt-1 text-xs text-slate-500 font-medium">{subtext || subtitle}</p>
        )}
      </div>

      {delta && !loading && !error && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm">
          {delta}
        </div>
      )}
    </Card>
  );
}
