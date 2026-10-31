import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  compareDisciplineNames,
  matchStandardDisciplineName,
  parseProtocolDob,
  parseProtocolValue,
} from './protocol-parser';
import {
  computeOverallFinalPlaces,
  isFinalRoundLabel,
} from '../domain/services/web-importer/web-importer.utils';

describe('protocol-parser', () => {
  describe('parseProtocolDob', () => {
    it('parses standard dd.mm.yyyy dates', () => {
      const d = parseProtocolDob('09.10.2008');
      assert.ok(d);
      assert.strictEqual(d.getUTCFullYear(), 2008);
      assert.strictEqual(d.getUTCMonth(), 9); // October (0-indexed)
      assert.strictEqual(d.getUTCDate(), 9);
    });

    it('parses 4-digit birth year only', () => {
      const d = parseProtocolDob('2006');
      assert.ok(d);
      assert.strictEqual(d.getUTCFullYear(), 2006);
      assert.strictEqual(d.getUTCMonth(), 0);
      assert.strictEqual(d.getUTCDate(), 1);
    });

    it('returns null for empty or invalid input', () => {
      assert.strictEqual(parseProtocolDob(''), null);
      assert.strictEqual(parseProtocolDob('abc'), null);
    });
  });

  describe('parseProtocolValue', () => {
    it('parses simple running time with manual timing', () => {
      const p = parseProtocolValue('11,2');
      assert.strictEqual(p.status, 'OK');
      assert.strictEqual(p.val, 11.2);
      assert.strictEqual(p.timing, 'manual');
      assert.strictEqual(p.isFinal, false);
    });

    it('parses electronic time with 2 decimals', () => {
      const p = parseProtocolValue('10.84');
      assert.strictEqual(p.status, 'OK');
      assert.strictEqual(p.val, 10.84);
      assert.strictEqual(p.timing, 'electronic');
    });

    it('parses finals prefix Ф-', () => {
      const p = parseProtocolValue('Ф-11,2');
      assert.strictEqual(p.status, 'OK');
      assert.strictEqual(p.val, 11.2);
      assert.strictEqual(p.isFinal, true);
      assert.strictEqual(p.finalVal, 11.2);
    });

    it('parses both heat and final values in single string', () => {
      const p = parseProtocolValue('11,4 Ф-11,2');
      assert.strictEqual(p.status, 'OK');
      assert.strictEqual(p.isFinal, true);
      assert.strictEqual(p.heatVal, 11.4);
      assert.strictEqual(p.finalVal, 11.2);
      assert.strictEqual(p.val, 11.2);
    });

    it('parses minutes and seconds format', () => {
      const p = parseProtocolValue('1:58.4');
      assert.strictEqual(p.status, 'OK');
      assert.strictEqual(p.val, 118.4);
      assert.strictEqual(p.timing, 'manual');
    });

    it('parses status codes DNS, DNF, DQ, NM', () => {
      assert.strictEqual(parseProtocolValue('DNS').status, 'DNS');
      assert.strictEqual(parseProtocolValue('DNF').status, 'DNF');
      assert.strictEqual(parseProtocolValue('DQ').status, 'DQ');
      assert.strictEqual(parseProtocolValue('Ф-DNS').status, 'DNS');
    });

    it('parses jump marks with wind after slash (e.g. 5.67/0.0 or 10.97/-0.6)', () => {
      const p1 = parseProtocolValue('5.67/0.0');
      assert.strictEqual(p1.status, 'OK');
      assert.strictEqual(p1.val, 5.67);
      assert.strictEqual(p1.wind, 0);

      const p2 = parseProtocolValue('5.44/+2.4');
      assert.strictEqual(p2.status, 'OK');
      assert.strictEqual(p2.val, 5.44);
      assert.strictEqual(p2.wind, 2.4);

      const p3 = parseProtocolValue('10.97/-0.6');
      assert.strictEqual(p3.status, 'OK');
      assert.strictEqual(p3.val, 10.97);
      assert.strictEqual(p3.wind, -0.6);
    });
  });

  describe('matchStandardDisciplineName', () => {
    it('matches hurdles with priority over flat running', () => {
      assert.strictEqual(matchStandardDisciplineName('Біг 110 м з/б, юнаки'), '110 м з бар’єрами');
      assert.strictEqual(matchStandardDisciplineName('100м з/б'), '100 м з бар’єрами');
      assert.strictEqual(matchStandardDisciplineName('400 м з/б'), '400 м з бар’єрами');
    });

    it('matches flat sprint and distance running', () => {
      assert.strictEqual(matchStandardDisciplineName('100м, чоловіки'), '100 м');
      assert.strictEqual(matchStandardDisciplineName('Біг 200 м'), '200 м');
      assert.strictEqual(matchStandardDisciplineName('800 м'), '800 м');
      assert.strictEqual(matchStandardDisciplineName('1500 м'), '1500 м');
    });

    it('matches field disciplines', () => {
      assert.strictEqual(matchStandardDisciplineName('Стрибки у висоту, дівчата'), 'Стрибки у висоту');
      assert.strictEqual(matchStandardDisciplineName('Потрійний стрибок'), 'Потрійний стрибок');
      assert.strictEqual(matchStandardDisciplineName('Штовхання ядра'), 'Штовхання ядра');
      assert.strictEqual(matchStandardDisciplineName('Метання списа'), 'Метання списа');
    });

    it('matches relays', () => {
      assert.strictEqual(matchStandardDisciplineName('Естафетний біг 100+200+300+400 м'), 'Естафета 100+200+300+400 м');
      assert.strictEqual(matchStandardDisciplineName('4х100 м'), 'Естафета 4х100 м');
      assert.strictEqual(matchStandardDisciplineName('4х400 м'), 'Естафета 4х400 м');
      assert.strictEqual(matchStandardDisciplineName('4х800 м'), 'Естафета 4х800 м');
    });
  });

  describe('compareDisciplineNames', () => {
    it('sorts disciplines in official athletic order (stadium events first, then cross-country at the end)', () => {
      const unordered = [
        'Крос 4 км',
        'Естафета 4х400 м',
        '800 м',
        '100 м',
        'Стрибки у довжину',
        '1500 м',
        '60 м',
        'Штовхання ядра',
        '400 м',
        '60 м з бар’єрами',
        '200 м',
        '3000 м',
      ];
      const sorted = [...unordered].sort(compareDisciplineNames);
      assert.deepStrictEqual(sorted, [
        '60 м',
        '100 м',
        '200 м',
        '400 м',
        '800 м',
        '1500 м',
        '3000 м',
        '60 м з бар’єрами',
        'Стрибки у довжину',
        'Штовхання ядра',
        'Естафета 4х400 м',
        'Крос 4 км',
      ]);
    });
  });

  describe('web-importer multi-heat final & round place calculation', () => {
    it('identifies true finals and excludes heats, qualifications, and combined event sub-disciplines', () => {
      assert.strictEqual(isFinalRoundLabel('Фінал'), true);
      assert.strictEqual(isFinalRoundLabel('Фінальні забіги'), true);
      assert.strictEqual(isFinalRoundLabel('Забіги'), false);
      assert.strictEqual(isFinalRoundLabel('Кваліфікація'), false);
      assert.strictEqual(isFinalRoundLabel('1/2 фіналу'), false);
      assert.strictEqual(isFinalRoundLabel('Семиборство'), false);
      assert.strictEqual(isFinalRoundLabel('Фінал', 'Семиборство'), false);
    });

    it('computes overall final places across multiple timed-final heats before region filtering', () => {
      // Cup of Ukraine 200m Men Final (3 heats)
      const heat1Winner = { name: 'Петков Роман', heat: 1 };
      const heat2Winner = { name: 'Єрмоленко Андрій', heat: 2 };
      const heat3Winner = { name: 'Барабанов Андрій', heat: 3 };
      const heat3Second = { name: 'Ємець Владислав', heat: 3 };
      const dnsRunner = { name: 'Іванов Іван', heat: 1 };

      const places = computeOverallFinalPlaces(
        [
          { item: heat1Winner, rawMark: '23.63', heatPlace: 1 },
          { item: heat2Winner, rawMark: '22.43', heatPlace: 1 },
          { item: heat3Winner, rawMark: '21.87', heatPlace: 1 },
          { item: heat3Second, rawMark: '22.36', heatPlace: 2 },
          { item: dnsRunner, rawMark: 'DNS', heatPlace: undefined },
        ],
        false,
      );

      assert.strictEqual(places.get(heat3Winner), 1);
      assert.strictEqual(places.get(heat3Second), 2);
      assert.strictEqual(places.get(heat2Winner), 3); // 1st in Heat 2 -> 3rd overall!
      assert.strictEqual(places.get(heat1Winner), 4); // 1st in Heat 1 -> 4th overall!
      assert.strictEqual(places.get(dnsRunner), undefined);
    });
  });
});
