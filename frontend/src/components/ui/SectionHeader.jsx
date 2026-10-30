/**
 * SectionHeader Component
 * Uniform section header with title, subtitle, optional badge, and action slot.
 */
export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
  className = '',
  as: Component = 'div',
  ...props
}) {
  return (
    <Component className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 ${className}`} {...props}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {action}
        </div>
      )}
    </Component>
  );
}
