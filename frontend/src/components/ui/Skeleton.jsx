/**
 * Skeleton Component
 * Animated shimmer loading placeholder.
 */
export function Skeleton({ className = '', variant = 'rectangular', ...props }) {
  const variantStyles = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full',
    pill: 'rounded-full h-6 w-16'
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200 ${variantStyles[variant] || ''} ${className}`}
      {...props}
    />
  );
}
