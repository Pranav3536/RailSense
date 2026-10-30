import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

/**
 * DefinitionNote Component
 * Accessible disclosure popover explaining exact metric definitions.
 */
export function DefinitionNote({
  title = 'Metric Definition',
  children,
  className = '',
  align = 'right' // 'right' | 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on Click Outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-0.5 transition-colors"
        aria-label={`View definition for ${title}`}
        aria-expanded={isOpen}
      >
        <Info size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          className={`absolute z-50 top-full mt-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 animate-in fade-in zoom-in-95 ${alignmentClass}`}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-semibold text-slate-200">{title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
              aria-label="Close definition"
            >
              <X size={12} />
            </button>
          </div>
          <div className="text-slate-300 leading-relaxed font-normal">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
