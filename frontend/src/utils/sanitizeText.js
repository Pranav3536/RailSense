/**
 * RailSense — Text Sanitizer Helper (frontend/src/utils/sanitizeText.js)
 * Strips and replaces LaTeX artifacts and mathematical markup from prose
 * to ensure accessible, clean Unicode representation in user-facing UI.
 */

/**
 * Sanitizes LaTeX tokens and unescaped math expressions in text.
 * Replaces common symbols with clean Unicode and un-wraps inline dollar math.
 *
 * @param {string} text - Raw string possibly containing LaTeX artifacts
 * @returns {string} Sanitized plain-text or Markdown-compatible string
 */
export function sanitizeLatex(text) {
  if (typeof text !== 'string') {
    return text || '';
  }

  let result = text;

  // 1. Common comparison and arrow symbols (with or without inline math delimiters)
  result = result
    .replace(/\$\s*\\ge\s*\$/gi, '≥')
    .replace(/\$\s*\\le\s*\$/gi, '≤')
    .replace(/\$\s*\\rightarrow\s*\$/gi, '→')
    .replace(/\$\s*\\to\s*\$/gi, '→')
    .replace(/\$\s*\\times\s*\$/gi, '×')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\le\b/g, '≤')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\to\b/g, '→')
    .replace(/\\times\b/g, '×');

  // 2. Strip remaining inline $math$ delimiters while preserving inner text
  // e.g. "$N = 100$" -> "N = 100", "$\Pr(delay > 15)$" -> "Pr(delay > 15)"
  result = result.replace(/\$([^$\n]+)\$/g, (match, inner) => {
    return inner
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\mathrm\{([^}]+)\}/g, '$1')
      .replace(/\\math[a-zA-Z]+\{([^}]+)\}/g, '$1')
      .replace(/\\([a-zA-Z]+)/g, '$1');
  });

  return result;
}
