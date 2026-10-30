const VARIANTS = {
  primary: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500'
  },
  danger: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500'
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500'
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500'
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400'
  },
  navy: {
    badge: 'bg-navy-900 text-slate-200 border-slate-700',
    dot: 'bg-blue-400'
  },
  outline: {
    badge: 'bg-transparent text-slate-600 border-slate-300',
    dot: 'bg-slate-400'
  }
};

const SIZES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5'
};

/**
 * Badge Component
 * Uniform status, tag, and metric categorization badge.
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) {
  const currentVariant = VARIANTS[variant] || VARIANTS.neutral;
  const currentSize = SIZES[size] || SIZES.sm;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${currentVariant.badge} ${currentSize} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${currentVariant.dot} ${pulse ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
