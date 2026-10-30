import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCompact,
  formatPercent,
  formatMinutes,
  formatDate
} from '../utils/format';

describe('format.js utility suite', () => {
  it('formats standard numbers using en-IN grouping', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(100000)).toBe('1,00,000');
    expect(formatNumber(2805574)).toBe('28,05,574');
  });

  it('formats compact numbers cleanly in Indian notation', () => {
    expect(formatCompact(500)).toBe('500');
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(2800000)).toBe('28L');
  });

  it('formats percentages cleanly with custom decimals', () => {
    expect(formatPercent(0.4852)).toBe('48.5%');
    expect(formatPercent(0.4852, true, 2)).toBe('48.52%');
    expect(formatPercent(1.0)).toBe('100.0%');
  });

  it('formats delay minutes preserving negative values for early arrivals', () => {
    expect(formatMinutes(14)).toBe('+14 min');
    expect(formatMinutes(-10)).toBe('-10 min');
    expect(formatMinutes(0)).toBe('0 min');
  });

  it('formats dates consistently', () => {
    expect(formatDate('2026-10-15')).toContain('Oct');
    expect(formatDate('2026-10-15')).toContain('2026');
  });

  it('gracefully handles null, undefined, and NaN with fallback', () => {
    expect(formatNumber(null)).toBe('Not available');
    expect(formatNumber(undefined)).toBe('Not available');
    expect(formatNumber(NaN)).toBe('Not available');

    expect(formatPercent(null)).toBe('Not available');
    expect(formatPercent(undefined)).toBe('Not available');
    expect(formatPercent(NaN)).toBe('Not available');

    expect(formatMinutes(null)).toBe('Not available');
    expect(formatMinutes(undefined)).toBe('Not available');
    expect(formatMinutes(NaN)).toBe('Not available');

    expect(formatDate(null)).toBe('Not available');
    expect(formatDate('')).toBe('Not available');
  });
});
