/**
 * Card Component
 * Standard surface container matching the RailSense design system.
 * Background: White (#FFFFFF)
 * Border: Slate-200 (#E2E8F0)
 * Shadow: shadow-sm
 * Rounded: rounded-xl (12px)
 */
export function Card({
  children,
  className = '',
  padding = 'p-6',
  hover = false,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${
        hover ? 'transition-all duration-200 hover:shadow-md hover:border-slate-300' : ''
      } ${padding} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`border-b border-slate-100 pb-4 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component className={`text-base font-semibold text-slate-900 ${className}`} {...props}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs text-slate-500 mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`border-t border-slate-100 pt-4 mt-4 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}
