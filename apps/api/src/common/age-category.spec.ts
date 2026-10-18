import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ageCategory } from './age-category';

describe('ageCategory', () => {
  const eventDate = new Date('2026-06-15T00:00:00Z');

  it('determines U16 category correctly (15 or younger in event year)', () => {
    // 2026 - 2011 = 15 -> U16
    assert.equal(ageCategory('2011-09-23', eventDate), 'U16');
    // 2026 - 2012 = 14 -> U16
    assert.equal(ageCategory('2012-01-01', eventDate), 'U16');
  });

  it('determines U18 category correctly (16 or 17 in event year)', () => {
    // 2026 - 2010 = 16 -> U18
    assert.equal(ageCategory('2010-05-10', eventDate), 'U18');
    // 2026 - 2009 = 17 -> U18
    assert.equal(ageCategory('2009-12-31', eventDate), 'U18');
  });

  it('determines U21 category correctly (18 to 20 in event year)', () => {
    // 2026 - 2008 = 18 -> U21
    assert.equal(ageCategory('2008-03-14', eventDate), 'U21');
    // 2026 - 2006 = 20 -> U21
    assert.equal(ageCategory('2006-08-20', eventDate), 'U21');
  });

  it('determines U23 category correctly (21 or 22 in event year)', () => {
    // 2026 - 2005 = 21 -> U23
    assert.equal(ageCategory('2005-07-07', eventDate), 'U23');
    // 2026 - 2004 = 22 -> U23
    assert.equal(ageCategory('2004-11-11', eventDate), 'U23');
  });

  it('determines ADULT category for athletes older than 22 in event year', () => {
    // 2026 - 2003 = 23 -> ADULT
    assert.equal(ageCategory('2003-01-01', eventDate), 'ADULT');
    // 2026 - 1990 = 36 -> ADULT
    assert.equal(ageCategory('1990-05-12', eventDate), 'ADULT');
  });

  it('handles Date objects as inputs', () => {
    const birth = new Date('2010-02-15T00:00:00Z');
    assert.equal(ageCategory(birth, eventDate), 'U18');
  });
});
