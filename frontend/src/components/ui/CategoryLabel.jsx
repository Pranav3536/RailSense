import PropTypes from 'prop-types';
import { CATEGORY_MAP } from '../../config/constants.js';

/**
 * CategoryLabel — Maps raw 3-4 letter railway category codes to verified definitions.
 */
export function CategoryLabel({ category, showName = true, className = '' }) {
  const meta = CATEGORY_MAP[category] || null;
  const name = meta ? meta.name : category;
  const description = meta ? meta.description : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 ${className}`}
      title={description ? `${name}: ${description}` : name}
    >
      <span className="font-bold text-primary-700">{category}</span>
      {showName && (
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
