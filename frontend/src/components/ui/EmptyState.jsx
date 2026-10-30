import { SearchX } from 'lucide-react';
import { Card } from './Card';

/**
 * EmptyState Component
 * Displays helpful messaging when queries or filters return no results.
 */
export function EmptyState({
  icon: Icon = SearchX,
  title = 'No Records Found',
  description = 'There are no records matching your current filter criteria in the observed dataset.',
  action,
  className = '',
  compact = false
}) {
  if (compact) {
    return (
      <div className={`p-4 text-center text-slate-500 text-xs ${className}`}>
        <Icon size={20} className="mx-auto mb-1 text-slate-400" aria-hidden="true" />
        <p className="font-medium text-slate-700">{title}</p>
        <p className="text-slate-500 mt-0.5">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  return (
    <Card className={`text-center py-10 px-6 ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 mb-3">
        <Icon size={24} aria-hidden="true" />
      </div>
      <h4 className="text-base font-semibold text-slate-900 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="inline-flex items-center">
          {action}
        </div>
      )}
    </Card>
  );
}
