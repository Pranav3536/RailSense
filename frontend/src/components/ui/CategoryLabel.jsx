import PropTypes from 'prop-types';
import { CATEGORY_MAP } from '../../config/constants.js';

/**
 * Categories explicitly documented and verified in docs/data_dictionary.md
 */
const DOCUMENTED_CATEGORIES = new Set([
  'MEX',
  'SUB',
  'MEMU',
  'PAS',
  'SUF',
  'TOD',
  'VNDB',
]);

/**
 * CategoryLabel — Maps raw 3-4 letter railway category codes to verified definitions.
 * Only shows plain-English name when documented in docs/data_dictionary.md.
 * Otherwise shows raw code with tooltip "code as in dataset".
 */
export function CategoryLabel({ category, showName = true, className = '' }) {
  const isDocumented = DOCUMENTED_CATEGORIES.has(category);
  const meta = isDocumented ? CATEGORY_MAP[category] : null;
  const name = meta ? meta.name : category;
  const tooltip = isDocumented
    ? (meta.description ? `${meta.name}: ${meta.description}` : meta.name)
    : 'code as in dataset';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 ${className}`}
      title={tooltip}
    >
      <span className="font-bold text-primary-700">{category}</span>
      {showName && isDocumented && (
        <span className="font-sans text-slate-600 font-normal truncate max-w-[140px] sm:max-w-none">
          {name}
        </span>
      )}
    </span>
  );
}

CategoryLabel.propTypes = {
  category: PropTypes.string.isRequired,
  showName: PropTypes.bool,
  className: PropTypes.string,
};
