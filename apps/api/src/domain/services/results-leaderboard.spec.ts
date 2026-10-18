import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBetterMark, pickBestMark } from '../../common/result-comparison';

describe('leaderboard comparison logic', () => {
  it('correctly orders 100m sprint results with manual penalty', () => {
    const r1 = { value: 10.9, timing: 'manual' }; // 10.9 + 0.24 = 11.14
    const r2 = { value: 11.05, timing: 'electronic' }; // 11.05
    const r3 = { value: 11.2, timing: 'electronic' }; // 11.20

    assert.equal(isBetterMark('time', r2, r1), true); // 11.05 is better than 11.14
    assert.equal(isBetterMark('time', r1, r3), true); // 11.14 is better than 11.20

    const best = pickBestMark([r1, r2, r3], 'time');
    assert.equal(best, r2);
  });

  it('correctly picks best mark for jumps/throws (greater is better)', () => {
    const m1 = { value: 6.85 };
    const m2 = { value: 7.12 };
    const m3 = { value: 6.95 };

    assert.equal(isBetterMark('distance', m2, m1), true);
    assert.equal(isBetterMark('distance', m1, m3), false);

    const best = pickBestMark([m1, m2, m3], 'distance');
    assert.equal(best, m2);
  });

  it('groups unique athletes keeping only their best performance', () => {
    const athleteA = { id: 'A', name: 'Ivan' };
    const runs = [
      { athlete: athleteA, value: 11.4, timing: 'manual' }, // 11.64
      { athlete: athleteA, value: 11.3, timing: 'electronic' }, // 11.30 (best)
      { athlete: athleteA, value: 11.5, timing: 'electronic' }, // 11.50
    ];

    const bestForA = runs.reduce((best, curr) => (isBetterMark('time', curr, best) ? curr : best), runs[0]);
    assert.equal(bestForA.value, 11.3);
    assert.equal(bestForA.timing, 'electronic');
  });
});
