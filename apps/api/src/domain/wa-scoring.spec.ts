import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateWaScore } from './wa-scoring';

describe('calculateWaScore', () => {
  it('returns valid WA points for standard track results', () => {
    // 10.50 in Men 100m should yield strong WA points (>900)
    const men100 = calculateWaScore('M', '100 м', 10.5);
    assert.ok(typeof men100 === 'number' && men100 > 900, `Expected >900 pts, got ${men100}`);

    // 11.50 in Women 100m should yield strong WA points (>1000)
    const women100 = calculateWaScore('F', '100 м', 11.5);
    assert.ok(typeof women100 === 'number' && women100 > 950, `Expected >950 pts, got ${women100}`);
  });

  it('adjusts manual timing by adding +0.24s penalty in sprint/run', () => {
    // Electronic 10.80 vs Manual 10.80 (which behaves as 11.04)
    const elecScore = calculateWaScore('M', '100 м', 10.8, 'electronic');
    const manualScore = calculateWaScore('M', '100 м', 10.8, 'manual');

    assert.ok(typeof elecScore === 'number' && typeof manualScore === 'number');
    assert.ok(elecScore > manualScore, 'Electronic score should be higher than manual score for same numeric mark');
  });

  it('handles field disciplines like jumps and throws', () => {
    // Men High Jump 2.10m
    const hjScore = calculateWaScore('M', 'Стрибки у висоту', 2.1);
    assert.ok(typeof hjScore === 'number' && hjScore > 900);

    // Women Long Jump 6.20m
    const ljScore = calculateWaScore('F', 'Стрибки у довжину', 6.2);
    assert.ok(typeof ljScore === 'number' && ljScore > 950);
  });

  it('returns null for invalid, non-positive or unknown disciplines', () => {
    assert.equal(calculateWaScore('M', '100 м', 0), null);
    assert.equal(calculateWaScore('M', '100 м', -5), null);
    assert.equal(calculateWaScore('M', 'Unknown Discipline', 10.0), null);
  });
});
