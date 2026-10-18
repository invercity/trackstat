import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectTiming, formatValue, getComparableValue, fullName } from './format.ts';

describe('format utilities', () => {
  describe('detectTiming', () => {
    it('detects manual timing from suffixes and decimals', () => {
      assert.equal(detectTiming('11.2h'), 'manual');
      assert.equal(detectTiming('11.2р'), 'manual');
      assert.equal(detectTiming('11.2 руч'), 'manual');
      assert.equal(detectTiming('11.2'), 'manual');
      assert.equal(detectTiming('10,8'), 'manual');
    });

    it('detects electronic timing for 2 or more decimal places', () => {
      assert.equal(detectTiming('11.24'), 'electronic');
      assert.equal(detectTiming('10,85'), 'electronic');
      assert.equal(detectTiming('1:54.32'), 'electronic');
    });
  });

  describe('formatValue', () => {
    it('formats time properly for manual and electronic timing', () => {
      // Manual time to tenths
      assert.equal(formatValue(11.2, 'time', 'manual'), '11.2');
      assert.equal(formatValue(72.5, 'time', 'manual'), '1:12.5');

      // Electronic time to hundredths
      assert.equal(formatValue(11.24, 'time', 'electronic'), '11.24');
      assert.equal(formatValue(114.56, 'time', 'electronic'), '1:54.56');
    });

    it('formats distance to 2 decimals', () => {
      assert.equal(formatValue(7.85, 'distance'), '7.85');
      assert.equal(formatValue(2.1, 'distance'), '2.10');
    });

    it('formats points to integer', () => {
      assert.equal(formatValue(1054.6, 'points'), '1055');
    });

    it('handles undefined or null values', () => {
      assert.equal(formatValue(undefined, 'time'), '–');
      assert.equal(formatValue(null, 'distance'), '–');
    });
  });

  describe('getComparableValue', () => {
    it('adds +0.24 penalty for manual running times', () => {
      const elec = getComparableValue(11.0, 'time', 'electronic');
      const manual = getComparableValue(11.0, 'time', 'manual');
      assert.equal(elec, 11.0);
      assert.equal(manual, 11.24);
    });

    it('does not modify distances or points', () => {
      assert.equal(getComparableValue(6.5, 'distance', 'manual'), 6.5);
      assert.equal(getComparableValue(800, 'points'), 800);
    });
  });

  describe('fullName', () => {
    it('formats full name with last, first, middle', () => {
      assert.equal(
        fullName({ lastName: 'Шевченко', firstName: 'Андрій', middleName: 'Миколайович' }),
        'Шевченко Андрій Миколайович',
      );
      assert.equal(
        fullName({ lastName: 'Франко', firstName: 'Іван' }),
        'Франко Іван',
      );
    });
  });
});
