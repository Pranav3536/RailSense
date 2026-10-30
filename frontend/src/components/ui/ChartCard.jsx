import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { Skeleton } from './Skeleton';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { DefinitionNote } from './DefinitionNote';

/**
 * ChartCard Component
 * Consistent container for Recharts and analytical data visualizations
 * with accessibility fallbacks and uniform states.
 */
export function ChartCard({
  title,
  subtitle,
  definition,
  definitionTitle,
  action,
  loading = false,
  error = null,
  empty = false,
  emptyMessage,
  onRetry,
  children,
  accessibleDescription,
  height = 'h-64',
  className = '',
  ...props
}) {
  return (
    <Card className={`flex flex-col ${className}`} {...props}>
      {(title || action) && (
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <CardTitle>{title}</CardTitle>
              {definition && (
                <DefinitionNote title={definitionTitle || title}>
                  {definition}
                </DefinitionNote>
              )}
            </div>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </CardHeader>
      )}

      <CardContent className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className={`w-full ${height} flex flex-col justify-between p-4 space-y-4`}>
            <Skeleton className="h-4 w-1/3" />
            <div className="flex items-end gap-3 h-full pt-4">
              <Skeleton className="h-1/3 flex-1" />
              <Skeleton className="h-2/3 flex-1" />
              <Skeleton className="h-1/2 flex-1" />
              <Skeleton className="h-4/5 flex-1" />
              <Skeleton className="h-3/4 flex-1" />
              <Skeleton className="h-1/4 flex-1" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <div className={`w-full ${height} flex items-center justify-center`}>
            <ErrorState
              compact
              message={typeof error === 'string' ? error : 'Chart data could not be loaded'}
              onRetry={onRetry}
            />
          </div>
        ) : empty ? (
          <div className={`w-full ${height} flex items-center justify-center`}>
            <EmptyState
              compact
              description={emptyMessage || 'No data points available for this visualization.'}
            />
          </div>
        ) : (
          <div className={`w-full ${height} relative`}>
            {accessibleDescription && (
              <div className="sr-only">
                {accessibleDescription}
              </div>
            )}
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
