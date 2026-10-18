import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { getComparableValue, isBetterMark, pickBestMark } from './result-comparison';

describe('result-comparison', () => {
  it('applies +0.24 penalty for manual running timing', () => {
    assert.strictEqual(getComparableValue(10.8, 'time', 'manual'), 11.04);
    assert.strictEqual(getComparableValue(10.84, 'time', 'electronic'), 10.84);
  });

  it('does not modify field event distances or points', () => {
    assert.strictEqual(getComparableValue(7.85, 'distance'), 7.85);
    assert.strictEqual(getComparableValue(5420, 'points'), 5420);
  });

  it('correctly compares running marks considering timing', () => {
    // 10.8 manual = 11.04 effective
    // 11.00 electronic = 11.00 effective (11.00 is faster than 11.04)
    const manual10_8 = { value: 10.8, timing: 'manual' };
    const elec11_0 = { value: 11.0, timing: 'electronic' };

    assert.strictEqual(isBetterMark('time', elec11_0, manual10_8), true);
    assert.strictEqual(isBetterMark('time', manual10_8, elec11_0), false);

    // If effective time is equal (e.g. 10.8 manual = 11.04 vs 11.04 electronic), electronic wins
    const elec11_04 = { value: 11.04, timing: 'electronic' };
    assert.strictEqual(isBetterMark('time', elec11_04, manual10_8), true);
  });

  it('correctly compares field marks (greater is better)', () => {
    const jumpA = { value: 2.15 };
    const jumpB = { value: 2.10 };
    assert.strictEqual(isBetterMark('distance', jumpA, jumpB), true);
    assert.strictEqual(isBetterMark('distance', jumpB, jumpA), false);
  });

  it('picks the best mark from an array of results', () => {
    const runs = [
      { id: 1, value: 11.2, timing: 'manual' },     // 11.44 eff
      { id: 2, value: 11.05, timing: 'electronic' }, // 11.05 eff (BEST)
      { id: 3, value: 11.1, timing: 'manual' },     // 11.34 eff
    ];
    const best = pickBestMark(runs, 'time');
    assert.strictEqual(best?.id, 2);
  });
});
