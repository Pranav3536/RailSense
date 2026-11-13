import { describe, it, expect } from 'vitest';
import { parsePositionBucketOrder, sortPositionBuckets } from '../utils/positionSort';

describe('positionSort utility', () => {
  it('parses bucket lower bounds accurately', () => {
    expect(parsePositionBucketOrder('Early (2-3)')).toBe(2);
    expect(parsePositionBucketOrder('Mid-Early (4-10)')).toBe(4);
    expect(parsePositionBucketOrder('Mid (11-25)')).toBe(11);
    expect(parsePositionBucketOrder('Late (26-50)')).toBe(26);
    expect(parsePositionBucketOrder('Deep (>50)')).toBe(51);
  });

  it('handles edge formats and raw strings', () => {
    expect(parsePositionBucketOrder('>50')).toBe(51);
    expect(parsePositionBucketOrder('11-25')).toBe(11);
    expect(parsePositionBucketOrder(4)).toBe(4);
    expect(parsePositionBucketOrder('unknown')).toBe(Infinity);
    expect(parsePositionBucketOrder(null)).toBe(Infinity);
  });

  it('sorts a shuffled fixture of Model Lab [binName, data] entries into journey order', () => {
    const shuffledFixture = [
      ['Late (26-50)', { count: 32000, recall: 0.81 }],
      ['Deep (>50)', { count: 8500, recall: 0.85 }],
      ['Early (2-3)', { count: 18000, recall: 0.74 }],
      ['Mid (11-25)', { count: 45000, recall: 0.79 }],
      ['Mid-Early (4-10)', { count: 38000, recall: 0.77 }],
    ];

    const sorted = sortPositionBuckets(shuffledFixture);
    const sortedKeys = sorted.map(([k]) => k);

    expect(sortedKeys).toEqual([
      'Early (2-3)',
      'Mid-Early (4-10)',
      'Mid (11-25)',
      'Late (26-50)',
      'Deep (>50)',
    ]);
  });

  it('sorts a shuffled array of Delay Patterns positionBucket objects into journey order', () => {
    const shuffledPatterns = [
      { positionBucket: 'Deep (>50)', delayedRate: 73.9 },
      { positionBucket: 'Early (2-3)', delayedRate: 25.8 },
      { positionBucket: 'Late (26-50)', delayedRate: 64.2 },
      { positionBucket: 'Mid-Early (4-10)', delayedRate: 38.4 },
      { positionBucket: 'Mid (11-25)', delayedRate: 52.1 },
    ];

    const sorted = sortPositionBuckets(shuffledPatterns);
    const sortedBuckets = sorted.map((p) => p.positionBucket);

    expect(sortedBuckets).toEqual([
      'Early (2-3)',
      'Mid-Early (4-10)',
      'Mid (11-25)',
      'Late (26-50)',
      'Deep (>50)',
    ]);
  });

  it('preserves fallback order for unrecognized labels', () => {
    const custom = [
      { label: 'Segment B' },
      { label: 'Segment A' },
    ];
    const sorted = sortPositionBuckets(custom, (item) => item.label);
    expect(sorted).toEqual(custom);
  });
});
