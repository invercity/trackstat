import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import { getComparableValue } from '../../common/result-comparison';
import { Athlete, Discipline, Result } from '../schemas';

export interface RelayAthleteRef {
  _id: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
  gender: 'M' | 'F';
  club?: string;
  ageCategory: string;
}

export interface RelayStageMark {
  discipline: string;
  value: number;
  timing?: 'manual' | 'electronic';
  rawMark?: string;
  rank?: string;
  effectiveValue: number;
}

export interface RelayStage {
  stage: number;
  distance: string;
  role: string;
  athlete: RelayAthleteRef | null;
  mark: RelayStageMark | null;
}

export interface RelayStageCandidateGroup {
  stage: number;
  distance: string;
  candidates: {
    athlete: RelayAthleteRef;
    mark: RelayStageMark;
    role: string;
  }[];
}

export type RelayCategory = 'U16' | 'U18' | 'U20' | 'U21' | 'U23' | 'ADULT';

export interface RelaySquad {
  id: string;
  title: string;
  category: RelayCategory;
  gender: 'M' | 'F';
  relayType: 'swedish' | '4x100' | '4x400' | '4x800';
  stages: RelayStage[];
  reserves: {
    athlete: RelayAthleteRef;
    mark: RelayStageMark;
    role: string;
  }[];
  stageReserves?: RelayStageCandidateGroup[];
  totalTimeEstimated?: number;
  smartSquad?: {
    stages: RelayStage[];
    totalTimeEstimated: number;
    description: string;
  };
}

@Injectable()
export class RelaysService {
  constructor(
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Result.name) private results: Model<Result>,
    @InjectModel(Discipline.name) private disciplines: Model<Discipline>,
  ) {}

  async getRelaysOverview(): Promise<RelaySquad[]> {
    // 1. Find discipline IDs for sprint/relay feeder events: 100m, 200m, 400m, 800m
    const discList = await this.disciplines
      .find({ name: { $in: ['100 м', '200 м', '400 м', '800 м'] } })
      .lean();
    const discMap = new Map<string, any>();
    for (const d of discList) discMap.set(d.name, d);

    const d100 = discMap.get('100 м');
    const d200 = discMap.get('200 м');
    const d400 = discMap.get('400 м');
    const d800 = discMap.get('800 м');

    // 2. Load all athletes
    const allAthletes = await this.athletes.find().lean();
    const athleteMap = new Map<string, any>();
    for (const a of allAthletes) {
      const cat = ageCategory(a.birthDate);
      athleteMap.set(String(a._id), {
        _id: String(a._id),
        lastName: a.lastName,
        firstName: a.firstName,
        middleName: a.middleName,
        birthDate: a.birthDate,
        gender: a.gender,
        club: a.club,
        ageCategory: cat,
        best100: null as RelayStageMark | null,
        best200: null as RelayStageMark | null,
        best400: null as RelayStageMark | null,
        best800: null as RelayStageMark | null,
      });
    }

    // 3. Load all valid results in 100m, 200m, 400m, 800m
    const discIds = [d100?._id, d200?._id, d400?._id, d800?._id].filter(Boolean);
    const validResults = await this.results
      .find({
        discipline: { $in: discIds },
        status: 'OK',
        value: { $exists: true, $ne: null },
        athlete: { $ne: null },
      })
      .lean();

    for (const r of validResults) {
      const a = athleteMap.get(String(r.athlete));
      if (!a) continue;
      const eff = getComparableValue(r.value, 'time', r.timing);
      const discName =
        String(r.discipline) === String(d100?._id)
          ? '100 м'
          : String(r.discipline) === String(d200?._id)
          ? '200 м'
          : String(r.discipline) === String(d400?._id)
          ? '400 м'
          : '800 м';
      const mark: RelayStageMark = {
        discipline: discName,
        value: r.value!,
        timing: r.timing as any,
        rawMark: r.rawMark,
        rank: r.rank,
        effectiveValue: eff,
      };

      if (mark.discipline === '100 м') {
        if (!a.best100 || eff < a.best100.effectiveValue) a.best100 = mark;
      } else if (mark.discipline === '200 м') {
        if (!a.best200 || eff < a.best200.effectiveValue) a.best200 = mark;
      } else if (mark.discipline === '400 м') {
        if (!a.best400 || eff < a.best400.effectiveValue) a.best400 = mark;
      } else if (mark.discipline === '800 м') {
        if (!a.best800 || eff < a.best800.effectiveValue) a.best800 = mark;
      }
    }

    const getEligible = (category: RelayCategory, gender: 'M' | 'F') => {
      return Array.from(athleteMap.values()).filter((a) => {
        if (a.gender !== gender) return false;
        if (category === 'U16') return a.ageCategory === 'U16';
        if (category === 'U18') return a.ageCategory === 'U16' || a.ageCategory === 'U18';
        if (category === 'U20') return a.ageCategory === 'U16' || a.ageCategory === 'U18' || a.ageCategory === 'U20';
        if (category === 'U21') return a.ageCategory === 'U16' || a.ageCategory === 'U18' || a.ageCategory === 'U20' || a.ageCategory === 'U21';
        if (category === 'U23') return a.ageCategory !== 'ADULT';
        return true; // ADULT: all athletes of gender can run for senior squad
      });
    };

    const toAthleteRef = (a: any): RelayAthleteRef => ({
      _id: a._id,
      lastName: a.lastName,
      firstName: a.firstName,
      middleName: a.middleName,
      birthDate: a.birthDate,
      gender: a.gender,
      club: a.club,
      ageCategory: a.ageCategory,
    });

    // Form Swedish Relay (100 - 200 - 300 - 400)
    const buildSwedish = (category: 'U16' | 'U18', gender: 'M' | 'F'): RelaySquad => {
      const pool = getEligible(category, gender);
      const used = new Set<string>();

      // 400m candidates
      const sorted400 = pool
        .filter((a) => a.best400)
        .sort((a, b) => a.best400.effectiveValue - b.best400.effectiveValue);

      // Stage 4 (400m): best 400m
      const athlete4 = sorted400[0] ?? null;
      if (athlete4) used.add(athlete4._id);

      // Stage 3 (300m): best 400m of remaining
      const athlete3 = sorted400.find((a) => !used.has(a._id)) ?? null;
      if (athlete3) used.add(athlete3._id);

      // 200m candidates for Stage 2 and Stage 1
      const sorted200 = pool
        .filter((a) => !used.has(a._id) && a.best200)
        .sort((a, b) => a.best200.effectiveValue - b.best200.effectiveValue);

      // Stage 2 (200m): best 200m of remaining
      const athlete2 = sorted200[0] ?? null;
      if (athlete2) used.add(athlete2._id);

      // Stage 1 (100m): best 100m of remaining
      const sorted100 = pool
        .filter((a) => !used.has(a._id) && a.best100)
        .sort((a, b) => a.best100.effectiveValue - b.best100.effectiveValue);
      const athlete1 = sorted100[0] ?? null;
      const stage1Mark = athlete1?.best100 ?? null;
      if (athlete1) used.add(athlete1._id);

      // Stage candidates (up to 3 for each leg)
      const stageReserves: RelayStageCandidateGroup[] = [
        {
          stage: 1,
          distance: '100 м',
          candidates: pool
            .filter((a) => !used.has(a._id) && a.best100)
            .sort((a, b) => a.best100.effectiveValue - b.best100.effectiveValue)
            .slice(0, 3)
            .map((a, idx) => ({
              athlete: toAthleteRef(a),
              mark: a.best100,
              role: `Претендент #${idx + 1}`,
            })),
        },
        {
          stage: 2,
          distance: '200 м',
          candidates: pool
            .filter((a) => !used.has(a._id) && a.best200)
            .sort((a, b) => a.best200.effectiveValue - b.best200.effectiveValue)
            .slice(0, 3)
            .map((a, idx) => ({
              athlete: toAthleteRef(a),
              mark: a.best200,
              role: `Претендент #${idx + 1}`,
            })),
        },
        {
          stage: 3,
          distance: '300 м',
          candidates: pool
            .filter((a) => !used.has(a._id) && a.best400)
            .sort((a, b) => a.best400.effectiveValue - b.best400.effectiveValue)
            .slice(0, 3)
            .map((a, idx) => ({
              athlete: toAthleteRef(a),
              mark: a.best400,
              role: `Претендент #${idx + 1} (база 400 м)`,
            })),
        },
        {
          stage: 4,
          distance: '400 м',
          candidates: pool
            .filter((a) => !used.has(a._id) && a.best400)
            .sort((a, b) => a.best400.effectiveValue - b.best400.effectiveValue)
            .slice(0, 3)
            .map((a, idx) => ({
              athlete: toAthleteRef(a),
              mark: a.best400,
              role: `Претендент #${idx + 1}`,
            })),
        },
      ];

      const stages: RelayStage[] = [
        {
          stage: 1,
          distance: '100 м',
          role: 'Швидкий старт (старт з колодок)',
          athlete: athlete1 ? toAthleteRef(athlete1) : null,
          mark: stage1Mark,
        },
        {
          stage: 2,
          distance: '200 м',
          role: 'Спринтер віражу/прямої',
          athlete: athlete2 ? toAthleteRef(athlete2) : null,
          mark: athlete2?.best200 ?? null,
        },
        {
          stage: 3,
          distance: '300 м',
          role: 'Подовжений спринт (база 400 м)',
          athlete: athlete3 ? toAthleteRef(athlete3) : null,
          mark: athlete3?.best400 ?? null,
        },
        {
          stage: 4,
          distance: '400 м',
          role: 'Фінішер 400 м (витривалість і тактика)',
          athlete: athlete4 ? toAthleteRef(athlete4) : null,
          mark: athlete4?.best400 ?? null,
        },
      ];

      // Reserves
      const generalReservesPool = pool
        .filter((a) => !used.has(a._id))
        .map((a) => {
          const marks = [a.best100, a.best200, a.best400].filter(Boolean);
          const topMark = marks[0];
          return {
            athlete: toAthleteRef(a),
            mark: topMark,
            role: 'Універсальний запасний',
          };
        })
        .slice(0, 4);

      const reserves = generalReservesPool;

      // Calculate estimated total time
      const time1 = athlete1?.best100?.value;
      const time2 = athlete2?.best200?.value;
      const time3 = athlete3?.best400 ? Number((athlete3.best400.value * 0.75).toFixed(2)) : undefined;
      const time4 = athlete4?.best400?.value;
      const hasAll = time1 !== undefined && time2 !== undefined && time3 !== undefined && time4 !== undefined;
      const totalTimeEstimated = hasAll ? Number((time1 + time2 + time3 + time4).toFixed(2)) : undefined;

      // Smart squad optimization (brute force best 4 unique athletes)
      const c100 = pool.filter((a) => a.best100).slice(0, 6);
      const c200 = pool.filter((a) => a.best200).slice(0, 6);
      const c400 = pool.filter((a) => a.best400).slice(0, 8);

      let bestCombo: any = null;

      for (let i4 = 0; i4 < c400.length; i4++) {
        const a4 = c400[i4];
        for (let i3 = 0; i3 < c400.length; i3++) {
          if (i3 === i4) continue;
          const a3 = c400[i3];
          for (let i2 = 0; i2 < c200.length; i2++) {
            const a2 = c200[i2];
            if (a2._id === a4._id || a2._id === a3._id) continue;
            for (let i1 = 0; i1 < c100.length; i1++) {
              const a1 = c100[i1];
              if (a1._id === a4._id || a1._id === a3._id || a1._id === a2._id) continue;

              const totalEff =
                a1.best100.effectiveValue +
                a2.best200.effectiveValue +
                Number((a3.best400.effectiveValue * 0.75).toFixed(2)) +
                a4.best400.effectiveValue;

              if (!bestCombo || totalEff < bestCombo.totalEff) {
                bestCombo = { a1, a2, a3, a4, totalEff };
              }
            }
          }
        }
      }

      let smartSquad: RelaySquad['smartSquad'] | undefined = undefined;
      if (bestCombo) {
        const sTime1 = bestCombo.a1.best100.value;
        const sTime2 = bestCombo.a2.best200.value;
        const sTime3 = Number((bestCombo.a3.best400.value * 0.75).toFixed(2));
        const sTime4 = bestCombo.a4.best400.value;
        const sTotal = Number((sTime1 + sTime2 + sTime3 + sTime4).toFixed(2));

        smartSquad = {
          stages: [
            {
              stage: 1,
              distance: '100 м',
              role: 'Оптимальний вибір на 100 м',
              athlete: toAthleteRef(bestCombo.a1),
              mark: bestCombo.a1.best100,
            },
            {
              stage: 2,
              distance: '200 м',
              role: 'Оптимальний вибір на 200 м',
              athlete: toAthleteRef(bestCombo.a2),
              mark: bestCombo.a2.best200,
            },
            {
              stage: 3,
              distance: '300 м',
              role: 'Оптимальний вибір на 300 м (база 400 м)',
              athlete: toAthleteRef(bestCombo.a3),
              mark: bestCombo.a3.best400,
            },
            {
              stage: 4,
              distance: '400 м',
              role: 'Оптимальний фінішер на 400 м',
              athlete: toAthleteRef(bestCombo.a4),
              mark: bestCombo.a4.best400,
            },
          ],
          totalTimeEstimated: sTotal,
          description: 'Склад для оптимального результату',
        };
      }

      return {
        id: `${category.toLowerCase()}-swedish-${gender.toLowerCase()}`,
        title: `${category} 100-200-300-400 м`,
        category,
        gender,
        relayType: 'swedish',
        stages,
        reserves,
        stageReserves,
        totalTimeEstimated,
        smartSquad,
      };
    };

    // Form 4x100 Relay
    const build4x100 = (category: RelayCategory, gender: 'M' | 'F'): RelaySquad => {
      const pool = getEligible(category, gender);
      const sorted = pool
        .filter((a) => a.best100)
        .sort((a, b) => a.best100.effectiveValue - b.best100.effectiveValue);

      const r1 = sorted[0] ?? null; // Best -> Stage 4
      const r2 = sorted[1] ?? null; // 2nd -> Stage 2
      const r3 = sorted[2] ?? null; // 3rd -> Stage 1
      const r4 = sorted[3] ?? null; // 4th -> Stage 3
      const res1 = sorted[4] ?? null;
      const res2 = sorted[5] ?? null;
      const res3 = sorted[6] ?? null;

      const stages: RelayStage[] = [
        {
          stage: 1,
          distance: '100 м',
          role: '3-й по силі (стартер, старт з колодок)',
          athlete: r3 ? toAthleteRef(r3) : null,
          mark: r3?.best100 ?? null,
        },
        {
          stage: 2,
          distance: '100 м',
          role: '2-й по силі (прийом і передача на прямій)',
          athlete: r2 ? toAthleteRef(r2) : null,
          mark: r2?.best100 ?? null,
        },
        {
          stage: 3,
          distance: '100 м',
          role: '4-й по силі (біг по віражу)',
          athlete: r4 ? toAthleteRef(r4) : null,
          mark: r4?.best100 ?? null,
        },
        {
          stage: 4,
          distance: '100 м',
          role: 'Кращий учасник (фінішер)',
          athlete: r1 ? toAthleteRef(r1) : null,
          mark: r1?.best100 ?? null,
        },
      ];

      const reserves = [res1, res2, res3].filter(Boolean).map((a, idx) => ({
        athlete: toAthleteRef(a),
        mark: a.best100,
        role: `Претендент #${idx + 1} (${idx + 5}-й рейтинг)`,
      }));

      const times = [r1, r2, r3, r4].map((x) => x?.best100?.value).filter((v): v is number => typeof v === 'number');
      const totalTimeEstimated = times.length === 4 ? Number(times.reduce((s, v) => s + v, 0).toFixed(2)) : undefined;

      const titleCategory = category === 'ADULT' ? 'Дорослі' : category;
      return {
        id: `${category.toLowerCase()}-4x100-${gender.toLowerCase()}`,
        title: `${titleCategory} 4х100 м`,
        category,
        gender,
        relayType: '4x100',
        stages,
        reserves,
        totalTimeEstimated,
      };
    };

    // Form 4x400 Relay
    const build4x400 = (category: RelayCategory, gender: 'M' | 'F'): RelaySquad => {
      const pool = getEligible(category, gender);
      const sorted = pool
        .filter((a) => a.best400)
        .sort((a, b) => a.best400.effectiveValue - b.best400.effectiveValue);

      const r1 = sorted[0] ?? null; // Best -> Stage 4
      const r2 = sorted[1] ?? null; // 2nd -> Stage 1
      const r3 = sorted[2] ?? null; // 3rd -> Stage 2
      const r4 = sorted[3] ?? null; // 4th -> Stage 3
      const res1 = sorted[4] ?? null;
      const res2 = sorted[5] ?? null;
      const res3 = sorted[6] ?? null;

      const stages: RelayStage[] = [
        {
          stage: 1,
          distance: '400 м',
          role: '2-й по силі (стартер по окремих доріжках)',
          athlete: r2 ? toAthleteRef(r2) : null,
          mark: r2?.best400 ?? null,
        },
        {
          stage: 2,
          distance: '400 м',
          role: '3-й по силі (перехід на загальну брівку)',
          athlete: r3 ? toAthleteRef(r3) : null,
          mark: r3?.best400 ?? null,
        },
        {
          stage: 3,
          distance: '400 м',
          role: '4-й по силі (утримання позиції на передостанньому етапі)',
          athlete: r4 ? toAthleteRef(r4) : null,
          mark: r4?.best400 ?? null,
        },
        {
          stage: 4,
          distance: '400 м',
          role: 'Кращий учасник (фінішер)',
          athlete: r1 ? toAthleteRef(r1) : null,
          mark: r1?.best400 ?? null,
        },
      ];

      const reserves = [res1, res2, res3].filter(Boolean).map((a, idx) => ({
        athlete: toAthleteRef(a),
        mark: a.best400,
        role: `Претендент #${idx + 1} (${idx + 5}-й рейтинг)`,
      }));

      const times = [r1, r2, r3, r4].map((x) => x?.best400?.value).filter((v): v is number => typeof v === 'number');
      const totalTimeEstimated = times.length === 4 ? Number(times.reduce((s, v) => s + v, 0).toFixed(2)) : undefined;

      const titleCategory = category === 'ADULT' ? 'Дорослі' : category;
      return {
        id: `${category.toLowerCase()}-4x400-${gender.toLowerCase()}`,
        title: `${titleCategory} 4х400 м`,
        category,
        gender,
        relayType: '4x400',
        stages,
        reserves,
        totalTimeEstimated,
      };
    };

    // Form 4x800 Relay
    const build4x800 = (category: RelayCategory, gender: 'M' | 'F'): RelaySquad => {
      const pool = getEligible(category, gender);
      const sorted = pool
        .filter((a) => a.best800)
        .sort((a, b) => a.best800.effectiveValue - b.best800.effectiveValue);

      const r1 = sorted[0] ?? null; // Best -> Stage 4
      const r2 = sorted[1] ?? null; // 2nd -> Stage 1
      const r3 = sorted[2] ?? null; // 3rd -> Stage 2
      const r4 = sorted[3] ?? null; // 4th -> Stage 3
      const res1 = sorted[4] ?? null;
      const res2 = sorted[5] ?? null;
      const res3 = sorted[6] ?? null;

      const stages: RelayStage[] = [
        {
          stage: 1,
          distance: '800 м',
          role: '2-й по силі (стартер, боротьба за позицію)',
          athlete: r2 ? toAthleteRef(r2) : null,
          mark: r2?.best800 ?? null,
        },
        {
          stage: 2,
          distance: '800 м',
          role: '3-й по силі (утримання темпу та розриву)',
          athlete: r3 ? toAthleteRef(r3) : null,
          mark: r3?.best800 ?? null,
        },
        {
          stage: 3,
          distance: '800 м',
          role: '4-й по силі (передостанній етап, збереження шансів)',
          athlete: r4 ? toAthleteRef(r4) : null,
          mark: r4?.best800 ?? null,
        },
        {
          stage: 4,
          distance: '800 м',
          role: 'Кращий учасник (фінішер, фінішний спурт)',
          athlete: r1 ? toAthleteRef(r1) : null,
          mark: r1?.best800 ?? null,
        },
      ];

      const reserves = [res1, res2, res3].filter(Boolean).map((a, idx) => ({
        athlete: toAthleteRef(a),
        mark: a.best800,
        role: `Претендент #${idx + 1} (${idx + 5}-й рейтинг)`,
      }));

      const times = [r1, r2, r3, r4].map((x) => x?.best800?.value).filter((v): v is number => typeof v === 'number');
      const totalTimeEstimated = times.length === 4 ? Number(times.reduce((s, v) => s + v, 0).toFixed(2)) : undefined;

      const titleCategory = category === 'ADULT' ? 'Дорослі' : category;
      return {
        id: `${category.toLowerCase()}-4x800-${gender.toLowerCase()}`,
        title: `${titleCategory} 4х800 м`,
        category,
        gender,
        relayType: '4x800',
        stages,
        reserves,
        totalTimeEstimated,
      };
    };

    return [
      // U16
      buildSwedish('U16', 'M'),
      buildSwedish('U16', 'F'),
      build4x100('U16', 'M'),
      build4x100('U16', 'F'),
      build4x400('U16', 'M'),
      build4x400('U16', 'F'),
      build4x800('U16', 'M'),
      build4x800('U16', 'F'),

      // U18
      buildSwedish('U18', 'M'),
      buildSwedish('U18', 'F'),
      build4x100('U18', 'M'),
      build4x100('U18', 'F'),
      build4x400('U18', 'M'),
      build4x400('U18', 'F'),
      build4x800('U18', 'M'),
      build4x800('U18', 'F'),

      // U21
      build4x100('U21', 'M'),
      build4x100('U21', 'F'),
      build4x400('U21', 'M'),
      build4x400('U21', 'F'),
      build4x800('U21', 'M'),
      build4x800('U21', 'F'),

      // U23
      build4x100('U23', 'M'),
      build4x100('U23', 'F'),
      build4x400('U23', 'M'),
      build4x400('U23', 'F'),
      build4x800('U23', 'M'),
      build4x800('U23', 'F'),

      // Дорослі
      build4x100('ADULT', 'M'),
      build4x100('ADULT', 'F'),
      build4x400('ADULT', 'M'),
      build4x400('ADULT', 'F'),
      build4x800('ADULT', 'M'),
      build4x800('ADULT', 'F'),
    ];
  }
}
