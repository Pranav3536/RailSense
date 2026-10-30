import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Search, Train, X, Loader2 } from 'lucide-react';
import { getTrains } from '../../api/endpoints';
import { CategoryLabel } from './CategoryLabel';

/**
 * TrainPicker — Accessible, debounced combobox for selecting a train service.
 * Supports quick search by train number or name with 300ms debounce and cancelation.
 */
export function TrainPicker({
  value,
  onChange,
  placeholder = 'Type train number or name (e.g., 12951)...',
  disabled = false,
  className = '',
}) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Sync internal search term when external value prop changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const response = await getTrains({ q: trimmed, page_size: 8 }, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setResults(response.trains || []);
          setLoading(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Search error');
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    if (!val) {
      onChange(null);
    }
  };

  const handleSelectTrain = (train) => {
    setSearchTerm(train.train_number);
    setIsOpen(false);
    onChange(train);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
    onChange(null);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search
          size={18}
          className="absolute left-3.5 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {loading && (
            <Loader2 size={16} className="text-primary-600 animate-spin" aria-hidden="true" />
          )}
          {searchTerm && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
              aria-label="Clear selection"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {isOpen && searchTerm.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1 divide-y divide-slate-100"
        >
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary-600" />
              Searching active catalog...
            </div>
          ) : results.length > 0 ? (
            results.map((train) => (
              <button
                key={train.train_number}
                type="button"
                role="option"
                aria-selected={value === train.train_number}
                onClick={() => handleSelectTrain(train)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Train size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="truncate">
                    <span className="font-mono font-bold text-slate-900 text-sm mr-2">
                      {train.train_number}
                    </span>
                    <span className="text-slate-700 text-sm font-medium">
                      {train.train_name || 'Service'}
                    </span>
                  </div>
                </div>
                {train.category && (
                  <CategoryLabel category={train.category} showName={false} className="flex-shrink-0" />
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-slate-500">
              {error ? 'Error searching train services.' : 'No matching trains found.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

TrainPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
