import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { determineSportRank } from './ua-ranks';

describe('determineSportRank', () => {
  it('determines elite ranks for Men 100m properly', () => {
    // 10.25 <= 10.27 -> МСМК
    assert.equal(determineSportRank('M', '100 м', 10.25, 'electronic'), 'МСМК');
    // 10.65 <= 10.70 -> МС
    assert.equal(determineSportRank('M', '100 м', 10.65, 'electronic'), 'МС');
    // 10.95 (electronic: 10.95 - 0.24 = 10.71 <= 10.8) -> КМС
    assert.equal(determineSportRank('M', '100 м', 10.95, 'electronic'), 'КМС');
  });

  it('determines ranks for field events (higher value is better)', () => {
    // Men Long Jump (МСМК: 8.00, МС: 7.75, КМС: 7.30, І: 6.90, ІІІ: 5.80)
    assert.equal(determineSportRank('M', 'Стрибки у довжину', 8.05), 'МСМК');
    assert.equal(determineSportRank('M', 'Стрибки у довжину', 7.80), 'МС');
    assert.equal(determineSportRank('M', 'Стрибки у довжину', 7.40), 'КМС');
    assert.equal(determineSportRank('M', 'Стрибки у довжину', 7.00), 'І');
    assert.equal(determineSportRank('M', 'Стрибки у довжину', 5.90), 'ІІІ');
  });

  it('determines ranks for Women events', () => {
    // Women 100m (МСМК: 11.34, МС: 11.84, КМС: 12.0)
    assert.equal(determineSportRank('F', '100 м', 11.30, 'electronic'), 'МСМК');
    assert.equal(determineSportRank('F', '100 м', 11.75, 'electronic'), 'МС');
  });

  it('returns null if mark does not achieve minimum standard or discipline is unknown', () => {
    assert.equal(determineSportRank('M', '100 м', 20.0), null);
    assert.equal(determineSportRank('M', 'Unknown Discipline', 10.0), null);
  });
});
