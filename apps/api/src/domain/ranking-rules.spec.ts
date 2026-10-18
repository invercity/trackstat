import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  calculateResultPoints,
  getRankBonus,
  getRecordBonus,
  getScoringGroup,
  PLACE_POINTS,
} from './ranking-rules';

describe('ranking-rules', () => {
  it('correctly maps categories to scoring groups', () => {
    assert.strictEqual(getScoringGroup('U16'), 'YOUTH');
    assert.strictEqual(getScoringGroup('U18'), 'YOUTH');
    assert.strictEqual(getScoringGroup('U20'), 'U20');
    assert.strictEqual(getScoringGroup('U21'), 'U20');
    assert.strictEqual(getScoringGroup('U23'), 'U23');
    assert.strictEqual(getScoringGroup('ADULT'), 'ADULT');
  });

  it('calculates regional championship place points', () => {
    // 1st place in obl for Adult = 60 pts
    const res1 = calculateResultPoints({ level: 'obl', category: 'ADULT', place: 1 });
    assert.strictEqual(res1.placePoints, 60);
    assert.strictEqual(res1.totalPoints, 60);

    // 1st place in obl for Youth (U16/U18) = 40 pts
    const resYouth = calculateResultPoints({ level: 'obl', category: 'U16', place: 1 });
    assert.strictEqual(resYouth.placePoints, 40);

    // 12th place in obl for Adult = 16 pts
    const res12 = calculateResultPoints({ level: 'obl', category: 'ADULT', place: 12 });
    assert.strictEqual(res12.placePoints, 16);
  });

  it('calculates national championship place points', () => {
    // 1st place in ukraine for Adult = 200 pts
    const res = calculateResultPoints({ level: 'ukraine', category: 'ADULT', place: 1 });
    assert.strictEqual(res.placePoints, 200);

    // 3rd place in ukraine for U18 = 120 pts
    const resU18 = calculateResultPoints({ level: 'ukraine', category: 'U18', place: 3 });
    assert.strictEqual(resU18.placePoints, 120);
  });

  it('awards sport rank bonuses', () => {
    // Adult with MSUMK = 100, MS = 60, KMS = 30
    assert.strictEqual(getRankBonus('МСУМК', 'ADULT'), 100);
    assert.strictEqual(getRankBonus('МСУ', 'ADULT'), 60);
    assert.strictEqual(getRankBonus('КМСУ', 'ADULT'), 30);
    assert.strictEqual(getRankBonus('I р.', 'ADULT'), 0);

    // Youth with I rank = 20, KMS = 60, MS = 120
    assert.strictEqual(getRankBonus('I розряд', 'YOUTH'), 20);
    assert.strictEqual(getRankBonus('КМС', 'YOUTH'), 60);
    assert.strictEqual(getRankBonus('МС', 'YOUTH'), 120);
  });

  it('awards record bonuses from notes', () => {
    assert.strictEqual(getRecordBonus('Рекорд України', 'ADULT'), 200);
    assert.strictEqual(getRecordBonus('рекорд області!', 'ADULT'), 100);
    assert.strictEqual(getRecordBonus('РНУ серед юніорів', 'U20'), 160);
    assert.strictEqual(getRecordBonus('РО', 'YOUTH'), 70);
    assert.strictEqual(getRecordBonus(undefined, 'ADULT'), 0);
  });

  it('combines place points, rank bonus and record bonus in calculateResultPoints', () => {
    // 1st place obl Adult (60) + KMS (30) + Region record (100) = 190
    const res = calculateResultPoints({
      level: 'obl',
      category: 'ADULT',
      place: 1,
      rank: 'КМСУ',
      notes: 'Рекорд області',
    });
    assert.strictEqual(res.placePoints, 60);
    assert.strictEqual(res.rankBonus, 30);
    assert.strictEqual(res.recordBonus, 100);
    assert.strictEqual(res.bonusPoints, 130);
    assert.strictEqual(res.totalPoints, 190);
  });
});
