/**
 * PageHeader Component
 * Consistent top banner for all primary view tabs.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  action,
  className = ''
}) {
  return (
    <header className={`mb-6 pb-4 border-b border-slate-200/80 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
