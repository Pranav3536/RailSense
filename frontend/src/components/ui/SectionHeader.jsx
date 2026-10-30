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
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
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
