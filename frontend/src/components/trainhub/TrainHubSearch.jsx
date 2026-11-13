import { Search, X } from 'lucide-react';
import { CATEGORY_OPTIONS } from '../../config/constants';

const SORT_OPTIONS = [
  { value: 'runs_desc', label: 'Most Observed Runs' },
  { value: 'delayed_rate_desc', label: 'Highest Delayed Rate' },
  { value: 'delayed_rate_asc', label: 'Lowest Delayed Rate' },
  { value: 'stops_desc', label: 'Most Scheduled Halts' },
  { value: 'number_asc', label: 'Train Number (Asc)' },
];

/**
 * TrainHubSearch Component
 * Accessible debounced search input, category filter, and sort selector for Train Hub.
 */
export function TrainHubSearch({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  totalResults = null,
  className = '',
}) {
  return (
    <div className={`p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 ${className}`}>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <label htmlFor="train-search-input" className="sr-only">
            Search train number or service name
          </label>
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="train-search-input"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search train number or service name (e.g. 12951)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Clear search input"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="w-full md:w-56 flex-shrink-0">
          <label htmlFor="category-filter-select" className="sr-only">
            Filter by service category
          </label>
          <select
            id="category-filter-select"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="w-full md:w-56 flex-shrink-0">
          <label htmlFor="sort-order-select" className="sr-only">
            Sort trains by
          </label>
          <select
            id="sort-order-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalResults !== null && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Found {totalResults} matching services</span>
          <span className="italic">Type at least 2 digits/letters to search</span>
        </div>
      )}
    </div>
  );
}

export default TrainHubSearch;
