import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCompact,
  formatPercent,
  formatFractionAsPercent,
  formatPercentValue,
  formatMinutes,
  formatDate,
  pluralize,
  formatConfidenceInterval
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
    expect(formatPercent(49.2, false)).toBe('49.2%');
  });

  it('formats fractions as percent explicitly with formatFractionAsPercent', () => {
    expect(formatFractionAsPercent(0.4852)).toBe('48.5%');
    expect(formatFractionAsPercent(0.4852, 2)).toBe('48.52%');
    expect(formatFractionAsPercent(0.227)).toBe('22.7%');
    expect(formatFractionAsPercent(0)).toBe('0.0%');
    expect(formatFractionAsPercent(1.0)).toBe('100.0%');
    expect(formatFractionAsPercent(null)).toBe('Not available');
    expect(formatFractionAsPercent(undefined)).toBe('Not available');
    expect(formatFractionAsPercent(NaN)).toBe('Not available');
  });

  it('formats percentage values directly with formatPercentValue without multiplying', () => {
    expect(formatPercentValue(88.24)).toBe('88.2%');
    expect(formatPercentValue(88.24, 2)).toBe('88.24%');
    expect(formatPercentValue(49.91)).toBe('49.9%');
    expect(formatPercentValue(0)).toBe('0.0%');
    expect(formatPercentValue(100)).toBe('100.0%');
    expect(formatPercentValue(null)).toBe('Not available');
    expect(formatPercentValue(undefined)).toBe('Not available');
    expect(formatPercentValue(NaN)).toBe('Not available');
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

  it('pluralizes nouns accurately based on count', () => {
    expect(pluralize(1, 'run')).toBe('1 run');
    expect(pluralize(0, 'run')).toBe('0 runs');
    expect(pluralize(5, 'stop')).toBe('5 stops');
    expect(pluralize(1, 'stop')).toBe('1 stop');
    expect(pluralize(1, 'observed run', 'observed runs')).toBe('1 observed run');
    expect(pluralize(19, 'observed run', 'observed runs')).toBe('19 observed runs');
    expect(pluralize(1, 'scheduled halt', 'scheduled halts')).toBe('1 scheduled halt');
    expect(pluralize(24, 'scheduled halt', 'scheduled halts')).toBe('24 scheduled halts');
    expect(pluralize(1000, 'train')).toBe('1,000 trains');
    expect(pluralize(null, 'run')).toBe('Not available');
    expect(pluralize(undefined, 'stop')).toBe('Not available');
  });

  it('formats Wilson confidence intervals cleanly as ranges without square brackets', () => {
    expect(formatConfidenceInterval(98.0, 100.0)).toBe('98.0% – 100.0%');
    expect(formatConfidenceInterval(97.7, 99.7)).toBe('97.7% – 99.7%');
    expect(formatConfidenceInterval('[98.0%, 100.0%]')).toBe('98.0% – 100.0%');
    expect(formatConfidenceInterval('[97.7%, 99.7%]')).toBe('97.7% – 99.7%');
    expect(formatConfidenceInterval(null)).toBe('Not available');
    expect(formatConfidenceInterval(undefined)).toBe('Not available');
    expect(formatConfidenceInterval(NaN, 100.0)).toBe('Not available');
  });
});
