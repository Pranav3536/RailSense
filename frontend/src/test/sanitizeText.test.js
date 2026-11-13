import { describe, it, expect } from 'vitest';
import { sanitizeLatex } from '../utils/sanitizeText';

describe('sanitizeLatex utility', () => {
  it('handles null, undefined, or empty values safely', () => {
    expect(sanitizeLatex(null)).toBe('');
    expect(sanitizeLatex(undefined)).toBe('');
    expect(sanitizeLatex('')).toBe('');
    expect(sanitizeLatex(123)).toBe(123);
  });

  it('replaces $\\ge$, $\\le$, $\\rightarrow$, and $\\times$ with clean Unicode symbols', () => {
    expect(sanitizeLatex('Catching $\\ge$ 80% of delayed stops')).toBe('Catching ≥ 80% of delayed stops');
    expect(sanitizeLatex('Delay $\\le$ 15 minutes')).toBe('Delay ≤ 15 minutes');
    expect(sanitizeLatex('From A $\\rightarrow$ B')).toBe('From A → B');
    expect(sanitizeLatex('Matrix 10 $\\times$ 20')).toBe('Matrix 10 × 20');
  });

  it('replaces bare \\ge, \\le, \\rightarrow, and \\times without dollar signs', () => {
    expect(sanitizeLatex('Score \\ge 0.40')).toBe('Score ≥ 0.40');
    expect(sanitizeLatex('Rate \\le 0.10')).toBe('Rate ≤ 0.10');
    expect(sanitizeLatex('0.0161 \\rightarrow 0.0213')).toBe('0.0161 → 0.0213');
  });

  it('unwraps inline math blocks and removes LaTeX command prefixes', () => {
    expect(sanitizeLatex('Where $N = 100$ and $p = 0.4920$')).toBe('Where N = 100 and p = 0.4920');
    expect(sanitizeLatex('Formula $\\Pr(\\text{delay} > 15)$')).toBe('Formula Pr(delay > 15)');
  });

  it('preserves clean prose unaffected', () => {
    const clean = 'LightGBM Gradient Boosted Decision Trees + Isotonic Regression';
    expect(sanitizeLatex(clean)).toBe(clean);
  });
});
