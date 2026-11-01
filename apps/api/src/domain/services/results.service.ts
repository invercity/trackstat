import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ageCategory } from '../../common/age-category';
import { CrudService } from '../../common/crud';
import { compareDisciplineNames } from '../../common/protocol-parser';
import { isBetterMark } from '../../common/result-comparison';
import { determineSeason } from '../../common/season';
import { Athlete, Competition, Discipline, Result } from '../schemas';
import { determineSportRank } from '../ua-ranks';
import { calculateWaScore } from '../wa-scoring';
import { SeasonsService } from './seasons.service';
import { AppCacheService } from '../../common/cache/app-cache.service';

const oid = (v: any) => String(v?._id ?? v);

@Injectable()
export class ResultsService extends CrudService {
  constructor(
    @InjectModel(Result.name) model: Model<Result>,
    @InjectModel(Athlete.name) private athletes: Model<Athlete>,
    @InjectModel(Competition.name) private competitions: Model<Competition>,
    @InjectModel(Discipline.name) private disciplines: Model<Discipline>,
    @Optional() private readonly seasonsService?: SeasonsService,
    @Optional() private readonly cache?: AppCacheService,
  ) {
    super(model);
  }

  async findAll(query: any = {}) {
    const filter: any = {};
    if (query.athleteId) filter.athlete = query.athleteId;
    if (query.competitionId) filter.competition = query.competitionId;
    if (query.disciplineId) filter.discipline = query.disciplineId;
    if (query.seasonId) filter.season = query.seasonId;
    return this.model
      .find(filter)
      .sort({ date: -1, _id: -1 })
      .populate({
        path: 'athlete',
        select: 'lastName firstName middleName birthDate gender club school',
        populate: { path: 'school', select: 'name shortName city' },
      })
      .populate('discipline', 'name nameEn type')
      .populate('competition', 'name date location')
      .populate('season')
      .lean();
  }

  /**
   * Бізнес-правила:
   *  - вид має бути серед видів змагання;
   *  - вікова категорія спортсмена (на дату змагання) має бути дозволена і змаганням, і видом;
   *  - season/date/ageCategory підставляються автоматично;
   *  - waScore та rank обраховуються автоматично, якщо не задані вручну.
   */
  private async prepare(body: any, current?: any) {
    const data = { ...(current ?? {}), ...body };
    const [athlete, competition, discipline] = await Promise.all([
      data.athlete ? this.athletes.findById(data.athlete).lean() : Promise.resolve(null),
      this.competitions.findById(data.competition).lean(),
      this.disciplines.findById(data.discipline).lean(),
    ]);
    const isRelay = discipline?.group === 'relay' || discipline?.name.toLowerCase().includes('естафет');
    if (!competition || !discipline || (!athlete && !isRelay)) {
      throw new BadRequestException('Невірний спортсмен, змагання або вид');
    }

    if (!competition.disciplines.some((d) => oid(d) === oid(discipline._id))) {
      throw new BadRequestException('Цього виду немає у програмі змагання');
    }

    let cat = data.ageCategory;
    if (athlete && !cat) {
      cat = ageCategory(athlete.birthDate, competition.date);
    }
    if (athlete) {
      if (competition.ageCategories.length && !competition.ageCategories.includes(cat)) {
        throw new BadRequestException(`Категорія ${cat} не допускається до цього змагання`);
      }
      if (discipline.allowedCategories.length && !discipline.allowedCategories.includes(cat)) {
        throw new BadRequestException(`Категорія ${cat} не допускається до виду "${discipline.name}"`);
      }
    }

    if ((data.status ?? 'OK') === 'OK' && (data.value === undefined || data.value === null)) {
      throw new BadRequestException('Вкажіть результат');
    }

    let timing = data.timing;
    if (!timing && discipline?.type === 'time' && typeof data.value === 'number') {
      const str = data.rawMark || String(data.value);
      const dec = str.replace(',', '.').split('.')[1];
      if (dec && dec.length === 1) {
        timing = 'manual';
      } else if (dec && dec.length >= 2) {
        timing = 'electronic';
      }
    }

    let waScore = data.waScore;
    if (waScore === undefined && data.value !== undefined && data.value !== null && athlete) {
      const calc = calculateWaScore(athlete.gender, discipline.name, data.value, timing);
      if (calc !== null) waScore = calc;
    }

    let rank = data.rank;
    if (!rank && data.value !== undefined && data.value !== null && athlete) {
      const calcRank = determineSportRank(athlete.gender, discipline.name, data.value, timing);
      if (calcRank) rank = calcRank;
    }

    return {
      ...body,
      timing: discipline?.type === 'time' ? timing : undefined,
      season: competition.season,
      date: competition.date,
      ageCategory: cat,
      waScore: waScore ?? undefined,
      rank: rank ?? undefined,
    };
  }

  async create(body: any) {
    return super.create(await this.prepare(body));
  }

  async update(id: string, body: any) {
    const current = await this.model.findById(id).lean();
    if (!current) throw new NotFoundException();
    return super.update(id, await this.prepare(body, current));
  }

  async getLeaderboard(params: {
    mode?: 'sb' | 'pb';
    year?: number;
    indoor?: 'ALL' | 'outdoor' | 'indoor' | string;
    category?: string;
    gender?: 'M' | 'F' | 'ALL' | string;
    disciplineId?: string;
    limit?: number;
  } = {}) {
    const mode = params.mode || 'sb';
    const limit = params.limit ?? 10;

    // 1. Determine target year and available years (using cached SeasonsService if available)
    let availableYears: number[] = [];
    let targetYear = params.year ?? new Date().getFullYear();

    if (this.seasonsService) {
      const yearContext = await this.seasonsService.getActiveYearContext(params.year);
      targetYear = yearContext.targetYear;
      availableYears = yearContext.allYears;
    } else {
      const allCompDates = await this.competitions.find({}, 'date name').lean();
      const yearSet = new Set<number>();
      for (const c of allCompDates) {
        if (c.date) {
          yearSet.add(determineSeason(c.date, c.name).year);
        }
      }
      availableYears = Array.from(yearSet).sort((a, b) => b - a);
      targetYear = params.year || availableYears[0] || new Date().getFullYear();
    }

    // 2. Build results query
    const filter: any = {
      status: 'OK',
      value: { $gt: 0 },
      athlete: { $ne: null },
    };

    if (params.disciplineId) {
      filter.discipline = params.disciplineId;
    }

    const rawResults = await this.model
      .find(filter)
      .populate({
        path: 'athlete',
        select: 'lastName firstName middleName birthDate gender club school',
        populate: { path: 'school', select: 'name shortName city' },
      })
      .populate('discipline', 'name nameEn type group')
      .populate('competition', 'name date location')
      .populate('season')
      .lean();

    // 3. Filter and group by discipline, category, and gender
    // For each unique athlete, keep only their BEST mark within this group
    const bestByAthleteAndGroup = new Map<string, any>();

    for (const r of rawResults) {
      const athlete = r.athlete as any;
      const discipline = r.discipline as any;
      const season = r.season as any;
      if (!athlete || !discipline) continue;

      if (mode === 'sb') {
        const sYear = season?.year ?? (r.date ? determineSeason(r.date).year : null);
        if (sYear !== targetYear) continue;
      }

      const isIndoor = Boolean(season?.indoor);
      if (params.indoor === 'indoor' && !isIndoor) continue;
      if (params.indoor === 'outdoor' && isIndoor) continue;

      const gender = athlete.gender;
      if (params.gender && params.gender !== 'ALL' && params.gender !== gender) continue;

      const cat = athlete.birthDate
        ? ageCategory(athlete.birthDate, r.date)
        : r.ageCategory || 'ADULT';
      if (params.category && params.category !== 'ALL' && cat !== params.category) continue;

      const groupKey = `${discipline._id}__${cat}__${gender}`;
      const athleteKey = `${athlete._id}__${groupKey}`;

      const existing = bestByAthleteAndGroup.get(athleteKey);
      if (!existing) {
        bestByAthleteAndGroup.set(athleteKey, { ...r, _groupKey: groupKey, _cat: cat, _gender: gender });
      } else {
        const discType = discipline.type || 'time';
        if (isBetterMark(discType, r, existing)) {
          bestByAthleteAndGroup.set(athleteKey, { ...r, _groupKey: groupKey, _cat: cat, _gender: gender });
        }
      }
    }

    // 4. Assemble groups
    const groupsMap = new Map<string, { discipline: any; category: string; gender: 'M' | 'F'; items: any[] }>();

    for (const item of bestByAthleteAndGroup.values()) {
      const gKey = item._groupKey;
      let g = groupsMap.get(gKey);
      if (!g) {
        g = {
          discipline: item.discipline,
          category: item._cat,
          gender: item._gender,
          items: [],
        };
        groupsMap.set(gKey, g);
      }
      g.items.push(item);
    }

    const groups: any[] = [];

    const CATEGORY_ORDER: Record<string, number> = {
      U14: 10,
      U16: 20,
      U18: 30,
      U20: 40,
      U21: 45,
      U23: 50,
      ADULT: 60,
    };
    const getCatWeight = (cat: string) => CATEGORY_ORDER[cat.toUpperCase()] ?? 500;

    for (const g of groupsMap.values()) {
      const discType = g.discipline.type || 'time';
      // Sort items by performance (best first)
      g.items.sort((a, b) => (isBetterMark(discType, a, b) ? -1 : 1));

      // Take top `limit`
      const topItems = g.items.slice(0, limit).map((r, idx) => ({
        rank: idx + 1,
        athlete: {
          _id: String(r.athlete._id),
          lastName: r.athlete.lastName,
          firstName: r.athlete.firstName,
          middleName: r.athlete.middleName,
          birthDate: r.athlete.birthDate,
          gender: r.athlete.gender,
          ageCategory: r._cat,
          club: r.athlete.club,
          school: r.athlete.school
            ? {
                _id: String(r.athlete.school._id),
                name: r.athlete.school.name,
                shortName: r.athlete.school.shortName,
                city: r.athlete.school.city,
              }
            : undefined,
        },
        value: r.value,
        timing: r.timing,
        rawMark: r.rawMark,
        wind: r.wind,
        status: r.status,
        sportRank: r.rank,
        waScore: r.waScore,
        date: r.date,
        indoor: Boolean((r.season as any)?.indoor),
        competition: {
          _id: String(r.competition?._id ?? ''),
          name: r.competition?.name ?? '',
          location: r.competition?.location,
        },
        round: r.round,
      }));

      groups.push({
        discipline: {
          _id: String(g.discipline._id),
          name: g.discipline.name,
          nameEn: g.discipline.nameEn,
          type: g.discipline.type,
        },
        category: g.category,
        gender: g.gender,
        results: topItems,
      });
    }

    // Sort groups: athletic discipline order -> category -> gender (M then F)
    groups.sort((a, b) => {
      const nameComp = compareDisciplineNames(a.discipline.name, b.discipline.name);
      if (nameComp !== 0) return nameComp;
      const catComp = getCatWeight(a.category) - getCatWeight(b.category);
      if (catComp !== 0) return catComp;
      return a.gender === 'M' ? -1 : 1;
    });

    return {
      mode,
      year: mode === 'sb' ? targetYear : undefined,
      availableYears,
      groups,
    };
  }
}
