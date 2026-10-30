import { Loader2 } from 'lucide-react';

/**
 * Spinner Component
 * Accessible loading indicator.
 */
export function Spinner({
  size = 20,
  className = '',
  label = 'Loading...',
  color = 'text-blue-600',
  ...props
}) {
  return (
    <div role="status" className="inline-flex items-center justify-center" {...props}>
      <Loader2
        size={size}
        className={`animate-spin ${color} ${className}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
