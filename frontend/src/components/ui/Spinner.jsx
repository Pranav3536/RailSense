import { Loader2 } from 'lucide-react';

/**
 * Spinner Component
 * Accessible loading indicator.
 */
const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 20,
  default: 24,
  lg: 32,
  xl: 48,
};

export function Spinner({
  size = 24,
  className = '',
  label = 'Loading...',
  color = 'text-blue-600',
  ...props
}) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 24;

  return (
    <div role="status" className="inline-flex items-center justify-center" {...props}>
      <Loader2
        size={pixelSize}
        className={`animate-spin ${color} ${className}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
