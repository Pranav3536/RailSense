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
        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        aria-label={`View definition for ${title}`}
        aria-expanded={isOpen}
      >
        <Info size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          className={`absolute z-50 top-full mt-2 w-80 sm:w-96 p-4 bg-slate-900 text-white text-sm rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 ${alignmentClass}`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-100 text-sm">{title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close definition"
            >
              <X size={16} />
            </button>
          </div>
          <div className="text-slate-300 leading-relaxed font-normal text-sm">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
