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
    <header className={`mb-8 pb-5 border-b border-slate-200/80 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-base text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
