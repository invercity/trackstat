import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { determineSeason, isCurrentSeason } from './season';

describe('determineSeason', () => {
  it('determines outdoor season from April to October', () => {
    // Квітень (початок outdoor сезону)
    assert.deepEqual(determineSeason('2026-04-01T00:00:00Z'), {
      year: 2026,
      indoor: false,
      label: '2026',
    });

    // Червень (середина outdoor сезону)
    assert.deepEqual(determineSeason('2026-06-15T12:00:00Z'), {
      year: 2026,
      indoor: false,
      label: '2026',
    });

    // Жовтень (кінець outdoor сезону)
    assert.deepEqual(determineSeason('2026-10-31T23:59:59Z'), {
      year: 2026,
      indoor: false,
      label: '2026',
    });
  });

  it('determines indoor season for November and December as belonging to NEXT year', () => {
    // 1 листопада 2026 -> indoor сезон 2027
    assert.deepEqual(determineSeason('2026-11-01T00:00:00Z'), {
      year: 2027,
      indoor: true,
      label: '2027 (i)',
    });

    // 25 грудня 2026 -> indoor сезон 2027
    assert.deepEqual(determineSeason('2026-12-25T15:30:00Z'), {
      year: 2027,
      indoor: true,
      label: '2027 (i)',
    });
  });

  it('determines indoor season for January, February, March as belonging to CURRENT year', () => {
    // 10 січня 2027 -> indoor сезон 2027
    assert.deepEqual(determineSeason('2027-01-10T00:00:00Z'), {
      year: 2027,
      indoor: true,
      label: '2027 (i)',
    });

    // 20 лютого 2027 -> indoor сезон 2027
    assert.deepEqual(determineSeason('2027-02-20T12:00:00Z'), {
      year: 2027,
      indoor: true,
      label: '2027 (i)',
    });

    // 31 березня 2027 -> indoor сезон 2027
    assert.deepEqual(determineSeason('2027-03-31T23:59:59Z'), {
      year: 2027,
      indoor: true,
      label: '2027 (i)',
    });
  });

  it('correctly transitions on exact month boundaries', () => {
    // 31 березня 2026 -> 2026 (i)
    assert.equal(determineSeason('2026-03-31T23:59:59Z').indoor, true);
    assert.equal(determineSeason('2026-03-31T23:59:59Z').year, 2026);

    // 1 квітня 2026 -> 2026 outdoor
    assert.equal(determineSeason('2026-04-01T00:00:00Z').indoor, false);
    assert.equal(determineSeason('2026-04-01T00:00:00Z').year, 2026);

    // 31 жовтня 2026 -> 2026 outdoor
    assert.equal(determineSeason('2026-10-31T23:59:59Z').indoor, false);
    assert.equal(determineSeason('2026-10-31T23:59:59Z').year, 2026);

    // 1 листопада 2026 -> 2027 (i)
    assert.equal(determineSeason('2026-11-01T00:00:00Z').indoor, true);
    assert.equal(determineSeason('2026-11-01T00:00:00Z').year, 2027);
  });

  it('identifies if a given season is current', () => {
    const june2026 = new Date('2026-06-15T00:00:00Z');
    assert.equal(isCurrentSeason({ year: 2026, indoor: false }, june2026), true);
    assert.equal(isCurrentSeason({ year: 2026, indoor: true }, june2026), false);

    const nov2026 = new Date('2026-11-15T00:00:00Z');
    assert.equal(isCurrentSeason({ year: 2027, indoor: true }, nov2026), true);
    assert.equal(isCurrentSeason({ year: 2026, indoor: false }, nov2026), false);
  });
});
