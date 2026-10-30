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
      <div className={`p-4 text-center text-slate-500 text-sm ${className}`}>
        <Icon size={24} className="mx-auto mb-1.5 text-slate-400" aria-hidden="true" />
        <p className="font-semibold text-slate-800 text-sm">{title}</p>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <Card className={`text-center py-12 px-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-500 mb-4">
        <Icon size={30} aria-hidden="true" />
      </div>
      <h4 className="text-lg font-bold text-slate-900 mb-1.5">
        {title}
      </h4>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
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
